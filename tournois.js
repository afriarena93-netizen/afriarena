/* AfriArena — Tournois : liste et création */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() {
    let tag = localStorage.getItem('afriarena:myTag');
    if (!tag || tag.trim() === '' || tag === 'Anonyme') {
      tag = prompt('Ton pseudo :');
      if (tag && tag.trim()) {
        tag = tag.trim();
        localStorage.setItem('afriarena:myTag', tag);
      } else return null;
    }
    return tag;
  }

  // ===== Charge la liste des tournois =====
  async function loadTournaments() {
    const cfg = getCfg();
    if (!cfg) return;
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?select=*&order=created_at.desc&limit=30', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });

      if (!res.ok) {
        container.innerHTML = '<div class="empty"><strong>Erreur ' + res.status + '</strong></div>';
        return;
      }

      const tournaments = await res.json();

      if (!tournaments || tournaments.length === 0) {
        container.innerHTML = `
          <div class="empty">
            <strong>Aucun tournoi pour le moment.</strong>
            Sois le premier à en créer un !
          </div>
        `;
        return;
      }

      container.innerHTML = tournaments.map(t => renderTournamentCard(t)).join('');

    } catch (e) {
      console.warn('Erreur:', e);
    }
  }

  // ===== Affiche une carte tournoi =====
  function renderTournamentCard(t) {
    const isMine = t.created_by === getMyTag();
    const statusLabel = t.status === 'registration' ? 'Inscriptions ouvertes'
                       : t.status === 'started' ? 'En cours'
                       : t.status === 'finished' ? 'Terminé' : t.status;

    return `
      <article class="tournament" style="position:relative">
        <div class="tournament-head">
          <div>
            <h3>${t.name}</h3>
            <p class="prize">🏆 ${t.game} · ${t.format}</p>
          </div>
          <span class="chip ${t.status === 'registration' ? 'info' : 'positive'}">${statusLabel}</span>
        </div>
        <div class="tournament-meta">
          <div><p class="k">Jeu</p><p class="v">${t.game}</p></div>
          <div><p class="k">Format</p><p class="v">${t.format}</p></div>
          <div><p class="k">Places</p><p class="v">${t.max_players}</p></div>
          <div><p class="k">Créé par</p><p class="v">${t.created_by}</p></div>
        </div>
        <div class="match-actions">
          ${isMine ? `
            <button class="btn btn-ghost btn-sm" data-delete-tournament="${t.id}" style="color:#FF5050">
              🗑 Supprimer
            </button>
          ` : ''}
          <button class="btn btn-primary btn-sm" data-join-tournament="${t.id}">
            🎯 S'inscrire
          </button>
          <button class="btn btn-outline btn-sm" data-view-tournament="${t.id}">
            Voir les détails
          </button>
        </div>
      </article>
    `;
  }

  // ===== Ouvre la modale de création =====
  function openCreateTournamentModal() {
    const tag = getMyTag();
    if (!tag) return;

    const existing = document.getElementById('tournament-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'tournament-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div>
            <h3>Créer un tournoi</h3>
            <p>Les joueurs pourront s'inscrire</p>
          </div>
          <button type="button" class="modal-close" data-close-modal>✕</button>
        </div>
        <form id="tournament-form">
          <div class="form-row">
            <label for="t-name">Nom du tournoi</label>
            <input id="t-name" required placeholder="Ex: Free Fire Togo Cup">
          </div>
          <div class="form-grid-2">
            <div class="form-row">
              <label for="t-game">Jeu</label>
              <select id="t-game">
                <option>Free Fire</option>
                <option>eFootball</option>
                <option>FC Mobile</option>
                <option>PUBG Mobile</option>
                <option>Call of Duty</option>
                <option>Blood Strike</option>
              </select>
            </div>
            <div class="form-row">
              <label for="t-format">Format</label>
              <select id="t-format">
                <option>1v1</option>
                <option>2v2</option>
                <option>Squad</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label for="t-players">Nombre de joueurs</label>
            <select id="t-players">
              <option value="4">4 joueurs</option>
              <option value="8" selected>8 joueurs</option>
              <option value="16">16 joueurs</option>
              <option value="32">32 joueurs</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
            <button type="submit" class="btn btn-primary">Créer le tournoi</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    const form = document.getElementById('tournament-form');
    setTimeout(() => document.getElementById('t-name').focus(), 100);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close-modal]')) backdrop.remove();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('t-name').value.trim();
      const game = document.getElementById('t-game').value;
      const format = document.getElementById('t-format').value;
      const maxPlayers = parseInt(document.getElementById('t-players').value, 10);

      if (!name) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = '⏳ Création…';
      submitBtn.disabled = true;

      const ok = await createTournament(name, game, format, maxPlayers, tag);

      if (ok) {
        backdrop.remove();
        if (window.afriToast) window.afriToast('🏆 Tournoi créé');
        loadTournaments();
      } else {
        submitBtn.textContent = '❌ Erreur';
        submitBtn.disabled = false;
      }
    });
  }

  // ===== Crée le tournoi =====
  async function createTournament(name, game, format, maxPlayers, tag) {
    const cfg = getCfg();
    if (!cfg) return false;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: name,
          game: game,
          format: format,
          max_players: maxPlayers,
          status: 'registration',
          created_by: tag
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ===== S'inscrire à un tournoi =====
  async function joinTournament(tournamentId) {
    const cfg = getCfg();
    const tag = getMyTag();
    if (!cfg || !tag) return false;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tournament_id: tournamentId,
          gamertag: tag
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ===== Supprimer un tournoi =====
  async function deleteTournament(id) {
    const cfg = getCfg();
    if (!cfg) return false;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + id, {
        method: 'DELETE',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ===== Handlers =====
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open-create-tournament]')) {
      e.preventDefault();
      openCreateTournamentModal();
      return;
    }

    const joinBtn = e.target.closest('[data-join-tournament]');
    if (joinBtn) {
      e.preventDefault();
      const id = joinBtn.getAttribute('data-join-tournament');
      joinBtn.textContent = '⏳…';
      joinBtn.disabled = true;
      const ok = await joinTournament(id);
      if (ok) {
        if (window.afriToast) window.afriToast('🎯 Inscrit au tournoi');
        joinBtn.textContent = '✅ Inscrit';
      } else {
        joinBtn.textContent = '❌ Erreur';
        setTimeout(() => { joinBtn.textContent = '🎯 S\'inscrire'; joinBtn.disabled = false; }, 2000);
      }
      return;
    }

    const delBtn = e.target.closest('[data-delete-tournament]');
    if (delBtn) {
      e.preventDefault();
      const id = delBtn.getAttribute('data-delete-tournament');
      if (!confirm('Supprimer ce tournoi ?')) return;
      const ok = await deleteTournament(id);
      if (ok) {
        if (window.afriToast) window.afriToast('🗑 Tournoi supprimé');
        loadTournaments();
      }
      return;
    }
  });

  // ===== Init =====
  function init() {
    if (!document.getElementById('tournaments-list')) return;
    loadTournaments();
    setInterval(loadTournaments, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
