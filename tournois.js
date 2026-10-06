/* AfriArena — Tournois v3 : badges pays + bracket Supabase */
(function () {
  'use strict';

  // ===== Badges pays africains =====
  const BADGES_PAYS = {
    'Togo':          { surnom: 'Éperviers',           emoji: '🦅' },
    'Côte d\'Ivoire':{ surnom: 'Éléphants',           emoji: '🐘' },
    'Sénégal':       { surnom: 'Lions',               emoji: '🦁' },
    'Cameroun':      { surnom: 'Lions Indomptables',  emoji: '🦁' },
    'Ghana':         { surnom: 'Black Stars',         emoji: '⭐' },
    'Nigeria':       { surnom: 'Super Eagles',        emoji: '🦅' },
    'Mali':          { surnom: 'Aigles',              emoji: '🦅' },
    'Burkina Faso':  { surnom: 'Étalons',             emoji: '🐎' },
    'Algérie':       { surnom: 'Fennecs',             emoji: '🦊' },
    'Maroc':         { surnom: 'Lions de l\'Atlas',   emoji: '🦁' },
    'Tunisie':       { surnom: 'Aigles de Carthage',  emoji: '🦅' },
    'RD Congo':      { surnom: 'Léopards',            emoji: '🐆' },
    'Gabon':         { surnom: 'Panthères',           emoji: '🐆' },
    'Bénin':         { surnom: 'Écureuils',           emoji: '🐿️' }
  };

  function getBadgeHTML(pays) {
    if (!pays || !BADGES_PAYS[pays]) return '';
    const b = BADGES_PAYS[pays];
    return ' <span class="badge-pays" title="' + b.surnom + '" style="font-size:.9em;margin-left:4px">' + b.emoji + '</span>';
  }

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

  // ===== Charge les tournois + pays des joueurs =====
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

      // Inscriptions aux tournois
      const tpRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournament_players?select=tournament_id,gamertag', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const tp = tpRes.ok ? await tpRes.json() : [];

      // Profils joueurs (pour récupérer le pays)
      const profRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?select=gamertag,country', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const profiles = profRes.ok ? await profRes.json() : [];

      // Enrichit les inscriptions avec le pays
      const allPlayers = tp.map(p => {
        const prof = profiles.find(x => x.gamertag === p.gamertag);
        return {
          tournament_id: p.tournament_id,
          gamertag: p.gamertag,
          pays: prof ? prof.country : null
        };
      });

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

    let bracketHTML = '';
    if (t.bracket && Array.isArray(t.bracket) && t.bracket.length > 0) {
      bracketHTML = renderBracket(t.bracket, isMine, allPlayers);
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
              : registered.map(p => '<p class="mono" style="font-size:13px;color:var(--ink)">👤 ' + p.gamertag + getBadgeHTML(p.pays) + '</p>').join('')
            }
          </div>
          ${bracketHTML}
        </div>
      </article>
    `;
  }

  // ▼ SECTION 2 arrive ▼
 // ===== Affiche le bracket =====
function renderBracket(bracket, isMine, allPlayers) {
  function paysOf(pseudo) {
    if (!pseudo) return null;
    const j = allPlayers.find(p => p.gamertag === pseudo);
    return j ? j.pays : null;
  }

  let html = '<p class="label" style="margin-top:20px;margin-bottom:12px">🏆 Bracket</p>';

  bracket.forEach((round, roundIndex) => {
    html += '<p class="mono" style="font-size:11px;color:var(--ink-faint);margin:14px 0 6px;letter-spacing:.1em">TOUR ' + (roundIndex + 1) + '</p>';

    round.matches.forEach((m, matchIndex) => {
      const p1 = m.p1 || 'En attente';
      const p2 = m.p2 || 'En attente';
      const done = m.winner !== null && m.winner !== undefined;
      const canClick = !done && m.p1 && m.p2 && isMine;
      const p1Class = m.winner === m.p1 ? 'color:var(--positive);font-weight:700' : 'color:var(--ink)';
      const p2Class = m.winner === m.p2 ? 'color:var(--positive);font-weight:700' : 'color:var(--ink)';

      html += '<div style="padding:10px 12px;background:var(--panel);border-radius:10px;border:1px solid var(--line);margin-bottom:6px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px">';

      if (canClick) {
        html += '<button data-declare-winner="' + roundIndex + '|' + matchIndex + '|1" class="mono" style="flex:1;text-align:left;font-size:13px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;' + p1Class + '">' + p1 + getBadgeHTML(paysOf(m.p1)) + '</button>';
        html += '<span class="mono" style="font-size:11px;color:var(--ink-faint)">vs</span>';
        html += '<button data-declare-winner="' + roundIndex + '|' + matchIndex + '|2" class="mono" style="flex:1;text-align:right;font-size:13px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;' + p2Class + '">' + p2 + getBadgeHTML(paysOf(m.p2)) + '</button>';
      } else {
        html += '<span class="mono" style="flex:1;font-size:13px;' + p1Class + '">' + p1 + getBadgeHTML(paysOf(m.p1)) + (m.winner === m.p1 ? ' 🏆' : '') + '</span>';
        html += '<span class="mono" style="font-size:11px;color:var(--ink-faint)">vs</span>';
        html += '<span class="mono" style="flex:1;text-align:right;font-size:13px;' + p2Class + '">' + p2 + getBadgeHTML(paysOf(m.p2)) + (m.winner === m.p2 ? ' 🏆' : '') + '</span>';
      }

      html += '</div>';

      if (!done && m.p1 && m.p2 && isMine) {
        html += '<p class="mono" style="font-size:10px;color:var(--ink-faint);text-align:center;margin-top:6px">Clique sur le gagnant</p>';
      }

      html += '</div>';
    });
  });

  // Champion ?
  if (bracket.length >= 1) {
    const lastRound = bracket[bracket.length - 1];
    if (lastRound.matches.length === 1 && lastRound.matches[0].winner) {
      const champ = lastRound.matches[0].winner;
      html += '<div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,rgba(255,107,53,.15),rgba(255,107,53,.05));border:1px solid rgba(255,107,53,.35);border-radius:14px;text-align:center">';
      html += '<p class="label" style="color:var(--brand)">CHAMPION 🏆</p>';
      html += '<p style="font-size:22px;font-weight:700;color:var(--ink);margin-top:8px">' + champ + getBadgeHTML(paysOf(champ)) + '</p>';
      html += '</div>';
    }
  }

  return html;
}

// ===== Génère le 1er tour =====
function generateBracket(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({ p1: shuffled[i], p2: shuffled[i + 1] || null, winner: null });
  }
  return [{ round: 1, matches }];
}

// ===== Déclare un gagnant + avance au tour suivant =====
async function declareWinner(tournamentId, bracket, roundIndex, matchIndex, winnerSide) {
  const cfg = getCfg();
  if (!cfg) return false;

  const match = bracket[roundIndex].matches[matchIndex];
  const winner = winnerSide === '1' ? match.p1 : match.p2;
  if (!winner) return false;

  match.winner = winner;

  const round = bracket[roundIndex];
  const allDone = round.matches.every(m => m.winner);

  let newStatus = 'started';
  let newBracket = bracket;

  if (allDone) {
    const winners = round.matches.map(m => m.winner).filter(Boolean);

    if (winners.length <= 1) {
      newStatus = 'finished';
    } else {
      const nextMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        nextMatches.push({
          p1: winners[i],
          p2: winners[i + 1] || null,
          winner: null
        });
      }
      newBracket = [...bracket, { round: roundIndex + 2, matches: nextMatches }];
    }
  }

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + tournamentId, {
      method: 'PATCH',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ bracket: newBracket, status: newStatus })
    });
    return res.ok;
  } catch (e) { return false; }
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

// ▼ SECTION 3 arrive ▼
   // ===== Crée un tournoi =====
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

  // ===== Supprimer =====
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

  // ===== Handlers de clic =====
  document.addEventListener('click', async (e) => {
    // Créer
    if (e.target.closest('[data-open-create-tournament]')) {
      e.preventDefault();
      openCreateTournamentModal();
      return;
    }

    // Déclarer le gagnant
    const winBtn = e.target.closest('[data-declare-winner]');
    if (winBtn) {
      e.preventDefault();
      e.stopPropagation();

      const parts = winBtn.getAttribute('data-declare-winner').split('|');
      const roundIndex = parseInt(parts[0], 10);
      const matchIndex = parseInt(parts[1], 10);
      const side = parts[2];

      const card = winBtn.closest('[data-tournament-id]');
      if (!card) return;
      const tid = card.getAttribute('data-tournament-id');

      const cfg = getCfg();
      if (!cfg) return;

      const r = await fetch(cfg.SUPABASE_URL + '/rest/v1/tournaments?id=eq.' + tid + '&select=bracket', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const data = await r.json();
      if (!data || !data.length) return;
      const bracket = data[0].bracket;
      if (!bracket) return;

      const ok = await declareWinner(tid, bracket, roundIndex, matchIndex, side);
      if (ok) {
        if (window.afriToast) window.afriToast('🏆 Gagnant déclaré');
        loadTournaments();
      } else {
        if (window.afriToast) window.afriToast('❌ Erreur');
      }
      return;
    }

    // Ouvrir/fermer les détails
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
