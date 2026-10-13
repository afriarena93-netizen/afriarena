/* AfriArena — Page d'une équipe */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }
  function getMyTag() { return localStorage.getItem('afriarena:myTag') || null; }

  let teamId = null;
  let teamData = null;
  let isMember = false;
  let isChief = false;

  // Charge les infos de l'équipe
  async function loadTeamInfo() {
    const cfg = getCfg();
    if (!cfg) return;

    const params = new URLSearchParams(window.location.search);
    teamId = params.get('id');
    if (!teamId) {
      document.getElementById('team-name').textContent = 'Équipe introuvable';
      return;
    }

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/teams?id=eq.' + teamId, {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      const data = await res.json();
      if (!data || data.length === 0) {
        document.getElementById('team-name').textContent = 'Équipe introuvable';
        return;
      }

      teamData = data[0];
      const myTag = getMyTag();
      isChief = (teamData.created_by === myTag);

      // Remplir les infos
      document.getElementById('team-logo').textContent = teamData.logo || '🛡️';
      document.getElementById('team-name').textContent = teamData.name;
      document.getElementById('team-meta').textContent =
        [teamData.game, teamData.city, teamData.country].filter(Boolean).join(' · ');
      document.getElementById('team-desc').textContent =
        teamData.description || 'Pas de description.';

    } catch (e) {
      console.warn('Erreur chargement équipe:', e);
    }
  }

  // Charge les membres
  async function loadMembers() {
    const cfg = getCfg();
    if (!cfg || !teamId) return;

    const container = document.getElementById('team-members-list');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members?team_id=eq.' + teamId + '&order=joined_at.asc', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      const members = await res.json();

      if (!members || members.length === 0) {
        container.innerHTML = '<div class="empty"><strong>Aucun membre.</strong></div>';
        return;
      }

      const myTag = getMyTag();
      isMember = members.some(m => m.gamertag === myTag);

      // Charger les avatars
      const playersRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?select=gamertag,avatar_url,rating', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      const players = await playersRes.json();
      const avatarMap = {};
      players.forEach(p => { if (p.avatar_url) avatarMap[p.gamertag] = p.avatar_url; });

      container.innerHTML = members.map(m => {
        const avatar = avatarMap[m.gamertag];
        const initial = (m.gamertag || '?').charAt(0).toUpperCase();
        const avatarHTML = avatar
          ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${m.gamertag}">`
          : initial;
        const roleIcon = m.role === 'Chef' ? '👑' : (m.role === 'Officier' ? '⚔️' : '🛡️');
        return `
          <div class="card" style="padding:14px;display:flex;align-items:center;gap:12px;">
            <div class="player-avatar" style="width:44px;height:44px;font-size:16px;flex-shrink:0;">${avatarHTML}</div>
            <div style="flex:1;min-width:0;">
              <p style="font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <a href="profil.html?gamertag=${encodeURIComponent(m.gamertag)}" style="color:inherit;text-decoration:none;">${m.gamertag}</a>
              </p>
              <p class="mono" style="font-size:10px;color:var(--ink-faint);">${roleIcon} ${m.role}</p>
            </div>
          </div>
        `;
      }).join('');

      updateActions();

    } catch (e) {
      console.warn('Erreur chargement membres:', e);
    }
  }

  // Met à jour les boutons d'action
  function updateActions() {
    const container = document.getElementById('team-actions');
    if (!container) return;
    const myTag = getMyTag();

    if (!myTag) {
      container.innerHTML = '<a href="connexion.html" class="btn btn-primary btn-sm">Connecte-toi pour rejoindre</a>';
      return;
    }

    if (isMember) {
      if (isChief) {
        container.innerHTML = `
          <span class="chip positive"><span class="dot live"></span> Tu es Chef</span>
          <button class="btn btn-outline btn-sm" id="delete-team-btn" style="border-color:#FF5050;color:#FF5050;">🗑 Supprimer l'équipe</button>
        `;
      } else {
        container.innerHTML = `
          <span class="chip positive"><span class="dot live"></span> Tu es membre</span>
          <button class="btn btn-outline btn-sm" id="leave-team-btn">🚪 Quitter l'équipe</button>
        `;
      }
    } else {
      container.innerHTML = '<button class="btn btn-primary btn-sm" id="join-team-btn">+ Rejoindre cette équipe</button>';
    }
                 }
  // Rejoindre l'équipe
async function joinTeam() {
  const cfg = getCfg();
  const myTag = getMyTag();
  if (!cfg || !myTag || !teamId) return;

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members', {
      method: 'POST',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        team_id: teamId,
        gamertag: myTag,
        role: 'Membre'
      })
    });

    if (res.ok) {
      if (window.afriToast) window.afriToast('🎉 Tu as rejoint l\'équipe !');
      loadMembers();
    } else {
      if (window.afriToast) window.afriToast('❌ Erreur');
    }
  } catch (e) {
    console.warn('Erreur join:', e);
  }
}

// Quitter l'équipe
async function leaveTeam() {
  const cfg = getCfg();
  const myTag = getMyTag();
  if (!cfg || !myTag || !teamId) return;

  if (!confirm('Quitter cette équipe ?')) return;

  try {
    await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members?team_id=eq.' + teamId + '&gamertag=eq.' + encodeURIComponent(myTag), {
      method: 'DELETE',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });
    if (window.afriToast) window.afriToast('🚪 Tu as quitté l\'équipe');
    loadMembers();
  } catch (e) {
    console.warn('Erreur leave:', e);
  }
}

// Supprimer l'équipe (Chef uniquement)
async function deleteTeam() {
  const cfg = getCfg();
  if (!cfg || !teamId) return;

  if (!confirm('Supprimer définitivement cette équipe ? Cette action est irréversible.')) return;

  try {
    await fetch(cfg.SUPABASE_URL + '/rest/v1/teams?id=eq.' + teamId, {
      method: 'DELETE',
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });
    if (window.afriToast) window.afriToast('🗑 Équipe supprimée');
    setTimeout(() => { window.location.href = 'equipes.html'; }, 1000);
  } catch (e) {
    console.warn('Erreur delete:', e);
  }
}

// Gestion des clics sur les boutons
document.addEventListener('click', (e) => {
  if (e.target.closest('#join-team-btn')) {
    e.preventDefault();
    joinTeam();
    return;
  }
  if (e.target.closest('#leave-team-btn')) {
    e.preventDefault();
    leaveTeam();
    return;
  }
  if (e.target.closest('#delete-team-btn')) {
    e.preventDefault();
    deleteTeam();
    return;
  }
});
    // === Init ===
  async function init() {
    if (!document.getElementById('team-name')) return;
    await loadTeamInfo();
    await loadMembers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
