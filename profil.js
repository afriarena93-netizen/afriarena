/* AfriArena — Profil : avatar + upload Supabase Storage */
(function () {
  'use strict';

  const BUCKET = 'avatars';

  function getCfg() {
    return window.AFRIARENA_CONFIG || null;
  }

  function getMyTag() {
    return localStorage.getItem('afriarena:myTag') || 'maz';
  }

  // ===== Upload vers Supabase Storage =====
  async function uploadAvatar(file) {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) {
      if (window.afriToast) window.afriToast('❌ Config Supabase manquante');
      return null;
    }

    const tag = getMyTag();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${tag}-${Date.now()}.${ext}`;
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
        const err = await res.text();
        console.warn('Upload error:', err);
        return null;
      }

      // URL publique
      const publicUrl = cfg.SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + filename;
      return publicUrl;
    } catch (e) {
      console.warn('Upload failed:', e);
      return null;
    }
  }

  // ===== Mise à jour dans la table players =====
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
    } catch (e) {
      console.warn('Save avatar failed:', e);
    }
  }

  // ===== Handler du bouton caméra =====
  function bindAvatar() {
    const input = document.getElementById('avatar-input');
    const preview = document.getElementById('avatar-preview');
    if (!input || !preview) return;

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;

      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        if (window.afriToast) window.afriToast('Format non supporté (JPG, PNG, WebP)');
        return;
      }

      // Aperçu immédiat
      const reader = new FileReader();
      reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="Aperçu">`;
      };
      reader.readAsDataURL(file);

      if (window.afriToast) window.afriToast('⏳ Envoi de la photo…');

      const url = await uploadAvatar(file);
      if (!url) {
        if (window.afriToast) window.afriToast('❌ Erreur upload');
        return;
      }

      await saveAvatarUrl(url);
      if (window.afriToast) window.afriToast('✅ Photo mise à jour');
    });
  }

  // ===== Init =====
  function init() {
    bindAvatar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();