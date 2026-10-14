/* AfriArena — Profil : avatar + totems + historique + équipe + réputation */
(function () {
  'use strict';

  const BUCKET = 'avatars';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }

  function getMyTag() {
    return localStorage.getItem('afriarena:myTag') || 'maz';
  }

  async function uploadAvatar(file) {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) { alert('Config Supabase manquante'); return null; }
    const tag = getMyTag();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = tag + '-' + Date.now() + '.' + ext;
    const url = cfg.SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + filename;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      });
      if (!res.ok) { console.warn('Upload error:', res.status); return null; }
      return cfg.SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + filename;
    } catch (e) { return null; }
  }

  async function saveAvatarUrl(url) {
    const cfg = getCfg();
    if (!cfg) return;
    const tag = getMyTag();
    try {
      await fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag), {
        method: 'PATCH',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatar_url: url })
      });
    } catch (e) {}
  }

  function bindAvatar() {
    const input = document.getElementById('avatar-input');
    const preview = document.getElementById('avatar-preview');
    if (!input || !preview) return;

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { alert('Format non supporté.'); return; }
      if (file.size > 3 * 1024 * 1024) { alert('Image trop lourde (max 3 Mo).'); return; }

      const reader = new FileReader();
      reader.onload = () => { preview.innerHTML = '<img src="' + reader.result + '" alt="Aperçu">'; };
      reader.readAsDataURL(file);

      const url = await uploadAvatar(file);
      if (!url) { alert('Erreur lors de l\'envoi'); return; }
      await saveAvatarUrl(url);
      if (window.afriToast) window.afriToast('✅ Photo mise à jour');
    });
  }

  function cacherBoutonSiPasProprietaire() {
    return;
        }
  // === CHARGER LA RÉPUTATION (moyenne + barres) ===
async function chargerReputation() {
  const cfg = getCfg();
  if (!cfg || !cfg.SUPABASE_URL) return;

  const urlParams = new URLSearchParams(window.location.search);
  const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/ratings?rated_player=eq.' + encodeURIComponent(tag) + '&select=*', {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });
    const ratings = await res.json();

    const ratingEl = document.getElementById('profile-rating');
    const countEl = document.getElementById('profile-match-count');
    const fairplayEl = document.getElementById('rep-fairplay');
    const punctualityEl = document.getElementById('rep-punctuality');
    const respectEl = document.getElementById('rep-respect');

    if (!ratings || ratings.length === 0) {
  // Aucune note : on affiche 0 avis ET on cache la section détaillée
  if (ratingEl) ratingEl.innerHTML = '5,0 <span style="color:#FFC15E;font-size:20px">★</span>';
  if (countEl) countEl.textContent = '0 avis';
  // Cacher la section "Réputation détaillée" si elle existe
  const repSection = document.querySelector('.rep-grid');
  if (repSection) repSection.parentElement.style.display = 'none';
  return;
} else {
  // Si on a des notes, on s'assure que la section est visible
  const repSection = document.querySelector('.rep-grid');
  if (repSection) repSection.parentElement.style.display = '';
    }

    // Calcul de la moyenne
    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    const avg = (sum / total).toFixed(1).replace('.', ',');

    // Calcul des pourcentages
    const fairplayCount = ratings.filter(r => r.fairplay).length;
    const punctualityCount = ratings.filter(r => r.punctuality).length;
    const respectCount = ratings.filter(r => r.respect).length;

    const fairplayPct = Math.round((fairplayCount / total) * 100) + '%';
    const punctualityPct = Math.round((punctualityCount / total) * 100) + '%';
    const respectPct = Math.round((respectCount / total) * 100) + '%';

    if (ratingEl) ratingEl.innerHTML = avg + ' <span style="color:#FFC15E;font-size:20px">★</span>';
    if (countEl) countEl.textContent = total + ' avis';
    if (fairplayEl) fairplayEl.textContent = fairplayPct;
    if (punctualityEl) punctualityEl.textContent = punctualityPct;
    if (respectEl) respectEl.textContent = respectPct;

    // Mettre à jour les barres de progression (largeur)
    const fairplayBar = document.getElementById('bar-fairplay');
    const punctualityBar = document.getElementById('bar-punctuality');
    const respectBar = document.getElementById('bar-respect');
    if (fairplayBar) fairplayBar.style.width = fairplayPct;
    if (punctualityBar) punctualityBar.style.width = punctualityPct;
    if (respectBar) respectBar.style.width = respectPct;

  } catch (e) {
    console.warn('Erreur chargement réputation:', e);
  }
}

