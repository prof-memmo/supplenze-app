/**
 * SEED_COMPLEX_DATA.JS
 * Versione 4.0: Supporto Firebase Firestore Cloud & Local Sync.
 * Popola classi, docenti, orari e assenze per l'anno scolastico selezionato.
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
    const targetYearId = Number(yearId || 1);
    console.log('[SEED] Inizio popolamento per anno:', targetYearId);

    // Calcolo data feriale di prova (Lunedì se weekend)
    const targetD = new Date();
    if (targetD.getDay() === 0) targetD.setDate(targetD.getDate() + 1); // Domenica -> Lunedì
    else if (targetD.getDay() === 6) targetD.setDate(targetD.getDate() + 2); // Sabato -> Lunedì
    const testDate = targetD.toISOString().slice(0, 10);

    // 1. Dati in memoria
    const classes = [];
    const classIds = [];
    SECTIONS.forEach(sec => {
      [1, 2, 3].forEach(grade => {
        const name = `${grade}${sec}`;
        const id = 1000 + classIds.length;
        classes.push({ id, name, school_year_id: targetYearId });
        classIds.push(id);
      });
    });

    const teachers = NAMES.map((name, i) => {
      const id = 500 + i;
      return {
        id, name,
        subject: SUBJECTS[i % SUBJECTS.length],
        assigned_classes: 'Tutte',
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@scuola.it`,
        school_year_id: targetYearId,
        hours_subs: 10, hours_trips: 0, is_available: 1
      };
    });

    const schedule = [];
    teachers.forEach((t, i) => {
      DAYS.forEach(day => {
        if (i < 2) {
          for (let h = 8; h <= 13; h++) {
            schedule.push({
              id: 2000 + schedule.length, teacher_id: t.id, day,
              hour: h, class_id: classIds[h % classIds.length], slot_type: 'normal', raw_value: 'OK', school_year_id: targetYearId
            });
          }
        } else {
          const h = 8 + ((i + DAYS.indexOf(day)) % 6);
          schedule.push({
            id: 2000 + schedule.length, teacher_id: t.id, day,
            hour: h, class_id: classIds[i % classIds.length], slot_type: 'normal', raw_value: 'OK', school_year_id: targetYearId
          });
          if (i % 3 === 0) {
            schedule.push({
              id: 2010 + schedule.length, teacher_id: t.id, day,
              hour: (h + 1) > 13 ? 8 : (h + 1), class_id: null, slot_type: 'disponibile', raw_value: 'DIS', school_year_id: targetYearId
            });
          }
        }
      });
    });

    const absences = [teachers[0], teachers[1]].map((t, idx) => ({
      id: Date.now() + idx,
      teacher_id: t.id,
      teacher_name: t.name,
      date: testDate,
      type: 'assenza_giornaliera',
      status: 'approved',
      school_year_id: targetYearId
    }));

    // 2. Salvataggio su Firestore (se Firebase è inizializzato)
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      try {
        const fdb = firebase.firestore();
        
        // Pulizia vecchi dati dell'anno
        const collectionsToClear = ['teachers', 'classes', 'schedule', 'absences', 'substitutions'];
        for (const col of collectionsToClear) {
          const snap = await fdb.collection(col).where('school_year_id', '==', targetYearId).get();
          if (!snap.empty) {
            let batch = fdb.batch();
            let count = 0;
            for (const doc of snap.docs) {
              batch.delete(doc.ref);
              count++;
              if (count >= 400) { await batch.commit(); batch = fdb.batch(); count = 0; }
            }
            if (count > 0) await batch.commit();
          }
        }

        // Inserimento nuovi dati in batch
        const insertBatch = async (colName, items) => {
          let b = fdb.batch();
          let c = 0;
          for (const it of items) {
            const docRef = fdb.collection(colName).doc(String(it.id));
            b.set(docRef, it);
            c++;
            if (c >= 400) { await b.commit(); b = fdb.batch(); c = 0; }
          }
          if (c > 0) await b.commit();
        };

        await insertBatch('classes', classes);
        await insertBatch('teachers', teachers);
        await insertBatch('schedule', schedule);
        await insertBatch('absences', absences);

        console.log('[SEED] Firestore sincronizzato con successo.');
      } catch (err) {
        console.error('[SEED] Errore salvataggio Firestore:', err);
      }
    }

    // 3. Salvataggio fallback in localStorage per compatibilità offline
    try {
      let localDb = {};
      try { localDb = JSON.parse(localStorage.getItem('sg_supplenze_db')) || {}; } catch(e) {}
      localDb.classes = [...(localDb.classes || []).filter(c => Number(c.school_year_id) !== targetYearId), ...classes];
      localDb.teachers = [...(localDb.teachers || []).filter(t => Number(t.school_year_id) !== targetYearId), ...teachers];
      localDb.schedule = [...(localDb.schedule || []).filter(s => Number(s.school_year_id) !== targetYearId), ...schedule];
      localDb.absences = [...(localDb.absences || []).filter(a => Number(a.school_year_id) !== targetYearId), ...absences];
      localDb.substitutions = (localDb.substitutions || []).filter(s => Number(s.school_year_id) !== targetYearId);
      localStorage.setItem('sg_supplenze_db', JSON.stringify(localDb));
    } catch(e) {}

    return {
      ok: true,
      testDate,
      message: `Scenario demo caricato con successo (15 docenti, classi e orari). Registro impostato sul giorno ${fmtDate(testDate)}.`
    };
  }

  return { run };
})();
