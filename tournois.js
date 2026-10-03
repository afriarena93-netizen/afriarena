/* AfriArena — Tournois : liste, création, inscription, bracket */
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

  // ===== Charge la liste =====
  async function loadTournaments() {
    const cfg = getCfg();
    if (!cfg) return;
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?select=*&order=created_at.desc&limit=30', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      if (!res.ok) { container.innerHTML = '<div class="empty"><strong>Erreur ' + res.status + '</strong></div>'; return; }
      const tournaments = await res.json();

      const playersRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players?select=tournament_id,gamertag', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const allPlayers = playersRes.ok ? await playersRes.json() : [];

      if (!tournaments || tournaments.length === 0) {
        container.innerHTML = '<div class="empty"><strong>Aucun tournoi pour le moment.</strong>Sois le premier à en créer un !</div>';
        return;
      }

      container.innerHTML = tournaments.map(t => renderTournamentCard(t, allPlayers)).join('');
    } catch (e) { console.warn('Erreur:', e); }
  }

  // ===== Carte tournoi =====
  function renderTournamentCard(t, allPlayers) {
    const myTag = getMyTag();
    const isMine = t.created_by === myTag;
    const registered = allPlayers.filter(p => p.tournament_id === t.id);
    const count = registered.length;
    const iAmRegistered = registered.some(p => p.gamertag === myTag);
    const isFull = count >= t.max_players;
    const canStart = isMine && t.status === 'registration' && count >= 2;

    const statusLabel = t.status === 'registration' ? 'INSCRIPTIONS OUVERTES'
                       : t.status === 'started' ? 'EN COURS'
                       : t.status === 'finished' ? 'TERMINÉ' : t.status;

    let actionBtn = '';
    if (t.status === 'registration') {
      if (iAmRegistered) actionBtn = '<button class="btn btn-outline btn-sm" disabled>✅ Inscrit</button>';
      else if (isFull) actionBtn = '<button class="btn btn-outline btn-sm" disabled>🔒 Complet</button>';
      else actionBtn = '<button class="btn btn-primary btn-sm" data-join-tournament="' + t.id + '">🎯 S\'inscrire</button>';
    }

    // Bracket (si existant)
    let bracketHTML = '';
    if (t.bracket && Array.isArray(t.bracket) && t.bracket.length > 0) {
      bracketHTML = renderBracket(t.bracket);
    }

    return `
      <article class="tournament" style="position:relative;cursor:pointer" data-tournament-id="${t.id}">
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
          <div><p class="k">Joueurs</p><p class="v">${count} / ${t.max_players}</p></div>
          <div><p class="k">Créé par</p><p class="v">${t.created_by}</p></div>
        </div>
        <div class="match-actions">
          ${isMine ? '<button class="btn btn-ghost btn-sm" data-delete-tournament="' + t.id + '" style="color:#FF5050">🗑 Supprimer</button>' : ''}
          ${canStart ? '<button class="btn btn-primary btn-sm" data-start-tournament="' + t.id + '">🚀 Démarrer</button>' : ''}
          ${actionBtn}
        </div>
        <div id="details-${t.id}" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--line)">
          <p class="label" style="margin-bottom:12px">Joueurs inscrits (${count}/${t.max_players})</p>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${registered.length === 0
              ? '<p class="mono" style="font-size:12px;color:var(--ink-faint)">Aucun joueur</p>'
              : registered.map(p => '<p class="mono" style="font-size:13px;color:var(--ink)">👤 ' + p.gamertag + '</p>').join('')
            }
          </div>
          ${bracketHTML}
        </div>
      </article>
    `;
  }

  // ===== Affiche le bracket =====
  function renderBracket(bracket) {
    let html = '<p class="label" style="margin-top:20px;margin-bottom:12px">🏆 Bracket</p>';
    bracket.forEach((round, i) => {
      html += '<p class="mono" style="font-size:12px;color:var(--ink-faint);margin:12px 0 6px">Tour ' + (i + 1) + '</p>';
      round.matches.forEach(m => {
        const p1 = m.p1 || 'À déterminer';
        const p2 = m.p2 || 'À déterminer';
        const w1 = m.winner === m.p1 ? ' 🏆' : '';
        const w2 = m.winner === m.p2 ? ' 🏆' : '';
        html += '<p class="mono" style="font-size:13px;color:var(--ink);padding:4px 0">' + p1 + w1 + ' vs ' + p2 + w2 + '</p>';
      });
    });
    return html;
  }

  // ===== Génère le bracket =====
  function generateBracket(players) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({ p1: shuffled[i], p2: shuffled[i + 1] || null, winner: null });
    }
    return [{ round: 1, matches }];
  }

  // ===== Démarre le tournoi =====
  async function startTournament(id) {
    const cfg = getCfg();
    if (!cfg) return false;

    try {
      const pRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players?tournament_id=eq.' + id + '&select=gamertag', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      if (!pRes.ok) return false;
      const players = await pRes.json();
      const names = players.map(p => p.gamertag);

      if (names.length < 2) return false;

      const bracket = generateBracket(names);

      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + id, {
        method: 'PATCH',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'started', bracket: bracket })
      });
      return res.ok;
    } catch (e) { return false; }
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
          name: name, game: game, format: format,
          max_players: maxPlayers, status: 'registration', created_by: tag
        })
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // ===== Inscription (anti-doublon) =====
  async function joinTournament(tournamentId) {
    const cfg = getCfg();
    const tag = getMyTag();
    if (!cfg || !tag) return false;
    try {
      const checkRes = await fetch(
        cfg.SUPABASE_URL + '/rest/v1/tournament_players?tournament_id=eq.' + tournamentId + '&gamertag=eq.' + encodeURIComponent(tag) + '&select=id',
        { headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY } }
      );
      const existing = checkRes.ok ? await checkRes.json() : [];
      if (existing && existing.length > 0) {
        if (window.afriToast) window.afriToast('⚠ Déjà inscrit');
        return 'already';
      }
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tournament_id: tournamentId, gamertag: tag })
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // ===== Supprime tournoi =====
  async function deleteTournament(id) {
    const cfg = getCfg();
    if (!cfg) return false;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + id, {
        method: 'DELETE',
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // ===== Modale création =====
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
          <div class="form-row"><label for="t-name">Nom du tournoi</label>
            <input id="t-name" required placeholder="Ex: Free Fire Togo Cup"></div>
          <div class="form-grid-2">
            <div class="form-row"><label for="t-game">Jeu</label>
              <select id="t-game"><option>Free Fire</option><option>eFootball</option><option>FC Mobile</option><option>PUBG Mobile</option><option>Call of Duty</option><option>Blood Strike</option></select>
            </div>
            <div class="form-row"><label for="t-format">Format</label>
              <select id="t-format"><option>1v1</option><option>2v2</option><option>Squad</option></select>
            </div>
          </div>
          <div class="form-row"><label for="t-players">Nombre de joueurs</label>
            <select id="t-players">
              <option value="4">4 joueurs</option><option value="8" selected>8 joueurs</option>
              <option value="16">16 joueurs</option><option value="32">32 joueurs</option>
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

  // ===== Handlers =====
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open-create-tournament]')) {
      e.preventDefault();
      openCreateTournamentModal();
      return;
    }

    // Détails
    const card = e.target.closest('[data-tournament-id]');
    if (card && !e.target.closest('button')) {
      const id = card.getAttribute('data-tournament-id');
      const details = document.getElementById('details-' + id);
      if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
      return;
    }

    // Inscription
    const joinBtn = e.target.closest('[data-join-tournament]');
    if (joinBtn) {
      e.preventDefault();
      const id = joinBtn.getAttribute('data-join-tournament');
      joinBtn.textContent = '⏳…';
      joinBtn.disabled = true;
      const result = await joinTournament(id);
      if (result === true) {
        if (window.afriToast) window.afriToast('🎯 Inscrit');
        loadTournaments();
      } else if (result === 'already') {
        loadTournaments();
      } else {
        joinBtn.textContent = '❌';
        setTimeout(() => { joinBtn.textContent = '🎯 S\'inscrire'; joinBtn.disabled = false; }, 2000);
      }
      return;
    }

    // Démarrer
    const startBtn = e.target.closest('[data-start-tournament]');
    if (startBtn) {
      e.preventDefault();
      if (!confirm('Démarrer le tournoi ? Les inscriptions seront fermées.')) return;
      const id = startBtn.getAttribute('data-start-tournament');
      startBtn.textContent = '⏳…';
      startBtn.disabled = true;
      const ok = await startTournament(id);
      if (ok) {
        if (window.afriToast) window.afriToast('🚀 Tournoi démarré !');
        loadTournaments();
      } else {
        startBtn.textContent = '❌ Erreur';
        setTimeout(() => { startBtn.textContent = '🚀 Démarrer'; startBtn.disabled = false; }, 2000);
      }
      return;
    }

    // Supprimer
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
  } else { init(); }
})();