// === OUVRIR LA MODALE DE NOTATION ===
function ouvrirModalNotation(matchId, opponent) {
  const existing = document.getElementById('rating-modal-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'rating-modal-backdrop';
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-head">
        <div>
          <h3>⭐ Noter le match</h3>
          <p>Comment était ton match contre <strong>${opponent}</strong> ?</p>
        </div>
        <button type="button" class="modal-close" data-close-modal>✕</button>
      </div>
      <form id="rating-form">
        <div style="text-align:center;margin:20px 0;">
          <div id="star-rating" style="font-size:40px;cursor:pointer;user-select:none;display:flex;justify-content:center;gap:8px;">
            <span data-star="1" style="color:#444;">★</span>
            <span data-star="2" style="color:#444;">★</span>
            <span data-star="3" style="color:#444;">★</span>
            <span data-star="4" style="color:#444;">★</span>
            <span data-star="5" style="color:#444;">★</span>
          </div>
          <input type="hidden" id="rating-score" value="0">
        </div>
        <div class="form-row" style="display:flex;align-items:center;justify-content:space-between;">
          <label>Fair-play</label>
          <input type="checkbox" id="rating-fairplay" checked style="width:20px;height:20px;">
        </div>
        <div class="form-row" style="display:flex;align-items:center;justify-content:space-between;">
          <label>Ponctualité</label>
          <input type="checkbox" id="rating-punctuality" checked style="width:20px;height:20px;">
        </div>
        <div class="form-row" style="display:flex;align-items:center;justify-content:space-between;">
          <label>Respect</label>
          <input type="checkbox" id="rating-respect" checked style="width:20px;height:20px;">
        </div>
        <div class="form-row">
          <label for="rating-comment">Commentaire (optionnel)</label>
          <textarea id="rating-comment" rows="2" placeholder="Ex: Très bon match, joueur sérieux..."></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
          <button type="submit" class="btn btn-primary">Envoyer la note</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  // Gestion des étoiles
  const starContainer = document.getElementById('star-rating');
  const scoreInput = document.getElementById('rating-score');
  starContainer.addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (!star) return;
    const val = parseInt(star.getAttribute('data-star'));
    scoreInput.value = val;
    starContainer.querySelectorAll('[data-star]').forEach(s => {
      const sVal = parseInt(s.getAttribute('data-star'));
      s.style.color = sVal <= val ? '#FFC15E' : '#444';
    });
  });

  // Fermeture
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
      backdrop.remove();
    }
  });

  // Soumission
  const form = document.getElementById('rating-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const score = parseInt(scoreInput.value);
    if (score < 1 || score > 5) {
      alert('Choisis une note entre 1 et 5 étoiles.');
      return;
    }

    const fairplay = document.getElementById('rating-fairplay').checked;
    const punctuality = document.getElementById('rating-punctuality').checked;
    const respect = document.getElementById('rating-respect').checked;
    const comment = document.getElementById('rating-comment').value.trim();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = '⏳ Envoi…';
    submitBtn.disabled = true;

    const cfg = getCfg();
    const myTag = getMyTag();

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/ratings', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          match_id: matchId,
          rated_by: myTag,
          rated_player: opponent,
          score: score,
          fairplay: fairplay,
          punctuality: punctuality,
          respect: respect,
          comment: comment || null
        })
      });

      if (res.ok) {
        backdrop.remove();
        if (window.afriToast) window.afriToast('⭐ Note envoyée, merci !');
        chargerReputation();
        chargerHistorique();
      } else {
        const err = await res.json();
        if (err.code === '23505') {
          alert('Tu as déjà noté ce match.');
        } else {
          alert('Erreur lors de l\'envoi.');
        }
        submitBtn.textContent = 'Envoyer la note';
        submitBtn.disabled = false;
      }
    } catch (err) {
      alert('Erreur réseau.');
      submitBtn.textContent = 'Envoyer la note';
      submitBtn.disabled = false;
    }
  });
}
    // === CHARGER LES INFOS DU JOUEUR ===
  async function chargerInfosJoueur() {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) return;

    const urlParams = new URLSearchParams(window.location.search);
    const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();
    const myTag = getMyTag();
    const isMyProfile = (tag === myTag);

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag) + '&select=*', {
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
        }
      });
      const data = await res.json();
      if (!data || data.length === 0) return;
      const p = data[0];

      const avatarPreview = document.getElementById('avatar-preview');
      if (avatarPreview) {
        if (p.avatar_url) {
          avatarPreview.innerHTML = '<img src="' + p.avatar_url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
        } else {
          avatarPreview.textContent = (p.gamertag || '?').charAt(0).toUpperCase();
        }
      }

      const nameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = p.gamertag || 'Joueur';

      const metaEl = document.getElementById('profile-meta');
      if (metaEl) {
        const city = p.city || '';
        const country = p.country || '';
        const date = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
        metaEl.textContent = [city, country, date ? 'Inscrit en ' + date : ''].filter(Boolean).join(' · ');
      }

      const bioEl = document.getElementById('profile-bio');
      if (bioEl) bioEl.textContent = p.bio || 'Aucune description pour le moment.';

      const tagsEl = document.getElementById('profile-tags');
      if (tagsEl) {
        let tagsHTML = '';
        if (p.game) tagsHTML += '<span class="tag">' + p.game + '</span>';
        if (p.level) tagsHTML += '<span class="tag">' + p.level + '</span>';
        tagsEl.innerHTML = tagsHTML || '<span class="tag">Aucun jeu renseigné</span>';
      }

      const actionsEl = document.getElementById('profile-actions');
      if (actionsEl && !isMyProfile) actionsEl.innerHTML = '';

      const editLabel = document.getElementById('avatar-edit-label');
      if (editLabel && !isMyProfile) editLabel.style.display = 'none';

      // === ÉQUIPE ===
      const teamRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/team_members?gamertag=eq.' + encodeURIComponent(tag) + '&select=team_id,role', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const teamMembers = await teamRes.json();
      const teamContainer = document.getElementById('profile-team');

      if (teamContainer && teamMembers && teamMembers.length > 0) {
        const tm = teamMembers[0];
        const infoRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/teams?id=eq.' + tm.team_id, {
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
        });
        const teamInfo = await infoRes.json();
        if (teamInfo && teamInfo.length > 0) {
          const t = teamInfo[0];
          const roleIcon = tm.role === 'Chef' ? '👑' : (tm.role === 'Officier' ? '⚔️' : '🛡️');
          teamContainer.innerHTML = `
            <a href="equipe.html?id=${t.id}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(255,107,53,0.15),rgba(204,140,255,0.15));border:1px solid rgba(255,107,53,0.4);border-radius:12px;padding:8px 14px;">
              <span style="font-size:22px;">${t.logo || '🛡️'}</span>
              <span style="display:flex;flex-direction:column;line-height:1.2;">
                <span style="font-size:13px;font-weight:600;color:#FF6B35;">${t.name}</span>
                <span style="font-size:10px;color:#aaa;">${roleIcon} ${tm.role} · ${t.game}</span>
              </span>
            </a>
          `;
        }
      }
    } catch (e) {
      console.warn('Erreur chargement infos joueur:', e);
    }
  }

  // === TOTEMS AFRICAINS ===
  async function chargerTotems() {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) return;
    const urlParams = new URLSearchParams(window.location.search);
    const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag) + '&select=rating,matches_count', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const data = await res.json();
      if (!data || data.length === 0) return;
      const player = data[0];
      const rating = parseFloat(player.rating) || 0;
      const matches = parseInt(player.matches_count) || 0;
      let totems = [];
      if (rating >= 4.8 && matches > 30) totems.push('🦅 Aigle (Stratège)');
      if (matches > 20) totems.push('🐆 Panthère (Rapide)');
      if (matches > 10) totems.push('🐘 Éléphant (Régulier)');
      if (rating >= 4.5) totems.push('🦁 Lion (Fair-play)');

      const container = document.getElementById('totems-container');
      if (container) {
        if (totems.length === 0) {
          container.innerHTML = '<span style="color: #888; font-size: 0.9rem;">Aucun totem pour le moment</span>';
        } else {
          const TOTEM_STYLES = {
  'Lion':     { img: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Lion/3D/lion_3d.png', gradient: 'linear-gradient(135deg, #FFC15E, #FF8457)', glow: 'rgba(255,193,94,0.5)',  label: 'Fair-play' },
  'Éléphant': { img: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Elephant/3D/elephant_3d.png', gradient: 'linear-gradient(135deg, #9CA3AF, #6B7280)', glow: 'rgba(156,163,175,0.5)', label: 'Régulier' },
  'Panthère': { img: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Leopard/3D/leopard_3d.png', gradient: 'linear-gradient(135deg, #CC8CFF, #78B7FF)', glow: 'rgba(204,140,255,0.5)', label: 'Rapide' },
  'Aigle':    { img: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Eagle/3D/eagle_3d.png', gradient: 'linear-gradient(135deg, #78B7FF, #06B6D4)', glow: 'rgba(120,183,255,0.5)', label: 'Stratège' }
};
container.innerHTML = totems.map(t => {
  const key = Object.keys(TOTEM_STYLES).find(k => t.includes(k)) || 'Lion';
  const style = TOTEM_STYLES[key];
  return `
    <div style="display:inline-flex;align-items:center;gap:10px;background:${style.gradient};color:#0b0c10;padding:8px 16px 8px 8px;border-radius:30px;font-weight:700;font-size:0.95rem;box-shadow:0 0 20px ${style.glow},0 4px 12px rgba(0,0,0,0.3);margin-right:8px;margin-bottom:8px;">
      <img src="${style.img}" alt="${key}" style="width:40px;height:40px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <span style="display:flex;flex-direction:column;line-height:1.1;">
        <span style="font-size:0.95rem;">${key}</span>
        <span style="font-size:0.7rem;opacity:0.75;font-weight:500;">${style.label}</span>
      </span>
    </div>
  `;
}).join('');
        }
      }
    } catch (e) { console.warn('Erreur totems:', e); }
  }

  // === HISTORIQUE DES MATCHS (avec confirmation + notation) ===
  async function chargerHistorique() {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) return;
    const urlParams = new URLSearchParams(window.location.search);
    const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();
    const myTag = getMyTag();
    const container = document.getElementById('match-history-container');
    if (!container) return;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/matches?or=(player1.eq.' + encodeURIComponent(tag) + ',player2.eq.' + encodeURIComponent(tag) + ')&order=created_at.desc&limit=10', {
        headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
      });
      const matches = await res.json();
      if (!matches || matches.length === 0) {
        container.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Aucun match pour le moment.</p>';
        return;
      }

      // Récupérer les notes déjà données par moi
      let myRatings = [];
      if (myTag) {
        const rRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/ratings?rated_by=eq.' + encodeURIComponent(myTag) + '&select=match_id', {
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY }
        });
        myRatings = await rRes.json();
      }
      const ratedIds = (myRatings || []).map(r => r.match_id);

      container.innerHTML = matches.map(m => {
        const isPlayer1 = m.player1 === tag;
        const opponent = isPlayer1 ? m.player2 : m.player1;
        const isWin = m.winner === tag;
        const date = new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const isPending = m.status === 'pending';
        const isConfirmed = m.status === 'confirmed';
        const iReported = m.reported_by === tag;

        let actionHTML = '';
        if (isPending && !iReported) {
          actionHTML = `
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="btn btn-primary btn-sm" data-confirm-match="${m.id}" style="background:#B8F27C;color:#0b0c10;border:none;font-size:11px;padding:4px 10px">✅ Confirmer</button>
              <button class="btn btn-outline btn-sm" data-contest-match="${m.id}" style="border-color:#FF5050;color:#FF5050;font-size:11px;padding:4px 10px">❌ Contester</button>
            </div>
          `;
        } else if (isPending && iReported) {
          actionHTML = '<p style="font-size:10px;color:#FFC15E;margin-top:4px">⏳ En attente de confirmation</p>';
        } else if (isConfirmed && tag === myTag && !ratedIds.includes(m.id)) {
          actionHTML = `
            <div style="margin-top:6px">
              <button class="btn btn-outline btn-sm" data-rate-match="${m.id}" data-rate-opponent="${opponent}" style="border-color:#FFC15E;color:#FFC15E;font-size:11px;padding:4px 10px">⭐ Noter cet adversaire</button>
            </div>
          `;
        } else if (isConfirmed && ratedIds.includes(m.id)) {
          actionHTML = '<p style="font-size:10px;color:#B8F27C;margin-top:4px">⭐ Déjà noté</p>';
        }

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="flex:1">
              <p style="font-weight: 600; color: ${isPending ? '#FFC15E' : (isWin ? '#B8F27C' : '#FF5050')};">
                ${isPending ? '⏳ En attente' : (isWin ? '🏆 Victoire' : '❌ Défaite')}
              </p>
              <p style="font-size: 12px; color: #888;">vs ${opponent} · ${m.game} · ${date}</p>
              ${actionHTML}
            </div>
            <span style="font-size: 12px; color: #666;">#${m.id}</span>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Erreur historique:', e);
      container.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Erreur de chargement.</p>';
    }
  }

  // === CONFIRMER / CONTESTER / NOTER ===
  document.addEventListener('click', async (e) => {
    const cfg = getCfg();
    if (!cfg) return;

    const confirmBtn = e.target.closest('[data-confirm-match]');
    if (confirmBtn) {
      e.preventDefault();
      const matchId = confirmBtn.getAttribute('data-confirm-match');
      confirmBtn.textContent = '⏳…';
      confirmBtn.disabled = true;
      try {
        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/matches?id=eq.' + matchId, {
          method: 'PATCH',
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('✅ Match confirmé !');
          chargerHistorique();
        } else { confirmBtn.textContent = '❌'; }
      } catch (err) { confirmBtn.textContent = '❌'; }
      return;
    }

    const contestBtn = e.target.closest('[data-contest-match]');
    if (contestBtn) {
      e.preventDefault();
      const matchId = contestBtn.getAttribute('data-contest-match');
      if (!confirm('Contester ce match ? Le résultat sera annulé.')) return;
      contestBtn.textContent = '⏳…';
      contestBtn.disabled = true;
      try {
        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/matches?id=eq.' + matchId, {
          method: 'PATCH',
          headers: { 'apikey': cfg.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'contested', winner: null })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('❌ Match contesté');
          chargerHistorique();
        } else { contestBtn.textContent = '❌'; }
      } catch (err) { contestBtn.textContent = '❌'; }
      return;
    }

    const rateBtn = e.target.closest('[data-rate-match]');
    if (rateBtn) {
      e.preventDefault();
      const matchId = rateBtn.getAttribute('data-rate-match');
      const opponent = rateBtn.getAttribute('data-rate-opponent');
      ouvrirModalNotation(matchId, opponent);
      return;
    }
  });
