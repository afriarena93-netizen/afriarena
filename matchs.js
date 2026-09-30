/* AfriArena — Match Center : saisie des infos de room */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() { return localStorage.getItem('afriarena:myTag') || 'Anonyme'; }

  // ===== Ouvre la modale pour saisir les infos =====
  function openRoomModal(matchId, card) {
    const existing = document.getElementById('room-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'room-modal-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>Ajouter les infos de la room</h3>
            <p>Copie l'ID et le mot de passe depuis le jeu</p>
          </div>
          <button type="button" class="modal-close" data-close-modal>✕</button>
        </div>
        <form id="room-form">
          <div class="form-row">
            <label for="room-code-input">ID de la room</label>
            <input id="room-code-input" required placeholder="Ex: 83927461">
          </div>
          <div class="form-row">
            <label for="room-pwd-input">Mot de passe</label>
            <input id="room-pwd-input" required placeholder="Ex: AFRI2026">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const form = document.getElementById('room-form');
    const codeInput = document.getElementById('room-code-input');
    const pwdInput = document.getElementById('room-pwd-input');

    setTimeout(() => codeInput.focus(), 100);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
        backdrop.remove();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = codeInput.value.trim();
      const pwd = pwdInput.value.trim();
      if (!code || !pwd) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = '⏳ Enregistrement…';
      submitBtn.disabled = true;

      const ok = await saveRoom(matchId, code, pwd);

      if (!ok) {
        submitBtn.textContent = '❌ Erreur';
        return;
      }

      displayRoom(card, code, pwd);
      backdrop.remove();
      if (window.afriToast) window.afriToast('🎯 Room enregistrée');
    });
  }

  // ===== Sauvegarde dans Supabase =====
  async function saveRoom(matchId, code, password) {
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
          match_id: matchId,
          room_code: code,
          room_password: password,
          created_by: getMyTag()
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ===== Affiche les infos dans la carte =====
  function displayRoom(card, code, pwd) {
    const roomBox = card.querySelector('.room-box');
    if (!roomBox) return;
    roomBox.style.display = 'block';
    roomBox.innerHTML = `
      <p class="label">Informations de la room</p>
      <div class="room-row">
        <div>
          <p class="room-key">ID de la room</p>
          <p class="room-val">${code}</p>
        </div>
        <button type="button" class="copy-btn" data-copy="${code}">Copier</button>
      </div>
      <div class="room-row">
        <div>
          <p class="room-key">Mot de passe</p>
          <p class="room-val">${pwd}</p>
        </div>
        <button type="button" class="copy-btn" data-copy="${pwd}">Copier</button>
      </div>
      <p class="mono" style="font-size:11px;color:var(--ink-faint);margin-top:12px">
        Ajoutée par ${getMyTag()}
      </p>
    `;

    const btn = card.querySelector('[data-gen-room]');
    if (btn) {
      btn.textContent = '✅ Room ajoutée';
      btn.disabled = true;
    }
  }

  // ===== Charge les rooms existantes =====
  async function loadExistingRooms() {
    const cfg = getCfg();
    if (!cfg) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms?select=*&order=created_at.desc&limit=10', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      if (!res.ok) return;
      const rooms = await res.json();
      if (!rooms || !rooms.length) return;

      const cards = document.querySelectorAll('.match');
      cards.forEach((card) => {
        const btn = card.querySelector('[data-gen-room]');
        if (!btn) return;
        const matchId = parseInt(btn.getAttribute('data-gen-room'), 10);
        const room = rooms.find(r => r.match_id === matchId);
        if (room) {
          displayRoom(card, room.room_code, room.room_password);
        }
      });
    } catch (e) {}
  }

  // ===== Clic sur le bouton =====
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-gen-room]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const matchId = parseInt(btn.getAttribute('data-gen-room'), 10) || 1;
    const card = btn.closest('.match');
    openRoomModal(matchId, card);
  });

  // ===== Chargement au démarrage =====
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadExistingRooms, 800);
  });
})();
