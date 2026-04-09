// ══════════════════════════════════════════════════════
// SUBSTITUTIONS VIEW — Vista Operativa Principale
// ══════════════════════════════════════════════════════
var SubstitutionsView = (() => {
  let _date, _yearId, _data=null;

  const STATUS_LABELS = { freed:'Libero (Uscita)', disponibile:'DIS', ricevimento:'Ricevimento', exceeding_in_service:'Eccedente (serv.)', exceeding:'Eccedente/Straordinario', asterisco:'Asterisco' };
  const STATUS_CLASS  = { freed:'freed', disponibile:'dis', ricevimento:'ricevimento', exceeding_in_service:'', exceeding:'' };

  async function render(container, state) {
    _yearId = state.yearId;
    _date = todayISO();
    if (!_yearId) { container.innerHTML='<div class="empty-state"><h3>Seleziona un anno scolastico</h3></div>'; return; }

    container.innerHTML = `
      <div class="page-header"><div class="page-title">📋 Sostituzioni</div><div class="page-subtitle">Vista operativa giornaliera — assegnazione sostituzioni</div></div>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="btn-group" style="margin-right:12px">
            <button class="btn btn-sm btn-ghost" id="sub-prev-day" title="Giorno precedente">◀</button>
            <button class="btn btn-sm btn-ghost" id="sub-next-day" title="Giorno successivo">▶</button>
          </div>
          <input type="date" class="date-input" id="sub-date" value="${_date}"/>
          <span id="sub-day-label" style="color:var(--text-secondary);font-size:14px;font-weight:600"></span>
        </div>
        <div class="toolbar-right flex gap-8">
          <label class="flex items-center gap-4" style="font-size:12px; margin-right:12px">
            <input type="checkbox" id="sub-ask-email" checked> Chiedi prima di inviare email
          </label>
          <button class="btn btn-secondary" id="sub-email-all-btn">📧 Invia Email a Tutti</button>
          <button class="btn btn-secondary" id="sub-refresh-btn">🔄 Aggiorna</button>
          <button class="btn btn-primary" id="sub-autoassign-btn">⚡ Auto-Assegna Tutti</button>
        </div>
      </div>
      <div id="sub-stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px"></div>
      <div id="sub-content"><div class="loading-overlay"><div class="spinner"></div> Caricamento…</div></div>`;

    container.querySelector('#sub-date').onchange = e => { _date=e.target.value; updateLabel(); loadData(); };
    container.querySelector('#sub-prev-day').onclick = () => {
      const d = new Date(_date + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      _date = d.toISOString().slice(0, 10);
      container.querySelector('#sub-date').value = _date;
      updateLabel(); loadData();
    };
    container.querySelector('#sub-next-day').onclick = () => {
      const d = new Date(_date + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      _date = d.toISOString().slice(0, 10);
      container.querySelector('#sub-date').value = _date;
      updateLabel(); loadData();
    };
    container.querySelector('#sub-refresh-btn').onclick = loadData;
    container.querySelector('#sub-autoassign-btn').onclick = autoAssignAll;
    container.querySelector('#sub-email-all-btn').onclick = emailAll;
    updateLabel();
    await loadData();
  }

  function updateLabel() {
    const el = document.getElementById('sub-day-label');
    if (el && _date) el.textContent = getDayName(_date);
  }

  async function loadData() {
    const content = document.getElementById('sub-content');
    if (!content) return;
    content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Caricamento dati…</div>';
    try {
      _data = await API.get(`/substitutions/daily?date=${_date}&year_id=${_yearId}`);
      renderStats();
      renderTable(content);
    } catch(e) {
      content.innerHTML = `<div class="empty-state"><div class="icon">❌</div><h3>${e.message}</h3></div>`;
    }
  }

  function renderStats() {
    const statsRow = document.getElementById('sub-stats-row');
    if (!statsRow || !_data) return;
    const slots = _data.slots || [];
    const total    = slots.length;
    const covered  = slots.filter(s=>s.existing_substitutions?.some(x=>x.substitute_teacher_id)).length;
    const absCount = ((_data.absences)||[]).length;
    const tripCount= ((_data.trips)||[]).length;
    statsRow.innerHTML = `
      <div class="stat-card"><div class="stat-value" style="font-size:24px">${total}</div><div class="stat-label">Slot da coprire</div></div>
      <div class="stat-card danger"><div class="stat-value" style="font-size:24px">${total-covered}</div><div class="stat-label">Non coperti</div></div>
      <div class="stat-card success"><div class="stat-value" style="font-size:24px">${covered}</div><div class="stat-label">Coperti</div></div>
      <div class="stat-card warning"><div class="stat-value" style="font-size:24px">${absCount}</div><div class="stat-label">Assenze • ${tripCount} uscite</div></div>`;
    const badge = document.getElementById('badge-subs');
    if (badge) { const u = total-covered; badge.textContent=u; badge.style.display = u>0?'inline':'none'; }
  }

  function renderTable(container) {
    const slots = _data?.slots || [];
    if (!slots.length) {
      container.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Nessuna sostituzione necessaria</h3><p>Non ci sono assenze o uscite che richiedono copertura per questa data.</p></div>`;
      return;
    }

    let html = `<div class="table-wrapper"><table class="sub-table">
      <thead><tr>
        <th>Ora</th><th>Titolare</th><th>Classe</th><th>Motivo</th>
        <th>Supplente D</th><th>Supplente E</th>
        <th>Compresenza</th><th>Disponibili</th><th>Note</th>
      </tr></thead><tbody>`;

    for (const slot of slots) {
      const rowClass = slot.type === 'absence' ? 'sub-row-absence' : 'sub-row-freed';
      const motivo = slot.type === 'absence'
        ? `<span class="badge badge-danger">Assente</span>${slot.reason?`<br><small style="color:var(--text-secondary)">${escHtml(slot.reason)}</small>`:''}`
        : `<span class="badge badge-freed">Liberato da uscita</span>`;

      const titolare = slot.type === 'absence'
        ? escHtml(slot.absent_teacher_name||'—')
        : escHtml(slot.freed_teacher_name||'—');

      const existing = slot.existing_substitutions || [];
      const subD = existing[0];
      const subE = existing[1];

      const optionsHTML = (excludeId) => {
        const available = slot.available_teachers || [];
        const opts = available.filter(a => a.teacher.id !== excludeId).map(a =>
          `<option value="${a.teacher.id}" data-status="${a.status}">${escHtml(a.teacher.name)} [${STATUS_LABELS[a.status]||a.status}${a.teacher.hours_to_recover>0?' ★'+a.teacher.hours_to_recover:''}]</option>`
        ).join('');
        return `<option value="">— Seleziona —</option>${opts}`;
      };

      const slotKey = `${slot.hour}_${slot.class_id}_${slot.absent_teacher_id||slot.freed_teacher_id}`;

      const coTeacherHtml = (slot.co_teachers||[]).length
        ? slot.co_teachers.map(c=>`<span class="badge badge-info" style="font-size:10px">${escHtml(c.name)}</span>`).join(' ')
        : '<span style="color:var(--text-muted)">—</span>';

      const availChips = (slot.available_teachers||[]).slice(0,6).map(a =>
        `<span class="avail-chip ${STATUS_CLASS[a.status]||''}" title="${STATUS_LABELS[a.status]||''}">${escHtml(a.teacher.name.split(' ')[0])}</span>`
      ).join('');

      html += `<tr class="${rowClass}" data-slot='${JSON.stringify({hour:slot.hour,class_id:slot.class_id,absent_id:slot.absent_teacher_id||slot.freed_teacher_id,type:slot.type})}'>
        <td><span class="hour-badge">${slot.hour}</span></td>
        <td>${titolare}</td>
        <td><strong>${escHtml(slot.class_name||'—')}</strong></td>
        <td>${motivo}</td>
        <td class="teacher-select-cell">
          <select class="sub-select" data-col="D" data-slot-key="${escHtml(slotKey)}" data-sub-id="${subD?.id||''}" onchange="SubstitutionsView.onSubChange(this,${JSON.stringify(JSON.stringify(slot))})">
            ${optionsHTML(subE?.substitute_teacher_id)}
          </select>
        </td>
        <td class="teacher-select-cell">
          <select class="sub-select" data-col="E" data-slot-key="${escHtml(slotKey)}" data-sub-id="${subE?.id||''}" onchange="SubstitutionsView.onSubChange(this,${JSON.stringify(JSON.stringify(slot))})">
            ${optionsHTML(subD?.substitute_teacher_id)}
          </select>
        </td>
        <td>${coTeacherHtml}</td>
        <td><div class="available-list">${availChips||'<span style="color:var(--text-muted);font-size:12px">Nessuno</span>'}</div></td>
        <td><input type="text" placeholder="Note…" style="width:120px;height:28px;font-size:12px" class="sub-note" data-slot-key="${escHtml(slotKey)}"/></td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;

    // Restore existing selections
    for (const slot of slots) {
      const existing = slot.existing_substitutions || [];
      const slotKey = `${slot.hour}_${slot.class_id}_${slot.absent_teacher_id||slot.freed_teacher_id}`;
      const selects = container.querySelectorAll(`select[data-slot-key="${slotKey}"]`);
      if (existing[0]?.substitute_teacher_id && selects[0]) selects[0].value = existing[0].substitute_teacher_id;
      if (existing[1]?.substitute_teacher_id && selects[1]) selects[1].value = existing[1].substitute_teacher_id;
    }
  }

  async function onSubChange(select, slotJson) {
    const slot = typeof slotJson === 'string' ? JSON.parse(slotJson) : slotJson;
    const teacherId = select.value ? parseInt(select.value) : null;
    const existingSubId = select.dataset.subId ? parseInt(select.dataset.subId) : null;
    const askEmail = document.getElementById('sub-ask-email')?.checked;

    try {
      if (teacherId) {
        // ASSIGN OR UPDATE
        const res = await API.post('/substitutions/assign', {
          date: _date, hour: slot.hour, class_id: slot.class_id,
          absent_teacher_id: slot.absent_id, substitute_teacher_id: teacherId,
          sub_type: slot.type, school_year_id: _yearId
        });
        select.dataset.subId = res.id;
        
        // Notify
        const teacher = (await API.get(`/teachers?year_id=${_yearId}`)).find(t => t.id == teacherId);
        if (teacher && teacher.email) {
          let proceed = true;
          if (askEmail) proceed = await APP.confirm(`Inviare email di notifica a ${teacher.name}?`);
          if (proceed) {
            Engine.sendEmail(teacher.email, `Nuova Sostituzione: Classe ${slot.class_name}`, `Ti è stata assegnata una sostituzione alla ${slot.hour} ora in classe ${slot.class_name} il giorno ${fmtDate(_date)}.`);
            APP.toast('Email inviata!', 'info', 2000);
          }
        }
      } else if (existingSubId) {
        // DELETE
        // Get old sub to know who to notify for cancellation
        const history = await API.get(`/substitutions/history?year_id=${_yearId}&from=${_date}&to=${_date}`);
        const oldSub = history.find(h => h.id == existingSubId);

        await API.del(`/substitutions/${existingSubId}`);
        select.dataset.subId = '';

        if (oldSub && oldSub.substitute_teacher_id) {
          const teacher = (await API.get(`/teachers?year_id=${_yearId}`)).find(t => t.id == oldSub.substitute_teacher_id);
          if (teacher && teacher.email) {
            let proceed = true;
            if (askEmail) proceed = await APP.confirm(`Inviare email di CANCELLAZIONE a ${teacher.name}?`);
            if (proceed) {
              Engine.sendEmail(teacher.email, `Cancellazione Sostituzione: Classe ${slot.class_name}`, `La sostituzione prevista per la ${slot.hour} ora in classe ${slot.class_name} il giorno ${fmtDate(_date)} è stata CANCELLATA.`);
              APP.toast('Email di cancellazione inviata!', 'warning', 2000);
            }
          }
        }
      }
      APP.toast('Operazione completata ✔', 'success', 2000);
      renderStats();
    } catch(e) { APP.toast(e.message, 'error'); select.value = ''; }
  }

  async function emailAll() {
    const history = await API.get(`/substitutions/history?year_id=${_yearId}&from=${_date}&to=${_date}`);
    const assigned = history.filter(h => h.substitute_teacher_id);
    if (assigned.length === 0) { APP.toast('Nessuna sostituzione assegnata da notificare.', 'warning'); return; }

    const proceed = await APP.confirm(`Inviare ${assigned.length} email di notifica a tutti i sostituti di oggi?`);
    if (!proceed) return;

    let sent = 0;
    const teachers = await API.get(`/teachers?year_id=${_yearId}`);
    for (const sub of assigned) {
      const t = teachers.find(x => x.id == sub.substitute_teacher_id);
      if (t && t.email) {
        Engine.sendEmail(t.email, `Riepilogo Sostituzione ${fmtDate(_date)}`, `Ti ricordiamo la sostituzione alla ${sub.hour} ora in classe ${sub.class_name}.`);
        sent++;
      }
    }
    APP.toast(`${sent} email inviate con successo!`, 'success');
  }

  async function autoAssignAll() {
    if (!_data?.slots) return;
    let assigned = 0, failed = 0;
    for (const slot of _data.slots) {
      const existing = slot.existing_substitutions || [];
      if (existing.some(x=>x.substitute_teacher_id)) continue; // already assigned
      const best = (slot.available_teachers||[])[0];
      if (!best) { failed++; continue; }
      try {
        await API.post('/substitutions/assign', {
          date: _date, hour: slot.hour, class_id: slot.class_id,
          absent_teacher_id: slot.absent_teacher_id || slot.freed_teacher_id,
          substitute_teacher_id: best.teacher.id,
          sub_type: slot.type, school_year_id: _yearId
        });
        assigned++;
      } catch { failed++; }
    }
    APP.toast(`Auto-assegnazione: ${assigned} sostituzioni assegnate${failed?`, ${failed} non assegnabili`:''}`, assigned>0?'success':'warning');
    await loadData();
  }

  return { render, onSubChange };
})();
