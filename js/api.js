/**
 * API.JS — Mapper tra le chiamate REST e l'Engine locale.
 * Permette alle viste di funzionare senza modifiche massicce.
 */
const API = (() => {
  let _token = localStorage.getItem('sg_token') || 'local-session-active';

  function setToken(t) {
    _token = t;
    if (t) localStorage.setItem('sg_token', t);
    else localStorage.removeItem('sg_token');
  }

  function getToken() { return _token; }

  // Simulazione chiamate asincrone per mantenere la compatibilità con await
  async function request(method, path, data) {
    console.log(`[API MOCK] ${method} ${path}`, data);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // --- AUTH ---
          if (path === '/auth/login') { 
            try {
              const result = Engine.login(data.username, data.password);
              localStorage.setItem('sg_user', JSON.stringify(result.user));
              resolve(result);
            } catch(e) { reject(e); }
            return; 
          }
          if (path === '/auth/login-google') {
            try {
              const result = Engine.loginWithGoogle(data.email, data.name);
              localStorage.setItem('sg_user', JSON.stringify(result.user));
              resolve(result);
            } catch(e) { reject(e); }
            return;
          }
          if (path === '/auth/register') { 
            resolve(Engine.register(data));
            return;
          }
          if (path === '/auth/me') { 
            const saved = localStorage.getItem('sg_user');
            if (saved) { resolve(JSON.parse(saved)); return; }
            reject(new Error('Non autenticato')); return;
          }
          if (path === '/debug/db') { resolve(Engine._load()); return; }

          // --- SETTINGS ---
          if (path === '/settings/years') { resolve(Engine.getYears()); return; }
          if (path.startsWith('/settings/years/') && method === 'PUT') { resolve(Engine.activateYear(path.split('/')[3])); return; }
          if (path.startsWith('/settings/classes') && method === 'GET') { resolve(Engine.getClasses(new URLSearchParams(path.split('?')[1]).get('year_id'))); return; }
          if (path === '/settings/classes' && method === 'POST') { resolve(Engine.addClass(data)); return; }
          if (path === '/settings/classes/bulk' && method === 'POST') { data.names.forEach(n => Engine.addClass({ name: n, school_year_id: data.school_year_id })); resolve({ ok: true }); return; }
          if (path.startsWith('/settings/classes/') && method === 'DELETE') { resolve(Engine.deleteClass(path.split('/')[3])); return; }
          
          if (path === '/settings/users' && method === 'GET') { resolve(Engine.getUsers()); return; }
          if (path === '/settings/users' && method === 'POST') { resolve(Engine.addUser(data)); return; }
          if (path.startsWith('/settings/users/') && method === 'PUT') { resolve(Engine.updateUser(path.split('/')[3], data)); return; }
          if (path.startsWith('/settings/users/') && method === 'DELETE') { resolve(Engine.deleteUser(path.split('/')[3])); return; }
          if (path === '/settings/log') { resolve(Engine.getActivityLog()); return; }

          if (path.startsWith('/settings/stats')) {
            const sp = new URLSearchParams(path.split('?')[1]);
            const yid = sp.get('year_id');
            const teachers = Engine.getTeachers(yid);
            const classes = Engine.getClasses(yid);
            const subs = Engine.getHistory(yid);
            resolve({
              totalTeachers: teachers.length, totalClasses: classes.length,
              totalAbsences: 0, totalSubs: subs.length, totalTrips: 0
            });
            return;
          }

          // --- SUGGESTIONS & STATS (Must be before general /teachers and /absences) ---
          if (path.startsWith('/teachers/suggestions/ferie') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getFerieSuggestions(sp.get('teacher_id'), sp.get('date')));
            return;
          }
          if (path.startsWith('/absences/stats') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getAbsenceStats(sp.get('teacher_id'), sp.get('year_id')));
            return;
          }

          // --- TEACHERS ---
          if (path.startsWith('/teachers') && method === 'GET') { resolve(Engine.getTeachers(new URLSearchParams(path.split('?')[1]).get('year_id'))); return; }
          if (path === '/teachers' && method === 'POST') { resolve(Engine.addTeacher(data)); return; }
          if (path.startsWith('/teachers/') && method === 'PUT') { resolve(Engine.updateTeacher(path.split('/')[2], data)); return; }
          if (path.startsWith('/teachers/') && path.includes('/lock') && method === 'PUT') { resolve(Engine.lockAvailability(path.split('/')[2])); return; }
          if (path.startsWith('/teachers/') && path.includes('/unlock') && method === 'PUT') { resolve(Engine.unlockAvailability(path.split('/')[2])); return; }
          if (path.startsWith('/teachers/') && method === 'DELETE') { resolve(Engine.deleteTeacher(path.split('/')[2])); return; }
          if (path.includes('/hours') && method === 'PATCH') { resolve(Engine.adjustHours(path.split('/')[2], data.delta, data.type)); return; }

          // --- SCHEDULE ---
          if (path.startsWith('/schedule') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getSchedule(sp.get('year_id'), sp.get('teacher_id')));
            return;
          }
          if (path === '/schedule/slot' && method === 'PUT') { resolve(Engine.updateSlot(data)); return; }
          if (path.startsWith('/schedule/all') && method === 'DELETE') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.clearSchedule(sp.get('year_id')));
            return;
          }

          // --- ABSENCES & TRIPS ---
          if (path.startsWith('/absences') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getAbsences(sp.get('date'), sp.get('year_id')));
            return;
          }
          if (path === '/absences' && method === 'POST') { 
            const user = JSON.parse(localStorage.getItem('sg_user') || '{}');
            resolve(Engine.addAbsence(data, user.username || 'Admin')); 
            return; 
          }
          if (path.startsWith('/absences/') && path.endsWith('/status') && method === 'PATCH') {
            resolve(Engine.updateAbsenceStatus(path.split('/')[2], data.status));
            return;
          }
           if (path.startsWith('/absences/teacher-cancel/') && method === 'DELETE') {
             const user = JSON.parse(localStorage.getItem('sg_user') || '{}');
             const teacherId = user?.teacher_id;
             const id = path.split('/')[3];
             resolve(Engine.cancelAbsence(id, teacherId));
             return;
           }
           if (path.startsWith('/absences/') && method === 'DELETE') { resolve(Engine.deleteAbsence(path.split('/')[2])); return; }

          if (path.startsWith('/trips') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getTrips(sp.get('date'), sp.get('year_id')));
            return;
          }
          if (path === '/trips' && method === 'POST') { 
            const user = JSON.parse(localStorage.getItem('sg_user') || '{}');
            resolve(Engine.addTrip(data, user.username || 'Admin')); 
            return; 
          }
          if (path.startsWith('/trips/') && method === 'DELETE') { resolve(Engine.deleteTrip(path.split('/')[2])); return; }

          // --- SUBSTITUTIONS ---
          if (path.startsWith('/substitutions/daily') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getDailySubstitutions(sp.get('date'), sp.get('year_id')));
            return;
          }
          if (path.startsWith('/substitutions/daily') && method === 'DELETE') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.clearDailyData(sp.get('date'), sp.get('year_id')));
            return;
          }
          if (path === '/substitutions/assign' && method === 'POST') { resolve(Engine.assignSubstitution(data)); return; }
          if (path.startsWith('/substitutions/history') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getHistory(sp.get('year_id'), sp.get('from'), sp.get('to'), sp.get('teacher_id')));
            return;
          }
          if (path.startsWith('/substitutions/') && path.endsWith('/accept') && method === 'PATCH') { resolve(Engine.acceptSubstitution(path.split('/')[2])); return; }
          if (path.startsWith('/substitutions/') && method === 'DELETE') { resolve(Engine.deleteSubstitution(path.split('/')[2])); return; }

          // --- NOTIFICHES ---
          if (path === '/notifications/bulk' && method === 'POST') {
            resolve(Engine.bulkSendNotifications(data.date, data.year_id, data.creatorId));
            return;
          }
          if (path.startsWith('/notifications') && method === 'GET') {
            const sp = new URLSearchParams(path.split('?')[1]);
            resolve(Engine.getNotifications(sp.get('teacher_id')));
            return;
          }
          if (path.startsWith('/notifications/') && path.endsWith('/read') && method === 'POST') {
            resolve(Engine.markNotificationRead(path.split('/')[2]));
            return;
          }

          // --- LONG TERM ASSIGNMENTS ---
          if ((path === '/long-term-assignments' || path.startsWith('/long-term-assignments?')) && method === 'GET') { resolve(Engine.getLongTermAssignments()); return; }
          if (path === '/long-term-assignments' && method === 'POST') { resolve(Engine.addLongTermAssignment(data)); return; }
          const ltMatch = path.match(/^\/long-term-assignments\/([^\/?]+)/);
          if (ltMatch && method === 'DELETE') { resolve(Engine.removeLongTermAssignment(ltMatch[1])); return; }

          if (path === '/settings/clear-history' && method === 'POST') { resolve(Engine.clearHistory()); return; }
          if (path === '/settings/reset' && method === 'POST') { resolve(Engine.resetToInitial()); return; }
          reject(new Error(`Percorso non gestito: ${path}`));
        } catch (err) {
          reject(err);
        }
      }, 50); // Piccolo delay per simulare la rete
    });
  }

  return {
    setToken, getToken,
    get   : (p)    => request('GET',    p),
    post  : (p, d) => request('POST',   p, d),
    put   : (p, d) => request('PUT',    p, d),
    patch : (p, d) => request('PATCH',  p, d),
    del   : (p)    => request('DELETE', p),
  };
})();
