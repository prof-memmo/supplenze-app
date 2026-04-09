/**
 * TEACHER_SELF_SERVICE.JS — La Mia Area Docente
 * Profilo personale del docente con 4 schede:
 * 1. Notifiche & Sostituzioni
 * 2. Il Mio Orario
 * 3. Le Mie Ore
 * 4. Esporta i Miei Dati
 */
var TeacherSelfServiceView = (() => {
  const DAYS = ['LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI'];
  const DAY_LABELS = { LUNEDI:'Lunedì', MARTEDI:'Martedì', MERCOLEDI:'Mercoledì', GIOVEDI:'Giovedì', VENERDI:'Venerdì' };
  const HOURS_BY_DAY = { LUNEDI:[8,9,10,11,12,13,14,15], MARTEDI:[8,9,10,11,12,13], MERCOLEDI:[8,9,10,11,12,13,14,15], GIOVEDI:[8,9,10,11,12,13,14,15], VENERDI:[8,9,10,11,12,13] };

  let _tab = 'notifiche';
  let _teacherId = null;
  let _yearId = null;
  let _teacher = null;
  let _history = [];
  let _schedule = [];
  let _allSchedule = [];

  async function render(container, state) {
    _teacherId = state.user?.teacher_id || 100;
    _yearId = state.yearId;

    if (!_yearId) {
      container.innerHTML = '<div class="alert alert-warning">Seleziona un anno scolastico per procedere.</div>';
      return;
    }

    container.innerHTML = `
      <div class="page-header" style="padding-bottom:12px; border-bottom:1px solid var(--border);">
        <div class="page-title">👤 La Mia Area Docente</div>
        <div class="page-subtitle" id="ts-subtitle">Caricamento...</div>
      </div>

      <div id="ts-stats-bar" style="margin-top:12px; display:flex; gap:16px; flex-wrap:wrap;"></div>

      <div class="mt-20 mb-24" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <div class="btn-group" style="background:var(--bg-card); padding:4px; border-radius:var(--radius); border:1px solid var(--border); display:inline-flex; gap:4px;">
          <button class="btn btn-sm ${_tab==='notifiche'?'btn-primary':'btn-ghost'}" id="ts-tab-notifiche">🔔 Notifiche</button>
          <button class="btn btn-sm ${_tab==='orario'?'btn-primary':'btn-ghost'}" id="ts-tab-orario">📅 Il Mio Orario</button>
          <button class="btn btn-sm ${_tab==='ore'?'btn-primary':'btn-ghost'}" id="ts-tab-ore">📊 Le Mie Ore</button>
          <button class="btn btn-sm ${_tab==='esporta'?'btn-primary':'btn-ghost'}" id="ts-tab-esporta">📄 Esporta</button>
        </div>
        <button class="btn btn-sm ${_tab==='segnala'?'btn-primary':'btn-ghost'}" id="ts-tab-segnala" style="border:1px solid var(--accent); font-weight:700;">➕ Segnala Assenza</button>
      </div>

      <div id="ts-content"></div>
      
      <!-- Info Alert per Docenti -->
      <div id="ts-alerts-container" style="margin-top:24px;">
        <div class="card" style="background:rgba(59,130,246,0.05); border:1px solid rgba(59,130,246,0.2); padding:16px; border-radius:var(--radius);">
          <div style="display:flex; gap:12px;">
            <div style="font-size:20px;">ℹ️</div>
            <div style="font-size:12px; line-height:1.6; color:var(--text-secondary);">
              <strong style="color:var(--text-primary); display:block; margin-bottom:4px;">Promemoria Operativo</strong>
              <ul style="margin:0; padding-left:16px;">
                <li><strong>Proporzionalità:</strong> Tutti i permessi e le ferie sono proporzionali alla durata del contratto (per docenti non di ruolo).</li>
                <li><strong>Non cumulabilità:</strong> I 5 giorni di formazione non si cumulano se si è sia docenti che formatori.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#ts-tab-notifiche').onclick = () => { _tab='notifiche'; render(container, state); };
    container.querySelector('#ts-tab-orario').onclick = () => { _tab='orario'; render(container, state); };
    container.querySelector('#ts-tab-ore').onclick = () => { _tab='ore'; render(container, state); };
    container.querySelector('#ts-tab-esporta').onclick = () => { _tab='esporta'; render(container, state); };
    container.querySelector('#ts-tab-segnala').onclick = () => { _tab='segnala'; render(container, state); };

    // Load teacher info
    try {
      const teachers = await API.get(`/teachers?year_id=${_yearId}`);
      _teacher = teachers.find(t => t.id == _teacherId) || { name: state.user?.username || 'Docente', subject: '', hours_subs: 0, hours_trips: 0 };
      container.querySelector('#ts-subtitle').textContent = `${_teacher.name} — ${_teacher.subject || ''}`;
      
      // Load stats
      const stats = await API.get(`/absences/stats?teacher_id=${_teacherId}&year_id=${_yearId}`) || {};
      const s = {
        ferie: stats.ferie || 0,
        formazione: stats.formazione || 0,
        permessi: stats.permessi_giornalieri || 0,
        concorsi: stats.concorsi || 0,
        matrimonio: stats.matrimonio || 0,
        sindacali: stats.permessi_sindacali || 0,
        assemblea: stats.assemblea || 0
      };

      container.querySelector('#ts-stats-bar').innerHTML = `
        <div class="badge badge-info" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">🏝️ Ferie: <strong>${s.ferie}/6</strong></div>
        <div class="badge badge-warning" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">📚 Formazione: <strong>${s.formazione}/5</strong></div>
        <div class="badge badge-success" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">👨‍👩‍👧‍👦 Permessi: <strong>${s.permessi}/3</strong></div>
        <div class="badge badge-secondary" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">📝 Concorsi: <strong>${s.concorsi}/8</strong></div>
        <div class="badge badge-primary" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">💍 Matrimonio: <strong>${s.matrimonio}/15</strong></div>
        <div class="badge badge-neutral" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">📢 Permesso Sindacale: <strong>${s.sindacali}/12</strong></div>
        <div class="badge badge-ghost" style="background:var(--bg-card); border:1px solid var(--border); padding:8px 12px; font-size:12px;">👥 Assemblee: <strong>${s.assemblea}/10</strong></div>
      `;
    } catch(e) { console.error('Stats error:', e); }

    const content = container.querySelector('#ts-content');
    if (_tab === 'notifiche') await renderNotifiche(content, state);
    else if (_tab === 'orario') await renderOrario(content, state);
    else if (_tab === 'ore') await renderOre(content, state);
    else if (_tab === 'segnala') await renderSegnala(content, state);
    else await renderEsporta(content, state);
  }


  async function renderNotifiche(container, state) {
    container.innerHTML = `
      <div class="card mb-20">
        <div class="card-header border-b mb-16">
          <h3 class="card-title">🔔 Notifiche</h3>
        </div>
        <div id="ts-notifications"></div>
      </div>

      <div class="card mb-20">
        <div class="card-header border-b mb-16">
          <h3 class="card-title">✍️ Sostituzioni Assegnate</h3>
          <span style="font-size:12px; color:var(--text-secondary);">Firma per confermare la presa in carico</span>
        </div>
        <div id="ts-assignments"></div>
      </div>

      <div class="card mb-20">
        <div class="card-header border-b mb-16">
          <h3 class="card-title">📝 Le Mie Richieste</h3>
          <span style="font-size:12px; color:var(--text-secondary);">Stato delle tue segnalazioni di assenza</span>
        </div>
        <div id="ts-my-requests"></div>
      </div>
    `;
    
    loadMyNotifications(container);
    loadMyAssignments(container);
    loadMyRequests(container);
  }

  async function renderSegnala(container, state) {
    container.innerHTML = `
      <div class="card mb-20" style="border:2px solid var(--accent);">
        <div class="card-header border-b mb-16">
          <h3 class="card-title">📝 Nuova Segnalazione Assenza</h3>
        </div>
        <form id="ts-absence-form">
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
            <label id="ts-tipo-gen-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--accent); background:var(--accent-light);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-gen" value="assenza_giornaliera" checked style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">🚫 Permesso Giorno</div><div style="font-size:9px; color:var(--text-secondary);">Intero</div></div>
            </label>
            <label id="ts-tipo-ora-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-ora" value="permesso_orario" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">⏳ Permesso Ora</div><div style="font-size:9px; color:var(--text-secondary);">Singole ore</div></div>
            </label>
            <label id="ts-tipo-usc-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-usc" value="uscita_didattica" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">🚌 Uscita / Soggiorno</div></div>
            </label>
            <label id="ts-tipo-fer-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-fer" value="ferie" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">🏝️ Ferie</div><div style="font-size:9px; color:var(--text-secondary);">Matrici sugg.</div></div>
            </label>
            <label id="ts-tipo-for-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-for" value="formazione" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">📚 Formazione</div></div>
            </label>
            <label id="ts-tipo-con-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-con" value="concorsi_esami" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">📝 Concorsi</div></div>
            </label>
            <label id="ts-tipo-mat-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-mat" value="matrimonio" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">💍 Matrimonio</div></div>
            </label>
            <label id="ts-tipo-sin-lbl" style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; cursor:pointer; border:2px solid var(--border); background:var(--bg-secondary);">
              <input type="radio" name="ts-abs-tipo" id="ts-tipo-sin" value="permessi_sindacali" style="width:15px;height:15px;">
              <div><div style="font-weight:700; font-size:11px;">📢 Permesso Sindacale</div></div>
            </label>
          </div>

          <div class="form-group">
            <label>Periodo (Dal... al...)</label>
            <div class="grid grid-cols-2 gap-8">
              <input type="date" id="abs-date-start" class="form-control" value="${todayISO()}" required>
              <input type="date" id="abs-date-end" class="form-control" value="${todayISO()}" min="${todayISO()}">
            </div>
          </div>

          <div id="extra-fields-wrapper">
             <div class="form-group" id="hours-wrapper" style="display:none">
               <label>Ore interessate</label>
               <select id="abs-hours" class="form-control" multiple></select>
             </div>
             <div class="form-group" id="classes-wrapper" style="display:none">
               <label>Classi accompagnate</label>
               <select id="abs-classes" class="form-control" multiple></select>
             </div>
             <div class="form-group" id="accompanists-wrapper" style="display:none">
               <label>Colleghi accompagnatori</label>
               <select id="abs-accompanists" class="form-control" multiple></select>
             </div>
             <div class="form-group" id="subs-wrapper" style="display:none">
               <label>Sostituti individuati (concordati per ora)</label>
               <div id="ts-ferie-subs-container" style="display:grid; gap:8px;"></div>
             </div>
          </div>
          
          <div class="form-group" id="reason-wrapper">
            <label>Motivazione (facoltativo)</label>
            <textarea id="abs-reason" class="form-control" rows="2" placeholder="Es. Motivi personali, Visita medica..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%; font-weight:700;">Invia Segnalazione</button>
        </form>
      </div>
    `;

    const form = container.querySelector('#ts-absence-form');
    const tipoGenEl = container.querySelector('#ts-tipo-gen');
    const tipoOraEl = container.querySelector('#ts-tipo-ora');
    const tipoUscEl = container.querySelector('#ts-tipo-usc');
    const tipoFerEl = container.querySelector('#ts-tipo-fer');
    const tipoForEl = container.querySelector('#ts-tipo-for');
    const tipoConEl = container.querySelector('#ts-tipo-con');
    const tipoMatEl = container.querySelector('#ts-tipo-mat');
    const tipoSinEl = container.querySelector('#ts-tipo-sin');

    const updateTipoStyle = () => {
      const isOra = tipoOraEl?.checked;
      const isUsc = tipoUscEl?.checked;
      const isFer = tipoFerEl?.checked;
      
      const ids = ['ts-tipo-gen','ts-tipo-ora','ts-tipo-usc','ts-tipo-fer','ts-tipo-for','ts-tipo-con','ts-tipo-mat','ts-tipo-sin'];
      ids.forEach(id => {
        const el = container.querySelector('#' + id);
        const lbl = container.querySelector('#' + id + '-lbl');
        if (el && lbl) {
          lbl.style.borderColor = el.checked ? 'var(--accent)' : 'var(--border)';
          lbl.style.background = el.checked ? 'var(--accent-light)' : 'var(--bg-secondary)';
        }
      });

      container.querySelector('#hours-wrapper').style.display = (isOra || isUsc) ? 'block' : 'none';
      container.querySelector('#classes-wrapper').style.display = isUsc ? 'block' : 'none';
      container.querySelector('#accompanists-wrapper').style.display = isUsc ? 'block' : 'none';
      container.querySelector('#subs-wrapper').style.display = isFer ? 'block' : 'none';
      
      const hideReason = isFer || isUsc || tipoForEl?.checked || tipoConEl?.checked || tipoSinEl?.checked || tipoMatEl?.checked;
      container.querySelector('#reason-wrapper').style.display = hideReason ? 'none' : 'block';
    };

    const subsContainer = container.querySelector('#ts-ferie-subs-container');
    const updateFerieSubs = async () => {
      if (!tipoFerEl?.checked) return;
      const date = container.querySelector('#abs-date-start').value;
      if (!date) return;
      
      subsContainer.innerHTML = '<div style="padding:10px;text-align:center"><div class="spinner"></div></div>';
      try {
        const tid = _teacherId || 0;
        const res = await API.get(`/teachers/suggestions/ferie?teacher_id=${tid}&date=${date || ''}`);
        const suggestions = res && typeof res === 'object' ? res : {};
        const hours = Object.keys(suggestions).sort((a,b)=>a-b);
        if (!hours.length) {
          subsContainer.innerHTML = '<div class="alert alert-info" style="font-size:11px;">ℹ️ Nessuna ora di lezione per questo giorno.</div>';
          return;
        }
        subsContainer.innerHTML = hours.map(h => {
          const hourIdx = parseInt(h);
          const displayHour = hourIdx - 7; // Map 8-15 to 1-8
          const cand = suggestions[h] || [];
          return `
            <div class="ferie-slot-row" style="padding:10px 0; border-bottom:1px solid var(--border-light); display:flex; align-items:center; gap:12px;">
              <div style="font-weight:700; font-size:13px; color:var(--text-primary); width:60px;">${displayHour}ª ora:</div>
              <div style="flex:1;">
                <select class="form-control ts-ferie-sub-sel" data-hour="${h}" style="font-size:12px; height:34px; width:100%; border-radius:6px; border:1px solid var(--border);">
                  <option value="">-- Seleziona collega --</option>
                  <optgroup label="Disponibili in quest'ora">
                    ${cand.map(c => `<option value="${c.id}">${escHtml(c.name || 'Docente')} (${(c.type || 'N/D').toUpperCase()})</option>`).join('')}
                  </optgroup>
                  <optgroup label="Altri docenti">
                    ${(_allTeachers || []).filter(t => !cand.find(c => c.id == t.id)).map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('')}
                  </optgroup>
                </select>
              </div>
            </div>`;
        }).join('');
      } catch(e) { 
        console.error('Ferie Proposals Error:', e);
        subsContainer.innerHTML = '<div class="alert alert-danger" style="font-size:11px;">❌ Errore caricamento suggerimenti.</div>'; 
      }
    };

    [tipoGenEl, tipoOraEl, tipoUscEl, tipoFerEl, tipoForEl, tipoConEl, tipoMatEl, tipoSinEl].forEach(el => el?.addEventListener('change', () => {
      updateTipoStyle();
      if (tipoFerEl.checked) updateFerieSubs();
    }));

    // Sincronizzazione Date
    const startEl = container.querySelector('#abs-date-start');
    const endEl = container.querySelector('#abs-date-end');
    if (startEl && endEl) {
      startEl.addEventListener('change', () => {
        if (!endEl.value || endEl.value < startEl.value) {
          endEl.value = startEl.value;
        }
        endEl.min = startEl.value;
        if (tipoFerEl.checked) updateFerieSubs();
      });
    }

    // Init TomSelect
    let tsHours, tsClasses, tsAccompanists, _allTeachers = [];
    try {
      const hSel = container.querySelector('#abs-hours');
      for (let i = 1; i <= 8; i++) hSel.appendChild(new Option(`${i}ª Ora`, i));
      tsHours = new TomSelect(hSel, { plugins: ['remove_button'], create: false });

      const cSel = container.querySelector('#abs-classes');
      const classes = await API.get(`/settings/classes?year_id=${_yearId}`);
      classes.forEach(c => cSel.appendChild(new Option(c.name, c.id)));
      tsClasses = new TomSelect(cSel, { plugins: ['remove_button'], create: false });

      const accSel = container.querySelector('#abs-accompanists');
      const teachers = await API.get(`/teachers?year_id=${_yearId}`);
      _allTeachers = teachers.filter(t => t.id != _teacherId);
      _allTeachers.forEach(t => accSel.appendChild(new Option(t.name, t.id)));
      tsAccompanists = new TomSelect(accSel, { plugins: ['remove_button'], create: false });
    } catch(e) { console.error('TS Init error:', e); }

    container.querySelector('#abs-date-start').addEventListener('change', (e) => {
      const start = e.target.value;
      const endEl = container.querySelector('#abs-date-end');
      if (start && (!endEl.value || endEl.value < start)) endEl.value = start;
      if (tipoFerEl.checked) updateFerieSubs();
    });
    container.querySelector('#abs-date-end').addEventListener('change', () => { 
      if (tipoFerEl.checked) updateFerieSubs(); 
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        school_year_id: _yearId,
        teacher_id: _teacherId,
        date: container.querySelector('#abs-date-start').value,
        date_end: container.querySelector('#abs-date-end').value,
        type: container.querySelector('input[name="ts-abs-tipo"]:checked').value,
        reason: container.querySelector('#abs-reason').value,
        status: 'pending'
      };
      if (payload.type === 'permesso_orario' || payload.type === 'uscita_didattica') {
        payload.hours = tsHours.getValue();
        if (!payload.hours.length) return APP.toast('Seleziona le ore', 'warning');
      }
      if (payload.type === 'ferie') {
        const subs = {};
        container.querySelectorAll('.ts-ferie-sub-sel').forEach(sel => {
          if (sel.value) subs[sel.dataset.hour] = parseInt(sel.value);
        });
        payload.additional_data = { substitutes_identified: subs };
        if (Object.keys(subs).length === 0) return APP.toast('Indica i sostituti', 'warning');
      }
      try {
        await API.post('/absences', payload);
        APP.toast('Segnalazione inviata!', 'success');
        _tab = 'notifiche';
        render(container.closest('.view-container') || container.parentElement.parentElement, state);
      } catch(err) { APP.toast(err.message, 'error'); }
    };

    updateTipoStyle();
    if (tipoFerEl.checked) updateFerieSubs();
  }
  async function loadMyNotifications(container) {
    const list = container.querySelector('#ts-notifications');
    if (!list) return;
    try {
      const notes = await API.get(`/notifications?teacher_id=${_teacherId}`);
      if (!notes.length) { list.innerHTML = '<div class="empty-state" style="padding:16px;">Nessuna notifica.</div>'; return; }
      list.innerHTML = notes.map(n => `
        <div style="padding:12px; border-bottom:1px solid var(--border); position:relative;">
          ${!n.read ? '<span style="position:absolute; left:0; top:18px; width:5px; height:5px; background:var(--accent); border-radius:50%;"></span>' : ''}
          <div style="font-weight:600; font-size:14px; margin-bottom:3px;">${escHtml(n.title)}</div>
          <div style="font-size:13px; color:var(--text-secondary);">${escHtml(n.message)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px; display:flex; justify-content:space-between;">
            <span>${new Date(n.created_at).toLocaleString('it-IT')}</span>
            ${!n.read ? `<a href="#" onclick="TeacherSelfServiceView.markRead(event,${n.id})" style="color:var(--accent); font-weight:600; text-decoration:none;">Segna come letta</a>` : ''}
          </div>
        </div>`).join('');
    } catch(e) { list.innerHTML = 'Errore caricamento notifiche.'; }
  }

  async function loadMyAssignments(container) {
    const list = container.querySelector('#ts-assignments');
    if (!list) return;
    try {
      const history = await API.get(`/substitutions/history?year_id=${_yearId}&teacher_id=${_teacherId}`);
      const mySubs = history.filter(s => s.substitute_teacher_id == _teacherId);
      if (!mySubs.length) { list.innerHTML = '<div class="empty-state" style="padding:16px;">Nessuna sostituzione assegnata.</div>'; return; }
      list.innerHTML = `<table class="table"><thead><tr><th>Data</th><th>Ora</th><th>Classe</th><th>Tipo</th><th>Firma</th></tr></thead><tbody>
        ${mySubs.map(s => `<tr>
          <td><strong>${fmtDate(s.date)}</strong></td>
          <td>${s.hour}ª</td>
          <td>${escHtml(s.class_name||'—')}</td>
          <td><span class="badge ${s.hours_counted?'badge-info':'badge-warning'}">${s.hours_counted?'Recupero':'Eccedente'}</span></td>
          <td>${!s.accepted ? `<button class="btn btn-primary btn-sm" onclick="TeacherSelfServiceView.acceptAssignment(event,${s.id})">✍️ Firma</button>` : `<span style="color:#16a34a; font-weight:bold;">✅ Firmata</span>`}</td>
        </tr>`).join('')}
      </tbody></table>`;
    } catch(e) { list.innerHTML = '<div class="empty-state">Errore caricamento sostituzioni.</div>'; }
  }

  // ─── TAB 2: IL MIO ORARIO ───────────────────────────────────────────────────

  async function renderOrario(container, state) {
    container.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="ts-show-personal">📋 Il Mio Orario Personale</button>
        <button class="btn btn-secondary btn-sm" id="ts-show-full">🏫 Orario Completo Scuola</button>
      </div>
      <div id="ts-orario-grid">
        <div class="loading-overlay"><div class="spinner"></div> Caricamento orario...</div>
      </div>
    `;
    const btnPersonal = container.querySelector('#ts-show-personal');
    const btnFull = container.querySelector('#ts-show-full');
    const grid = container.querySelector('#ts-orario-grid');

    btnPersonal.onclick = () => {
      loadPersonalSchedule(grid);
      btnPersonal.className = 'btn btn-primary btn-sm';
      btnFull.className = 'btn btn-secondary btn-sm';
    };
    btnFull.onclick = () => {
      loadFullSchedule(grid);
      btnFull.className = 'btn btn-primary btn-sm';
      btnPersonal.className = 'btn btn-secondary btn-sm';
    };
    await loadPersonalSchedule(grid);
  }

  async function loadPersonalSchedule(target) {
    target.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      // Re-fetch teacher to get latest lock status
      const teachers = await API.get(`/teachers?year_id=${_yearId}`);
      _teacher = teachers.find(t => t.id == _teacherId);
      const isLocked = _teacher?.availability_locked;

      const schedule = await API.get(`/schedule?year_id=${_yearId}`);
      const mySlots = schedule.filter(s => s.teacher_id == _teacherId);
      
      const allHours = [8,9,10,11,12,13,14,15];
      
      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
          <div>
            <h4 style="margin:0; font-size:14px;">📋 Il Mio Orario Personale</h4>
            <p style="margin:2px 0 0 0; font-size:11px; color:var(--text-secondary);">
              ${isLocked 
                ? '<span style="color:#16a34a; font-weight:600;">✅ Scelte Inviate e Protette</span> (Contatta la segreteria per modifiche)' 
                : '<span style="color:var(--accent); font-weight:600;">✏️ Fase di Compilazione</span>: Clicca sugli slot vuoti per indicare disponibilità o ricevimento'}
            </p>
          </div>
          ${!isLocked ? `<button class="btn btn-primary btn-sm" id="ts-submit-availability" style="background:#16a34a; border-color:#16a34a; font-weight:700;">📤 Invia alla Segreteria</button>` : ''}
        </div>
        
        <div class="table-wrapper"><table style="border-collapse:collapse; width:100%; font-size:12px;">
        <thead><tr style="background:#0f172a">
          <th style="padding:8px; text-align:center; border:1px solid #334155; color:#94a3b8; font-size:10px;">Ora</th>
          ${DAYS.map(d => `<th style="padding:8px; border:1px solid #334155; color:#94a3b8; font-size:10px;">${DAY_LABELS[d]}</th>`).join('')}
        </tr></thead><tbody style="background:#1e293b">`;

      allHours.forEach(h => {
        html += `<tr><td style="font-weight:700; text-align:center; padding:7px; border:1px solid var(--border);">${h-7}ª</td>`;
        DAYS.forEach(d => {
          const slot = mySlots.find(s => s.day===d && s.hour===h);
          const val = slot?.raw_value || '';
          const type = slot?.slot_type || 'empty';
          
          let cellClass = '';
          let interactive = 'cursor:default;';
          let statusText = escHtml(val||'—');

          if (type === 'normal') {
            cellClass = 'ov-cell-normal';
          } else if (type === 'disponibile') {
            cellClass = 'ov-cell-dis';
            statusText = '⚡ DIS';
          } else if (type === 'eccedente') {
            cellClass = 'ov-cell-ecc';
            statusText = '💜 ECC';
          } else if (type === 'ricevimento') {
            cellClass = 'ov-cell-ricevimento'; // Need CSS for this
            statusText = '🤝 R';
          }

          if (!isLocked && type !== 'normal') {
            interactive = 'cursor:pointer; transition: transform 0.1s;';
          }
          
          html += `<td class="${cellClass} ts-slot" 
                      data-day="${d}" data-hour="${h}" data-type="${type}"
                      style="padding:7px; border:1px solid #1e293b; text-align:center; font-size:10px; font-weight:600; ${interactive}"
                      onmouseover="if(this.style.cursor==='pointer') this.style.transform='scale(1.05)';"
                      onmouseout="this.style.transform='scale(1)';"
                  >${statusText}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      
      // Legenda
      html += `
        <div style="margin-top:16px; display:flex; gap:12px; font-size:10px; color:var(--text-muted); flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:10px; background:#1e293b; border:1px solid #334155; border-radius:3px;"></span> Libero</div>
          <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:10px; background:var(--accent); border-radius:3px;"></span> Lezione</div>
          <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:10px; background:#16a34a; border-radius:3px;"></span> Disponibile (DIS)</div>
          <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:10px; background:#8b5cf6; border-radius:3px;"></span> Eccedente (ECC)</div>
          <div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:10px; background:#f59e0b; border-radius:3px;"></span> Ricevimento (R)</div>
        </div>
      `;

      target.innerHTML = html;

      // Wire clicks
      if (!isLocked) {
        target.querySelectorAll('.ts-slot').forEach(td => {
          td.onclick = async () => {
            const day = td.dataset.day;
            const hour = parseInt(td.dataset.hour);
            const type = td.dataset.type;
            if (type === 'normal') return;

            let newVal = '';
            if (type === 'empty' || type === 'asterisco') newVal = 'DIS';
            else if (type === 'disponibile') newVal = 'ECC';
            else if (type === 'eccedente') newVal = 'R';
            else newVal = ''; // back to empty

            try {
              await API.put('/schedule/slot', {
                teacher_id: _teacherId,
                day, hour,
                raw_value: newVal,
                school_year_id: _yearId
              });
              loadPersonalSchedule(target); // re-render
            } catch(e) { APP.toast(e.message, 'error'); }
          };
        });

        const submitBtn = target.querySelector('#ts-submit-availability');
        if (submitBtn) {
          submitBtn.onclick = async () => {
            if (await APP.confirm('Sei sicuro di voler inviare le tue disponibilità? Una volta inviate, non potrai più modificarle autonomamente.')) {
              try {
                await API.put(`/teachers/${_teacherId}/lock`);
                APP.toast('Disponibilità inviate con successo!', 'success');
                loadPersonalSchedule(target);
              } catch(e) { APP.toast(e.message, 'error'); }
            }
          };
        }
      }
    } catch(e) { 
      console.error(e);
      target.innerHTML = '<div class="empty-state">Errore caricamento orario.</div>'; 
    }
  }

  async function loadFullSchedule(target) {
    target.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Caricamento...</div>';
    try {
      const teachers = await API.get(`/teachers?year_id=${_yearId}`);
      const schedule = await API.get(`/schedule?year_id=${_yearId}`);
      const allHours = [8,9,10,11,12,13,14,15];

      let html = `<h4 style="margin-bottom:12px; font-size:14px; display:flex; align-items:center; gap:8px;">
          🏫 Orario Completo Scuola 
          <span class="badge badge-neutral" style="font-weight:400; font-size:11px;">Sola Lettura</span>
        </h4>
        <div class="ov-master-wrapper" style="max-height: 500px;">
          <table class="ov-master-table" style="min-width: 1000px;">
            <thead>
              <tr>
                <th class="sticky-col" style="min-width:150px">Docente</th>
                ${DAYS.map(d => `<th colspan="${(HOURS_BY_DAY[d]||allHours).length}" style="border-right:2px solid var(--border-thick)">${DAY_LABELS[d]}</th>`).join('')}
              </tr>
              <tr>
                <th class="sticky-col"></th>
                ${DAYS.map(d => (HOURS_BY_DAY[d]||allHours).map(h => `<th style="min-width:50px; font-size:9px">${h}ª</th>`).join('')).join('')}
              </tr>
            </thead>
            <tbody>`;

      teachers.forEach(t => {
        const isMe = t.id == _teacherId;
        html += `<tr>
          <td class="sticky-col" style="font-weight:600; ${isMe ? 'color:var(--accent-hover); background:var(--accent-light);' : ''}">${escHtml(t.name)}</td>`;
        
        DAYS.forEach(d => {
          const hours = HOURS_BY_DAY[d] || allHours;
          hours.forEach((h, idx) => {
            const slot = schedule.find(s => s.teacher_id == t.id && s.day == d && s.hour == h);
            const val = slot?.raw_value || '';
            const type = slot?.slot_type || 'empty';
            
            let cellStyle = 'font-size:10px; text-align:center;';
            if (isMe) cellStyle += 'background:rgba(99,102,241,0.05);';
            
            if (type === 'disponibile') cellStyle += 'background:var(--success-bg); color:var(--success-text); font-weight:700;';
            else if (type === 'eccedente') cellStyle += 'background:rgba(139,92,246,0.15); color:#a78bfa; font-weight:700;';
            else if (type === 'empty') cellStyle += 'color:var(--text-muted); opacity:0.3;';
            
            const isLastHour = idx === hours.length - 1;
            const borderRight = isLastHour ? 'border-right:2px solid var(--border-thick)' : '';

            html += `<td style="${cellStyle}; ${borderRight}">${escHtml(val||'—')}</td>`;
          });
        });
        html += '</tr>';
      });

      html += '</tbody></table></div>';
      target.innerHTML = html;
    } catch(e) { 
      console.error(e);
      target.innerHTML = '<div class="empty-state">Errore caricamento orario completo.</div>'; 
    }
  }

  // ─── TAB 3: LE MIE ORE ─────────────────────────────────────────────────────

  async function renderOre(container, state) {
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Caricamento ore...</div>';
    try {
      const history = await API.get(`/substitutions/history?year_id=${_yearId}&teacher_id=${_teacherId}`);
      const mySubs = history.filter(s => s.substitute_teacher_id == _teacherId);

      const totalRec = mySubs.filter(s => s.hours_counted).length;
      const totalEcc = mySubs.filter(s => !s.hours_counted).length;
      const debtSubs = _teacher?.hours_subs || 0;
      const debtTrips = _teacher?.hours_trips || 0;
      const totalDebt = debtSubs + debtTrips;

      // Stats by trimester and type
      const Q = { 
        subs: { Q1:{rec:0, target: Math.ceil(debtSubs/3)}, Q2:{rec:0, target: Math.ceil((debtSubs-Math.ceil(debtSubs/3))/2)}, Q3:{rec:0, target: Math.max(0, debtSubs - Math.ceil(debtSubs/3) - Math.ceil((debtSubs-Math.ceil(debtSubs/3))/2))} },
        trips: { Q1:{rec:0, target: Math.ceil(debtTrips/3)}, Q2:{rec:0, target: Math.ceil((debtTrips-Math.ceil(debtTrips/3))/2)}, Q3:{rec:0, target: Math.max(0, debtTrips - Math.ceil(debtTrips/3) - Math.ceil((debtTrips-Math.ceil(debtTrips/3))/2))} }
      };

      mySubs.forEach(s => {
        if (!s.hours_counted) return;
        const m = new Date(s.date).getMonth()+1;
        const q = [9,10,11].includes(m) ? 'Q1' : [12,1,2].includes(m) ? 'Q2' : 'Q3';
        // Heuristic to distinguish between sub and trip in history
        const isTrip = (s.type === 'trip' || (s.notes||'').toLowerCase().includes('uscita') || (s.notes||'').toLowerCase().includes('soggiorno'));
        if (isTrip) Q.trips[q].rec++; else Q.subs[q].rec++;
      });

      const rowsHtml = mySubs.map(s => {
        const isRec = !!s.hours_counted;
        return `<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:7px 12px;"><strong>${fmtDate(s.date)}</strong></td>
          <td>${s.hour}ª</td>
          <td><span class="badge ${isRec?'badge-info':'badge-warning'}">${isRec?'Recupero Ore':'Ore Eccedenti / Straordinario'}</span></td>
          <td>${escHtml(s.class_name||'—')}</td>
          <td>${s.accepted ? '✅ Firmato' : '<span style="font-size:11px; color:var(--text-muted);">In attesa</span>'}</td>
        </tr>`;
      }).join('');

      container.innerHTML = `
        <div class="stats-grid" style="grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:20px;">
          <div class="stat-card" style="background:#eff6ff; border:1px solid #dbeafe;">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <div class="stat-value" style="color:#1d4ed8; font-size:24px">${debtSubs}</div>
              <div class="badge badge-info">${Q.subs.Q1.rec + Q.subs.Q2.rec + Q.subs.Q3.rec} recuperate</div>
            </div>
            <div class="stat-label" style="margin-top:4px">Ore Sostituzioni da Recuperare</div>
          </div>
          <div class="stat-card" style="background:#f0fdf4; border:1px solid #dcfce7;">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <div class="stat-value" style="color:#15803d; font-size:24px">${debtTrips}</div>
              <div class="badge badge-success">${Q.trips.Q1.rec + Q.trips.Q2.rec + Q.trips.Q3.rec} recuperate</div>
            </div>
            <div class="stat-label" style="margin-top:4px">Ore Uscite/Soggiorni da Recuperare</div>
          </div>
          <div class="stat-card" style="background:#fff7ed; border:1px solid #ffedd5; grid-column: span 2">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <div class="stat-value" style="color:#c2410c; font-size:24px">${totalEcc}</div>
              <div style="font-size:12px; color:var(--text-secondary)">Ore effettuate oltre il debito orario</div>
            </div>
            <div class="stat-label" style="margin-top:4px">Ore Eccedenti / Straordinario</div>
          </div>
        </div>

        <div class="card mb-20" style="padding:0; overflow:hidden; border:1px solid var(--border)">
          <div style="padding:12px 20px; background:var(--bg-secondary); border-bottom:1px solid var(--border); font-weight:700; font-size:13px; display:flex; justify-content:space-between">
            <span>📅 Ripartizione per Trimestre</span>
            <span style="font-weight:400; font-size:11px; color:var(--text-secondary)">Debito totale: ${totalDebt} ore</span>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
              <tr style="background:var(--bg-secondary); font-size:10px; text-transform:uppercase; letter-spacing:0.5px">
                <th style="padding:10px 15px; text-align:left; border-bottom:2px solid var(--border)">Tipo & Trimestre</th>
                <th style="text-align:center; border-bottom:2px solid var(--border)">Da Recuperare</th>
                <th style="text-align:center; border-bottom:2px solid var(--border)">Recuperate</th>
                <th style="text-align:center; border-bottom:2px solid var(--border)">Stato</th>
              </tr>
            </thead>
            <tbody>
              <!-- Sostituzioni -->
              <tr style="background:rgba(59,130,246,0.03)"><td colspan="4" style="padding:6px 15px; font-weight:700; font-size:11px; color:#1d4ed8">📘 RECUPERO SOSTITUZIONI</td></tr>
              <tr>
                <td style="padding:8px 15px;">1° Trimestre (Set–Nov)</td>
                <td style="text-align:center;">${Q.subs.Q1.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.subs.Q1.rec}</td>
                <td style="text-align:center;">${Q.subs.Q1.rec >= Q.subs.Q1.target ? '✅' : '⏳'}</td>
              </tr>
              <tr>
                <td style="padding:8px 15px;">2° Trimestre (Dic–Feb)</td>
                <td style="text-align:center;">${Q.subs.Q2.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.subs.Q2.rec}</td>
                <td style="text-align:center;">${Q.subs.Q2.rec >= Q.subs.Q2.target ? '✅' : '⏳'}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:8px 15px;">3° Trimestre (Mar–Giu)</td>
                <td style="text-align:center;">${Q.subs.Q3.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.subs.Q3.rec}</td>
                <td style="text-align:center;">${Q.subs.Q3.rec >= Q.subs.Q3.target ? '✅' : '⏳'}</td>
              </tr>
              <!-- Uscite -->
              <tr style="background:rgba(34,197,94,0.03)"><td colspan="4" style="padding:6px 15px; font-weight:700; font-size:11px; color:#15803d">🚌 RECUPERO USCITE / SOGGIORNI</td></tr>
              <tr>
                <td style="padding:8px 15px;">1° Trimestre (Set–Nov)</td>
                <td style="text-align:center;">${Q.trips.Q1.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.trips.Q1.rec}</td>
                <td style="text-align:center;">${Q.trips.Q1.rec >= Q.trips.Q1.target ? '✅' : '⏳'}</td>
              </tr>
              <tr>
                <td style="padding:8px 15px;">2° Trimestre (Dic–Feb)</td>
                <td style="text-align:center;">${Q.trips.Q2.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.trips.Q2.rec}</td>
                <td style="text-align:center;">${Q.trips.Q2.rec >= Q.trips.Q2.target ? '✅' : '⏳'}</td>
              </tr>
              <tr>
                <td style="padding:8px 15px;">3° Trimestre (Mar–Giu)</td>
                <td style="text-align:center;">${Q.trips.Q3.target}</td>
                <td style="text-align:center; font-weight:700;">${Q.trips.Q3.rec}</td>
                <td style="text-align:center;">${Q.trips.Q3.rec >= Q.trips.Q3.target ? '✅' : '⏳'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
          <div style="padding:12px 20px; background:var(--bg-secondary); border-bottom:1px solid var(--border); font-weight:700; font-size:13px;">📋 Storico Completo</div>
          ${mySubs.length ? `<table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead><tr style="background:var(--bg-secondary);">
              <th style="padding:7px 12px;">Giorno</th><th>Ora</th><th>Tipo</th><th>Classe</th><th>Firma</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>` : '<div class="empty-state" style="padding:24px;">Nessuna sostituzione o recupero effettuato.</div>'}
        </div>
      `;
    } catch(e) {
      container.innerHTML = '<div class="empty-state">Errore caricamento dati orari.</div>';
    }
    
    // Load local permissions list
    loadShortPermissions(container);
  }

  async function loadShortPermissions(container) {
    const list = container.querySelector('#ts-permissions-list');
    if (!list) return;
    try {
      const absences = await API.get(`/absences?year_id=${_yearId}`);
      const myPerms = absences.filter(a => a.teacher_id == _teacherId && a.type === 'permesso_orario' && a.status === 'approved');
      
      if (!myPerms.length) {
        list.innerHTML = '<div class="empty-state" style="padding:16px;">Nessuna sostituzione breve da recuperare.</div>';
        return;
      }

      list.innerHTML = `<table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead><tr style="background:var(--bg-secondary); text-align:left;">
          <th style="padding:8px 15px;">Data</th><th style="text-align:center;">Ore</th><th>Scadenza Recupero (2 mesi)</th><th>Stato</th>
        </tr></thead><tbody>
        ${myPerms.map(p => {
          const d = new Date(p.date);
          const deadline = new Date(d);
          deadline.setMonth(deadline.getMonth() + 2);
          const isExpired = deadline < new Date();
          return `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 15px;">${fmtDate(p.date)}</td>
            <td style="text-align:center;">${(p.hours||[]).length}</td>
            <td style="${isExpired ? 'color:var(--danger-text); font-weight:bold;' : ''}">${fmtDate(deadline.toISOString().slice(0,10))} ${isExpired ? '(SCADUTO)' : ''}</td>
            <td><span class="badge ${isExpired ? 'badge-neutral' : 'badge-warning'}">${isExpired ? 'Non più dovuto' : 'Da recuperare'}</span></td>
          </tr>`;
        }).join('')}
      </tbody></table>`;
    } catch(e) {}
  }

  // ─── TAB 4: ESPORTA ─────────────────────────────────────────────────────────

  async function renderEsporta(container, state) {
    container.innerHTML = `
      <div class="card" style="padding:24px; max-width:600px;">
        <div style="font-size:15px; font-weight:700; margin-bottom:6px;">📄 Scegli cosa includere nel documento</div>
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">Seleziona le sezioni che vuoi esportare o stampare come PDF.</div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
          ${[
            ['cb-notifiche', '🔔 Notifiche recenti'],
            ['cb-supplenze', '✍️ Sostituzioni assegnate e accettazioni'],
            ['cb-orario', '📅 Il mio orario personale'],
            ['cb-riepilogo', '📊 Riepilogo ore (da recuperare, recuperate, eccedenti)'],
            ['cb-storico', '📋 Storico completo sostituzioni/recuperi'],
            ['cb-trimestri', '📅 Ripartizione per trimestre'],
          ].map(([id, label]) => `
            <label style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:var(--bg-secondary); border-radius:8px; cursor:pointer; border:1px solid var(--border); transition:border-color 0.2s;">
              <input type="checkbox" id="${id}" checked style="width:18px; height:18px; cursor:pointer;">
              <span style="font-size:14px;">${label}</span>
            </label>`).join('')}
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn btn-ghost btn-sm" id="ts-sel-all-exp">✅ Seleziona Tutti</button>
          <button class="btn btn-ghost btn-sm" id="ts-sel-none-exp">☐ Deseleziona Tutti</button>
          <button class="btn btn-primary" id="ts-generate-doc" style="margin-left:auto;">🖨️ Genera Documento</button>
        </div>
      </div>
    `;

    container.querySelector('#ts-sel-all-exp').onclick = () => container.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked=true);
    container.querySelector('#ts-sel-none-exp').onclick = () => container.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked=false);
    container.querySelector('#ts-generate-doc').onclick = () => generateDocument(container);
  }

  async function generateDocument(container) {
    const sections = {
      notifiche: container.querySelector('#cb-notifiche')?.checked,
      supplenze: container.querySelector('#cb-supplenze')?.checked,
      orario: container.querySelector('#cb-orario')?.checked,
      riepilogo: container.querySelector('#cb-riepilogo')?.checked,
      storico: container.querySelector('#cb-storico')?.checked,
      trimestri: container.querySelector('#cb-trimestri')?.checked,
    };

    APP.toast('Generazione documento in corso…', 'info');
    try {
      const history = await API.get(`/substitutions/history?year_id=${_yearId}&teacher_id=${_teacherId}`);
      const mySubs = history.filter(s => s.substitute_teacher_id == _teacherId);
      const schedule = await API.get(`/schedule?year_id=${_yearId}`);
      const mySlots = schedule.filter(s => s.teacher_id == _teacherId);

      const totalRec = mySubs.filter(s => s.hours_counted).length;
      const totalEcc = mySubs.filter(s => !s.hours_counted).length;
      const totalDebt = (_teacher?.hours_subs||0) + (_teacher?.hours_trips||0);
      const Q = { Q1:{rec:0,ecc:0}, Q2:{rec:0,ecc:0}, Q3:{rec:0,ecc:0} };
      mySubs.forEach(s => {
        const m = new Date(s.date).getMonth()+1;
        const q = [9,10,11].includes(m)?'Q1':[12,1,2].includes(m)?'Q2':'Q3';
        if (s.hours_counted) Q[q].rec++; else Q[q].ecc++;
      });
      const q1t = Math.ceil(totalDebt/3);
      const q2t = Math.ceil((totalDebt-q1t)/2);
      const q3t = Math.max(0, totalDebt-q1t-q2t);

      const allHours = [8,9,10,11,12,13,14,15];
      let body = '';

      if (sections.riepilogo) {
        body += `<h2>📊 Riepilogo Ore</h2>
          <table><tr><th>Totale ore da recuperare</th><th>Recuperate</th><th>Eccedenti</th></tr>
          <tr><td>${totalDebt}</td><td>${totalRec}</td><td>${totalEcc}</td></tr></table>`;
      }
      if (sections.trimestri) {
        body += `<h2>📅 Ripartizione per Trimestre</h2>
          <table><tr><th>Trimestre</th><th>Da Recuperare</th><th>Recuperate</th><th>Eccedenti</th></tr>
          <tr><td>1° Trimestre (Set–Nov)</td><td>${q1t}</td><td>${Q.Q1.rec}</td><td>${Q.Q1.ecc}</td></tr>
          <tr><td>2° Trimestre (Dic–Feb)</td><td>${q2t}</td><td>${Q.Q2.rec}</td><td>${Q.Q2.ecc}</td></tr>
          <tr><td>3° Trimestre (Mar–Giu)</td><td>${q3t}</td><td>${Q.Q3.rec}</td><td>${Q.Q3.ecc}</td></tr></table>`;
      }
      if (sections.storico) {
        body += `<h2>📋 Storico Sostituzioni/Recuperi</h2>
          <table><tr><th>Giorno</th><th>Ora</th><th>Tipo</th><th>Classe</th><th>Firma</th></tr>
          ${mySubs.map(s => `<tr>
            <td>${fmtDate(s.date)}</td><td>${s.hour}ª</td>
            <td>${s.hours_counted?'Recupero Ore':'Ore Eccedenti / Straordinario'}</td>
            <td>${s.class_name||'—'}</td><td>${s.accepted?'✅':'—'}</td>
          </tr>`).join('')}</table>`;
      }
      if (sections.orario) {
        let schedHtml = `<h2>📅 Il Mio Orario</h2>
          <table><tr><th>Ora</th>${DAYS.map(d=>`<th>${DAY_LABELS[d]}</th>`).join('')}</tr>`;
        allHours.forEach(h => {
          schedHtml += `<tr><td>${h-7}ª</td>`;
          DAYS.forEach(d => {
            const slot = mySlots.find(s=>s.day===d&&s.hour===h);
            schedHtml += `<td>${slot?.raw_value||'—'}</td>`;
          });
          schedHtml += '</tr>';
        });
        schedHtml += '</table>';
        body += schedHtml;
      }
      if (sections.supplenze) {
        body += `<h2>✍️ Sostituzioni e Accettazioni</h2>
          <table><tr><th>Data</th><th>Ora</th><th>Classe</th><th>Tipo</th><th>Firmata</th></tr>
          ${mySubs.map(s=>`<tr>
            <td>${fmtDate(s.date)}</td><td>${s.hour}ª</td><td>${s.class_name||'—'}</td>
            <td>${s.hours_counted?'Recupero':'Eccedente'}</td><td>${s.accepted?'✅':'—'}</td>
          </tr>`).join('')}</table>`;
      }

      if (!body) { APP.toast('Seleziona almeno una sezione.', 'warning'); return; }

      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8"><title>Area Docente — ${_teacher?.name||''}</title>
        <style>
          body {font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #0f172a;}
          h1 {font-size: 16px; margin-bottom: 4px;}
          h2 {font-size: 13px; margin: 20px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;}
          .meta {color: #64748b; font-size: 11px; margin-bottom: 20px;}
          table {width: 100%; border-collapse: collapse; margin-bottom: 12px;}
          th {background: #f1f5f9; padding: 5px 8px; text-align: left; font-size: 10px; border: 1px solid #cbd5e1;}
          td {padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 11px;}
          @media print { @page { margin: 1cm; } }
        </style>
      </head><body>
        <h1>👤 La Mia Area Docente</h1>
        <div class="meta">${_teacher?.name||''} — ${_teacher?.subject||''} | Generato: ${new Date().toLocaleString('it-IT')}</div>
        ${body}
      </body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 400);
    } catch(e) {
      APP.toast('Errore: ' + e.message, 'error');
    }
  }

  // ─── AZIONI GLOBALI ─────────────────────────────────────────────────────────

  async function markRead(e, id) {
    e.preventDefault();
    try {
      await API.post(`/notifications/${id}/read`);
      render(document.getElementById('content-area'), APP.getState());
    } catch(e) {}
  }

  async function acceptAssignment(e, id) {
    e.preventDefault();
    try {
      await API.patch(`/substitutions/${id}/accept`);
      APP.toast('Sostituzione accettata con successo', 'success');
      render(document.getElementById('content-area'), APP.getState());
    } catch(e) { APP.toast(e.message, 'error'); }
  }

  async function loadMyRequests(container) {
    const list = container.querySelector('#ts-my-requests');
    if (!list) return;
    try {
      const absences = await API.get(`/absences?year_id=${_yearId}`);
      const myAbsences = absences.filter(a => a.teacher_id == _teacherId);
      if (!myAbsences.length) { list.innerHTML = '<div class="empty-state" style="padding:16px;">Nessuna richiesta inviata.</div>'; return; }
      
      list.innerHTML = `<table class="table" style="font-size:13px;">
        <thead><tr><th>Data</th><th>Tipo</th><th>Stato</th><th>Azione</th></tr></thead>
        <tbody>
          ${myAbsences.map(a => `
            <tr>
              <td><strong>${fmtDate(a.date)}</strong></td>
              <td>${a.type === 'uscita_didattica' ? '🚌 Uscita' : '🚫 Assenza'}</td>
              <td>
                <span class="badge ${a.status==='approved'?'badge-success':'badge-warning'}">
                  ${a.status==='approved'?'✅ Approvata':'⏳ In attesa'}
                </span>
              </td>
              <td>
                <button class="btn btn-ghost btn-sm text-danger" title="Annulla richiesta" onclick="TeacherSelfServiceView.cancelRequest(event,${a.id})">Annulla</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    } catch(e) { list.innerHTML = '<div class="empty-state">Errore caricamento richieste.</div>'; }
  }

  async function cancelRequest(e, id) {
    if (e) e.preventDefault();
    if (!await APP.confirm('Sei sicuro di voler annullare questa richiesta di assenza? Verrà rimossa dal registro.')) return;
    try {
      await API.del(`/absences/teacher-cancel/${id}`);
      APP.toast('Richiesta annullata correttamente', 'success');
      render(document.getElementById('content-area'), APP.getState());
    } catch(e) { APP.toast(e.message, 'error'); }
  }

  return { render, markRead, acceptAssignment, cancelRequest };
})();
