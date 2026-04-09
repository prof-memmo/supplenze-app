var SettingsView = (() => {
  let _activeTab = 'years';
  let _yearId = null;

  async function render(container, state) {
    _yearId = state.yearId;
    const user = state.user;
    const isAdminMaster = user?.role === 'admin_master';
    
    if (user?.role === 'teacher') {
      container.innerHTML='<div class="empty-state"><div class="icon">🔒</div><h3>Accesso non autorizzato</h3></div>'; return;
    }
    
    // Available tabs based on role
    const allTabs = ['years','classes','users','log','password'];
    const visibleTabs = isAdminMaster ? allTabs : allTabs.filter(t => t !== 'log');
    
    container.innerHTML = `
      <div class="page-header"><div class="page-title">⚙️ Impostazioni</div><div class="page-subtitle">Anni scolastici, classi e gestione utenti</div></div>
      <div style="display:flex;gap:4px;margin-bottom:20px;background:var(--bg-secondary);padding:4px;border-radius:var(--radius);width:fit-content;overflow-x:auto;max-width:100%">
        ${visibleTabs.map(t=>`
          <button class="btn ${_activeTab===t?'btn-primary':'btn-ghost'} btn-sm" style="border-radius:6px; white-space:nowrap" onclick="SettingsView.setTab('${t}')" id="tab-${t}">
            ${{years:'🗓 Anni',classes:'🏫 Classi',users:'👥 Utenti',log:'📜 Log Sistema',password:'🔐 Password'}[t]}
          </button>`).join('')}
      </div>
      <div id="settings-content"></div>`;
    // Reset to 'years' if on 'log' tab but not admin_master
    if (_activeTab === 'log' && !isAdminMaster) _activeTab = 'years';
    loadTab();
  }

  function setTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('[id^="tab-"]').forEach(b => {
      b.className = `btn btn-ghost btn-sm`;
      b.style.borderRadius='6px';
    });
    const active = document.getElementById('tab-'+tab);
    if (active) { active.className='btn btn-primary btn-sm'; active.style.borderRadius='6px'; }
    loadTab();
  }

  function loadTab() {
    const content = document.getElementById('settings-content');
    if (!content) return;
    const fns = { years: loadYears, classes: loadClasses, users: loadUsers, log: loadActivityLog, password: renderPasswordChange };
    (fns[_activeTab]||loadYears)(content);
  }

  async function loadActivityLog(el) {
    el.innerHTML='<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const logs = await API.get('/settings/log');
      el.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📜 Log Attività Recenti</div>
            <button class="btn btn-danger btn-sm" onclick="SettingsView.openClearHistoryModal()">🗑️ Svuota Storico Sostituzioni</button>
          </div>
          <div class="table-wrapper"><table>
            <thead><tr><th>Data/Ora</th><th>Utente</th><th>Azione</th><th>Dettaglio</th></tr></thead>
            <tbody>${logs.map(l=>`
              <tr>
                <td style="font-size:11px; white-space:nowrap">${new Date(l.timestamp).toLocaleString('it-IT')}</td>
                <td><strong>${escHtml(l.username)}</strong></td>
                <td><span class="badge badge-neutral" style="font-size:10px">${l.action}</span></td>
                <td style="font-size:12px; color:var(--text-secondary)">${escHtml(l.detail)}</td>
              </tr>`).join('')}
              ${!logs.length?'<tr><td colspan="4" style="text-align:center;padding:20px">Nessun log presente</td></tr>':''}
            </tbody></table></div>
        </div>`;
    } catch(e) { APP.toast(e.message,'error'); }
  }

  function openClearHistoryModal() {
    const ov = APP.modal({
      title: '⚠️ Svuota Storico Sostituzioni',
      body: `
        <div style="background:var(--danger-bg); padding:16px; border-radius:8px; margin-bottom:16px; border:1px solid var(--danger-text)">
          <h4 style="color:var(--danger-text); margin-bottom:8px">Conseguenze di questa azione:</h4>
          <ul style="color:var(--danger-text); padding-left:20px; line-height:1.5">
            <li><strong>Tutte le sostituzioni, assenze e uscite</strong> registrate fino ad oggi verranno eliminate definitivamente.</li>
            <li>Le ore di recupero scalate da ciascun docente verranno <strong>automaticamente rimborsate</strong> (i debiti si ripristineranno ai valori iniziali).</li>
            <li><strong>Tutte le notifiche e i log di sistema</strong> verranno cancellati per pulire l'area log.</li>
            <li>L'operazione è di natura sistemica e irreversibile.</li>
          </ul>
        </div>
        <p>Sei sicuro di voler effettuare un <strong>Reset Operativo Totale</strong> di sistema?</p>
      `,
      footer: `<button class="btn btn-secondary" id="ch-cancel">Annulla</button><button class="btn btn-danger" id="ch-save">Conferma e Svuota</button>`
    });
    
    ov.querySelector('#ch-cancel').onclick = () => ov.remove();
    ov.querySelector('#ch-save').onclick = async () => {
      try {
        await API.post('/settings/clear-history');
        ov.remove();
        APP.toast('Storico sostituzioni svuotato. Tutti i docenti sono stati rimborsati.', 'success');
        // Refresh log tab
        setTab('log');
      } catch(e) {
        APP.toast('Errore: ' + e.message, 'error');
      }
    };
  }

  // ── ANNI SCOLASTICI ──
  async function loadYears(container) {
    const el = document.getElementById('settings-content');
    el.innerHTML='<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const years = await API.get('/settings/years');
      const isAdminMaster = APP.getState().user?.role === 'admin_master';
      el.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">Anni Scolastici</div>
            <div style="display:flex;gap:8px">
              ${isAdminMaster ? `
                <button class="btn btn-secondary btn-sm" id="reset-db-btn">🗑 Ripristina Esempi</button>
                <button class="btn btn-accent btn-sm" id="seed-test-btn">🧪 Carica Dati Test</button>
              ` : ''}
              <button class="btn btn-primary btn-sm" id="add-year-btn">+ Nuovo Anno</button>
            </div>
          </div>
          <div class="table-wrapper"><table>
            <thead><tr><th>Anno</th><th>Inizio</th><th>Fine</th><th>Stato</th><th>Azioni</th></tr></thead>
            <tbody>${years.map(y=>`
              <tr>
                <td><strong>${escHtml(y.name)}</strong></td>
                <td>${fmtDate(y.start_date)}</td><td>${fmtDate(y.end_date)}</td>
                <td>${y.is_active?'<span class="badge badge-success">✓ Attivo</span>':'<span class="badge badge-neutral">Inattivo</span>'}</td>
                <td style="display:flex;gap:4px">
                  ${!y.is_active?`<button class="btn btn-success btn-sm" onclick="SettingsView.activateYear(${y.id})">Attiva</button>`:''}
                  <button class="btn btn-ghost btn-sm" onclick="SettingsView.deleteYear(${y.id})">🗑️</button>
                </td>
              </tr>`).join('')}
            </tbody></table></div>
        </div>`;
      el.querySelector('#add-year-btn').onclick = openYearModal;
      el.querySelector('#seed-test-btn')?.addEventListener('click', async () => {
        if (await APP.confirm('Caricare i dati di test complessi per il 2025/26?')) {
          const res = await SeedData.run(yearId);
          APP.toast(res.message, 'success');
          loadTab();
        }
      });
      el.querySelector('#reset-db-btn')?.addEventListener('click', async () => {
        if (await APP.confirm('ATTENZIONE: Questo cancellerà tutti i tuoi dati attuali e caricherà i docenti di esempio. Procedere?')) {
          await API.post('/settings/reset');
        }
      });
    } catch(e) { APP.toast(e.message,'error'); }
  }

  function openYearModal() {
    const ov = APP.modal({
      title: 'Nuovo Anno Scolastico',
      body: `
        <div class="form-group"><label>Nome *</label><input type="text" id="y-name" placeholder="es. 2025/2026"/></div>
        <div class="form-group"><label>Data inizio *</label><input type="date" id="y-start"/></div>
        <div class="form-group"><label>Data fine *</label><input type="date" id="y-end"/></div>`,
      footer: `<button class="btn btn-secondary" id="y-cancel">Annulla</button><button class="btn btn-primary" id="y-save">Crea Anno</button>`
    });
    ov.querySelector('#y-cancel').onclick = () => ov.remove();
    ov.querySelector('#y-save').onclick = async () => {
      const name=ov.querySelector('#y-name').value.trim(), start=ov.querySelector('#y-start').value, end=ov.querySelector('#y-end').value;
      if (!name||!start||!end) { APP.toast('Compila tutti i campi','error'); return; }
      try { await API.post('/settings/years',{name,start_date:start,end_date:end}); ov.remove(); await APP.loadYears(); setTab('years'); APP.toast('Anno creato','success'); }
      catch(e) { APP.toast(e.message,'error'); }
    };
  }

  async function activateYear(id) {
    try { await API.put(`/settings/years/${id}/activate`); await APP.loadYears(); setTab('years'); APP.toast('Anno attivato','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  async function deleteYear(id) {
    if (!await APP.confirm('Eliminare questo anno? Tutti i dati associati saranno eliminati.')) return;
    try { await API.del(`/settings/years/${id}`); await APP.loadYears(); setTab('years'); APP.toast('Anno eliminato','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  // ── CLASSI ──
  async function loadClasses(container) {
    const yearId = APP.getState().yearId;
    const el = document.getElementById('settings-content');
    if (!yearId) { el.innerHTML='<div class="empty-state"><h3>Seleziona un anno scolastico</h3></div>'; return; }
    el.innerHTML='<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const classes = await API.get(`/settings/classes?year_id=${yearId}`);
      el.innerHTML = `
        <div class="card">
          <div class="card-header">
            <div><div class="card-title">Classi (${classes.length})</div></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary btn-sm" id="bulk-class-btn">+ Aggiungi Più Classi</button>
              <button class="btn btn-primary btn-sm" id="add-class-btn">+ Aggiungi Classe</button>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">
            ${classes.map(c=>`
              <span class="badge badge-neutral" style="font-size:13px;padding:6px 12px">
                ${escHtml(c.name)}
                <span style="cursor:pointer;margin-left:6px;color:var(--danger-text)" onclick="SettingsView.deleteClass(${c.id},'${escHtml(c.name)}')">✕</span>
              </span>`).join('')}
            ${!classes.length?'<div class="empty-state" style="padding:16px;width:100%"><p>Nessuna classe configurata</p></div>':''}
          </div>
        </div>`;
      el.querySelector('#add-class-btn').onclick = () => openClassModal(yearId);
      el.querySelector('#bulk-class-btn').onclick = () => openBulkClassModal(yearId);
    } catch(e) { APP.toast(e.message,'error'); }
  }

  function openClassModal(yearId) {
    const ov = APP.modal({
      title: 'Aggiungi Classe',
      body: `<div class="form-group"><label>Nome classe *</label><input type="text" id="cls-name" placeholder="es. 2A" autofocus/></div>`,
      footer: `<button class="btn btn-secondary" id="cls-cancel">Annulla</button><button class="btn btn-primary" id="cls-save">Aggiungi</button>`
    });
    ov.querySelector('#cls-cancel').onclick = () => ov.remove();
    ov.querySelector('#cls-save').onclick = async () => {
      const name = ov.querySelector('#cls-name').value.trim();
      if (!name) { APP.toast('Nome obbligatorio','error'); return; }
      try { await API.post('/settings/classes',{name,school_year_id:yearId}); ov.remove(); setTab('classes'); APP.toast('Classe aggiunta','success'); }
      catch(e) { APP.toast(e.message,'error'); }
    };
  }

  function openBulkClassModal(yearId) {
    const ov = APP.modal({
      title: 'Aggiungi Più Classi',
      body: `<div class="form-group"><label>Nomi classi (uno per riga)</label><textarea id="bulk-names" style="height:150px" placeholder="1A\n1B\n2A\n2B\n3A\n3B"></textarea></div>`,
      footer: `<button class="btn btn-secondary" id="bk-cancel">Annulla</button><button class="btn btn-primary" id="bk-save">Aggiungi Tutte</button>`
    });
    ov.querySelector('#bk-cancel').onclick = () => ov.remove();
    ov.querySelector('#bk-save').onclick = async () => {
      const names = ov.querySelector('#bulk-names').value.split('\n').map(s=>s.trim()).filter(Boolean);
      if (!names.length) { APP.toast('Inserisci almeno un nome','error'); return; }
      try { await API.post('/settings/classes/bulk',{names,school_year_id:yearId}); ov.remove(); setTab('classes'); APP.toast(`${names.length} classi aggiunte`,'success'); }
      catch(e) { APP.toast(e.message,'error'); }
    };
  }

  async function deleteClass(id, name) {
    if (!await APP.confirm(`Eliminare la classe ${name}?`)) return;
    try { await API.del(`/settings/classes/${id}`); setTab('classes'); APP.toast('Classe eliminata','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  async function loadUsers() {
    const el = document.getElementById('settings-content');
    const state = APP.getState();
    const isAdminMaster = state.user?.role === 'admin_master';
    
    el.innerHTML='<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const [users, teachers] = await Promise.all([API.get('/settings/users'), API.get(`/teachers?year_id=${APP.getState().yearId}`)]);
      const ROLES = { admin_master: '👑 Admin Master', admin:'Amministratore', secretary:'Segreteria', director:'Dirigente', teacher:'Docente' };
      const ROLE_BADGES = { admin_master:'badge-warning', admin:'badge-danger', director:'badge-accent', secretary:'badge-warning', teacher:'badge-neutral' };
      el.innerHTML = `
        <div class="card">
          <div class="card-header"><div class="card-title">Utenti (${users.length})</div>${isAdminMaster ? '<button class="btn btn-primary btn-sm" id="add-user-btn">+ Nuovo Utente</button>' : ''}</div>
          <div class="table-wrapper"><table>
            <thead><tr><th>Username</th><th>Ruolo</th><th>Docente collegato</th><th>Creato il</th>${isAdminMaster ? '<th>Azioni</th>' : ''}</tr></thead>
            <tbody>${users.map(u=>`
              <tr>
                <td><strong>${escHtml(u.username)}</strong></td>
                <td><span class="badge ${ROLE_BADGES[u.role]||'badge-neutral'}">${ROLES[u.role]||u.role}</span></td>
                <td>${u.teacher_id?escHtml(teachers.find(t=>t.id===u.teacher_id)?.name||'—'):'—'}</td>
                <td style="color:var(--text-secondary);font-size:12px">${fmtDate(u.created_at?.slice(0,10))}</td>
                ${isAdminMaster ? `<td style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="SettingsView.openUserModal(${u.id})">✏️</button>
                  <button class="btn btn-ghost btn-sm" onclick="SettingsView.deleteUser(${u.id},'${escHtml(u.username)}')">🗑️</button>
                </td>` : '<td></td>'}
              </tr>`).join('')}
            </tbody></table></div>
        </div>`;
      if (isAdminMaster) el.querySelector('#add-user-btn')?.addEventListener('click', () => openUserModal(null));
    } catch(e) { APP.toast(e.message,'error'); }
  }

  async function openUserModal(userId) {
    const teachers = await API.get(`/teachers?year_id=${APP.getState().yearId}`).catch(()=>[]);
    let user = null;
    if (userId) { const users = await API.get('/settings/users').catch(()=>[]); user = users.find(u=>u.id===userId); }
    const ov = APP.modal({
      title: user ? 'Modifica Utente' : 'Nuovo Utente',
      body: `
        <div class="form-group"><label>Username *</label><input type="text" id="u-username" value="${escHtml(user?.username||'')}" ${user?'readonly':''}  placeholder="username"/></div>
        <div class="form-group"><label>Password ${user?'(lascia vuoto per non cambiare)':'*'}</label><input type="password" id="u-password" placeholder="min 6 caratteri"/></div>
        <div class="form-group"><label>Ruolo *</label>
          <select id="u-role" data-no-tomselect="1">
            <option value="admin_master" ${user?.role==='admin_master'?'selected':''}>👑 Admin Master (accesso completo)</option>
            <option value="admin" ${user?.role==='admin'?'selected':''}>🔑 Amministratore</option>
            <option value="director" ${user?.role==='director'?'selected':''}>🏫 Dirigente</option>
            <option value="secretary" ${user?.role==='secretary'?'selected':''}>📋 Segreteria</option>
            <option value="teacher" ${user?.role==='teacher'?'selected':''}>👨‍🏫 Docente</option>
          </select>
        </div>
        <div class="form-group"><label>Docente collegato (opzionale)</label>
          <select id="u-teacher" data-no-tomselect="1"><option value="">— Nessuno —</option>${teachers.map(t=>`<option value="${t.id}" ${user?.teacher_id===t.id?'selected':''}>${escHtml(t.name)}</option>`).join('')}</select>
        </div>`,
      footer: `<button class="btn btn-secondary" id="u-cancel">Annulla</button><button class="btn btn-primary" id="u-save">Salva</button>`
    });
    ov.querySelector('#u-cancel').onclick = () => ov.remove();
    ov.querySelector('#u-save').onclick = async () => {
      const payload = {
        username: ov.querySelector('#u-username').value.trim(),
        password: ov.querySelector('#u-password').value,
        role: ov.querySelector('#u-role').value,
        teacher_id: ov.querySelector('#u-teacher').value ? parseInt(ov.querySelector('#u-teacher').value) : null
      };
      if (!user && !payload.password) { APP.toast('Password obbligatoria','error'); return; }
      try {
        if (user) await API.put(`/settings/users/${user.id}`, payload); else await API.post('/settings/users', payload);
        ov.remove(); setTab('users'); APP.toast('Utente salvato','success');
      } catch(e) { APP.toast(e.message,'error'); }
    };
  }

  async function deleteUser(id, username) {
    if (!await APP.confirm(`Eliminare l'utente "${username}"?`)) return;
    try { await API.del(`/settings/users/${id}`); setTab('users'); APP.toast('Utente eliminato','success'); }
    catch(e) { APP.toast(e.message,'error'); }
  }

  // ── CAMBIO PASSWORD ──
  function renderPasswordChange() {
    const el = document.getElementById('settings-content');
    el.innerHTML = `
      <div class="card" style="max-width:420px">
        <div class="card-header"><div class="card-title">🔐 Cambia Password</div></div>
        <div class="form-group"><label>Password attuale *</label><input type="password" id="pw-current"/></div>
        <div class="form-group"><label>Nuova password *</label><input type="password" id="pw-new"/></div>
        <div class="form-group"><label>Conferma nuova password *</label><input type="password" id="pw-confirm"/></div>
        <button class="btn btn-primary" id="pw-save-btn">Aggiorna Password</button>
      </div>`;
    el.querySelector('#pw-save-btn').onclick = async () => {
      const cur = el.querySelector('#pw-current').value;
      const nw  = el.querySelector('#pw-new').value;
      const conf= el.querySelector('#pw-confirm').value;
      if (!cur||!nw) { APP.toast('Compila tutti i campi','error'); return; }
      if (nw !== conf) { APP.toast('Le password non coincidono','error'); return; }
      if (nw.length < 6) { APP.toast('La password deve avere almeno 6 caratteri','error'); return; }
      try { await API.post('/auth/change-password',{currentPassword:cur,newPassword:nw}); APP.toast('Password aggiornata con successo','success'); el.querySelector('#pw-current').value=el.querySelector('#pw-new').value=el.querySelector('#pw-confirm').value=''; }
      catch(e) { APP.toast(e.message,'error'); }
    };
  }

  return { render, setTab, activateYear, deleteYear, deleteClass, openUserModal, deleteUser, openClearHistoryModal };
})();
