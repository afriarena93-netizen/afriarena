/* AfriArena — Liste des rooms actives */
(function () {
  'use strict';

  let currentGameFilter = '';
  // Mémoire pour savoir qui était dans la room au dernier chargement
  let lastKnownPlayers = {};

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
    if (!cfg) {
      console.warn('⚠ Config Supabase manquante');
      return;
    }

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

      if (!res.ok) {
        console.warn('⚠ Erreur Supabase:', res.status);
        container.innerHTML = `
          <div class="empty">
            <strong>Erreur de chargement (${res.status})</strong>
            Réessaie dans un instant.
          </div>
        `;
        return;
      }

      const rooms = await res.json();

      // === NOTIFICATIONS DE ROOM ===
      const myTag = getMyTag();
      if (myTag) {
        rooms.forEach(room => {
          // On vérifie seulement les rooms que J'AI créées
          if (room.created_by === myTag) {
            const players = room.players ? room.players.split(',').filter(Boolean) : [];
            
            // Si on a déjà une mémoire de cette room, on compare
            if (lastKnownPlayers[room.id]) {
              const oldPlayers = lastKnownPlayers[room.id];
              const newPlayers = players.filter(p => !oldPlayers.includes(p));
              
              if (newPlayers.length > 0) {
                newPlayers.forEach(p => {
                  if (window.afriToast) {
                    window.afriToast('🔔 ' + p + ' a rejoint ta room !');
                  }
                });
              }
            }
            // On met à jour la mémoire
            lastKnownPlayers[room.id] = players;
          }
        });
      }
      // === FIN NOTIFICATIONS ===

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
      console.warn('⚠ Erreur chargement rooms:', e);
      const c = document.getElementById('rooms-list');
      if (c) c.innerHTML = '<div class="empty"><strong>Erreur réseau</strong>Vérifie ta connexion.</div>';
    }
  }
  // ===== Affiche une carte room =====
function renderRoomCard(room) {
  const time = new Date(room.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });
  const gameName = room.game || 'Free Fire';
  const format = room.format || '1v1';
  const isMine = room.created_by === getMyTag();
  const players = room.players || '';
  const playerList = players ? players.split(',').filter(Boolean) : [];
  const maxPlayers = format === 'Squad' ? 4 : (format === '2v2' ? 4 : 2);
  const isFull = playerList.length >= maxPlayers;
  const iAlreadyJoined = playerList.includes(getMyTag());
  const gameLinks = {
    'Free Fire': 'https://ff.garena.com/',
    'eFootball': 'https://www.konami.com/efootball/',
    'FC Mobile': 'https://www.ea.com/games/fc/fc-mobile',
    'PUBG Mobile': 'https://www.pubgmobile.com/',
    'Call of Duty': 'https://www.callofduty.com/mobile',
    'Blood Strike': 'https://blood-strike.com/'
  };

  return `
    <article class="match" style="position:relative" data-room-id="${room.id}">
      <div class="match-head">
        <span class="match-id">ROOM · ${room.id}</span>
        <span class="chip ${isFull ? 'brand' : 'positive'}">
          <span class="dot ${isFull ? '' : 'live'}"></span>
          ${isFull ? 'COMPLÈTE' : 'ACTIVE'}
        </span>
      </div>

      <div style="padding:16px 0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div>
            <p style="font-weight:700;font-size:16px;color:var(--ink);margin-bottom:4px">${gameName} · ${format}</p>
            <p class="mono" style="font-size:11px;color:var(--ink-faint)">
              ${isMine ? '👑 Ta room · créée à ' + time : 'Créée par ' + room.created_by + ' · ' + time}
            </p>
          </div>
          ${isMine ? `
            <button class="btn btn-ghost btn-sm" data-delete-room="${room.id}" title="Supprimer"
              style="color:#FF5050;font-size:18px;padding:6px 12px">🗑</button>
          ` : ''}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.25);border-radius:12px;padding:12px">
            <p class="mono" style="font-size:10px;color:var(--brand);letter-spacing:.12em;margin-bottom:6px">ID ROOM</p>
            <p class="mono" style="font-size:15px;color:var(--ink);word-break:break-all">${room.room_code}</p>
          </div>
          <div style="background:rgba(184,242,124,.08);border:1px solid rgba(184,242,124,.25);border-radius:12px;padding:12px">
            <p class="mono" style="font-size:10px;color:var(--positive);letter-spacing:.12em;margin-bottom:6px">MOT DE PASSE</p>
            <p class="mono" style="font-size:15px;color:var(--ink);word-break:break-all">${room.room_password}</p>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <button class="btn btn-primary btn-sm" data-copy-all="${room.room_code}|${room.room_password}" style="flex:1">📋 Copier ID + MDP</button>
          ${gameLinks[gameName] ? `
            <a href="${gameLinks[gameName]}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="flex:1">🎮 Ouvrir ${gameName}</a>
          ` : ''}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-top:12px;border-top:1px dashed var(--line)">
          <div style="flex:1;min-width:120px">
            <p class="mono" style="font-size:11px;color:var(--ink-faint)">
              ${playerList.length} / ${maxPlayers} joueurs
            </p>
            ${playerList.length > 0 ? `
              <p class="mono" style="font-size:11px;color:var(--ink-muted);margin-top:4px">
                ${playerList.map(n => n === room.created_by ? '👑 ' + n : '👤 ' + n).join(' · ')}
              </p>
            ` : ''}
          </div>
          ${iAlreadyJoined ? `
            <button class="btn btn-outline btn-sm" data-leave-room="${room.id}">
              🚪 Quitter
            </button>
          ` : isFull ? `
            <button class="btn btn-outline btn-sm" disabled>🔒 Complète</button>
          ` : `
            <button class="btn btn-primary btn-sm" data-join-room="${room.id}">
              ➕ Rejoindre
            </button>
          `}
        </div>
      </div>
    </article>
  `;
}

