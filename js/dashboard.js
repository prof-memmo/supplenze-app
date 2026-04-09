/**
 * DASHBOARD_ABSENCES.JS (UNIFIED)
 * Consolidates daily stats, absences management, and school trips in one view.
 */
var DashboardView = (() => {
  let _date = todayISO();
  let _yearId, _teachers = [], _classes = [];

  async function render(container, state) {
    if (!state.yearId) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px">
          <div class="icon" style="font-size:48px; margin-bottom:16px;">🏠</div>
          <h3 style="margin-bottom:8px;">Benvenuto</h3>
          <p style="color:var(--text-secondary); max-width:400px; margin:0 auto 20px;">
            Per visualizzare i dati della dashboard, seleziona l'<strong>Anno Scolastico</strong> attivo dal selettore in alto.
          </p>
          <div class="attention-hint" style="font-size:12px; color:var(--accent); font-weight:600;">
            ⬅️ Scegli Anno qui
          </div>
        </div>`;
      return;
    }
    _yearId = state.yearId;
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Caricamento riepilogo...</div>';

    try {
      // Fetch everything
      const [rawStats, dailyData, teachers, classes] = await Promise.all([
        API.get(`/settings/stats?year_id=${_yearId}`),
        API.get(`/substitutions/daily?date=${_date}&year_id=${_yearId}`),
        API.get(`/teachers?year_id=${_yearId}`),
        API.get(`/settings/classes?year_id=${_yearId}`)
      ]);
      const stats = rawStats || {};
      _teachers = teachers || [];
      _classes = classes || [];

      const totalSlots = (dailyData.slots || []).length;
      const uncov = (dailyData.slots || []).filter(s => !s.existing_substitutions?.length).length;
      const covered = totalSlots - uncov;

      container.innerHTML = `
        <div class="page-header" style="padding-bottom:12px; border-bottom:1px solid var(--border)">
           <div class="flex justify-between items-center">
             <div class="page-title">Panoramica Giornaliera</div>
             <div class="toolbar-right flex gap-12 items-center">
                <div class="date-navigator">
                  <div class="nav-btn" id="dash-prev-day">◀</div>
                  <label>DATA:</label>
                  <input type="date" id="dash-date-sel" value="${_date}">
                  <div class="nav-btn" id="dash-next-day">▶</div>
                </div>
             </div>
           </div>
        </div>

        <div class="stats-grid">
           <div class="stat-card accent"><div class="stat-value">${stats.totalTeachers || 0}</div><div class="stat-label">Docenti</div></div>
           <div class="stat-card info"><div class="stat-value">${stats.totalClasses || 0}</div><div class="stat-label">Classi</div></div>
           <div class="stat-card warning"><div class="stat-value">${dailyData.absences?.length || 0}</div><div class="stat-label">Assenze oggi</div></div>
           <div class="stat-card success"><div class="stat-value">${stats.assemblea || 0}</div><div class="stat-label">Assemblee</div></div>
           <div class="stat-card danger"><div class="stat-value">${covered}/${totalSlots}</div><div class="stat-label">Slot coperti</div></div>
        </div>

        <div class="dashboard-main-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px">
          <div class="card" style="border: 2px solid var(--border-thick)">
            <div class="card-header">
              <div class="card-title">🚫 Registro Assenze</div>
              <button class="btn btn-danger btn-sm" id="dash-add-abs">+ Aggiungi assenza</button>
            </div>
            ${renderAbsences(dailyData.absences || [])}
          </div>

          <div class="card" style="border: 2px solid var(--border-thick)">
            <div class="card-header">
              <div class="card-title">🚌 Uscite Didattiche</div>
              <button class="btn btn-primary btn-sm" id="dash-add-trip">+ Nuova Uscita</button>
            </div>
            ${renderTrips(dailyData.trips || [])}
          </div>
        </div>
      `;

      container.querySelector('#dash-add-abs').onclick = () => openAbsenceModal(container, state);
      container.querySelector('#dash-add-trip').onclick = () => openTripModal(container, state);
      
      const dateSel = container.querySelector('#dash-date-sel');
      dateSel.onchange = (e) => { _date = e.target.value; render(container, state); };
      
      const updateDashDate = (newDate) => {
        _date = newDate;
        const selector = container.querySelector('#dash-date-sel');
        if (selector) selector.value = _date;
        render(container, state);
      };

      container.querySelector('#dash-prev-day').onclick = (e) => {
        e.stopPropagation();
        const d = new Date(_date + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        updateDashDate(d.toISOString().slice(0, 10));
      };
      container.querySelector('#dash-next-day').onclick = (e) => {
        e.stopPropagation();
        const d = new Date(_date + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        updateDashDate(d.toISOString().slice(0, 10));
      };

    } catch (e) {
      container.innerHTML = `<div class="empty-state">❌ Errore: ${e.message}</div>`;
    }
  }

  function renderAbsences(list) {
    if (!list.length) return '<div class="empty-state">✅ Nessuna assenza registrata oggi.</div>';
    return `
      <div class="table-wrapper">
        <table style="border: 1px solid var(--border-thick)">
          <thead>
            <tr><th>Docente</th><th>Stato</th><th>Motivo</th><th>Azioni</th></tr>
          </thead>
          <tbody>
            ${list.map(a => `
              <tr style="${a.status === 'pending' ? 'background:rgba(187,128,9,0.05)' : ''}">
                <td><strong>${escHtml(a.teacher_name)}</strong></td>
                <td>
                   <span class="badge ${a.status === 'approved' ? 'badge-success' : 'badge-warning'}">
                    ${a.status === 'approved' ? 'Approvato' : 'In attesa'}
                  </span>
                </td>
                <td><span class="text-muted">${escHtml(a.reason || '—')}</span></td>
                <td style="display:flex; gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="APP.printAbsence(${JSON.stringify(a).replace(/"/g, '&quot;')})" title="Stampa">🖨️</button>
                  ${a.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="DashboardView.approveAbsence(${a.id})" title="Approva">✅</button>` : ''}
                  <button class="btn btn-ghost btn-sm" onclick="DashboardView.deleteAbsence(${a.id})">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTrips(list) {
    if (!list.length) return '<div class="empty-state">✅ Nessuna classe in uscita.</div>';
    return list.map(t => `
      <div class="trip-entry" style="border: 2px solid var(--info-text); border-radius: 8px; padding: 12px; margin-bottom: 8px; background: var(--info-bg)">
        <div class="flex justify-between">
           <span style="font-weight:700; color:var(--info-text)">🚌 Classe ${t.classes.map(c=>c.name).join(', ')}</span>
           <button class="btn btn-ghost btn-sm" onclick="DashboardView.deleteTrip(${t.id})">🗑️</button>
        </div>
        <div class="text-muted" style="font-size:12px; margin-top:4px">
           Ref: ${escHtml(t.lead_teacher_name)}<br/>
           Ore: ${t.hours.join(', ')}
        </div>
      </div>
    `).join('');
  }

  async function openAbsenceModal(container, state) {
    const yearId = state.yearId || (await API.get('/settings/years')).find(y=>y.is_active)?.id || 1;
    const teachers = await API.get(`/teachers?year_id=${yearId}`);

    const ov = APP.modal({
      title: '🚫 Nuova Assenza',
      body: `
        <div class="form-group"><label>Docenti (anche più di uno)</label>
          <select id="m-abs-teacher" multiple>
            ${teachers.map(t=>`<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Tipo Assenza</label>
          <select id="m-abs-type" class="form-control">
            <option value="assenza_giornaliera">Assenza Giornaliera (Malattia/Permesso)</option>
            <option value="ferie">Ferie</option>
            <option value="formazione">Formazione</option>
            <option value="permessi_sindacali">Permessi Sindacali</option>
            <option value="assemblea">Assemblea</option>
            <option value="concorsi_esami">Concorsi / Esami</option>
            <option value="matrimonio">Matrimonio</option>
          </select>
        </div>
        <div class="form-group" id="m-abs-r-wrapper"><label>Motivo / Note</label><input type="text" id="m-abs-r" placeholder="Dettagli aggiuntivi..."/></div>
      `,
      footer: `<button class="btn btn-ghost" id="m-abs-cancel">Annulla</button><button class="btn btn-primary" id="m-abs-save">✅ Salva</button>`
    });

    const ts = new TomSelect(ov.querySelector('#m-abs-teacher'), { plugins: ['remove_button'], create: false });
    const typeSel = ov.querySelector('#m-abs-type');
    const rw = ov.querySelector('#m-abs-r-wrapper');
    
    typeSel.onchange = () => {
      const isShort = ['assenza_giornaliera','permesso_orario'].includes(typeSel.value);
      rw.style.display = isShort ? 'block' : 'none';
    };
    typeSel.onchange();

    ov.querySelector('#m-abs-cancel').onclick = () => ov.remove();
    ov.querySelector('#m-abs-save').onclick = async () => {
      const tids = ts.getValue().map(v => parseInt(v));
      if (!tids.length) { APP.toast('Seleziona almeno un docente','error'); return; }
      try {
        await API.post('/absences', { 
          teacher_id: tids, 
          date: _date, 
          type: typeSel.value,
          reason: ov.querySelector('#m-abs-r').value, 
          status: 'approved',
          school_year_id: yearId 
        });
        ov.remove();
        loadData(container, state); // Reload dashboard
        APP.toast('Assenza registrata correttamente','success');
      } catch(e) { APP.toast(e.message, 'error'); }
    };
  }

      ov.remove(); render(container, state);
    };
  }

  async function openTripModal(container, state) {
    const yearId = state.yearId || (await API.get('/settings/years')).find(y=>y.is_active)?.id || 1;
    const [teachers, classes] = await Promise.all([
      API.get(`/teachers?year_id=${yearId}`),
      API.get(`/settings/classes?year_id=${yearId}`)
    ]);

    const ov = APP.modal({
      title: '🚌 Nuova Uscita Didattica',
      size: 'modal-lg',
      body: `
        <div class="form-group"><label>Docente Referente</label>
        <select id="m-tr-l"><option value="">-- Seleziona --</option>${teachers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Classi Coinvolte</label>
        <select id="m-tr-c" multiple>${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Ore coinvolte (es: 8, 9, 10)</label><input type="text" id="m-tr-h" placeholder="8, 9, 10..."/></div>
      `,
      footer: `<button class="btn btn-ghost" id="m-tr-c-btn">Annulla</button><button class="btn btn-primary" id="m-tr-s">✅ Salva</button>`
    });

    // Inizializza TomSelect per Docenti e Classi (CON PROTEZIONE CRASH)
    const initTS = () => {
      const elTripT = ov.querySelector('#m-tr-l');
      const elTripC = ov.querySelector('#m-tr-c');
      if (elTripT) new TomSelect(elTripT, { create: false });
      if (elTripC) new TomSelect(elTripC, { plugins: ['remove_button'] });
    };
    // Esegui dopo un piccolo delay per assicurare che il DOM sia pronto
    setTimeout(initTS, 50);

    ov.querySelector('#m-tr-c-btn').onclick = () => ov.remove();
    ov.querySelector('#m-tr-s').onclick = async () => {
      const classIds = Array.from(ov.querySelector('#m-tr-c').selectedOptions).map(o => parseInt(o.value));
      const hours = ov.querySelector('#m-tr-h').value.split(',').map(h=>parseInt(h.trim())).filter(Boolean);
      const leadId = ov.querySelector('#m-tr-l').value;
      if (!leadId || !classIds.length) { APP.toast('Docente e classe obbligatori','error'); return; }
      
      await API.post('/trips', { 
        lead_teacher_id: parseInt(leadId), 
        class_ids: classIds, 
        hours, 
        date: _date, 
        school_year_id: yearId 
      });
      ov.remove(); render(container, state);
    };
  }

  async function deleteAbsence(id) {
    if (await APP.confirm('Eliminare assenza?')) {
       await API.del(`/absences/${id}`);
       APP.navigate('dashboard');
    }
  }

  async function deleteTrip(id) {
    if (await APP.confirm('Eliminare uscita?')) {
       await API.del(`/trips/${id}`);
       APP.navigate('dashboard');
    }
  }

  async function approveAbsence(id) {
    try {
      await API.patch(`/absences/${id}/status`, { status: 'approved' });
      APP.navigate('dashboard');
      APP.toast('Assenza approvata','success');
    } catch(e) { APP.toast(e.message,'error'); }
  }

  return { render, deleteAbsence, deleteTrip, approveAbsence };
})();
