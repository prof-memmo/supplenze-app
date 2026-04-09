/**
 * ENGINE.JS — Il "cuore" dell'applicazione (Zero-Terminale)
 * Gestisce i dati in localStorage, l'algoritmo di supplenza e la logica di business.
 * Predisposto per Firebase/Supabase in futuro.
 */
const Engine = (() => {
  // ── STATO INIZIALE & SCHEMI ──────────────────────────────────────────────────
  const INITIAL_DB = {
    school_years: [
      { id: 2, name: '2025/26', is_active: 1 }
    ],
    users: [
      { id: 1, username: 'admin', password_hash: 'admin123', role: 'admin_master', teacher_id: null, created_at: '2025-09-01T00:00:00.000Z' },
      { id: 5, username: 'segreteria', password_hash: 'admin456', role: 'admin', teacher_id: null, created_at: '2025-09-01T00:00:00.000Z' },
      { id: 2, username: 'rossi', password_hash: 'rossi123', role: 'teacher', teacher_id: 100, created_at: '2025-09-01T00:00:00.000Z' },
      { id: 3, username: 'bianchi', password_hash: 'bianchi123', role: 'teacher', teacher_id: 101, created_at: '2025-09-01T00:00:00.000Z' },
      { id: 4, username: 'verdi', password_hash: 'verdi123', role: 'teacher', teacher_id: 102, created_at: '2025-09-01T00:00:00.000Z' }
    ],
    teachers: [
      { id: 100, name: 'ROSSI MARIO', subject: 'MATEMATICA', assigned_classes: '1A, 2A, 1B', email: 'm.rossi@scuola.it', school_year_id: 2, hours_subs: 10, hours_trips: 0, is_available: 1 },
      { id: 101, name: 'BIANCHI ANNA', subject: 'LETTERE', assigned_classes: '3A, 4A, 5A', email: 'a.bianchi@scuola.it', school_year_id: 2, hours_subs: 5, hours_trips: 0, is_available: 1 },
      { id: 102, name: 'VERDI LUIGI', subject: 'INGLESE', assigned_classes: '1C, 2C, 3C', email: 'l.verdi@scuola.it', school_year_id: 2, hours_subs: 15, hours_trips: 2, is_available: 1 },
      { id: 103, name: 'NERI ELENA', subject: 'ARTE', assigned_classes: '1D, 2D, 3D', email: 'e.neri@scuola.it', school_year_id: 2, hours_subs: 2, hours_trips: 0, is_available: 1 },
      { id: 104, name: 'RUSSO GIUSEPPE', subject: 'ED. FISICA', assigned_classes: 'PALESTRA', email: 'g.russo@scuola.it', school_year_id: 2, hours_subs: 0, hours_trips: 0, is_available: 1 }
    ],
    classes: [
      { id: 200, name: '1A', school_year_id: 2 },
      { id: 201, name: '1B', school_year_id: 2 },
      { id: 202, name: '1C', school_year_id: 2 },
      { id: 203, name: '1D', school_year_id: 2 },
      { id: 204, name: '2A', school_year_id: 2 },
      { id: 205, name: '2B', school_year_id: 2 },
      { id: 206, name: '2C', school_year_id: 2 },
      { id: 207, name: '2D', school_year_id: 2 },
      { id: 208, name: '3A', school_year_id: 2 },
      { id: 209, name: '3B', school_year_id: 2 },
      { id: 210, name: '3C', school_year_id: 2 },
      { id: 211, name: '3D', school_year_id: 2 },
      { id: 212, name: '4A', school_year_id: 2 },
      { id: 213, name: '4B', school_year_id: 2 },
      { id: 214, name: '5A', school_year_id: 2 },
      { id: 215, name: '5B', school_year_id: 2 }
    ],
    schedule: [
      // ROSSI (LUN)
      { id: 300, teacher_id: 100, day: 'LUNEDI', hour: 8, class_id: null, slot_type: 'normal', raw_value: '1A', school_year_id: 2 },
      { id: 301, teacher_id: 100, day: 'LUNEDI', hour: 9, class_id: null, slot_type: 'normal', raw_value: '2A', school_year_id: 2 },
      { id: 302, teacher_id: 100, day: 'LUNEDI', hour: 10, class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: 2 },
      { id: 303, teacher_id: 100, day: 'LUNEDI', hour: 11, class_id: null, slot_type: 'eccedente', raw_value: 'ECC', school_year_id: 2 },
      // BIANCHI (LUN)
      { id: 304, teacher_id: 101, day: 'LUNEDI', hour: 8, class_id: null, slot_type: 'normal', raw_value: '3A', school_year_id: 2 },
      { id: 305, teacher_id: 101, day: 'LUNEDI', hour: 10, class_id: null, slot_type: 'normal', raw_value: '4A', school_year_id: 2 },
      { id: 306, teacher_id: 101, day: 'LUNEDI', hour: 11, class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: 2 },
      // VERDI (LUN)
      { id: 307, teacher_id: 102, day: 'LUNEDI', hour: 9, class_id: null, slot_type: 'normal', raw_value: '1C', school_year_id: 2 },
      { id: 308, teacher_id: 102, day: 'LUNEDI', hour: 12, class_id: null, slot_type: 'eccedente', raw_value: 'ECC', school_year_id: 2 },
      // NERI (MAR)
      { id: 309, teacher_id: 103, day: 'MARTEDI', hour: 8, class_id: null, slot_type: 'normal', raw_value: '1D', school_year_id: 2 },
      { id: 310, teacher_id: 103, day: 'MARTEDI', hour: 9, class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: 2 },
      { id: 311, teacher_id: 103, day: 'MARTEDI', hour: 10, class_id: null, slot_type: 'eccedente', raw_value: 'ECC', school_year_id: 2 },
      // RUSSO (MER)
      { id: 312, teacher_id: 104, day: 'MERCOLEDI', hour: 10, class_id: null, slot_type: 'normal', raw_value: 'PALESTRA', school_year_id: 2 },
      { id: 313, teacher_id: 104, day: 'MERCOLEDI', hour: 11, class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: 2 }
    ],
    absences: [],
    trips: [],
    substitutions: [],
    notifications: [],
    logs: [],
    long_term_assignments: []
  };

  // Role hierarchy: admin_master > admin > teacher
  const ROLE_LEVELS = { admin_master: 100, admin: 50, director: 30, secretary: 20, teacher: 10 };

  let _db = null;

  // ── PERSISTENZA ─────────────────────────────────────────────────────────────
  function _load() {
    if (_db) return _db;
    const raw = localStorage.getItem('sg_supplenze_db');
    if (raw) {
      try { _db = JSON.parse(raw); } catch(e) { console.error('DB Corrotto', e); _db = { ...INITIAL_DB }; }
    } else {
      _db = { ...INITIAL_DB };
      _save();
    }
    
    // MIGRATION: split legacy undivided debt dynamically once
    let changed = false;
    if (Array.isArray(_db.teachers)) {
      _db.teachers.forEach(t => {
        if (t && !t.legacy_split_done_v2) {
          const total = (t.hours_subs || 0) + (t.hours_trips || 0);
          if (total > 0) {
             t.hours_subs = Math.floor(total / 2);
             t.hours_trips = Math.ceil(total / 2);
          }
          t.legacy_split_done_v2 = true;
          changed = true;
        }
      });
    } else {
      _db.teachers = [...INITIAL_DB.teachers];
    }
    // MIGRATION: Ensure school_years key exists and is non-empty
    if (!_db.school_years || !_db.school_years.length) {
      _db.school_years = [...INITIAL_DB.school_years];
      changed = true;
    }
    // MIGRATION: Ensure 'segreteria' user exists
    if (!_db.users && Array.isArray(INITIAL_DB.users)) {
       _db.users = [...INITIAL_DB.users];
       changed = true;
    } else if (_db.users && !_db.users.find(u => u.username === 'segreteria')) {
      _db.users.push({ id: 5, username: 'segreteria', password_hash: 'admin456', role: 'admin', teacher_id: null, created_at: new Date().toISOString() });
      changed = true;
    }
    
    if (changed) _save();
    
    return _db;
  }

  function _save() {
    if (!_db) return;
    localStorage.setItem('sg_supplenze_db', JSON.stringify(_db));
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

  // ── API ENGINE (Mock per le viste) ──────────────────────────────────────────

  const api = {
    _save: () => localStorage.setItem('sg_supplenze_db', JSON.stringify(_db)),

    _log: (userId, action, details) => {
      const db = _load();
      if (!db.logs) db.logs = [];
      db.logs.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        user_id: userId,
        action,
        details
      });
      // Non chiamiamo _save qui perchè lo farà chi ha chiamato _log
    },

    // ── CALCOLO DEBITO & SCADENZA ──
    getTeacherDebt: (teacherId) => {
      const db = _load();
      const t = db.teachers.find(x => x.id == teacherId);
      if (!t) return 0;

      // Calcoliamo le ore a debito dai permessi orari (ultimi 2 mesi)
      const now = new Date();
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(now.getMonth() - 2);

      const activeHourlyDebts = db.absences.filter(a => 
        a.teacher_id == teacherId && 
        a.type === 'permesso_orario' &&
        a.status === 'approved' &&
        new Date(a.date) >= twoMonthsAgo
      ).reduce((sum, a) => sum + (a.hours?.length || 0), 0);

      // Sostituzioni che hanno "saldato" il debito (recuperi)
      // Nota: in questo sistema hours_subs è il campo principale per il debito "standard"
      // ma i permessi orari lo alimentano temporaneamente.
      return (t.hours_subs || 0); 
    },

    // ── ANNI SCOLASTICI ──
    getYears: () => _load().school_years,
    addYear: (y) => {
      const db = _load();
      const id = Date.now();
      const newYear = { ...y, id, is_active: 0 };
      db.school_years.push(newYear);
      _save();
      return newYear;
    },
    activateYear: (id) => {
      const db = _load();
      db.school_years.forEach(y => y.is_active = (y.id === parseInt(id) ? 1 : 0));
      _save();
    },
    deleteYear: (id) => {
      const db = _load();
      db.school_years = db.school_years.filter(y => y.id !== parseInt(id));
      _save();
    },

    // ── AUTH & REGISTRAZIONE ──
    login: (username, password) => {
      const db = _load();
      const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password_hash === password);
      if (!user) throw new Error('Credenziali non valide. Verifica username e password.');
      const teacher = user.teacher_id ? db.teachers.find(t => t.id === user.teacher_id) : null;
      api.logActivity(user.id, 'LOGIN', `Accesso effettuato da ${user.username}`);
      return { token: 'mock-jwt-' + user.id, user: { ...user, teacher } };
    },

    loginWithGoogle: (email, displayName) => {
      // ENFORCE INSTITUTIONAL DOMAIN
      if (!email.toLowerCase().endsWith('@padregemelli.net')) {
        throw new Error(`Accesso negato. Usa il tuo account @padregemelli.net.`);
      }

      const db = _load();
      // Look for a user by email (teacher email)
      const teacher = db.teachers.find(t => t.email && t.email.toLowerCase() === email.toLowerCase());
      if (teacher) {
        // Find linked user account
        const user = db.users.find(u => u.teacher_id === teacher.id);
        if (user) {
          api.logActivity(user.id, 'LOGIN_GOOGLE', `Accesso Google: ${email}`);
          return { token: 'mock-jwt-' + user.id, user: { ...user, teacher } };
        }
        // Auto-create teacher account from Google
        const newUser = {
          id: Date.now(), username: email.split('@')[0],
          password_hash: '', role: 'teacher', teacher_id: teacher.id,
          email, created_at: new Date().toISOString()
        };
        db.users.push(newUser); _save();
        api.logActivity(newUser.id, 'LOGIN_GOOGLE_NEW', `Nuovo accesso Google: ${email}`);
        return { token: 'mock-jwt-' + newUser.id, user: { ...newUser, teacher } };
      }
      // Check admin by email
      const adminUser = db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (adminUser) {
        api.logActivity(adminUser.id, 'LOGIN_GOOGLE', `Accesso Google admin: ${email}`);
        return { token: 'mock-jwt-' + adminUser.id, user: adminUser };
      }
      throw new Error(`Nessun account trovato per ${email}. Contatta l'amministratore.`);
    },

    register: (data) => {
      const db = _load();
      // Match per email
      const teacher = db.teachers.find(t => t.email && t.email.toLowerCase() === data.email.toLowerCase());
      if (!teacher) throw new Error('E-mail non trovata tra i docenti censiti. Contatta la segreteria.');
      
      // Verifica se già registrato
      if (db.users.some(u => u.username === data.username || u.teacher_id === teacher.id)) {
        throw new Error('Utente già registrato per questo docente o username già in uso.');
      }

      const newUser = {
        id: Date.now(),
        username: data.username,
        password_hash: data.password, // In a real app, hash this
        role: 'teacher',
        teacher_id: teacher.id,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      api.logActivity(newUser.id, 'REGISTRAZIONE', `Auto-registrazione docente: ${teacher.name}`);
      _save();
      return newUser;
    },

    addUser: (data) => {
      const db = _load();
      if (db.users.some(u => u.username === data.username)) throw new Error('Username già in uso.');
      const newUser = {
        id: Date.now(), username: data.username,
        password_hash: data.password || '',
        role: data.role || 'teacher',
        teacher_id: data.teacher_id || null,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      api.logActivity(null, 'CREA_UTENTE', `Creato utente: ${newUser.username} (${newUser.role})`);
      _save();
      return newUser;
    },

    getUsers: () => _load().users,
    updateUser: (id, data) => {
      const db = _load();
      const u = db.users.find(x => x.id == id);
      if (u) {
        if (data.username) u.username = data.username;
        if (data.password) u.password_hash = data.password;
        if (data.role) u.role = data.role;
        if (data.teacher_id !== undefined) u.teacher_id = data.teacher_id;
        _save();
        return u;
      }
    },
    deleteUser: (id) => {
      const db = _load();
      db.users = db.users.filter(u => u.id != id);
      _save();
    },

    // ── DOCENTI ──
    getTeachers: (yearId) => {
      const db = _load();
      const yid = Number(yearId || db.school_years.find(y => y.is_active)?.id);
      return db.teachers.filter(t => Number(t.school_year_id) === yid).sort((a,b)=>a.name.localeCompare(b.name));
    },
    addTeacher: (t) => {
      const db = _load();
      const id = Date.now();
      const newT = { id, ...t, hours_subs: parseInt(t.hours_subs)||0, hours_trips: parseInt(t.hours_trips)||0, is_available: t.is_available !== false ? 1 : 0 };
      db.teachers.push(newT);
      _save();
      return newT;
    },
    updateTeacher: (id, t) => {
      const db = _load();
      const idx = db.teachers.findIndex(x => x.id === parseInt(id));
      if (idx !== -1) { db.teachers[idx] = { ...db.teachers[idx], ...t }; _save(); return db.teachers[idx]; }
      throw new Error('Docente non trovato');
    },
    deleteTeacher: (id) => {
      const db = _load();
      db.teachers = db.teachers.filter(t => t.id !== parseInt(id));
      db.schedule = db.schedule.filter(s => s.teacher_id !== parseInt(id));
      _save();
    },
    adjustHours: (id, delta, type='subs') => {
      const db = _load();
      const t = db.teachers.find(x => x.id === parseInt(id));
      if (t) { 
        const field = type === 'trips' ? 'hours_trips' : 'hours_subs';
        t[field] = Math.max(0, (t[field]||0) + delta); 
        _save(); return t; 
      }
      throw new Error('Docente non trovato');
    },

    // ── CLASSI ──
    getClasses: (yearId) => {
      const db = _load();
      const yid = Number(yearId || db.school_years.find(y => y.is_active)?.id);
      return db.classes.filter(c => Number(c.school_year_id) === yid).sort((a,b)=>a.name.localeCompare(b.name));
    },
    addClass: (c) => {
      const db = _load();
      const id = Date.now();
      const cls = { id, ...c, name: c.name.toUpperCase().trim() };
      db.classes.push(cls);
      _save();
      return cls;
    },
    deleteClass: (id) => {
      const db = _load();
      db.classes = db.classes.filter(c => c.id !== parseInt(id));
      _save();
    },

    // ── ORARIO ──
    getSchedule: (yearId, teacherId, day) => {
      const db = _load();
      const yid = Number(yearId);
      const tid = teacherId ? Number(teacherId) : null;
      return db.schedule.filter(s => 
        Number(s.school_year_id) === yid && 
        (!tid || Number(s.teacher_id) === tid) &&
        (!day || s.day === day.toUpperCase())
      ).sort((a,b) => a.hour - b.hour);
    },
    updateSlot: (slot) => {
      const db = _load();
      const { teacher_id, day, hour, raw_value, school_year_id } = slot;
      
      // Parsing logica orario
      const classes = db.classes.filter(c => c.school_year_id == school_year_id);
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

      const existing = db.schedule.find(s => s.teacher_id == teacher_id && s.day == day.toUpperCase() && s.hour == hour && s.school_year_id == school_year_id);
      if (existing) {
        existing.slot_type = slot_type; existing.class_id = class_id; existing.raw_value = raw_value;
      } else {
        db.schedule.push({ id: Date.now(), teacher_id, day, hour, class_id, slot_type, raw_value, school_year_id });
      }
      _save();
    },
    clearSchedule: (yearId) => {
      const db = _load();
      const yid = Number(yearId);
      db.schedule = db.schedule.filter(s => Number(s.school_year_id) !== yid);
      _save();
    },
    lockAvailability: (tid) => {
      const db = _load();
      const t = db.teachers.find(x => x.id == tid);
      if (t) {
        t.availability_locked = true;
        t.availability_submitted_at = new Date().toISOString();
        _save();
      }
      return t;
    },
    unlockAvailability: (tid) => {
      const db = _load();
      const t = db.teachers.find(x => x.id == tid);
      if (t) {
        t.availability_locked = false;
        _save();
      }
      return t;
    },

    // ── ASSENZE ──
    getAbsences: (date, yearId) => {
      const db = _load();
      const yid = Number(yearId);
      return db.absences.filter(a => 
        (!date || a.date === date) && 
        (!yid || Number(a.school_year_id) === yid)
      ).map(a => ({
        ...a, 
        teacher_name: db.teachers.find(t=>t.id == a.teacher_id)?.name || '?',
        status: a.status || 'approved'
      })).sort((a,b) => a.teacher_name.localeCompare(b.teacher_name));
    },
    addAbsence: (a, creatorId) => {
      const db = _load();
      if (!db.absences) db.absences = [];
      if (!db.notifications) db.notifications = [];

      const teachersToProcess = Array.isArray(a.teacher_id) ? a.teacher_id : [a.teacher_id];
      const results = [];

      teachersToProcess.forEach(tid => {
        // Validation for Union Leave (Permessi Sindacali)
        if (a.type === 'permessi_sindacali') {
          const stats = api.getAbsenceStats(tid, a.school_year_id);
          if (a.date_end && a.date_end !== a.date) {
              const start = new Date(a.date + 'T12:00:00');
              const end = new Date(a.date_end + 'T12:00:00');
              const total = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
              if (stats.permessi_sindacali + total > 12) throw new Error(`Limite annuale permessi sindacali (12gg) superato per docente ID ${tid}.`);
          } else {
              if (stats.permessi_sindacali + 1 > 12) throw new Error(`Limite annuale permessi sindacali (12gg) superato per docente ID ${tid}.`);
              const bimCount = stats.bimestre_sindacali || 0;
              if (bimCount + 1 > 5) throw new Error(`Limite bimestrale permessi sindacali (5gg) superato per docente ID ${tid}.`);
          }
        }

        const id = Date.now() + Math.random();
        const status = a.status || 'approved';
        const absWithId = { id, created_at: new Date().toISOString(), ...a, teacher_id: tid, status };
        db.absences.push(absWithId);
        results.push(absWithId);
        
        // Se è un permesso orario, aumenta il debito del docente
        if (a.type === 'permesso_orario' && status === 'approved') {
          const t = db.teachers.find(x => x.id == tid);
          if (t) {
            const hoursCount = (a.hours || []).length;
            t.hours_subs = (t.hours_subs || 0) + hoursCount;
          }
        }

        // Crea sempre una notifica (se creatorId è admin, la segnamo come gestita)
        db.notifications.push({
          id: id + 1,
          teacher_id: tid,
          teacher_name: db.teachers.find(t=>t.id == tid)?.name || '?',
          date: a.date,
          type: a.type || 'assenza_giornaliera',
          status: status,
          processed_by: creatorId,
          created_at: new Date().toISOString()
        });

        api._log(creatorId, 'AGGIUNTA_ASSENZA', `Docente ID: ${tid}, Tipo: ${a.type}, Data: ${a.date}`);
      });
      
      _save();
      return Array.isArray(a.teacher_id) ? results : results[0];
    },
    
    // Suggerimenti Ferie per Docenti
    getFerieSuggestions: (teacherId, date) => {
      try {
        const db = _load();
        const tid = Number(teacherId) || 0;
        if (!date) return {};
        
        const dayOfWeek = typeof getDayOfWeek === 'function' ? getDayOfWeek(date) : null;
        if (!dayOfWeek) return {};
        
        const yearId = (db.school_years || []).find(y => y.is_active)?.id || (db.school_years?.[0]?.id) || 1;
        const schedule = db.schedule || [];
        const teachers = db.teachers || [];

        // 1. Ore in cui il docente RICHIEDENTE lavora
        const mySchedule = schedule.filter(s => 
          s.teacher_id == tid && 
          s.day === dayOfWeek && 
          (s.slot_type === 'normal' || s.slot_type === 'lezione') && 
          s.school_year_id == yearId
        );
        
        const results = {};
        const hoursOfDay = [8, 9, 10, 11, 12, 13, 14, 15];
        
        hoursOfDay.forEach(h => {
          // Use findAvailable to get all candidates (including liberi, a disposizione, etc.)
          const candidates = findAvailable(db, date, h, yearId, [tid], 0);
          
          results[h] = candidates
            .filter(c => !c.isOccupied || c.isRicevimento) // Include available and ricevimento (marked)
            .map(c => ({ 
              id: c.id, 
              name: c.name, 
              type: c.statusText || 'disponibile' 
            }));
        });
        return results;
      } catch (err) {
        console.error('getFerieSuggestions Error:', err);
        return {};
      }
    },

    getAbsenceStats: (teacherId, yearId) => {
      const db = _load();
      const myAbs = db.absences.filter(a => a.teacher_id == teacherId && a.school_year_id == yearId && (a.status||'approved') === 'approved');
      
      const getUniqueDates = (type) => {
        const datesSet = new Set();
        myAbs.filter(a => a.type === type).forEach(a => {
          let curr = new Date(a.date + 'T12:00:00');
          const end = a.date_end ? new Date(a.date_end + 'T12:00:00') : curr;
          while (curr <= end) {
            datesSet.add(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
          }
        });
        return datesSet;
      };

      const sindacaliDates = getUniqueDates('permessi_sindacali');
      
      const countSindacaliBimestre = (dateStr) => {
        const targetDate = new Date(dateStr + 'T12:00:00');
        const month = targetDate.getMonth() + 1;
        const bim = Math.ceil(month / 2); 
        let count = 0;
        sindacaliDates.forEach(d => {
          const currDate = new Date(d + 'T12:00:00');
          if (Math.ceil((currDate.getMonth() + 1) / 2) === bim) {
            count++;
          }
        });
        return count;
      };


      const countAssembleeHours = () => {
        let total = 0;
        myAbs.filter(a => a.type === 'assemblea').forEach(a => {
          if (Array.isArray(a.hours) && a.hours.length > 0) {
            total += a.hours.length;
          } else {
            // Se inserita come giornaliera senza ore, contiamo forfettariamente 1 (o potremmo contare le ore di quel giorno)
            // Per ora contiamo 1 come fallback se non ci sottostanti ore
            total += 1; 
          }
        });
        return total;
      };

      return {
        ferie: getUniqueDates('ferie').size,
        formazione: getUniqueDates('formazione').size,
        permessi_giornalieri: getUniqueDates('assenza_giornaliera').size,
        concorsi: getUniqueDates('concorsi_esami').size,
        matrimonio: getUniqueDates('matrimonio').size,
        permessi_sindacali: sindacaliDates.size,
        assemblea: countAssembleeHours(),
        bimestre_sindacali: countSindacaliBimestre(new Date().toISOString().split('T')[0]),
        label_td: "Personale a tempo determinato"
      };
    },

    getTeacherStats: (teacherId, yearId) => {
      const db = _load();
      const absToday = db.absences.filter(a => a.teacher_id == teacherId && a.school_year_id == yearId && (a.status||'approved') === 'approved');
      
      const getUniqueDates = (type) => {
        const datesSet = new Set();
        absToday.filter(a => a.type === type).forEach(a => {
          let curr = new Date(a.date + 'T12:00:00');
          const end = a.date_end ? new Date(a.date_end + 'T12:00:00') : curr;
          while(curr <= end) {
            datesSet.add(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
          }
        });
        return datesSet;
      };

      return {
        malattia: getUniqueDates('assenza_giornaliera').size,
        ferie: getUniqueDates('ferie').size,
        formazione: getUniqueDates('formazione').size,
        concorsi: getUniqueDates('concorsi_esami').size,
        matrimonio: getUniqueDates('matrimonio').size,
        sindacale: getUniqueDates('permessi_sindacali').size,
        assemblea: getUniqueDates('assemblea').size,
        permessi_orari: absToday.filter(a => a.type === 'permesso_orario').reduce((sum, a) => sum + (a.hours||[]).length, 0)
      };
    },

    updateAbsenceStatus: (id, status) => {
      const db = _load();
      const abs = db.absences.find(a => a.id == id);
      if (abs) {
        const oldStatus = abs.status;
        abs.status = status;

        // Se approvato dopo essere stato pending, aggiorna debito se permesso orario
        if (status === 'approved' && oldStatus !== 'approved' && abs.type === 'permesso_orario') {
          const t = db.teachers.find(x => x.id == abs.teacher_id);
          if (t) t.hours_subs = (t.hours_subs || 0) + (abs.hours || []).length;
        }
        // Ferie, Formazione, Permessi, Matrimonio e Concorsi non richiedono recupero

        // Se l'assenza è di tipo ferie, assegniamo subito i sostituti individuati (se presenti)
        // [UPDATE]: Come richiesto, l'admin caricherà manualmente dal registro, 
        // ma manteniamo la struttura dati se servisse in futuro.

        // Se approvato ed è una "Ferie" con sostituti, crea automaticamente le sostituzioni nel registro
        if (status === 'approved' && abs.type === 'ferie' && abs.substitutes_identified) {
          const subsMap = abs.substitutes_identified; // hour -> teacherId
          const dayOfWeek = getDayOfWeek(abs.date);
          
          Object.entries(subsMap).forEach(([hour, subId]) => {
            // Trova la classe dall'orario del titolare
            const slot = db.schedule.find(s => s.teacher_id == abs.teacher_id && s.day == dayOfWeek && s.hour == hour && s.slot_type === 'normal');
            if (slot) {
              api.assignSubstitution({
                date: abs.date,
                hour: parseInt(hour),
                class_id: slot.class_id,
                absent_teacher_id: abs.teacher_id,
                substitute_teacher_id: parseInt(subId),
                sub_role: 'disposizione', // Default per ferie
                school_year_id: abs.school_year_id,
                created_by: abs.created_by
              }, null); // Nessun creatorId specifico nel log interno qui
            }
          });

          // Notifica i sostituti
          Object.values(subsMap).forEach(subId => {
            api.addNotification({
              teacher_id: subId,
              title: '🏝️ Sostituzione Concordata',
              message: `Il collega ${db.teachers.find(t=>t.id == abs.teacher_id)?.name} è in ferie il ${abs.date}. Sei stato indicato come sostituto concordato.`,
              type: 'ferie_nomination',
              ref_id: abs.id
            });
          });
        }

        _save();
        return abs;
      }
      throw new Error('Assenza non trovata');
    },
    deleteAbsence: (id) => {
      const db = _load();
      db.absences = db.absences.filter(a => String(a.id) !== String(id));
      _save();
    },

    cancelAbsence: (id, teacherId) => {
      const db = _load();
      const abs = db.absences.find(a => String(a.id) === String(id));
      if (abs && String(abs.teacher_id) === String(teacherId)) {
        const tName = db.teachers.find(t => t.id == teacherId)?.name || 'Docente';
        api.logActivity(null, 'ANNULLA_ASSENZA_DOCENTE', `Assenza del ${abs.date} annullata autonomamente da ${tName}`);
        db.absences = db.absences.filter(a => String(a.id) !== String(id));
        // Rimuoviamo anche le notifiche correlate
        db.notifications = db.notifications.filter(n => n.ref_id != id);
        _save();
        return true;
      }
      throw new Error('Assenza non trovata o non autorizzata.');
    },

    // ── USCITE DIDATTICHE ──
    getTrips: (date, yearId) => {
      const db = _load();
      return db.trips.filter(t => t.date === date && t.school_year_id == yearId).map(t => ({
        ...t,
        lead_teacher_name: db.teachers.find(x => x.id == t.lead_teacher_id)?.name || '?',
        classes: db.classes.filter(c => (t.class_ids||[]).includes(c.id)),
        companions: db.teachers.filter(x => (t.companion_ids||[]).includes(x.id))
      }));
    },
    addTrip: (t) => {
      const db = _load();
      const newT = { id: Date.now(), ...t };
      db.trips.push(newT);
      _save();
      return newT;
    },
    deleteTrip: (id) => {
      const db = _load();
      db.trips = db.trips.filter(t => t.id !== parseInt(id));
      _save();
    },

    // ── ALGORITMO SOSTITUZIONI ──
    getDailySubstitutions: (date, yearId) => {
      const db = _load();
      const dayOfWeek = getDayOfWeek(date);
      if (!dayOfWeek || !SCHOOL_HOURS[dayOfWeek]) return { slots: [], trips: [], absences: [] };

      const hours = SCHOOL_HOURS[dayOfWeek];
      const VIEW_TITLE = 'Orario Scolastico';
      const absToday = api.getAbsences(date, yearId).filter(a => a.status === 'approved');
      const tripsToday = api.getTrips(date, yearId);
      const allSubsRows = db.substitutions.filter(s => s.date === date && s.school_year_id == yearId);

      // Mappe per velocizzare
      const tripClassByHour = {};
      const tripTeacherByHour = {};
      tripsToday.forEach(t => {
        t.hours.forEach(h => {
          if (!tripClassByHour[h]) tripClassByHour[h] = new Set();
          if (!tripTeacherByHour[h]) tripTeacherByHour[h] = new Set();
          t.class_ids.forEach(cid => tripClassByHour[h].add(cid));
          tripTeacherByHour[h].add(t.lead_teacher_id);
          (t.companion_ids||[]).forEach(tid => tripTeacherByHour[h].add(tid));
        });
      });

      const slots = [];

      // Helper to identify consecutive hours
      function getConsecutiveHours(tid, currentHour) {
        const tSched = db.schedule.filter(s => s.teacher_id == tid && s.day == dayOfWeek && s.school_year_id == yearId && (s.slot_type === 'normal' || s.slot_type === 'eccedente'));
        tSched.sort((a,b) => a.hour - b.hour);
        
        let consecutive = 0;
        let maxConsecutive = 0;
        let lastHour = -1;
        
        for (const s of tSched) {
          if (lastHour === -1 || s.hour === lastHour + 1) {
            consecutive++;
          } else {
            consecutive = 1;
          }
          if (s.hour <= currentHour) {
             maxConsecutive = Math.max(maxConsecutive, consecutive);
          }
          lastHour = s.hour;
        }
        return maxConsecutive;
      }

      // 1. Assenze semplici + Ereditarietà Supplenti
      const processedAbsences = [...absToday];
      
      // Controllo se ci sono supplenti di lungo periodo attivi oggi
      const activeLT = (db.long_term_assignments || []).filter(lt => date >= lt.start_date && date <= lt.end_date);

      absToday.forEach(abs => {
        hours.forEach(h => {
          // Controlla se per questa ora il docente ha un supplente di lungo periodo
          const lt = activeLT.find(l => l.replaced_id == abs.teacher_id && (l.hours.length === 0 || l.hours.includes(h)));
          
          let effectiveTeacherId = abs.teacher_id;
          let subNote = '';
          if (lt) {
             effectiveTeacherId = lt.substitute_id;
             const subT = db.teachers.find(x=>x.id == lt.substitute_id);
             subNote = ` (In sua vece: ${subT?.name})`;
          }

          const sched = db.schedule.filter(s => s.teacher_id == abs.teacher_id && s.day == dayOfWeek && s.hour == h && s.slot_type === 'normal' && s.school_year_id == yearId);
          sched.forEach(s => {
            const cls = db.classes.find(c => c.id == s.class_id);
            const subForThis = allSubsRows.filter(x => x.hour == h && x.class_id == s.class_id && x.absent_teacher_id == abs.teacher_id);
            
            // All teachers for this slot
            const candidatesData = findAvailable(db, date, h, yearId, [abs.teacher_id], s.class_id);
            
            const allT = db.teachers.filter(t => t.school_year_id == yearId && t.is_available && t.id != abs.teacher_id).sort((a,b)=>a.name.localeCompare(b.name)).map(t => ({ id: t.id, name: t.name, type: 'fallback' }));

            slots.push({
              type: 'absence', hour: h, class_id: s.class_id, class_name: cls?.name,
              absent_teacher_id: abs.teacher_id, absent_teacher_name: abs.teacher_name,
              absence_record_id: abs.id,
              existing_substitutions: subForThis,
              candidates: {
                compresenza: [...candidatesData.filter(x => x.isCompresenza)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                compresenza_altre: [...candidatesData.filter(x => x.isCompresenzaAltraSezione)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                disposizione: [...candidatesData.filter(x => x.isDis)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                eccedente: [...candidatesData.filter(x => x.isEcc)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                oltre5ore: [...candidatesData.filter(x => x.isOltre5)].sort((a, b) => (b.priority - a.priority)).concat(allT)
              }
            });
          });
        });
      });

      // 2. Classi liberate da uscite didattiche
      hours.forEach(h => {
        const clsIds = tripClassByHour[h];
        if (!clsIds) return;
        clsIds.forEach(cid => {
          const sched = db.schedule.filter(s => s.class_id == cid && s.day == dayOfWeek && s.hour == h && s.slot_type === 'normal' && s.school_year_id == yearId);
          sched.forEach(s => {
            const isAbsent = absToday.some(a => a.teacher_id == s.teacher_id);
            const isAccompanying = tripTeacherByHour[h]?.has(s.teacher_id);
            if (isAbsent || isAccompanying) return;

            const cls = db.classes.find(c => c.id == cid);
            const subForThis = allSubsRows.filter(x => x.hour == h && x.class_id == cid && x.absent_teacher_id == s.teacher_id);
            
            const candidatesData = findAvailable(db, date, h, yearId, [s.teacher_id], cid);

            const allT = db.teachers.filter(t => t.school_year_id == yearId && t.is_available && t.id != s.teacher_id).sort((a,b)=>a.name.localeCompare(b.name)).map(t => ({ id: t.id, name: t.name, type: 'fallback' }));

            slots.push({
              type: 'freed', hour: h, class_id: cid, class_name: cls?.name,
              freed_teacher_id: s.teacher_id, freed_teacher_name: db.teachers.find(t=>t.id==s.teacher_id)?.name,
              absent_teacher_name: db.teachers.find(t=>t.id==s.teacher_id)?.name, // compatibility
              absent_teacher_id: s.teacher_id,
              existing_substitutions: subForThis,
              candidates: {
                compresenza: [...candidatesData.filter(x => x.isCompresenza)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                compresenza_altre: [...candidatesData.filter(x => x.isCompresenzaAltraSezione)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                disposizione: [...candidatesData.filter(x => x.isDis)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                eccedente: [...candidatesData.filter(x => x.isEcc)].sort((a, b) => (b.priority - a.priority)).concat(allT),
                oltre5ore: [...candidatesData.filter(x => x.isOltre5)].sort((a, b) => (b.priority - a.priority)).concat(allT)
              }
            });
          });
        });
      });

      return { date, day: dayOfWeek, slots, trips: tripsToday, absences: absToday };
    },

    clearDailyData: (date, yearId) => {
      const db = _load();
      db.absences = db.absences.filter(a => !(a.date === date && a.school_year_id == yearId));
      db.substitutions = db.substitutions.filter(s => !(s.date === date && s.school_year_id == yearId));
      db.trips = db.trips.filter(t => !(t.date === date && t.school_year_id == yearId));
      // Re-reset potentially counting hours
      db.teachers.forEach(t => {
        if (t.school_year_id == yearId) {
          // Note: resetting hours would need a full re-calculation from history
          // For now, we trust the sync on next historical action or a full recalculation.
        }
      });
      _save();
      api.logActivity(null, 'CLEAR_DAY', `Svuotato il registro per il giorno ${date}`);
      return { ok: true };
    },

    assignSubstitution: (sub, creatorId) => {
      const db = _load();
      const id = Date.now();
      const newSub = { 
        ...sub, 
        id, 
        hours_counted: 0,
        accepted: false,
        created_by: creatorId || null,
        created_at: new Date().toISOString()
      };
      
      // Calcolo se deve essere contata come ora da recuperare
      const dayOfWeek = getDayOfWeek(sub.date);
      if (sub.substitute_teacher_id) {
        const slot = db.schedule.find(s => s.teacher_id == sub.substitute_teacher_id && s.day == dayOfWeek && s.hour == sub.hour && s.school_year_id == sub.school_year_id);
        
        // Verifica se l'assenza sostituita è di tipo "Ferie"
        const associatedAbsence = db.absences.find(a => a.date === sub.date && a.teacher_id == sub.absent_teacher_id);
        const isFerie = associatedAbsence?.type === 'ferie';

        if (slot?.slot_type === 'disponibile' || isFerie) newSub.hours_counted = 1;
        else if (slot?.slot_type === 'normal') {
          const trip = db.trips.find(t => t.date === sub.date && (t.class_ids||[]).includes(slot.class_id) && t.hours.includes(sub.hour));
          if (trip) newSub.hours_counted = 1;
        }
      }

      db.substitutions.push(newSub);
      if (newSub.hours_counted && newSub.substitute_teacher_id) {
        const t = db.teachers.find(x => x.id == newSub.substitute_teacher_id);
        if (t) t.hours_subs = Math.max(0, (t.hours_subs||0) - 1);
      }

      const subName = db.teachers.find(x => x.id == newSub.substitute_teacher_id)?.name || 'N.C.';
      api.logActivity(creatorId, 'SUB_ASSIGN', `Assegnata sostituzione a ${subName} (${sub.class_id})`);
      
      // Crea Notifica automatica
      if (newSub.substitute_teacher_id) {
        api.addNotification({
          teacher_id: newSub.substitute_teacher_id,
          title: 'Nuova Sostituzione Assegnata',
          message: `Gent.le docente, ti è stata assegnata una sostituzione per il giorno ${newSub.date}, ora ${newSub.hour}ª, classe ${newSub.class_id || '—'}.`,
          type: 'sub_assignment',
          ref_id: newSub.id
        });
      }

      _save();
      return newSub;
    },

    deleteSubstitution: (id) => {
      const db = _load();
      const idx = db.substitutions.findIndex(s => s.id == id);
      if (idx !== -1) {
        const sub = db.substitutions[idx];
        if (sub.hours_counted && sub.substitute_teacher_id) {
          const t = db.teachers.find(x => x.id == sub.substitute_teacher_id);
          if (t) t.hours_subs += 1;
        }
        db.substitutions.splice(idx, 1);
        _save();
      }
    },

    acceptSubstitution: (id) => {
      const db = _load();
      const sub = db.substitutions.find(s => s.id == parseInt(id));
      if (sub) {
        sub.accepted = true;
        _save();
        return sub;
      }
      throw new Error('Sostituzione non trovata');
    },

    // Supplenti di lungo periodo
    addLongTermAssignment: (data) => {
      const db = _load();
      if (!db.long_term_assignments) db.long_term_assignments = [];
      const item = { id: Date.now(), ...data };
      db.long_term_assignments.push(item);
      _save();
      return item;
    },
    removeLongTermAssignment: (id) => {
      const db = _load();
      db.long_term_assignments = db.long_term_assignments.filter(x => x.id != id);
      _save();
    },
    getLongTermAssignments: () => {
      const db = _load();
      return db.long_term_assignments || [];
    },

    getHistory: (yearId, from, to, teacherId) => {
      const db = _load();
      return db.substitutions.filter(s => 
        s.school_year_id == yearId &&
        (!from || s.date >= from) &&
        (!to || s.date <= to) &&
        (!teacherId || s.substitute_teacher_id == teacherId || s.absent_teacher_id == teacherId)
      ).map(s => ({
        ...s,
        absent_teacher_name: db.teachers.find(t => t.id == s.absent_teacher_id)?.name || '—',
        substitute_teacher_name: db.teachers.find(t => t.id == s.substitute_teacher_id)?.name || '—',
        class_name: db.classes.find(c => c.id == s.class_id)?.name || '—'
      })).sort((a,b) => b.date.localeCompare(a.date) || a.hour - b.hour);
    },

    resetToInitial: () => {
      localStorage.removeItem('sg_supplenze_db');
      location.reload();
    },

    clearHistory: () => {
      const db = _load();
      // Refund all hours
      db.substitutions.forEach(sub => {
        if (sub.hours_counted && sub.substitute_teacher_id) {
          const t = db.teachers.find(x => x.id == sub.substitute_teacher_id);
          if (t) t.hours_subs += 1;
        }
      });
      db.substitutions = [];
      db.absences = [];
      db.trips = [];
      db.notifications = [];
      db.logs = [];
      _save();
      return true;
    },

    // Bulk send for a specific day
    bulkSendNotifications: (date, yearId, creatorId) => {
      const db = _load();
      const subs = db.substitutions.filter(s => s.date === date && s.school_year_id == yearId && s.substitute_teacher_id);
      let count = 0;
      
      subs.forEach(s => {
        // Check if already notified
        const exists = db.notifications.some(n => n.type === 'sub_assignment' && n.ref_id === s.id);
        if (!exists) {
          api.addNotification({
            teacher_id: s.substitute_teacher_id,
            title: 'Spostamento / Sostituzione Assegnata',
            message: `Gent.le docente, ti è stata assegnata una sostituzione per il giorno ${s.date}, ora ${s.hour}ª, classe ${db.classes.find(c=>c.id==s.class_id)?.name || '—'}.`,
            type: 'sub_assignment',
            ref_id: s.id
          });
          count++;
        }
      });
      
      if (count > 0) api.logActivity(creatorId, 'BULK_NOTIFY', `Inviate ${count} notifiche per il giorno ${date}`);
      _save();
      return count;
    },

    getNotifications: (teacherId) => {
      const db = _load();
      return db.notifications.filter(n => n.teacher_id == teacherId).sort((a,b) => b.created_at.localeCompare(a.created_at));
    },
    addNotification: (n) => {
      const db = _load();
      const newN = { id: Date.now() + Math.random(), created_at: new Date().toISOString(), read: false, ...n };
      db.notifications.push(newN);
      _save();
      return newN;
    },
    markNotificationRead: (id) => {
      const db = _load();
      const n = db.notifications.find(x => x.id == id);
      if (n) { n.read = true; _save(); }
    },

    // ── LOG ATTIVITÀ ──
    logActivity: (userId, action, detail) => {
      const db = _load();
      if (!db.logs) db.logs = [];
      const user = db.users.find(u => u.id == userId);
      const log = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        user_id: userId || null,
        username: user ? user.username : 'Sistema/Anonimo',
        action,
        details: detail || '', // alias 'details' for compatibility
        detail: detail || ''
      };
      db.logs.unshift(log);
      if (db.logs.length > 500) db.logs.pop();
      _save();
    },
    getActivityLog: () => _load().logs || [],

    sendEmail: (to, subject, body) => {
      console.log(`%c📧 MOCK EMAIL TO: ${to}`, 'background: #222; color: #bada55; font-weight: bold', { subject, body });
      // In a real app, this would call a backend API.
      // We can also trigger a mailto: if desired.
      return true;
    }
  };

  /* ── UTILS INTERNI ── */
  function getDatesInRange(start, end) {
    const dates = [];
    let cur = new Date(start + 'T12:00:00');
    const stop = new Date(end + 'T12:00:00');
    while (cur <= stop) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  // ── LOGICA ALGORITMO ────────────────────────────────────────────────────────
  function findAvailable(db, date, hour, yearId, excludeIds, targetClassId) {
    const day = getDayOfWeek(date);
    const excludeSet = new Set(excludeIds || []);
    
    // Absent teachers
    const absToday = db.absences.filter(a => a.date === date && a.school_year_id == yearId && (a.status||'approved') === 'approved');
    const absIds = new Set(absToday.map(a => a.teacher_id));
    
    // Teachers already assigned to substitutions this hour
    const assignedIds = new Set(db.substitutions.filter(s => s.date === date && s.hour == hour && s.substitute_teacher_id).map(s => s.substitute_teacher_id));

    // Teachers on trip
    const trips = db.trips.filter(t => t.date === date && t.hours.includes(hour) && t.school_year_id == yearId);
    const teachersOnTrip = new Set();
    trips.forEach(t => {
      teachersOnTrip.add(t.lead_teacher_id);
      (t.companion_ids||[]).forEach(tid => teachersOnTrip.add(tid));
    });

    const teachers = db.teachers.filter(t => t.school_year_id == yearId && t.is_available);
    const results = [];

    teachers.forEach(t => {
      if (excludeSet.has(t.id)) return; // Strictly exclude the absent teacher of this slot

      const tSched = db.schedule.filter(s => s.teacher_id == t.id && s.day == day && s.school_year_id == yearId);
      const slot = tSched.find(s => s.hour == hour);
      
      const isAbsent = absIds.has(t.id);
      const isAssigned = assignedIds.has(t.id);
      const isOnTrip = teachersOnTrip.has(t.id);
      const isRicevimento = slot?.slot_type === 'ricevimento';
      const isOccupied = isAbsent || isAssigned || isOnTrip;

      // Calculate status/metadata
      const hoursDebt = (t.hours_subs || 0) + (t.hours_trips || 0);
      const isFree = !slot;
      const isDis = (isFree || slot?.slot_type === 'disponibile' || slot?.slot_type === 'potenziamento' || hoursDebt > 0) && (!slot || slot.slot_type !== 'normal');
      const isEcc = slot?.slot_type === 'eccedente';
      const isCompresenza = slot?.slot_type === 'normal' && slot.class_id == targetClassId;
      const isCompresenzaAltraSezione = slot?.slot_type === 'normal' && slot.class_id != targetClassId;
      
      const hoursToday = tSched.filter(s => s.slot_type === 'normal' || s.slot_type === 'eccedente');
      const hasHoursToday = hoursToday.length > 0;
      
      let entersAt = null;
      if (hasHoursToday) {
        entersAt = Math.min(...hoursToday.map(s => s.hour));
      }
      
      const alreadyAtSchool = hasHoursToday && entersAt <= hour;
      const notYetInService = hasHoursToday && entersAt > hour;
      
      // 5 consecutive hours check
      let isOltre5 = false;
      if (hasHoursToday) {
        let consecutive = 0;
        let lastH = -1;
        const sortedToday = hoursToday.sort((a,b) => a.hour - b.hour);
        for(const s of sortedToday) {
          if (lastH === -1 || s.hour === lastH + 1) consecutive++; else consecutive = 1;
          if (s.hour <= hour) {
            if (consecutive >= 5) isOltre5 = true;
          }
          lastH = s.hour;
        }
      }

      // Priority calculation (Global sort)
      let priority = 0;
      if (!isOccupied) {
        if (alreadyAtSchool && (isFree || slot?.slot_type === 'disponibile' || slot?.slot_type === 'empty' || slot?.slot_type === 'asterisco' || slot?.slot_type === 'ricevimento')) {
           priority += 100;
        }
        if (alreadyAtSchool && (isCompresenza || isCompresenzaAltraSezione)) {
           priority += 100;
        }
        priority += hoursDebt * 50; // Massima priorità a chi ha debito orario
        if (slot?.slot_type === 'disponibile' || slot?.slot_type === 'potenziamento') priority += 80; 
        if (isOltre5) priority -= 100; // Evita fortemente le oltre 5 ore consecutive
      } else {
        priority -= 1000; // Put occupied at the bottom
      }

      // Formatting status text
      let statusText = "Libero";
      if (!hasHoursToday) statusText = "Non in servizio oggi";
      else if (notYetInService) statusText = `Entra alle ${entersAt}ª ora`;
      else if (isOccupied) {
        if (isAbsent) statusText = "Assente";
        else if (isAssigned) statusText = "Già in sostituzione";
        else if (isOnTrip) statusText = "In uscita didattica";
        else if (isRicevimento) statusText = "Impegnato in ricevimento";
      } else {
        if (isDis) statusText = "A disposizione";
        else if (isEcc) statusText = "Eccedente";
        else if (isCompresenza) statusText = "In compresenza";
      }
      
      let badges = [];
      if (hoursDebt > 0) badges.push(`Recupero: ${hoursDebt}h`);
      if (isOltre5) badges.push(`⚠️ >5 ore`);
      if (badges.length > 0) statusText += ` (${badges.join(', ')})`;

      results.push({
        id: t.id, name: t.name, priority, statusText,
        isOccupied, isFree, isDis, isEcc, isCompresenza, isCompresenzaAltraSezione, isOltre5, isRicevimento, entersAt,
        debt: hoursDebt
      });
    });
    return results;
  };

  return api;
})();

