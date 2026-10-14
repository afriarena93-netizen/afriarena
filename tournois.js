/* AfriArena — Tournois */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() { return localStorage.getItem('afriarena:myTag') || null; }

  async function loadTournaments() {
    const cfg = getCfg();
    if (!cfg) return;
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?select=*&order=created_at.desc', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const tournaments = await res.json();

      const tpRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players?select=*', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const tp = await tpRes.json();

      const profRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?select=gamertag,country,avatar_url', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const profiles = profRes.ok ? await profRes.json() : [];

      const allPlayers = (tp || []).map(p => {
        const prof = profiles.find(x => x.gamertag === p.gamertag);
        return {
          tournament_id: p.tournament_id,
          gamertag: p.gamertag,
          pays: prof ? prof.country : null,
          avatar: prof ? prof.avatar_url : null
        };
      });

      if (!tournaments || tournaments.length === 0) {
        container.innerHTML = '<div class="empty"><strong>Aucun tournoi pour le moment.</strong>Sois le premier à en créer un !</div>';
        return;
      }

      container.innerHTML = tournaments.map(t => renderTournamentCard(t, allPlayers)).join('');
    } catch (e) {
      console.warn('Erreur:', e);
      container.innerHTML = '<div class="empty"><strong>Erreur de chargement</strong>Réessaie dans un instant.</div>';
    }
  }
  // === AFFICHAGE D'UNE CARTE TOURNOI ===
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

  // === BOUTONS D'ACTION ===
  let actionButtons = '';
  if (isMine) {
    actionButtons = `
      <button class="btn btn-ghost btn-sm" data-delete-tournament="${t.id}" style="color:#FF5050;">🗑 Supprimer</button>
      ${canStart ? `<button class="btn btn-primary btn-sm" data-start-tournament="${t.id}">🚀 Démarrer</button>` : ''}
    `;
  } else if (iAmRegistered) {
    actionButtons = `
      <button class="btn btn-outline btn-sm" data-leave-tournament="${t.id}" style="border-color:#FF5050;color:#FF5050;">🚪 Quitter le tournoi</button>
    `;
  } else if (isFull) {
    actionButtons = `<button class="btn btn-outline btn-sm" disabled>🔒 Complet</button>`;
  } else if (t.status === 'registration') {
    actionButtons = `<button class="btn btn-primary btn-sm" data-join-tournament="${t.id}">✅ S'inscrire</button>`;
  }

  return `
    <article class="card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-size:18px;font-weight:700;">${t.name}</h3>
          <p style="font-size:13px;color:#FF6B35;margin-top:4px;">🏆 ${t.game} · ${t.format}</p>
        </div>
        <span class="chip" style="font-size:10px;">${statusLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;padding:12px;background:rgba(255,255,255,0.02);border-radius:10px;">
        <div>
          <p class="mono" style="font-size:10px;color:var(--ink-faint);">Joueurs</p>
          <p style="font-size:14px;font-weight:600;margin-top:4px;">${count} / ${t.max_players}</p>
        </div>
        <div>
          <p class="mono" style="font-size:10px;color:var(--ink-faint);">Créé par</p>
          <p style="font-size:14px;font-weight:600;margin-top:4px;">${t.created_by}</p>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
  <button class="btn btn-outline btn-sm" data-view-tournament="${t.id}">👁 Voir le tournoi</button>
  ${actionButtons}
</div>
    </article>
  `;
}

// === GÉNÉRATION DU BRACKET ===
function generateBracket(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const rounds = [];
  let current = shuffled.map(name => ({ p1: name, p2: null, winner: null }));

  // Premier tour : on apparie les joueurs
  const firstRoundMatches = [];
  for (let i = 0; i < current.length; i += 2) {
    if (i + 1 < current.length) {
      firstRoundMatches.push({ p1: shuffled[i], p2: shuffled[i + 1], winner: null });
    } else {
      firstRoundMatches.push({ p1: shuffled[i], p2: null, winner: shuffled[i] });
    }
  }

  rounds.push({ round: 1, matches: firstRoundMatches });
  return rounds;
}

