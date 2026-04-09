/**
 * SEED_COMPLEX_DATA.JS
 * Versione 3.0: Massima Stabilità. Popola classi, docenti e assenze per l'anno attivo.
 */
const SeedData = (() => {
  const NAMES = [
    'MARIO ROSSI', 'ANNA BIANCHI', 'LUIGI VERDI', 'ELENA NERI', 'GIUSEPPE RUSSO',
    'LAURA FRANCHI', 'MARCO COSTA', 'GIOVANNA GALLI', 'PAOLO RIZZI', 'SILVIA MORI',
    'ROBERTO FERRARI', 'FRANCESCA GRECO', 'STEFANO BRUNI', 'MONICA LOMBARDI', 'ALESSANDRO SERRA'
  ];
  const SUBJECTS = ['MATEMATICA', 'LETTERE', 'INGLESE', 'ARTE', 'ED. FISICA', 'STORIA', 'SCIENZE', 'TECNOLOGIA', 'MUSICA', 'RELIGIONE'];
  const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
  const DAYS = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI'];

  async function run(yearId) {
    console.log('[SEED] Inizio popolamento per anno:', yearId);
    let db = Engine._load();
    
    // Normalizziamo l'ID anno
    const targetYearId = Number(yearId || (db.school_years.find(y => y.is_active)?.id || 1));
    
    // 1. Pulizia totale dati per l'anno target
    db.teachers = db.teachers.filter(t => Number(t.school_year_id) !== targetYearId);
    db.schedule = db.schedule.filter(s => Number(s.school_year_id) !== targetYearId);
    db.classes = db.classes.filter(c => Number(c.school_year_id) !== targetYearId);
    db.absences = db.absences.filter(a => Number(a.school_year_id) !== targetYearId);
    db.trips = db.trips.filter(t => Number(t.school_year_id) !== targetYearId);
    db.substitutions = db.substitutions.filter(s => Number(s.school_year_id) !== targetYearId);

    // 2. Creazione 15 Classi (1A - 3E)
    const classIds = [];
    SECTIONS.forEach(sec => {
      [1,2,3].forEach(grade => {
        const name = `${grade}${sec}`;
        const id = 1000 + classIds.length;
        db.classes.push({ id, name, school_year_id: targetYearId });
        classIds.push(id);
      });
    });

    // 3. Creazione 15 Docenti
    const teachers = NAMES.map((name, i) => {
      const id = 500 + i;
      const t = {
        id, name, 
        subject: SUBJECTS[i % SUBJECTS.length],
        assigned_classes: 'Tutte',
        email: `${name.toLowerCase().replace(' ', '.')}@scuola.it`,
        school_year_id: targetYearId,
        hours_subs: 10, hours_trips: 0, is_available: 1
      };
      db.teachers.push(t);
      return t;
    });

    // 4. Creazione Orario Settimanale Completo
    teachers.forEach((t, i) => {
      DAYS.forEach(day => {
        // Teacher 0 e 1 hanno orario pieno
        if (i < 2) {
          for (let h = 8; h <= 13; h++) {
            db.schedule.push({ 
              id: 2000 + db.schedule.length, teacher_id: t.id, day, 
              hour: h, class_id: classIds[h % classIds.length], slot_type: 'normal', raw_value: 'OK', school_year_id: targetYearId 
            });
          }
        } else {
          // Gli altri hanno un orario sparso
          const h = 8 + ((i + DAYS.indexOf(day)) % 6);
          db.schedule.push({ 
            id: 2000 + db.schedule.length, teacher_id: t.id, day, 
            hour: h, class_id: classIds[i % classIds.length], slot_type: 'normal', raw_value: 'OK', school_year_id: targetYearId 
          });
          // Alcune ore a disposizione
          if (i % 3 === 0) {
            db.schedule.push({ 
              id: 2010 + db.schedule.length, teacher_id: t.id, day, 
              hour: (h + 1) > 13 ? 8 : (h + 1), class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: targetYearId 
            });
          }
        }
      });
    });

    // 5. Aggiunta Assenze per la DATA ODIERNA reale
    const today = new Date().toISOString().slice(0, 10);
    [teachers[0], teachers[1]].forEach((t, idx) => {
       db.absences.push({
         id: Date.now() + idx, 
         teacher_id: t.id, 
         teacher_name: t.name,
         date: today, 
         type: 'assenza_giornaliera', 
         status: 'approved', 
         school_year_id: targetYearId
       });
    });

    localStorage.setItem('sg_supplenze_db', JSON.stringify(db));
    console.log('[SEED] Completato. Classi:', db.classes.filter(c => c.school_year_id === targetYearId).length);
    return { 
      ok: true, 
      message: `Dati caricati con successo per l'anno ${targetYearId}. Sguardo al Registro in data ${today} per vedere i docenti assenti.` 
    };
  }

  return { run };
})();
