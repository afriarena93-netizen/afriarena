/* AfriArena — Charge les joueurs depuis Supabase */
(function () {
  'use strict';

  async function fetchSupabase(path) {
    const cfg = window.AFRIARENA_CONFIG;
    if (!cfg || !cfg.SUPABASE_URL) return null;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/' + path, {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function buildPlayerCard(p) {
    const card = document.createElement('article');
    card.className = 'player';
    card.dataset.filterTarget = '';
    card.style.position = 'relative';

    const initial = (p.gamertag || '?').charAt(0).toUpperCase();
    const dispo = p.availability || 'Disponible maintenant';
    const dispoTone = dispo.includes('maintenant') ? 'positive'
                    : dispo.includes('soir') ? 'info' : 'violet';

    card.innerHTML = `
      <div class="player-avatar">
        ${initial}
        ${dispo.includes('maintenant') ? '<span class="presence"></span>' : ''}
      </div>
      <div class="player-body">
        <div class="player-head">
          <span class="player-name">${p.gamertag}</span>
          <span class="player-meta">${p.city || ''} · ${p.country || ''}</span>
        </div>
        <div class="player-tags">
          <span class="chip ${dispoTone}">${dispo}</span>
          <span class="tag">${p.game || 'Jeu'}</span>
          <span class="tag">${p.level || 'Niveau ?'}</span>
          <span class="tag">★ ${p.rating || '5'}</span>
        </div>
      </div>
      <div class="player-actions">
        <button class="btn btn-primary btn-sm" data-invite="${p.gamertag}">Proposer un match</button>
        <a href="chat.html" class="btn btn-outline btn-sm">Message</a>
      </div>
    `;
    return card;
  }

  async function loadPlayers() {
    const container = document.querySelector('.players') || document.querySelector('[data-game-players]');
    if (!container) return;

    const players = await fetchSupabase('players?select=*&order=created_at.desc');
    const banned = await fetchSupabase('bans?select=gamertag');

    if (!players) return;

    const bannedNames = banned ? banned.map(b => b.gamertag) : [];

    container.innerHTML = '';
    players
      .filter(p => !p.is_banned && !bannedNames.includes(p.gamertag))
      .forEach(p => container.appendChild(buildPlayerCard(p)));

    if (document.body.classList.contains('admin-mode')) {
      document.dispatchEvent(new CustomEvent('afriarena:players-loaded'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPlayers);
  } else {
    loadPlayers();
  }

  window.afriarenaLoadPlayers = loadPlayers;
})();