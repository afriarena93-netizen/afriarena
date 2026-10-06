/* AfriArena — Tournois : liste, création, inscription, bracket, champion */
(function () {
  'use strict';
  // ==== Fonction pour afficher le badge du pays ====
function getBadgeHTML(pays) {
  const badges = {
    "Togo": { surnom: "Éperviers", emoji: "🦅" },
    "Côte d'Ivoire": { surnom: "Éléphants", emoji: "🐘" },
    "Sénégal": { surnom: "Lions", emoji: "🦁" },
    "Cameroun": { surnom: "Lions Indomptables", emoji: "🦁" },
    "Ghana": { surnom: "Black Stars", emoji: "⭐" },
    "Nigeria": { surnom: "Super Eagles", emoji: "🦅" },
    "Mali": { surnom: "Aigles", emoji: "🦅" },
    "Burkina Faso": { surnom: "Étalons", emoji: "🐎" },
    "Algérie": { surnom: "Fennecs", emoji: "🦊" },
    "Maroc": { surnom: "Lions de l'Atlas", emoji: "🦁" },
    "Tunisie": { surnom: "Aigles de Carthage", emoji: "🦅" },
    "RD Congo": { surnom: "Léopards", emoji: "🐆" },
    "Gabon": { surnom: "Panthères", emoji: "🐆" },
    "Bénin": { surnom: "Écureuils", emoji: "🐿️" }
  };
  if (pays && badges[pays]) {
    return `<span class="badge-pays" title="${badges[pays].surnom}" style="font-size:0.8em; margin-left:5px;">${badges[pays].emoji} ${badges[pays].surnom}</span>`;
  }
  return "";
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
              : registered.map(p => '<p class="mono" style="font-size:13px;color:var(--ink)">👤 ' + p.gamertag + '</p>').join('')
            }
          </div>
          ${bracketHTML}
        </div>
      </article>
    `;
  }

  // ▼▼▼ SECTION 2 commence ici ▼▼▼
 function renderBracket(bracket, isMine, allPlayers) {
  let html = '<p class="label" style="margin-top:20px;">Bracket</p>';
  bracket.forEach((round, roundIndex) => {
    html += '<p class="mono" style="font-size:11px; margin-top:10px;">TOUR ' + (roundIndex + 1) + '</p>';
    round.matches.forEach((m, matchIndex) => {
      const p1 = m.p1 || 'En attente';
      const p2 = m.p2 || 'En attente';
      
      // Fonction pour trouver le pays d'un joueur
      const getPaysJoueur = (pseudo) => {
        const joueur = allPlayers.find(p => p.gamertag === pseudo);
        return joueur ? joueur.pays : null;
      };

      const done = m.winner !== null && m.winner !== undefined;
      const canClick = !done && m.p1 && m.p2 && isMine;
      const p1Class = m.winner === m.p1 ? 'color:var(--green)' : '';
      const p2Class = m.winner === m.p2 ? 'color:var(--green)' : '';
      
      html += '<div style="padding:10px 12px;background:var(--card);border-radius:8px;margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">';
      
      if (canClick) {
        // Joueur 1 cliquable
        html += '<button data-declare-winner="' + roundIndex + ',' + matchIndex + ',1" class="btn btn-sm btn-ghost" style="flex:1;text-align:left;' + p1Class + '">' + p1 + getBadgeHTML(getPaysJoueur(p1)) + '</button>';
        html += '<span class="mono" style="font-size:11px;color:var(--muted)">VS</span>';
        // Joueur 2 cliquable
        html += '<button data-declare-winner="' + roundIndex + ',' + matchIndex + ',2" class="btn btn-sm btn-ghost" style="flex:1;text-align:right;' + p2Class + '">' + p2 + getBadgeHTML(getPaysJoueur(p2)) + '</button>';
      } else {
        // Affichage simple (non cliquable)
        html += '<span class="mono" style="flex:1;' + p1Class + '">' + p1 + getBadgeHTML(getPaysJoueur(p1)) + '</span>';
        html += '<span class="mono" style="font-size:11px;color:var(--muted)">VS</span>';
        html += '<span class="mono" style="flex:1;text-align:right;' + p2Class + '">' + p2 + getBadgeHTML(getPaysJoueur(p2)) + '</span>';
      }
      
      html += '</div>';
      if (!done && m.p1 && m.p2 && isMine) {
        html += '<p class="mono" style="font-size:10px;color:var(--muted);margin-top:5px;text-align:center;">Clique sur le gagnant</p>';
      }
      html += '</div>';
    });
  });
  // ... le reste de la fonction (champion) reste inchangé
  if (bracket.length >= 1) {
    const lastRound = bracket[bracket.length - 1];
    if (lastRound.matches.length === 1 && lastRound.matches[0].winner) {
      html += '<div style="margin-top:16px;padding:16px;background:linear-gradient(135deg,rgba(255,107,53,.15),rgba(255,107,53,.05));border:1px solid rgba(255,107,53,.35);border-radius:14px;text-align:center">';
      html += '<p class="label" style="color:var(--brand)">CHAMPION 🏆</p>';
      html += '<p style="font-size:22px;font-weight:700;color:var(--ink);margin-top:8px">' + lastRound.matches[0].winner + '</p>';
      html += '</div>';
    }
  }
  return html;
}

function generateBracket(players) {
  const unique = [...new Set(players)];
  const shuffled = unique.sort(() => Math.random() - 0.5);
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1] || null;
    matches.push({
      p1: p1,
      p2: p2,
      winner: p2 ? null : p1
    });
  }
  return [{ round: 1, matches }];
}

async function declareWinner(tournamentId, bracket, roundIndex, matchIndex, winnerSide) {
  const cfg = getCfg();
  if (!cfg) return false;
  const match = bracket[roundIndex].matches[matchIndex];
  const winner = winnerSide === '1' ? match.p1 : match.p2;
  match.winner = winner;
  const round = bracket[roundIndex];
  const allDone = round.matches.every(m => m.winner);
  let newStatus = 'started';
  let newBracket = bracket;
  if (allDone) {
    const winners = round.matches.map(m => m.winner);
    if (winners.length === 1) {
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bracket: newBracket, status: newStatus })
    });
    return res.ok;
  } catch (e) { return false; }
}

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
        name, game, format,
        max_players: maxPlayers,
        status: 'registration',
        created_by: tag
      })
    });
    return res.ok;
  } catch (e) { return false; }
}

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

// ▼▼▼ SECTION 3 commence ici ▼▼▼
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

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open-create-tournament]')) {
      e.preventDefault();
      openCreateTournamentModal();
      return;
    }

    const winBtn = e.target.closest('[data-declare-winner]');
    if (winBtn) {
      alert('CLIC DÉTECTÉ');
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
      const ok = await declareWinner(tid, bracket, roundIndex, matchIndex, side);
if (ok) {
  if (window.afriToast) window.afriToast('🏆 Gagnant déclaré');
  loadTournaments();
} else {
  alert('❌ Erreur lors de la déclaration du gagnant. Regarde la console.');
}
return;
    }

    const card = e.target.closest('[data-tournament-id]');
    if (card && !e.target.closest('button')) {
      const id = card.getAttribute('data-tournament-id');
      const details = document.getElementById('details-' + id);
      if (details) details.style.display = details.style.display === 'none' ? 'block' : 'none';
      return;
    }

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

  function init() {
    if (!document.getElementById('tournaments-list')) return;
    loadTournaments();
    setInterval(loadTournaments, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
