/* AfriArena — Match Center : génération de salles */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() { return localStorage.getItem('afriarena:myTag') || 'Anonyme'; }

  function generateRoomCode() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return 'AFRI-' + num;
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pwd = '';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  async function createRoomInSupabase(matchId, code, password) {
    const cfg = getCfg();
    if (!cfg) return null;
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
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-gen-room]');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const matchId = parseInt(btn.getAttribute('data-gen-room'), 10) || 1;

    btn.textContent = '⏳ Génération…';
    btn.disabled = true;

    const code = generateRoomCode();
    const pwd = generatePassword();

    const result = await createRoomInSupabase(matchId, code, pwd);

    if (!result) {
      btn.textContent = '❌ Erreur';
      setTimeout(() => {
        btn.textContent = '🎲 Générer la room';
        btn.disabled = false;
      }, 2000);
      return;
    }

    const card = btn.closest('.match');
    if (card) {
      const roomBox = card.querySelector('.room-box');
      if (roomBox) {
        roomBox.style.display = 'block';
        roomBox.innerHTML = `
          <p class="label">Informations de la room</p>
          <div class="room-row">
            <div>
              <p class="room-key">ID de la room</p>
              <p class="room-val">${code}</p>
            </div>
            <button class="copy-btn" data-copy="${code}">Copier</button>
          </div>
          <div class="room-row">
            <div>
              <p class="room-key">Mot de passe</p>
              <p class="room-val">${pwd}</p>
            </div>
            <button class="copy-btn" data-copy="${pwd}">Copier</button>
          </div>
        `;
      }
    }

    btn.textContent = '✅ Room créée';
    if (window.afriToast) window.afriToast('🎲 Room générée : ' + code);
  });
})();
