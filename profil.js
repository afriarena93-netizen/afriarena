/* AfriArena — Profil : avatar + upload Supabase Storage */
(function () {
  'use strict';
  // ==== NOUVEAU : Dictionnaire des pays et badges ====
const BADGES_PAYS = {
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
  // Ajoute d'autres pays ici...
};

// ==== NOUVEAU : Fonction pour sauvegarder le pays du joueur ====
async function savePays(pays) {
  const cfg = getCfg();
  if (!cfg || !cfg.SUPABASE_URL) return;
  
  const tag = getMyTag();
  if (!tag) return;

  try {
    const res = await fetch(
      cfg.SUPABASE_URL + '/rest/v1/players?tag=eq.' + encodeURIComponent(tag),
      {
        method: 'PATCH',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ pays: pays })
      }
    );
    if (res.ok) {
       if (window.afriToast) window.afriToast('Pays mis à jour ! ' + (BADGES_PAYS[pays] ? BADGES_PAYS[pays].emoji : ''));
    }
  } catch (e) {
    console.warn('Save pays failed:', e);
  }
}

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
