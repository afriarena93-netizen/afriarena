/* AfriArena — Profil : upload avatar + totems + historique + confirmation matchs */
(function () {
  'use strict';

  const BUCKET = 'avatars';

  function getCfg() { return window.AFRIARENA_CONFIG || null; }

  function getMyTag() {
    return localStorage.getItem('afriarena:myTag') || 'maz';
  }

  async function uploadAvatar(file) {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) {
      alert('Config Supabase manquante');
      return null;
    }

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

      if (!res.ok) {
        console.warn('Upload error:', res.status, await res.text());
        return null;
      }

      return cfg.SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + filename;
    } catch (e) {
      console.warn('Upload failed:', e);
      return null;
    }
  }

  async function saveAvatarUrl(url) {
    const cfg = getCfg();
    if (!cfg) return;
    const tag = getMyTag();
    try {
      await fetch(
        cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag),
        {
          method: 'PATCH',
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatar_url: url })
        }
      );
    } catch (e) {}
  }

  function bindAvatar() {
    const input = document.getElementById('avatar-input');
    const preview = document.getElementById('avatar-preview');
    if (!input || !preview) return;

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        alert('Format non supporté. Utilise JPG, PNG ou WebP.');
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        alert('Image trop lourde. Maximum 3 Mo.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        preview.innerHTML = '<img src="' + reader.result + '" alt="Aperçu">';
      };
      reader.readAsDataURL(file);

      const url = await uploadAvatar(file);
      if (!url) {
        alert('Erreur lors de l\'envoi');
        return;
      }

      await saveAvatarUrl(url);
      if (window.afriToast) window.afriToast('✅ Photo mise à jour');
    });
  }

  function cacherBoutonSiPasProprietaire() {
    return;
      }
  // === TOTEMS AFRICAINS ===
async function chargerTotems() {
  const cfg = getCfg();
  if (!cfg || !cfg.SUPABASE_URL) return;

  const urlParams = new URLSearchParams(window.location.search);
  const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/players?gamertag=eq.' + encodeURIComponent(tag) + '&select=rating,matches_count', {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
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
        container.innerHTML = '<span style="color: #888; font-size: 0.9rem;">Aucun totem pour le moment (Jouez plus de matchs !)</span>';
      } else {
        container.innerHTML = totems.map(t => `<span style="background: #191A21; padding: 6px 12px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px; display: inline-block; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1); color: #FF6B35;">${t}</span>`).join('');
      }
    }
  } catch (e) {
    console.warn('Erreur chargement totems:', e);
  }
}

// === HISTORIQUE DES MATCHS (avec confirmation) ===
async function chargerHistorique() {
  const cfg = getCfg();
  if (!cfg || !cfg.SUPABASE_URL) return;

  const urlParams = new URLSearchParams(window.location.search);
  const tag = urlParams.get('gamertag') || urlParams.get('tag') || getMyTag();
  const container = document.getElementById('match-history-container');
  if (!container) return;

  try {
    const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/matches?or=(player1.eq.' + encodeURIComponent(tag) + ',player2.eq.' + encodeURIComponent(tag) + ')&order=created_at.desc&limit=10', {
      headers: {
        'apikey': cfg.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY
      }
    });

    const matches = await res.json();

    if (!matches || matches.length === 0) {
      container.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Aucun match pour le moment.</p>';
      return;
    }

    container.innerHTML = matches.map(m => {
      const isPlayer1 = m.player1 === tag;
      const opponent = isPlayer1 ? m.player2 : m.player1;
      const isWin = m.winner === tag;
      const date = new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const isPending = m.status === 'pending';
      const iReported = m.reported_by === tag;

      // Si le match est en attente, j'affiche les boutons si je suis l'adversaire
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
    console.warn('Erreur chargement historique:', e);
    container.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Erreur de chargement.</p>';
  }
}
    // === CONFIRMER / CONTESTER UN MATCH ===
  document.addEventListener('click', async (e) => {
    const cfg = getCfg();
    if (!cfg) return;

    // Bouton Confirmer
    const confirmBtn = e.target.closest('[data-confirm-match]');
    if (confirmBtn) {
      e.preventDefault();
      const matchId = confirmBtn.getAttribute('data-confirm-match');
      confirmBtn.textContent = '⏳…';
      confirmBtn.disabled = true;

      try {
        const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/matches?id=eq.' + matchId, {
          method: 'PATCH',
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'confirmed' })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('✅ Match confirmé !');
          chargerHistorique();
        } else {
          confirmBtn.textContent = '❌';
        }
      } catch (err) {
        confirmBtn.textContent = '❌';
      }
      return;
    }

    // Bouton Contester
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
          headers: {
            'apikey': cfg.SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'contested', winner: null })
        });
        if (res.ok) {
          if (window.afriToast) window.afriToast('❌ Match contesté');
          chargerHistorique();
        } else {
          contestBtn.textContent = '❌';
        }
      } catch (err) {
        contestBtn.textContent = '❌';
      }
      return;
    }
  });

  function init() {
    bindAvatar();
    cacherBoutonSiPasProprietaire();
    chargerTotems();
    chargerHistorique();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