// === MODIFIER MON PROFIL ===
function bindEditProfile() {
  const btn = document.getElementById('edit-profile-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const tag = getMyTag();
    const cfg = getCfg();
    if (!tag || !cfg) return;

    // On récupère les infos actuelles du joueur
    fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag) + '&select=*', {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    })
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) return;
      const p = data[0];

      // On crée la modale
      const existing = document.getElementById('edit-profile-backdrop');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'edit-profile-backdrop';
      backdrop.className = 'modal-backdrop open';
      backdrop.innerHTML = `
        <div class="modal">
          <div class="modal-head">
            <div>
              <h3>Modifier mon profil</h3>
              <p>Mets à jour tes infos</p>
            </div>
            <button type="button" class="modal-close" data-close-modal>✕</button>
          </div>
          <form id="edit-profile-form">
            <div class="form-row">
              <label for="ep-bio">Bio</label>
              <textarea id="ep-bio" rows="3" placeholder="Décris-toi en quelques mots...">${p.bio || ''}</textarea>
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label for="ep-country">Pays</label>
                <select id="ep-country">
                  <option>Togo</option><option>Ghana</option><option>Bénin</option>
                  <option>Côte d'Ivoire</option><option>Nigeria</option>
                  <option>Sénégal</option><option>Cameroun</option>
                </select>
              </div>
              <div class="form-row">
                <label for="ep-city">Ville</label>
                <input id="ep-city" value="${p.city || ''}" placeholder="Lomé">
              </div>
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label for="ep-game">Jeu préféré</label>
                <select id="ep-game">
                  <option>Free Fire</option><option>eFootball</option>
                  <option>FC Mobile</option><option>PUBG Mobile</option>
                  <option>Call of Duty</option><option>Blood Strike</option>
                </select>
              </div>
              <div class="form-row">
                <label for="ep-level">ID dans le jeu</label>
                <input id="ep-level" value="${p.level || ''}" placeholder="Ex: KOSSI228">
              </div>
            </div>
// === MODIFIER MON PROFIL ===
function bindEditProfile() {
  const btn = document.getElementById('edit-profile-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const tag = getMyTag();
    const cfg = getCfg();
    if (!tag || !cfg) return;

    // On récupère les infos actuelles du joueur
    fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag) + '&select=*', {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    })
    .then(res => res.json())
    .then(data => {
      if (!data || data.length === 0) return;
      const p = data[0];

      // On crée la modale
      const existing = document.getElementById('edit-profile-backdrop');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'edit-profile-backdrop';
      backdrop.className = 'modal-backdrop open';
      backdrop.innerHTML = `
        <div class="modal">
          <div class="modal-head">
            <div>
              <h3>Modifier mon profil</h3>
              <p>Mets à jour tes infos</p>
            </div>
            <button type="button" class="modal-close" data-close-modal>✕</button>
          </div>
          <form id="edit-profile-form">
            <div class="form-row">
              <label for="ep-bio">Bio</label>
              <textarea id="ep-bio" rows="3" placeholder="Décris-toi en quelques mots...">${p.bio || ''}</textarea>
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label for="ep-country">Pays</label>
                <select id="ep-country">
                  <option>Togo</option><option>Ghana</option><option>Bénin</option>
                  <option>Côte d'Ivoire</option><option>Nigeria</option>
                  <option>Sénégal</option><option>Cameroun</option>
                </select>
              </div>
              <div class="form-row">
                <label for="ep-city">Ville</label>
                <input id="ep-city" value="${p.city || ''}" placeholder="Lomé">
              </div>
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label for="ep-game">Jeu préféré</label>
                <select id="ep-game">
                  <option>Free Fire</option><option>eFootball</option>
                  <option>FC Mobile</option><option>PUBG Mobile</option>
                  <option>Call of Duty</option><option>Blood Strike</option>
                </select>
              </div>
              <div class="form-row">
                <label for="ep-level">ID dans le jeu</label>
                <input id="ep-level" value="${p.level || ''}" placeholder="Ex: KOSSI228">
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" data-close-modal>Annuler</button>
              <button type="submit" class="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(backdrop);

      // Pré-sélectionner les valeurs actuelles
      document.getElementById('ep-country').value = p.country || 'Togo';
      document.getElementById('ep-game').value = p.game || 'Free Fire';

      // Fermeture
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
          backdrop.remove();
        }
      });

      // Soumission
      document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bio = document.getElementById('ep-bio').value.trim();
        const country = document.getElementById('ep-country').value;
        const city = document.getElementById('ep-city').value.trim();
        const game = document.getElementById('ep-game').value;
        const level = document.getElementById('ep-level').value.trim();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.textContent = '⏳ Enregistrement…';
        submitBtn.disabled = true;

        try {
          const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag), {
            method: 'PATCH',
            headers: {
              'apikey': cfg.SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bio, country, city, game, level })
          });
          if (res.ok) {
            backdrop.remove();
            if (window.afriToast) window.afriToast('✅ Profil mis à jour');
            chargerInfosJoueur();
          } else {
            submitBtn.textContent = '❌ Erreur';
            submitBtn.disabled = false;
          }
        } catch (err) {
          submitBtn.textContent = '❌ Erreur';
          submitBtn.disabled = false;
        }
      });
    });
  });
          }
  function init() {
  bindAvatar();
  cacherBoutonSiPasProprietaire();
  chargerInfosJoueur();
  chargerTotems();
  chargerHistorique();
  chargerReputation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