// === AFFICHAGE DU BRACKET ===
function renderBracket(bracket, isMine, allPlayers) {
  if (!bracket || bracket.length === 0) return '';
  let html = '<div style="margin-top:20px;">';
  bracket.forEach((round, roundIndex) => {
    html += '<p class="label" style="margin-top:16px;">Tour ' + round.round + '</p>';
    round.matches.forEach((m, matchIndex) => {
      const p1 = m.p1 || 'En attente';
      const p2 = m.p2 || 'En attente';
      const done = m.winner !== null && m.winner !== undefined;
      const canClick = !done && m.p1 && m.p2 && isMine;
      const p1Won = m.winner === m.p1;
      const p2Won = m.winner === m.p2;

      html += '<div style="padding:10px 12px;background:var(--panel);border-radius:10px;border:1px solid var(--line);margin-bottom:6px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">';

      if (canClick) {
        html += '<button data-declare-winner="' + roundIndex + '|' + matchIndex + '|1" class="mono" style="flex:1;text-align:left;font-size:13px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;">' + p1 + (p1Won ? ' 🏆' : '') + '</button>';
        html += '<span class="mono" style="font-size:11px;color:var(--ink-faint)">vs</span>';
        html += '<button data-declare-winner="' + roundIndex + '|' + matchIndex + '|2" class="mono" style="flex:1;text-align:right;font-size:13px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;">' + p2 + (p2Won ? ' 🏆' : '') + '</button>';
      } else {
        html += '<span class="mono" style="flex:1;font-size:13px;">' + p1 + (p1Won ? ' 🏆' : '') + '</span>';
        html += '<span class="mono" style="font-size:11px;color:var(--ink-faint)">vs</span>';
        html += '<span class="mono" style="flex:1;text-align:right;font-size:13px;">' + p2 + (p2Won ? ' 🏆' : '') + '</span>';
      }

      html += '</div>';
      if (!done && m.p1 && m.p2 && isMine) {
        html += '<p class="mono" style="font-size:10px;color:var(--ink-faint);text-align:center;margin-top:6px">Clique sur le gagnant</p>';
      }
      html += '</div>';
    });
  });
  html += '</div>';
  return html;
}

// === FONCTIONS UTILITAIRES ===
function getBadgeHTML(pays) {
  if (!pays) return '';
  const map = {
    'Togo': '🇹🇬', 'Ghana': '🇬🇭', 'Bénin': '🇧🇯',
    'Côte d\'Ivoire': '🇨🇮', 'Nigeria': '🇳🇬', 'Sénégal': '🇸🇳',
    'Cameroun': '🇨🇲', 'Mali': '🇲🇱', 'Burkina Faso': '🇧🇫',
    'Algérie': '🇩🇿', 'Maroc': '🇲🇦', 'Tunisie': '🇹🇳',
    'RD Congo': '🇨🇩', 'Gabon': '🇬🇦'
  };
  return ' ' + (map[pays] || '');
}

function paysOf(pseudo) {
  const players = window._afriAllPlayers || [];
  const found = players.find(p => p.gamertag === pseudo);
  return found ? found.pays : null;
}

