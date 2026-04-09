// ══════════════════════════════════
// ABSENCES VIEW — Assenze & Uscite Didattiche
// ══════════════════════════════════
var AbsencesView = (() => {
  let _date, _yearId, _teachers=[], _classes=[];

  async function render(container, state) {
    _yearId = state.yearId;
    _date = todayISO();
    if (!_yearId) { container.innerHTML='<div class="empty-state"><h3>Seleziona un anno scolastico</h3></div>'; return; }

    container.innerHTML = `
      <div class="page-header"><div class="page-title">🚫 Assenze &amp; Uscite Didattiche</div><div class="page-subtitle">Gestisci le assenze del giorno e le uscite con classi</div></div>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="btn-group" style="margin-right:12px">
            <button class="btn btn-sm btn-ghost" id="abs-prev-day" title="Giorno precedente">◀</button>
            <button class="btn btn-sm btn-ghost" id="abs-next-day" title="Giorno successivo">▶</button>
          </div>
          <input type="date" class="date-input" id="abs-date" value="${_date}"/>
          <span id="abs-day-label" style="color:var(--text-secondary);font-size:13px"></span>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-danger" id="add-absence-btn">+ Aggiungi Assenza</button>
          <button class="btn btn-primary" id="add-trip-btn">🚌 Aggiungi Uscita</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" id="abs-content">
        <div class="loading-overlay"><div class="spinner"></div></div>
      </div>`;

    try {
      [_teachers, _classes] = await Promise.all([
        API.get(`/teachers?year_id=${_yearId}`),
        API.get(`/settings/classes?year_id=${_yearId}`)
      ]);
    } catch(e) { APP.toast(e.message,'error'); }

    container.querySelector('#abs-date').onchange = e => { _date=e.target.value; updateDayLabel(); loadData(); };
    container.querySelector('#abs-prev-day').onclick = () => {
      const d = new Date(_date + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      _date = d.toISOString().slice(0, 10);
      container.querySelector('#abs-date').value = _date;
      updateDayLabel(); loadData();
    };
    container.querySelector('#abs-next-day').onclick = () => {
      const d = new Date(_date + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      _date = d.toISOString().slice(0, 10);
      container.querySelector('#abs-date').value = _date;
      updateDayLabel(); loadData();
    };
    container.querySelector('#add-absence-btn').onclick = () => openAbsenceModal();
    container.querySelector('#add-trip-btn').onclick = () => openTripModal();
    updateDayLabel();
    await loadData();
  }

  function updateDayLabel() {
    const el = document.getElementById('abs-day-label');
    if (el && _date) el.textContent = getDayName(_date);
  }

  async function loadData() {
    const content = document.getElementById('abs-content');
    if (!content) return;
    content.innerHTML = '<div class="loading-overlay" style="grid-column:1/-1"><div class="spinner"></div></div>';
    try {
      const [absences, trips] = await Promise.all([
        API.get(`/absences?date=${_date}&year_id=${_yearId}`),
        API.get(`/trips?date=${_date}&year_id=${_yearId}`)
      ]);
      content.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div><div class="card-title">🚫 Assenze (${absences.length})</div></div>
            <button class="btn btn-danger btn-sm" onclick="AbsencesView.openAbsenceModal()">+ Aggiungi</button>
          </div>
          ${renderAbsences(absences)}
        </div>
        <div class="card">
          <div class="card-header">
            <div><div class="card-title">🚌 Uscite Didattiche (${trips.length})</div></div>
            <button class="btn btn-primary btn-sm" onclick="AbsencesView.openTripModal()">+ Aggiungi</button>
          </div>
          ${renderTrips(trips)}
        </div>`;
    } catch(e) { 
      content.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; padding:40px">
          <div class="icon">⚠️</div>
          <h3>Errore nel caricamento</h3>
          <p style="color:var(--text-secondary); margin-bottom:16px">${e.message}</p>
          <button class="btn btn-primary" onclick="AbsencesView.loadData()">Riprova</button>
        </div>`; 
    }
  }

  function renderAbsences(list) {
    if (!list.length) return '<div class="empty-state" style="padding:24px"><div class="icon">✅</div><div style="font-weight:600">Nessuna assenza</div><div style="font-size:12px;color:var(--text-secondary)">Tutti i docenti sono presenti</div></div>';
    return `<div class="abs-list" style="padding:12px; display:flex; flex-direction:column; gap:8px">
      ${list.map(a => `
        <div class="abs-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border); ${a.status === 'pending' ? 'border-left:4px solid var(--warning-text)' : ''}">
          <div style="flex:1">
            <div style="font-weight:700; font-size:14px; margin-bottom:2px">${escHtml(a.teacher_name)}</div>
            <div style="font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px">
              ${a.reason ? `<span title="Motivo">${escHtml(a.reason)}</span>` : '<span style="font-style:italic">Nessun motivo specificato</span>'}
              <span class="badge ${a.status === 'approved' ? 'badge-success' : 'badge-warning'}" style="font-size:10px; padding:2px 6px">
                ${a.status === 'approved' ? 'Approvata' : 'In attesa'}
              </span>
            </div>
          </div>
          <div style="display:flex; gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="APP.printAbsence(${JSON.stringify(a).replace(/"/g, '&quot;')})" style="width:32px; height:32px; padding:0; border-radius:8px" title="Stampa">🖨️</button>
            ${a.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="AbsencesView.approveAbsence(${a.id})" style="width:32px; height:32px; padding:0; border-radius:8px">✅</button>` : ''}
            <button class="btn btn-ghost btn-sm text-danger" onclick="AbsencesView.deleteAbsence(${a.id})" style="width:32px; height:32px; padding:0; border-radius:8px">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`;
  }

  function renderTrips(list) {
    if (!list.length) return '<div class="empty-state" style="padding:24px"><div class="icon">🏘️</div><div style="font-weight:600">Nessuna uscita</div><div style="font-size:12px;color:var(--text-secondary)">Non ci sono classi fuori sede</div></div>';
    return `<div class="trip-list" style="padding:12px; display:flex; flex-direction:column; gap:10px">
      ${list.map(t => `
        <div class="trip-card" style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:12px; padding:12px; border-left:4px solid var(--accent)">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px">
            <div style="font-weight:800; font-size:14px; color:var(--accent)">🚌 Classi: ${t.classes.map(c=>c.name).join(', ')}</div>
            <div style="display:flex; gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="AbsencesView.openTripModal(${t.id})" style="width:28px; height:28px; padding:0">✏️</button>
              <button class="btn btn-ghost btn-sm text-danger" onclick="AbsencesView.deleteTrip(${t.id})" style="width:28px; height:28px; padding:0">🗑️</button>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
            <div style="font-size:11px; color:var(--text-secondary)">Docente: <strong style="color:var(--text-primary)">${escHtml(t.lead_teacher_name)}</strong></div>
            <div style="font-size:11px; color:var(--text-secondary)">Ore: <strong style="color:var(--text-primary)">${t.hours.map(h => h + 'ª').join(', ')}</strong></div>
            ${t.companions.length ? `<div style="font-size:11px; color:var(--text-secondary); grid-column:span 2">Accompagnatori: <strong style="color:var(--text-primary)">${t.companions.map(c=>c.name.split(' ')[0]).join(', ')}</strong></div>` : ''}
          </div>
          ${t.notes ? `<div style="font-size:11px; color:var(--text-secondary); margin-top:6px; padding-top:6px; border-top:1px dashed var(--border)">Nota: ${escHtml(t.notes)}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function openAbsenceModal() {
    const ov = APP.modal({
      title: 'Registra Assenza',
      body: `
        <div class="form-group"><label>Docente *</label>
          <select id="ab-teacher" placeholder="Cerca docente..."><option value="">– Seleziona –</option>${_teachers.map(t=>`<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tipo Assenza *</label>
          <select id="ab-type" class="form-control">
            <option value="assenza_giornaliera">Assenza Giornaliera (Malattia/Permesso)</option>
            <option value="permesso_orario">Permesso Orario</option>
            <option value="ferie">Ferie</option>
            <option value="formazione">Formazione</option>
            <option value="permessi_sindacali">Permessi Sindacali</option>
            <option value="assemblea">Assemblea</option>
            <option value="concorsi_esami">Concorsi / Esami</option>
            <option value="matrimonio">Matrimonio</option>
          </select>
        </div>
        <div class="form-group"><label>Motivo</label><input type="text" id="ab-reason" placeholder="Dettagli aggiuntivi..."/></div>`,

      footer: `<button class="btn btn-secondary" id="ab-cancel">Annulla</button><button class="btn btn-danger" id="ab-save">Registra Assenza</button>`
    });
    
    // TomSelect initialization (Enabled create: true to allow typing names)
    const tsTeacher = new TomSelect(ov.querySelector('#ab-teacher'), { 
      plugins: ['remove_button'], 
      create: true,
      createFilter: (input) => input.length >= 2,
      render: {
        option_create: (data, escape) => `<div class="create">➕ Aggiungi nuovo docente: <strong>${escape(data.input)}</strong></div>`
      }
    });

    ov.querySelector('#ab-cancel').onclick = () => ov.remove();
    ov.querySelector('#ab-save').onclick = async () => {
      let tid = tsTeacher.getValue();
      if (!tid) { APP.toast('Seleziona o scrivi un docente','error'); return; }

      // Se tid non è un numero, è un nuovo nome: creiamo il docente al volo
      if (isNaN(parseInt(tid))) {
        try {
          const newT = await API.post('/teachers', { 
            name: tid.toUpperCase(),
            subject: 'DA DEFINIRE',
            school_year_id: _yearId,
            is_available: true
          });
          tid = newT.id;
          _teachers.push(newT); // Aggiorna lista locale
        } catch(e) { APP.toast('Errore creazione docente: ' + e.message, 'error'); return; }
      }

      try {
        await API.post('/absences', { 
          date: _date, 
          teacher_id: parseInt(tid), 
          type: ov.querySelector('#ab-type').value,
          reason: ov.querySelector('#ab-reason').value, 
          school_year_id: _yearId 
        });
        ov.remove(); loadData(); APP.toast('Assenza registrata','success');
      } catch(e) { APP.toast(e.message,'error'); }
    };
  }

  async function deleteAbsence(id) {
    if (!await APP.confirm('Eliminare questa assenza?')) return;
    try { await API.del(`/absences/${id}`); loadData(); APP.toast('Assenza eliminata','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  async function approveAbsence(id) {
    try {
      await API.patch(`/absences/${id}/status`, { status: 'approved' });
      loadData();
      APP.toast('Assenza approvata','success');
    } catch(e) { APP.toast(e.message,'error'); }
  }

  function openTripModal(tripId) {
    const t = tripId ? null : null; // Logic to load trip if editing skipped for brevity or should be implemented
    
    const ov = APP.modal({
      title: tripId ? 'Modifica Uscita Didattica' : '🚌 Nuova Uscita Didattica',
      size : 'modal-lg',
      body : `
        <div class="form-group"><label>Docente Referente *</label>
          <select id="tr-lead" placeholder="Cerca referente..."><option value="">– Seleziona –</option>${_teachers.map(t=>`<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Classi coinvolte *</label>
          <select id="tr-classes" multiple placeholder="Seleziona classi...">${_classes.map(c=>`<option value="${c.id}">${escHtml(c.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Ore coinvolte *</label>
          <div id="tr-hours-wrap" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            ${[8,9,10,11,12,13,14,15].map(h=>`
              <label class="hour-chip" style="display:flex;align-items:center;gap:6px;cursor:pointer;background:var(--bg-secondary);padding:6px 10px;border-radius:8px;border:1px solid var(--border);font-size:12px;font-weight:600">
                <input type="checkbox" value="${h}" style="width:auto; cursor:pointer"/> ${h-7}ª ora
              </label>`).join('')}
          </div>
        </div>
        <div class="form-group"><label>Docenti Accompagnatori</label>
          <select id="tr-companions" multiple placeholder="Cerca accompagnatori...">${_teachers.map(t=>`<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Note</label><textarea id="tr-notes" placeholder="Dettagli dell'uscita..."></textarea></div>`,
      footer: `<button class="btn btn-secondary" id="tr-cancel">Annulla</button><button class="btn btn-primary" id="tr-save">Salva Uscita</button>`
    });

    const tsConfig = {
      plugins: ['remove_button'],
      create: true,
      createFilter: (input) => input.length >= 2,
      render: {
        option_create: (data, escape) => `<div class="create">➕ Aggiungi nuovo docente: <strong>${escape(data.input)}</strong></div>`
      }
    };

    const tsLead = new TomSelect(ov.querySelector('#tr-lead'), tsConfig);
    const tsClasses = new TomSelect(ov.querySelector('#tr-classes'), { plugins: ['remove_button'], create: false });
    const tsComp = new TomSelect(ov.querySelector('#tr-companions'), tsConfig);

    // If editing, populate (simplified)
    if (tripId) {
       // Note: in a real app, we'd fetch the trip before opening or pass it. 
       // For now, I'll assume trip data is available if needed.
    }

    ov.querySelector('#tr-save').onclick = async () => {
      let leadId = tsLead.getValue();
      const classIds = tsClasses.getValue().map(id => parseInt(id));
      const hours = [...ov.querySelectorAll('#tr-hours-wrap input:checked')].map(i=>parseInt(i.value));
      const companionIds = tsComp.getValue();
      const notes = ov.querySelector('#tr-notes').value;

      if (!leadId||!classIds.length||!hours.length) { APP.toast('Compila tutti i campi obbligatori','error'); return; }

      // Helper per creare docenti se sono stringhe (nomi digitati)
      const ensureTeacher = async (val) => {
        if (isNaN(parseInt(val))) {
          const newT = await API.post('/teachers', { name: val.toUpperCase(), subject: 'DA DEFINIRE', school_year_id: _yearId, is_available: true });
          _teachers.push(newT);
          return newT.id;
        }
        return parseInt(val);
      };

      try {
        const finalLeadId = await ensureTeacher(leadId);
        const finalCompIds = await Promise.all(companionIds.map(id => ensureTeacher(id)));

        const payload = { 
          date: _date, 
          lead_teacher_id: finalLeadId, 
          class_ids: classIds, 
          hours, 
          companion_teacher_ids: finalCompIds, 
          notes, 
          school_year_id: _yearId 
        };

        if (tripId) await API.put(`/trips/${tripId}`, payload); 
        else await API.post('/trips', payload);

        ov.remove(); loadData(); APP.toast('Uscita salvata','success');
      } catch(e) { APP.toast(e.message,'error'); }
    };
  }

  async function deleteTrip(id) {
    if (!await APP.confirm('Eliminare questa uscita didattica?')) return;
    try { await API.del(`/trips/${id}`); loadData(); APP.toast('Uscita eliminata','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  return { render, openAbsenceModal, deleteAbsence, approveAbsence, openTripModal, deleteTrip };
})();
