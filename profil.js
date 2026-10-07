/* AfriArena — Profil : upload avatar */
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

  function init() {
    bindAvatar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
