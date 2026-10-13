/* AfriArena — Équipes & Guildes */
(function () {
  'use strict';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }

  function getMyTag() {
    return localStorage.getItem('afriarena:myTag') || null;
  }

  // Charge la liste des équipes
  async function loadTeams() {
    const cfg = getCfg();
    if (!cfg) return;

    const container = document.getElementById('teams-list');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/teams?select=*&order=created_at.desc', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      const teams = await res.json();

      if (!teams || teams.length === 0) {
        container.innerHTML = '<div class="empty"><strong>Aucune équipe pour le moment.</strong>Sois le premier à en créer une !</div>';
        return;
      }

      // Pour chaque équipe, on compte les membres
      const memberCounts = {};
      for (const t of teams) {
        const mRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members?team_id=eq.' + t.id + '&select=id', {
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
          }
        });
        const members = await mRes.json();
        memberCounts[t.id] = members ? members.length : 0;
      }

      container.innerHTML = teams.map(t => {
        const count = memberCounts[t.id] || 0;
        return `
          <div class="card" style="padding:20px;cursor:pointer;" onclick="window.location.href='equipe.html?id=${t.id}'">
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
              <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#FF6B35,#FF8457);display:grid;place-items:center;font-size:28px;">${t.logo || '🛡️'}</div>
              <div style="flex:1;">
                <p style="font-weight:700;font-size:16px;color:var(--ink);">${t.name}</p>
                <p class="mono" style="font-size:11px;color:var(--ink-faint);">${t.game} · ${t.city || ''} ${t.country || ''}</p>
              </div>
            </div>
            <p style="font-size:13px;color:var(--ink-muted);min-height:36px;">${t.description || 'Pas de description.'}</p>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);">
              <span class="mono" style="font-size:11px;color:var(--ink-faint);">👥 ${count} membre${count > 1 ? 's' : ''}</span>
              <span class="chip brand" style="font-size:10px;">Voir →</span>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.warn('Erreur chargement équipes:', e);
      container.innerHTML = '<div class="empty"><strong>Erreur de chargement.</strong></div>';
    }
  }
  // === Création d'une équipe ===
function openCreateTeamModal() {
  const myTag = getMyTag();
  if (!myTag) {
    alert('Tu dois être connecté pour créer une équipe.');
    window.location.href = 'connexion.html';
    return;
  }

  const existing = document.getElementById('create-team-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'create-team-backdrop';
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <h3>Créer mon équipe</h3>
          <p>Rassemble tes coéquipiers</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>✕</button>
      </div>
      <form id="create-team-form">
        <div class="form-row">
          <label for="ct-name">Nom de l'équipe</label>
          <input id="ct-name" required placeholder="Ex: Les Lions de Lomé">
        </div>
        <div class="form-row">
          <label for="ct-logo">Logo (un emoji)</label>
          <input id="ct-logo" placeholder="🛡️" maxlength="4" value="🛡️">
        </div>
        <div class="form-row">
          <label for="ct-game">Jeu principal</label>
          <select id="ct-game">
            <option>Free Fire</option>
            <option>Blood Strike</option>
            <option>Call of Duty</option>
            <option>PUBG Mobile</option>
            <option>eFootball</option>
            <option>FC Mobile</option>
          </select>
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="ct-country">Pays</label>
            <select id="ct-country">
              <option>Togo</option><option>Ghana</option><option>Bénin</option>
              <option>Côte d’Ivoire</option><option>Nigeria</option>
              <option>Sénégal</option><option>Cameroun</option>
            </select>
          </div>
          <div class="form-row">
            <label for="ct-city">Ville</label>
            <input id="ct-city" placeholder="Lomé">
          </div>
        </div>
        <div class="form-row">
          <label for="ct-desc">Description (optionnel)</label>
          <textarea id="ct-desc" rows="3" placeholder="Décris ton équipe en quelques mots..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="submit" class="btn btn-primary">Créer l'équipe</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const form = document.getElementById('create-team-form');
  setTimeout(() => document.getElementById('ct-name').focus(), 100);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
      backdrop.remove();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('ct-name').value.trim();
    const logo = document.getElementById('ct-logo').value.trim() || '🛡️';
    const game = document.getElementById('ct-game').value;
    const country = document.getElementById('ct-country').value;
    const city = document.getElementById('ct-city').value.trim();
    const description = document.getElementById('ct-desc').value.trim();

    if (!name) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '⏳ Création…';
    submitBtn.disabled = true;

    const cfg = getCfg();
    try {
      // 1. Créer l'équipe
      const teamRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/teams', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: name,
          description: description,
          game: game,
          logo: logo,
          country: country,
          city: city,
          created_by: myTag
        })
      });

      if (!teamRes.ok) {
        const errData = await teamRes.json();
        if (teamRes.status === 409) {
          alert('Ce nom d\'équipe est déjà pris. Choisis-en un autre.');
        } else {
          alert('Erreur : ' + (errData.message || 'Impossible de créer l\'équipe'));
        }
        submitBtn.textContent = 'Créer l\'équipe';
        submitBtn.disabled = false;
        return;
      }

      const teamData = await teamRes.json();
      const teamId = teamData[0].id;

      // 2. Ajouter le créateur comme Chef de l'équipe
      await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team_id: teamId,
          gamertag: myTag,
          role: 'Chef'
        })
      });

      if (window.afriToast) window.afriToast('🎉 Équipe créée !');
      backdrop.remove();
      loadTeams();

    } catch (err) {
      console.error(err);
      submitBtn.textContent = 'Créer l\'équipe';
      submitBtn.disabled = false;
    }
  });
}
    // === Gestion du clic sur "Créer une équipe" ===
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-create-team]');
    if (btn) {
      e.preventDefault();
      openCreateTeamModal();
    }
  });

  // === Init ===
  function init() {
    if (!document.getElementById('teams-list')) return;
    loadTeams();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