function avatarHTML(player) {
  if (!player || !player.gamertag) return '';
  if (player.avatar) {
    return '<img src="' + player.avatar + '" style="width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle;" alt="">';
  }
  const initial = player.gamertag.charAt(0).toUpperCase();
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#FF6B35,#FF8457);color:#0b0c10;font-weight:700;font-size:11px;margin-right:6px;vertical-align:middle;">' + initial + '</span>';
}
    // === CRÉATION D'UN TOURNOI ===
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
    } catch (e) { return false; }
  }

  // === SUPPRIMER UN TOURNOI ===
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

  // === DÉMARRER UN TOURNOI ===
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

  // === MODALE DE CRÉATION ===
  function openCreateTournamentModal() {
    const tag = getMyTag();
    if (!tag) {
      alert('Connecte-toi pour créer un tournoi.');
      window.location.href = 'connexion.html';
      return;
    }
    const existing = document.getElementById('tournament-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'tournament-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div><h3>Créer un tournoi</h3><p>Les joueurs pourront s\'inscrire</p></div>
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
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close-modal]')) backdrop.remove();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('t-name').value.trim();
      const game = document.getElementById('t-game').value;
      const format = document.getElementById('t-format').value;
      const maxPlayers = parseInt(document.getElementById('t-players').value);
      if (!name) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = '⏳ Création…';
      submitBtn.disabled = true;

      const ok = await createTournament(name, game, format, maxPlayers, tag);
      if (ok) {
        backdrop.remove();
        if (window.afriToast) window.afriToast('🏆 Tournoi créé !');
        loadTournaments();
      } else {
        submitBtn.textContent = '❌ Erreur';
        submitBtn.disabled = false;
      }
    });
  }

  // === GESTION DES CLICS ===
  document.addEventListener('click', async (e) => {
    const cfg = getCfg();
    if (!cfg) return;
    // Voir un tournoi (afficher le bracket)
const viewBtn = e.target.closest('[data-view-tournament]');
if (viewBtn) {
  e.preventDefault();
  const id = viewBtn.getAttribute('data-view-tournament');
  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + id, {
      headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
    });
    const data = await res.json();
    if (!data || data.length === 0) return;
    const t = data[0];
    const myTag = getMyTag();
    const isMine = t.created_by === myTag;

    const existing = document.getElementById('view-tournament-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'view-tournament-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div class="modal-head">
          <div>
            <h3>${t.name}</h3>
            <p>${t.game} · ${t.format}</p>
          </div>
          <button type="button" class="modal-close" data-close-modal>✕</button>
        </div>
        <div style="padding:16px 0;">
          ${t.bracket && t.bracket.length > 0 ? renderBracket(t.bracket, isMine, []) : '<p style="color:#888;text-align:center;">Les inscriptions sont encore ouvertes. Le bracket apparaîtra une fois le tournoi démarré.</p>'}
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop || ev.target.closest('[data-close-modal]')) {
        backdrop.remove();
      }
    });
  } catch (err) { console.warn(err); }
  return;
}

    // Créer un tournoi
    if (e.target.closest('[data-open-create-tournament]')) {
      e.preventDefault();
      openCreateTournamentModal();
      return;
    }

    // Quitter un tournoi
    const leaveTournamentBtn = e.target.closest('[data-leave-tournament]');
    if (leaveTournamentBtn) {
      e.preventDefault();
      if (!confirm('Quitter ce tournoi ?')) return;
      const id = leaveTournamentBtn.getAttribute('data-leave-tournament');
      const myTag = getMyTag();
      leaveTournamentBtn.textContent = '⏳…';
      leaveTournamentBtn.disabled = true;
      try {
        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players?tournament_id=eq.' + id + '&gamertag=eq.' + encodeURIComponent(myTag), {
          method: 'DELETE',
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('🚪 Tu as quitté le tournoi');
          loadTournaments();
        }
      } catch (err) { console.warn(err); }
      return;
    }

    // S'inscrire à un tournoi
    const joinBtn = e.target.closest('[data-join-tournament]');
    if (joinBtn) {
      e.preventDefault();
      const id = joinBtn.getAttribute('data-join-tournament');
      const myTag = getMyTag();
      if (!myTag) {
        alert('Connecte-toi pour t\'inscrire.');
        window.location.href = 'connexion.html';
        return;
      }
      joinBtn.textContent = '⏳…';
      joinBtn.disabled = true;
      try {
        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players', {
          method: 'POST',
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tournament_id: id, gamertag: myTag })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('✅ Inscrit !');
          loadTournaments();
        } else {
          joinBtn.textContent = '❌ Erreur';
        }
      } catch (err) { joinBtn.textContent = '❌'; }
      return;
    }

    // Supprimer un tournoi
    const delBtn = e.target.closest('[data-delete-tournament]');
    if (delBtn) {
      e.preventDefault();
      if (!confirm('Supprimer ce tournoi ?')) return;
      const id = delBtn.getAttribute('data-delete-tournament');
      delBtn.textContent = '⏳…';
      delBtn.disabled = true;
      const ok = await deleteTournament(id);
      if (ok) {
        if (window.afriToast) window.afriToast('🗑 Tournoi supprimé');
        loadTournaments();
      }
      return;
    }

    // Démarrer un tournoi
    const startBtn = e.target.closest('[data-start-tournament]');
    if (startBtn) {
      e.preventDefault();
      const id = startBtn.getAttribute('data-start-tournament');
      startBtn.textContent = '⏳…';
      startBtn.disabled = true;
      const ok = await startTournament(id);
      if (ok) {
        if (window.afriToast) window.afriToast('🚀 Tournoi démarré !');
        loadTournaments();
      } else {
        startBtn.textContent = '❌ Erreur';
        startBtn.disabled = false;
      }
      return;
    }

    // Déclarer un gagnant
    const winBtn = e.target.closest('[data-declare-winner]');
    if (winBtn) {
      e.preventDefault();
      e.stopPropagation();
      const parts = winBtn.getAttribute('data-declare-winner').split('|');
      const roundIndex = parseInt(parts[0], 10);
      const matchIndex = parseInt(parts[1], 10);
      const side = parts[2];

      try {
        const tRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?status=eq.started', {
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
        });
        const tournaments = await tRes.json();
        if (!tournaments || tournaments.length === 0) return;
        const t = tournaments[0];
        const bracket = t.bracket || [];
        const match = bracket[roundIndex] && bracket[roundIndex].matches[matchIndex];
        if (!match) return;

        const winner = side === '1' ? match.p1 : match.p2;
        match.winner = winner;

        // Vérifier si tous les matchs du tour sont finis
        const currentRound = bracket[roundIndex];
        const allDone = currentRound.matches.every(m => m.winner);

        if (allDone) {
          const winners = currentRound.matches.map(m => m.winner);
          if (winners.length === 1) {
            const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + t.id, {
              method: 'PATCH',
              headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'finished', bracket: bracket })
            });
            if (res.ok) { if (window.afriToast) window.afriToast('🏆 Champion : ' + winners[0] + ' !'); loadTournaments(); }
            return;
          }
          const nextMatches = [];
          for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
              nextMatches.push({ p1: winners[i], p2: winners[i + 1], winner: null });
            } else {
              nextMatches.push({ p1: winners[i], p2: null, winner: winners[i] });
            }
          }
          bracket.push({ round: currentRound.round + 1, matches: nextMatches });
        }

        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + t.id, {
          method: 'PATCH',
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ bracket: bracket })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('🏆 ' + winner + ' avance !');
          loadTournaments();
        }
      } catch (err) { console.warn(err); }
      return;
    }
  });

  // === INITIALISATION ===
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