// ===== Rejoindre une room =====
async function joinRoom(roomId) {
  const cfg = getCfg();
  const tag = getMyTag();
  if (!cfg || !tag) return false;

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms?id=eq.' + roomId, {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });
    const rooms = await res.json();
    if (!rooms || !rooms.length) return false;

    const room = rooms[0];
    const currentPlayers = room.players ? room.players.split(',').filter(Boolean) : [];
    if (currentPlayers.includes(tag)) return true;

    currentPlayers.push(tag);
    const newPlayers = currentPlayers.join(',');

    const updateRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms?id=eq.' + roomId, {
      method: 'PATCH',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ players: newPlayers })
    });
    return updateRes.ok;
  } catch (e) {
    return false;
  }
}

// ===== Quitter une room =====
async function leaveRoom(roomId) {
  const cfg = getCfg();
  const tag = getMyTag();
  if (!cfg || !tag) return false;

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms?id=eq.' + roomId, {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });
    const rooms = await res.json();
    if (!rooms || !rooms.length) return false;

    const room = rooms[0];
    const currentPlayers = room.players ? room.players.split(',').filter(Boolean) : [];
    const newPlayers = currentPlayers.filter(p => p !== tag).join(',');

    const updateRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/rooms?id=eq.' + roomId, {
      method: 'PATCH',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ players: newPlayers })
    });
    return updateRes.ok;
  } catch (e) {
    return false;
  }
}

// ===== Supprimer une room =====
async function deleteRoom(roomId) {
  const cfg = getCfg();
  const tag = getMyTag();
  if (!cfg || !tag) return false;

  try {
    const res = await fetch(
      cfg.SUPABASE_URL + '/rest/v1/rooms?id=eq.' + roomId + '&created_by=eq.' + encodeURIComponent(tag),
      {
        method: 'DELETE',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      }
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}
    // ===== Créer une room dans Supabase =====
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

  // ===== Modale de création =====
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

  // ===== Handlers de clic =====
  document.addEventListener('click', async (e) => {
    // Copier ID + MDP d'un coup
    const copyAll = e.target.closest('[data-copy-all]');
    if (copyAll) {
      e.preventDefault();
      const [code, pwd] = copyAll.getAttribute('data-copy-all').split('|');
      const text = 'ID Room: ' + code + '\\nMot de passe: ' + pwd;
      navigator.clipboard.writeText(text).then(
        () => { if (window.afriToast) window.afriToast('📋 Copié !'); },
        () => { if (window.afriToast) window.afriToast('❌ Erreur copie'); }
      );
      return;
    }
    
    // Créer une room
    if (e.target.closest('[data-open-create-room]')) {
      e.preventDefault();
      openCreateRoomModal();
      return;
    }

    // Rejoindre
    const joinBtn = e.target.closest('[data-join-room]');
    if (joinBtn) {
      e.preventDefault();
      const roomId = joinBtn.getAttribute('data-join-room');
      joinBtn.textContent = '⏳…';
      joinBtn.disabled = true;
      const ok = await joinRoom(roomId);
      if (ok) {
        if (window.afriToast) window.afriToast('✅ Tu as rejoint la room');
        loadRooms();
      } else {
        joinBtn.textContent = '❌ Erreur';
        setTimeout(() => { joinBtn.textContent = '➕ Rejoindre'; joinBtn.disabled = false; }, 2000);
      }
      return;
    }

    // Quitter
    const leaveBtn = e.target.closest('[data-leave-room]');
    if (leaveBtn) {
      e.preventDefault();
      const roomId = leaveBtn.getAttribute('data-leave-room');
      leaveBtn.textContent = '⏳…';
      leaveBtn.disabled = true;
      const ok = await leaveRoom(roomId);
      if (ok) {
        if (window.afriToast) window.afriToast('🚪 Tu as quitté la room');
        loadRooms();
      } else {
        leaveBtn.textContent = '❌ Erreur';
        setTimeout(() => { leaveBtn.textContent = '🚪 Quitter'; leaveBtn.disabled = false; }, 2000);
      }
      return;
    }

    // Supprimer
    const delBtn = e.target.closest('[data-delete-room]');
    if (delBtn) {
      e.preventDefault();
      const roomId = delBtn.getAttribute('data-delete-room');
      if (!confirm('Supprimer cette room ?')) return;
      delBtn.textContent = '⏳';
      const ok = await deleteRoom(roomId);
      if (ok) {
        if (window.afriToast) window.afriToast('🗑 Room supprimée');
        loadRooms();
      } else {
        delBtn.textContent = '❌';
      }
      return;
    }
  });

  // ===== Filtre =====
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
