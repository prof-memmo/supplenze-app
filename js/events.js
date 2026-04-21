/**
 * EVENTS.JS
 * Gestione degli eventi scolastici (classi, docenti, orario e giorno).
 */
var EventsView = (() => {
  let _yearId, _teachers = [], _classes = [];

  async function render(container, state) {
    if (!state.yearId) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px">
          <div class="icon" style="font-size:48px; margin-bottom:16px;">📅</div>
          <h3 style="margin-bottom:8px;">Eventi Scolastici</h3>
          <p style="color:var(--text-secondary); max-width:400px; margin:0 auto 20px;">
            Seleziona l'<strong>Anno Scolastico</strong> per visualizzare o aggiungere eventi.
          </p>
        </div>`;
      return;
    }

    _yearId = state.yearId;
    container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Caricamento eventi...</div>';

    try {
      const [events, teachers, classes] = await Promise.all([
        API.get(`/events?year_id=${_yearId}`),
        API.get(`/teachers?year_id=${_yearId}`),
        API.get(`/settings/classes?year_id=${_yearId}`)
      ]);

      _teachers = teachers || [];
      _classes = classes || [];

      // Filtriamo per mostrare solo eventi futuri (o tutti, visto che è un elenco)
      // Per ora mostriamo tutto ordinato per data
      const sortedEvents = (events || []).sort((a,b) => new Date(a.date) - new Date(b.date));

      container.innerHTML = `
        <div class="page-header" style="margin-bottom: 24px;">
          <div class="flex justify-between items-center">
            <div>
              <div class="page-title">📅 Eventi Scolastici</div>
              <p class="text-muted" style="font-size: 13px; margin-top: 4px;">Pianificazione e condivisione attività scolastiche</p>
            </div>
            <button class="btn btn-primary" id="event-add-btn">
              <span style="font-size: 18px; margin-right: 8px;">+</span> Aggiungi Evento
            </button>
          </div>
        </div>

        <div class="events-container">
          ${renderEventsList(sortedEvents)}
        </div>
      `;

      container.querySelector('#event-add-btn').onclick = () => openEventModal(container, state);

    } catch (e) {
      container.innerHTML = `<div class="empty-state">❌ Errore caricamento eventi: ${e.message}</div>`;
    }
  }

  function renderEventsList(list) {
    if (!list.length) {
      return `
        <div class="empty-state" style="padding: 60px; background: var(--bg-secondary); border-radius: 16px; border: 2px dashed var(--border);">
          <div style="font-size: 48px; margin-bottom: 16px;">🗓️</div>
          <h3>Nessun evento programmato</h3>
          <p class="text-muted">Inizia aggiungendo il primo evento per quest'anno scolastico.</p>
        </div>
      `;
    }

    // Raggruppiamo per mese per una visualizzazione migliore?
    return `
      <div class="events-list" style="display: flex; flex-direction: column; gap: 16px;">
        ${list.map(event => renderEventCard(event)).join('')}
      </div>
    `;
  }

  function renderEventCard(e) {
    const eventDate = new Date(e.date);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
    const weekday = eventDate.toLocaleDateString('it-IT', { weekday: 'short' });
    
    // Cerchiamo i nomi delle classi
    const classNames = (e.class_ids || []).map(id => _classes.find(c => c.id == id)?.name || '?').join(', ');
    const teacherNames = (e.teacher_ids || []).map(id => _teachers.find(t => t.id == id)?.name || '?').join(', ');

    const creator = e.created_by_name || 'Docente';
    const canDelete = APP.isAdmin() || (APP.getState().user?.username === e.created_by);

    return `
      <div class="event-card" style="display: flex; background: white; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div class="event-date-box" style="width: 80px; background: var(--bg-secondary); display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid var(--border); padding: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${weekday}</div>
          <div style="font-size: 28px; font-weight: 800; color: var(--accent); line-height: 1;">${day}</div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${month}</div>
        </div>
        
        <div class="event-content" style="flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div class="flex justify-between items-start">
            <h3 style="margin: 0; font-size: 18px; color: var(--text-primary); font-weight: 700;">${escHtml(e.title)}</h3>
            ${canDelete ? `<button class="btn btn-ghost btn-sm" onclick="EventsView.deleteEvent('${e.id}')" style="color: var(--danger-text)">🗑️</button>` : ''}
          </div>
          
          <div class="event-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 4px;">
            <div class="detail-item">
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">🏢 Classi</span>
              <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${escHtml(classNames || 'Tutte')}</span>
            </div>
            <div class="detail-item">
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">👨‍🏫 Docenti</span>
              <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${escHtml(teacherNames || '—')}</span>
            </div>
            <div class="detail-item">
              <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; display: block;">🕒 Orario</span>
              <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${escHtml(e.time_range || '—')}</span>
            </div>
          </div>
          
          ${e.description ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--bg-secondary);">${escHtml(e.description)}</div>` : ''}
          
          <div class="event-footer" style="margin-top: 12px; display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted);">
            <div class="user-avatar-mini" style="width: 18px; height: 18px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${creator.charAt(0)}</div>
            <span>Aggiunto da <strong>${escHtml(creator)}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  async function openEventModal(container, state) {
    const ov = APP.modal({
      title: '📅 Programma Nuovo Evento',
      size: 'modal-md',
      body: `
        <div class="form-group">
          <label>Titolo Evento *</label>
          <input type="text" id="ev-m-title" placeholder="Es: Progetto Scacchi, Incontro Orientamento..." required/>
        </div>
        
        <div class="form-group">
          <label>Data *</label>
          <input type="date" id="ev-m-date" value="${new Date().toISOString().slice(0,10)}" required/>
        </div>

        <div class="grid grid-cols-2 gap-12">
          <div class="form-group">
            <label>Classi Coinvolte</label>
            <select id="ev-m-classes" multiple placeholder="Seleziona classi">
              ${_classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Docenti Coinvolti</label>
            <select id="ev-m-teachers" multiple placeholder="Seleziona docenti">
              ${_teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Fascia Oraria / Ore (es: 2ª - 4ª ora, oppure 09:00 - 11:00)</label>
          <input type="text" id="ev-m-time" placeholder="Inserisci orario..."/>
        </div>

        <div class="form-group">
          <label>Descrizione (opzionale)</label>
          <textarea id="ev-m-desc" rows="3" placeholder="Aggiungi dettagli dell'evento..."></textarea>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" id="ev-m-cancel">Annulla</button>
        <button class="btn btn-primary" id="ev-m-save">✅ Pubblica Evento</button>
      `
    });

    // Inizializza TomSelect
    setTimeout(() => {
      new TomSelect(ov.querySelector('#ev-m-classes'), { plugins: ['remove_button'] });
      new TomSelect(ov.querySelector('#ev-m-teachers'), { plugins: ['remove_button'] });
    }, 50);

    ov.querySelector('#ev-m-cancel').onclick = () => ov.remove();
    ov.querySelector('#ev-m-save').onclick = async () => {
      const title = ov.querySelector('#ev-m-title').value.trim();
      const date = ov.querySelector('#ev-m-date').value;
      const classIds = Array.from(ov.querySelector('#ev-m-classes').selectedOptions).map(o => parseInt(o.value));
      const teacherIds = Array.from(ov.querySelector('#ev-m-teachers').selectedOptions).map(o => parseInt(o.value));
      const timeRange = ov.querySelector('#ev-m-time').value.trim();
      const description = ov.querySelector('#ev-m-desc').value.trim();

      if (!title || !date) {
        APP.toast('Titolo e data sono obbligatori', 'error');
        return;
      }

      const user = APP.getState().user;
      
      try {
        await API.post('/events', {
          title,
          date,
          class_ids: classIds,
          teacher_ids: teacherIds,
          time_range: timeRange,
          description,
          school_year_id: _yearId,
          created_by: user?.username || 'unknown',
          created_by_name: user?.teacher?.name || user?.username || 'Docente'
        });

        APP.toast('Evento aggiunto con successo!', 'success');
        ov.remove();
        render(container, state);
      } catch (err) {
        APP.toast('Errore: ' + err.message, 'error');
      }
    };
  }

  async function deleteEvent(id) {
    if (await APP.confirm('Sei sicuro di voler eliminare questo evento?')) {
      try {
        await API.del(`/events/${id}`);
        APP.toast('Evento eliminato', 'success');
        EventsView.render(document.getElementById('content-area'), APP.getState());
      } catch (err) {
        APP.toast('Errore: ' + err.message, 'error');
      }
    }
  }

  return { render, deleteEvent };
})();
