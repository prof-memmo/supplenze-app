/**
 * ADMIN_NOTIFICATIONS.JS
 * Admin panel to manage absence/trip requests from teachers.
 * Optimized structure for maximum reliability.
 */
var AdminNotificationsView = {
  _tab: 'unread', // 'unread' | 'read' | 'logs'
  _search: '',
  _selectedIds: new Set(),

  init: function() {
    console.log('[AdminNotificationsView] Module initialized.');
  },

  render: async function(container, state) {
    console.log('[AdminNotificationsView] Rendering view...', { tab: this._tab, state });

    if (!APP.isAdmin()) {
      container.innerHTML = '<div class="empty-state">Non hai i permessi per visualizzare questa pagina.</div>';
      return;
    }

    this._selectedIds.clear();

    // Count pending
    let pendingCount = 0;
    try {
      const absences = await API.get(`/absences?year_id=${state.yearId}`);
      pendingCount = absences.filter(a => a.status === 'pending').length;
    } catch(e) {
      console.warn('[AdminNotificationsView] Error counting pending:', e);
    }

    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">🔔 Richieste e Segnalazioni</div>
        <div class="flex gap-12 items-center flex-wrap">
          <div class="flex gap-4">
            <button class="btn btn-sm ${this._tab === 'unread' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminNotificationsView.changeTab('unread', this)">
              📥 Da Gestire ${pendingCount > 0 ? `<span style="background:#ef4444; color:#fff; border-radius:99px; font-size:10px; padding:1px 6px; margin-left:4px;">${pendingCount}</span>` : ''}
            </button>
            <button class="btn btn-sm ${this._tab === 'read' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminNotificationsView.changeTab('read', this)">
              ✅ Gestite
            </button>
            ${APP.isAdminMaster() ? `
            <button class="btn btn-sm ${this._tab === 'logs' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminNotificationsView.changeTab('logs', this)">
              📜 Storico
            </button>` : ''}
          </div>
          
          ${this._tab !== 'logs' ? `
            <div style="flex:1; min-width:200px;">
              <input type="text" id="notif-search" class="form-control" placeholder="🔍 Cerca docente..." value="${this._search}" oninput="AdminNotificationsView.handleSearch(this)" style="height:34px; font-size:13px;">
            </div>
          ` : ''}

          ${this._tab === 'unread' ? `
            <button class="btn btn-success btn-sm" id="bulk-approve-btn" onclick="AdminNotificationsView.bulkApprove()" disabled>
              ✅ Segna 0 come gestite
            </button>
          ` : ''}
        </div>
      </div>
      <div id="notif-content-area" style="margin-top:20px">
        <div class="loading-overlay"><div class="spinner"></div> Caricamento...</div>
      </div>
    `;

    const contentDiv = container.querySelector('#notif-content-area');
    this._container = container;
    this._state = state;

    if (this._tab === 'logs') {
      this.renderLogs(contentDiv, state);
    } else {
      this.loadAndRenderList(contentDiv, state);
    }
  },

  changeTab: function(tab, btn) {
    this._tab = tab;
    this._search = '';
    this.render(this._container, this._state);
  },

  handleSearch: function(input) {
    this._search = input.value.toLowerCase();
    const cards = this._container.querySelectorAll('.notif-card');
    cards.forEach(card => {
      const name = (card.dataset.teacher || '').toLowerCase();
      card.style.display = name.includes(this._search) ? '' : 'none';
    });
  },

  renderLogs: async function(container, state) {
    try {
      const db = await API.get('/debug/db');
      const logs = (db.logs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (!logs.length) {
        container.innerHTML = '<div class="empty-state">Nessuna operazione registrata nello storico.</div>';
        return;
      }

      const ACTION_ICONS = {
        LOGIN: '🔑', LOGIN_GOOGLE: '🔑', LOGIN_GOOGLE_NEW: '🔑',
        AGGIUNTA_ASSENZA: '🚫', REGISTRAZIONE: '📝', CREA_UTENTE: '👤',
        SUB_ASSIGN: '✅', BULK_NOTIFY: '🔔', CLEAR_DAY: '🗑️',
        'SISTEMA/ANONIMO': '⚙️'
      };

      container.innerHTML = `
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead style="background:var(--bg-secondary); border-bottom:1px solid var(--border);">
              <tr>
                <th style="padding:10px 16px; text-align:left; width:150px;">Ora/Data</th>
                <th style="text-align:left; width:120px;">Utente</th>
                <th style="text-align:left; width:130px;">Operazione</th>
                <th style="text-align:left;">Dettagli</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => {
                const actionText = String(l.action || '').replace(/_/g, ' ');
                return `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:8px 16px; color:var(--text-secondary); white-space:nowrap; font-size:11px;">${new Date(l.timestamp).toLocaleString('it-IT')}</td>
                  <td style="padding:8px 8px;"><span style="font-weight:600; font-size:12px;">${escHtml(l.username || 'Sistema')}</span></td>
                  <td><span class="badge badge-info" style="font-size:10px;">${ACTION_ICONS[l.action] || '📋'} ${actionText}</span></td>
                  <td style="padding:8px 16px; font-size:12px; color:var(--text-secondary);">${escHtml(l.detail || l.details || '')}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch(e) {
      container.innerHTML = `<div class="empty-state">❌ Errore: ${e.message}</div>`;
    }
  },

  loadAndRenderList: async function(container, state) {
    try {
      let absences = await API.get(`/absences?year_id=${state.yearId}`);

      if (this._tab === 'unread') absences = absences.filter(a => a.status === 'pending');
      else absences = absences.filter(a => a.status !== 'pending');

      absences.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (absences.length === 0) {
        container.innerHTML = `<div class="empty-state">${this._tab === 'unread' ? '✅ Nessuna richiesta da gestire' : 'Nessuna richiesta gestita'}</div>`;
        return;
      }

      container.innerHTML = `
        ${this._tab === 'unread' ? `
          <div style="margin-bottom:12px; padding-left:12px; font-size:12px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:8px;">
              <input type="checkbox" onchange="AdminNotificationsView.toggleAll(this)"> <strong>Seleziona Tutti</strong>
            </label>
          </div>
        ` : ''}
        <div class="grid gap-12" id="notif-list-container">
          ${absences.map(a => this.renderRequestCard(a, state.teachers || [])).join('')}
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="empty-state">❌ Errore: ${e.message}</div>`;
    }
  },

  toggleAll: function(cb) {
    const list = this._container.querySelectorAll('.notif-cb');
    list.forEach(c => {
      if (c.closest('.notif-card').style.display !== 'none') {
        c.checked = cb.checked;
        const id = c.closest('.notif-card').dataset.id;
        if (cb.checked) this._selectedIds.add(id);
        else this._selectedIds.delete(id);
      }
    });
    this.updateBulkUI();
  },

  toggleOne: function(cb, id) {
    if (cb.checked) this._selectedIds.add(id);
    else this._selectedIds.delete(id);
    this.updateBulkUI();
  },

  updateBulkUI: function() {
    const btn = document.getElementById('bulk-approve-btn');
    if (btn) {
      btn.disabled = this._selectedIds.size === 0;
      btn.innerHTML = `✅ Segna ${this._selectedIds.size} come gestite`;
    }
  },

  renderRequestCard: function(a, allTeachers = []) {
    const isUscita = a.type === 'uscita_didattica';
    const isFerie = a.type === 'ferie';
    const isPending = a.status === 'pending';
    const dateStr = a.date_end && a.date_end !== a.date
      ? `dal ${fmtDate(a.date)} al ${fmtDate(a.date_end)}`
      : `il giorno ${fmtDate(a.date)}`;

    return `
      <div class="card notif-card" data-id="${a.id}" data-teacher="${escHtml(a.teacher_name || '')}" style="border-left: 5px solid ${isPending ? 'var(--warning-text)' : 'var(--success-text)'}; ${!isPending ? 'opacity:0.75' : ''}">
        <div class="flex justify-between items-start">
          <div style="display:flex; gap:12px; flex:1">
            ${isPending ? `<input type="checkbox" class="notif-cb" onchange="AdminNotificationsView.toggleOne(this, '${a.id}')" style="margin-top:4px; width:16px; height:16px; cursor:pointer;">` : ''}
            <div>
              <div class="flex items-center gap-8 mb-4">
                <span class="badge ${isUscita ? 'badge-info' : (isFerie ? 'badge-success' : 'badge-warning')}">
                   ${isUscita ? '🚌 USCITA' : (isFerie ? '🏝️ FERIE' : '🚫 ASSENZA')}
                </span>
                <strong style="font-size:15px">${escHtml(a.teacher_name || 'Docente')}</strong>
                <span class="text-muted" style="font-size:12px">• ${dateStr}</span>
              </div>
              <div style="font-size:13px; color:var(--text-primary)">
                ${isUscita ? `Uscita didattica con classi segnalate.` : 
                  (isFerie ? `Sostituti concordati: <strong>${(a.substitutes_identified || []).map(id => allTeachers.find(t=>t.id == id)?.name || id).join(', ')}</strong>` : 
                  `Motivo: <em>${escHtml(a.reason || 'Non specificato')}</em>`)}
              </div>
            </div>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-primary btn-sm" onclick="AdminNotificationsView.goToRegistry('${a.date}')">Registro ➔</button>
            ${isPending ? `<button class="btn btn-success btn-sm" onclick="AdminNotificationsView.approve('${a.id}')">✅</button>` : ''}
          </div>
        </div>
      </div>`;
  },

  approve: async function(id) {
    try {
      await API.patch(`/absences/${id}/status`, { status: 'approved' });
      APP.toast('Richiesta gestita', 'success');
      this.render(this._container, this._state);
    } catch(e) { APP.toast(e.message, 'error'); }
  },

  bulkApprove: async function() {
    if (!await APP.confirm(`Gestire ${this._selectedIds.size} richieste?`)) return;
    try {
      for (let id of this._selectedIds) {
        await API.patch(`/absences/${id}/status`, { status: 'approved' });
      }
      this._selectedIds.clear();
      APP.toast('Richieste aggiornate', 'success');
      this.render(this._container, this._state);
    } catch(e) { APP.toast(e.message, 'error'); }
  },

  goToRegistry: function(date) {
    localStorage.setItem('registry_preselected_date', date);
    APP.navigate('operational_registry');
  }
};

AdminNotificationsView.init();
