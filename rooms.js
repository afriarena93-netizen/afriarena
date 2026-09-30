/* AfriArena — Liste des rooms actives */
(function () {
  'use strict';

  let currentGameFilter = '';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() {
    let tag = localStorage.getItem('afriarena:myTag');
    if (!tag || tag.trim() === '' || tag === 'Anonyme') {
      tag = prompt('Ton pseudo pour créer une room :');
      if (tag && tag.trim()) {
        tag = tag.trim();
        localStorage.setItem('afriarena:myTag', tag);
      } else {
        return null;
      }
    }
    return tag;
  }

  // ===== Charge la liste des rooms =====
  async function loadRooms() {
    const cfg = getCfg();
    if (!cfg) return;

    const container = document.getElementById('rooms-list');
    if (!container) return;

    try {
      let url = cfg.SUPABASE_URL + '/rest/v1/rooms?select=*&order=created_at.desc&limit=50';
      if (currentGameFilter) {
        url += '&game=eq.' + encodeURIComponent(currentGameFilter);
      }

      const res = await fetch(url, {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });

      if (!res.ok) return;
      const rooms = await res.json();

      if (!rooms || rooms.length === 0) {
        container.innerHTML = `
          <div class="empty">
            <strong>Aucune room active pour le moment.</strong>
            Sois le premier à en créer une !
          </div>
        `;
        return;
      }

      container.innerHTML = rooms.map(room => renderRoomCard(room)).join('');

    } catch (e) {
      console.warn('Erreur chargement rooms:', e);
    }
  }

  // ===== Affiche une carte room =====
  function renderRoomCard(room) {
    const time = new Date(room.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
    const gameName = room.game || 'Free Fire';
    const format = room.format || '1v1';

    return `
      <article class="match" style="position:relative">
        <div class="match-head">
          <span class="match-id">ROOM · ${room.id}</span>
          <span class="chip positive"><span class="dot live"></span> Active</span>
        </div>
        <div style="padding:16px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <p style="font-weight:600;color:var(--ink)">${gameName} · ${format}</p>
              <p class="mono" style="font-size:11px;color:var(--ink-faint);margin-top:4px">
                Créée par ${room.created_by} · ${time}
              </p>
            </div>
          </div>
          <div class="room" style="margin-top:0">
            <div class="room-row">
              <div>
                <p class="room-key">ID de la room</p>
                <p class="room-val">${room.room_code}</p>
              </div>
              <button class="copy-btn" data-copy="${room.room_code}">Copier</button>
            </div>
            <div class="room-row">
              <div>
                <p class="room-key">Mot de passe</p>
                <p class="room-val">${room.room_password}</p>
              </div>
              <button class="copy-btn" data-copy="${room.room_password}">Copier</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // ===== Ouvre la modale de création =====
  function openCreateRoomModal() {
    const tag = getMyTag();
    if (!tag) return;

    const existing = document.getElementById('create-room-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'create-room-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>Créer ma room</h3>
            <p>Copie l'ID et le mot de passe depuis le jeu</p>
          </div>
          <button type="button" class="modal-close" data-close-modal>✕</button>
        </div>
        <form id="create-room-form">
          <div class="form-grid-2">
            <div class="form-row">
              <label for="cr-game">Jeu</label>
              <select id="cr-game">
                <option>Free Fire</option>
                <option>eFootball</option>
                <option>FC Mobile</option>
                <option>PUBG Mobile</option>
                <option>Call of Duty</option>
                <option>Blood Strike</option>
              </select>
            </div>
            <div class="form-row">
              <label for="cr-format">Format</label>
              <select id="cr-format">
                <option>1v1</option>
                <option>2v2</option>
                <option>Squad</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label for="cr-code">ID de la room</label>
            <input id="cr-code" required placeholder="Ex: 83927461">
          </div>
          <div class="form-row">
            <label for="cr-pwd">Mot de passe</label>
            <input id="cr-pwd" required placeholder="Ex: AFRI2026">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
            <button type="submit" class="btn btn-primary">Créer ma room</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const form = document.getElementById('create-room-form');
    setTimeout(() => document.getElementById('cr-code').focus(), 100);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
        backdrop.remove();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const game = document.getElementById('cr-game').value;
      const format = document.getElementById('cr-format').value;
      const code = document.getElementById('cr-code').value.trim();
      const pwd = document.getElementById('cr-pwd').value.trim();
      if (!code || !pwd) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = '⏳ Création…';
      submitBtn.disabled = true;

      const ok = await createRoom(game, format, code, pwd, tag);

      if (ok) {
        backdrop.remove();
        if (window.afriToast) window.afriToast('🎯 Room créée');
        loadRooms();
      } else {
        submitBtn.textContent = '❌ Erreur';
        submitBtn.disabled = false;
      }
    });
  }

  // ===== Crée la room dans Supabase =====
  async function createRoom(game, format, code, pwd, tag) {
    const cfg = getCfg();
    if (!cfg) return false;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          room_code: code,
          room_password: pwd,
          created_by: tag,
          game: game,
          format: format
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ===== Bouton "Créer ma room" =====
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-create-room]')) {
      e.preventDefault();
      openCreateRoomModal();
    }
  });

  // ===== Filtres =====
  document.addEventListener('change', (e) => {
    if (e.target.id === 'filter-game') {
      currentGameFilter = e.target.value;
      loadRooms();
    }
  });

  // ===== Init =====
  function init() {
    if (!document.getElementById('rooms-list')) return;
    loadRooms();
    setInterval(loadRooms, 8000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadRooms();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
