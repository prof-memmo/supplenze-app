/**
 * ENGINE.JS — Il "cuore" dell'applicazione (Cloud Version)
 * Gestisce i dati via Firebase Firestore e Authentication.
 * Sincronizzazione in tempo reale per multi-utenza.
 */
const Engine = (() => {
  // ── FIREBASE INITIALIZATION ────────────────────────────────────────────────
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  const db = firebase.firestore();
  const auth = firebase.auth();

  // ── STATO INIZIALE & SCHEMI ──────────────────────────────────────────────────
  const INITIAL_DB = {
    school_years: [{ id: 2, name: '2025/26', is_active: 1 }],
    users: [],
    teachers: [],
    classes: [],
    schedule: [],
    absences: [],
    trips: [],
    substitutions: [],
    notifications: [],
    logs: [],
    long_term_assignments: [],
    school_events: []
  };

  const ROLE_LEVELS = { admin_master: 100, admin: 50, director: 30, secretary: 20, teacher: 10 };

  let _db = { ...INITIAL_DB };
  let _initialized = false;
  let _onDataUpdate = null;

  // ── REAL-TIME SYNC ─────────────────────────────────────────────────────────
  async function _initSync(callback) {
    if (_initialized) return;
    _onDataUpdate = callback;

    const collections = [
      'school_years', 'users', 'teachers', 'classes', 'schedule', 
      'absences', 'trips', 'substitutions', 'notifications', 'logs', 'long_term_assignments',
      'school_events'
    ];

    try {
      const snapshot = await db.collection('system').doc('metadata').get();
      if (!snapshot.exists) {
          console.log("Database cloud vuoto. Avvio migrazione iniziale...");
          await _performMigration();
      }

      // Sincronizzazione in tempo reale di tutte le collezioni
      collections.forEach(col => {
        db.collection(col).onSnapshot(snap => {
          _db[col] = snap.docs.map(doc => {
            const data = doc.data();
            // Convertiamo l'ID del documento in numero se possibile per retro-compatibilità
            const id = isNaN(doc.id) ? doc.id : Number(doc.id);
            return { ...data, id };
          });
          if (_onDataUpdate) _onDataUpdate(_db);
        }, err => console.error(`Errore Sync [${col}]:`, err));
      });

      _initialized = true;
    } catch (err) {
      console.error("Errore Inizializzazione Firebase:", err);
    }
  }

  async function _performMigration() {
    const localRaw = localStorage.getItem('sg_supplenze_db');
    if (!localRaw) return;

    let localData;
    try { localData = JSON.parse(localRaw); } catch(e) { return; }

    console.log("Migrazione dati locali verso Cloud...");
    const batch = db.batch();
    
    for (const key of Object.keys(localData)) {
      if (Array.isArray(localData[key])) {
        localData[key].forEach(item => {
          const docId = String(item.id || Date.now() + Math.random());
          const { id, ...data } = item;
          const docRef = db.collection(key).doc(docId);
          batch.set(docRef, data);
        });
      }
    }
    
    batch.set(db.collection('system').doc('metadata'), { 
      migrated: true, 
      timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    });
    
    await batch.commit();
    console.log("Migrazione completata con successo.");
  }

  // ── HELPER DATA ─────────────────────────────────────────────────────────────
  const DAYS = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI'];
  const SCHOOL_HOURS = {
    LUNEDI:    [8, 9, 10, 11, 12, 13, 14, 15],
    MARTEDI:   [8, 9, 10, 11],
    MERCOLEDI: [8, 9, 10, 11, 12, 13, 14, 15],
    GIOVEDI:   [8, 9, 10, 11, 12, 13, 14, 15],
    VENERDI:   [8, 9, 10, 11, 12, 13, 14, 15],
    SABATO:    [8, 9, 10, 11, 12]
  };

  function getDayOfWeek(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return ['DOMENICA', 'LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO'][d.getDay()] || null;
  }

  // ── API ENGINE ──────────────────────────────────────────────────────────────

  const api = {
    init: (callback) => _initSync(callback),
    onAuth: (callback) => auth.onAuthStateChanged(callback),
    
    getDb: () => _db,

    logActivity: async (userId, action, details) => {
      await db.collection('logs').add({
        timestamp: new Date().toISOString(),
        user_id: userId || 'system',
        action,
        details
      });
    },

    // ── ANNI SCOLASTICI ──
    getYears: () => _db.school_years,
    addYear: async (y) => {
      const id = Date.now();
      const newYear = { ...y, id, is_active: 0 };
      await db.collection('school_years').doc(String(id)).set(newYear);
      return newYear;
    },
    activateYear: async (id) => {
      const batch = db.batch();
      _db.school_years.forEach(y => {
        batch.update(db.collection('school_years').doc(String(y.id)), { is_active: (y.id == id ? 1 : 0) });
      });
      await batch.commit();
    },
    deleteYear: async (id) => {
      await db.collection('school_years').doc(String(id)).delete();
    },

    // ── AUTH (Misto locale/email per compatibilità) ──
    login: async (username, password) => {
        const user = _db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password_hash === password);
        if (!user) throw new Error('Credenziali non valide.');
        const teacher = user.teacher_id ? _db.teachers.find(t => t.id === user.teacher_id) : null;
        return { token: 'cloud-' + user.id, user: { ...user, teacher } };
    },

    loginWithGoogle: async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      const email = result.user.email;

      if (!email.toLowerCase().endsWith('@padregemelli.net')) {
        await auth.signOut();
        throw new Error(`Accesso negato. Usa l'account @padregemelli.net.`);
      }

      const teacher = _db.teachers.find(t => t.email && t.email.toLowerCase() === email.toLowerCase());
      const adminUser = _db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      
      const user = adminUser || _db.users.find(u => u.teacher_id === (teacher ? teacher.id : null));
      if (!user) {
        if (teacher) {
           const newUser = {
             username: email.split('@')[0],
             role: 'teacher', teacher_id: teacher.id,
             email, created_at: new Date().toISOString()
           };
           const docRef = await db.collection('users').add(newUser);
           return { token: docRef.id, user: { ...newUser, id: docRef.id, teacher } };
        }
        await auth.signOut();
        throw new Error(`Utente ${email} non presente nel database scolastico.`);
      }
      return { token: user.id || user.username, user: { ...user, teacher } };
    },

    logout: () => auth.signOut(),

    // ── DOCENTI ──
    getTeachers: (yearId) => {
      const yid = Number(yearId || _db.school_years.find(y => y.is_active)?.id);
      return _db.teachers.filter(t => Number(t.school_year_id) === yid).sort((a,b)=>a.name.localeCompare(b.name));
    },
    addTeacher: async (t) => {
      const id = Date.now();
      const newT = { ...t, hours_subs: parseInt(t.hours_subs)||0, hours_trips: parseInt(t.hours_trips)||0, is_available: 1 };
      await db.collection('teachers').doc(String(id)).set(newT);
      return { ...newT, id };
    },
    updateTeacher: async (id, t) => {
      await db.collection('teachers').doc(String(id)).update(t);
    },
    deleteTeacher: async (id) => {
      await db.collection('teachers').doc(String(id)).delete();
    },
    adjustHours: async (id, delta, type='subs') => {
      const t = _db.teachers.find(x => x.id == id);
      if (t) {
        const field = type === 'trips' ? 'hours_trips' : 'hours_subs';
        const newVal = Math.max(0, (t[field] || 0) + delta);
        await db.collection('teachers').doc(String(id)).update({ [field]: newVal });
      }
    },

    // ── CLASSI ──
    getClasses: (yearId) => {
      const yid = Number(yearId || _db.school_years.find(y => y.is_active)?.id);
      return _db.classes.filter(c => Number(c.school_year_id) === yid).sort((a,b)=>a.name.localeCompare(b.name));
    },
    addClass: async (c) => {
      const id = Date.now();
      const cls = { ...c, id, name: c.name.toUpperCase().trim() };
      await db.collection('classes').doc(String(id)).set(cls);
    },
    deleteClass: async (id) => {
      await db.collection('classes').doc(String(id)).delete();
    },

    // ── ORARIO ──
    getSchedule: (yearId, teacherId, day) => {
      const yid = Number(yearId);
      const tid = teacherId ? Number(teacherId) : null;
      return _db.schedule.filter(s => 
        Number(s.school_year_id) === yid && 
        (!tid || Number(s.teacher_id) === tid) &&
        (!day || s.day === day.toUpperCase())
      ).sort((a,b) => a.hour - b.hour);
    },
    updateSlot: async (slot) => {
      const { teacher_id, day, hour, raw_value, school_year_id } = slot;
      const docId = `${teacher_id}_${day}_${hour}_${school_year_id}`;
      
      const classes = _db.classes.filter(c => c.school_year_id == school_year_id);
      let slot_type = 'empty', class_id = null;
      if (raw_value) {
        const v = raw_value.trim().toUpperCase();
        if (v === 'DIS') slot_type = 'disponibile';
        else if (v === 'ECC') slot_type = 'eccedente';
        else if (v === 'R') slot_type = 'ricevimento';
        else if (v === '*' || v === '') slot_type = 'asterisco';
        else {
          const cls = classes.find(c => c.name.toUpperCase() === v.replace(/[*]/g,''));
          if (cls) { slot_type = 'normal'; class_id = cls.id; }
          else slot_type = 'empty';
        }
      }

      await db.collection('schedule').doc(docId).set({
        teacher_id, day, hour, class_id, slot_type, raw_value, school_year_id
      });
    },

    // ── ASSENZE ──
    getAbsences: (date, yearId) => {
      const yid = Number(yearId);
      return _db.absences.filter(a => 
        (!date || a.date === date) && 
        (!yid || Number(a.school_year_id) === yid)
      ).map(a => ({
        ...a, 
        teacher_name: _db.teachers.find(t=>t.id == a.teacher_id)?.name || '?',
        status: a.status || 'approved'
      })).sort((a,b) => a.teacher_name.localeCompare(b.teacher_name));
    },
    addAbsence: async (a, creatorId) => {
      const teachersToProcess = Array.isArray(a.teacher_id) ? a.teacher_id : [a.teacher_id];
      const batch = db.batch();

      for (const tid of teachersToProcess) {
        const absId = String(Date.now() + Math.random());
        const status = a.status || 'approved';
        const docRef = db.collection('absences').doc(absId);
        batch.set(docRef, { ...a, teacher_id: tid, status, created_at: new Date().toISOString() });

        // Notifica
        const notifId = String(Date.now() + Math.random());
        batch.set(db.collection('notifications').doc(notifId), {
          teacher_id: tid,
          date: a.date,
          type: a.type || 'assenza_giornaliera',
          status: status,
          processed_by: creatorId || 'system',
          created_at: new Date().toISOString()
        });
      }
      await batch.commit();
    },
    updateAbsenceStatus: async (id, status) => {
      await db.collection('absences').doc(String(id)).update({ status });
    },
    deleteAbsence: async (id) => {
      await db.collection('absences').doc(String(id)).delete();
    },

    // ── SOSTITUZIONI ──
    assignSubstitution: async (sub) => {
      const id = String(Date.now() + Math.random());
      await db.collection('substitutions').doc(id).set({
        ...sub, created_at: new Date().toISOString()
      });
    },
    deleteSubstitution: async (id) => {
      await db.collection('substitutions').doc(String(id)).delete();
    },

    // Business Logic Helper (Sync because it uses the local _db cache)
    getDailySubstitutions: (date, yearId) => {
      const dayOfWeek = getDayOfWeek(date);
      if (!dayOfWeek || !SCHOOL_HOURS[dayOfWeek]) return { slots: [], trips: [], absences: [] };

      const hours = SCHOOL_HOURS[dayOfWeek];
      const absToday = api.getAbsences(date, yearId).filter(a => a.status === 'approved');
      const allSubsRows = _db.substitutions.filter(s => s.date === date && s.school_year_id == yearId);

      const slots = [];
      absToday.forEach(abs => {
        hours.forEach(h => {
          const slot = _db.schedule.find(s => s.teacher_id == abs.teacher_id && s.day == dayOfWeek && s.hour == h && s.slot_type === 'normal');
          if (slot) {
            const sub = allSubsRows.find(s => s.hour == h && s.absent_teacher_id == abs.teacher_id);
            slots.push({
              hour: h,
              class_id: slot.class_id,
              className: _db.classes.find(c => c.id == slot.class_id)?.name || '?',
              absent_teacher_id: abs.teacher_id,
              absentTeacherName: abs.teacher_name,
              substitute_teacher_id: sub ? sub.substitute_teacher_id : null,
              substituteTeacherName: sub ? (_db.teachers.find(t=>t.id == sub.substitute_teacher_id)?.name || '?') : '',
              sub_role: sub ? sub.sub_role : ''
            });
          }
        });
      });

      return { slots, absences: absToday };
    },

    // ── ASSEGNAZIONI LUNGO TERMINE ──
    getLongTermAssignments: () => _db.long_term_assignments,

    // ── EVENTI SCOLASTICI ──
    getEvents: (yearId) => {
      const yid = Number(yearId);
      return _db.school_events.filter(e => !yid || Number(e.school_year_id) === yid)
        .sort((a,b) => new Date(a.date) - new Date(b.date));
    },
    addEvent: async (event) => {
      const id = String(Date.now() + Math.random());
      await db.collection('school_events').doc(id).set({
        ...event, 
        id,
        created_at: new Date().toISOString()
      });
      return { ...event, id };
    },
    deleteEvent: async (id) => {
      await db.collection('school_events').doc(String(id)).delete();
    },
    updateEvent: async (id, event) => {
      await db.collection('school_events').doc(String(id)).update(event);
    }
  };

  return api;
})();
