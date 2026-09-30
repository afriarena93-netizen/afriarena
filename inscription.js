/* AfriArena — Inscription à Supabase */
(function () {
  'use strict';

  const form = document.querySelector('form[data-auth-panel="register"]');
  if (!form) return;

  function getConfig() {
    return window.AFRIARENA_CONFIG || null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tag = document.getElementById('reg-tag')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const country = document.getElementById('reg-country')?.value;
    const city = document.getElementById('reg-city')?.value.trim();
    const game = document.getElementById('reg-game')?.value;

    if (!tag || !city) {
      alert('Le pseudo et la ville sont obligatoires');
      return;
    }

    const cfg = getConfig();
    if (!cfg) {
      alert('Erreur : connexion Supabase non configurée');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '⏳ Inscription…';
    submitBtn.disabled = true;

    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/players', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          gamertag: tag,
          city: city,
          country: country || 'Togo',
          game: game || 'Free Fire',
          availability: 'Disponible maintenant',
          rating: 5.0,
          matches_count: 0
        })
      });

      if (!res.ok) {
        if (res.status === 409) {
          alert('Ce pseudo est déjà pris. Choisis-en un autre.');
        } else {
          alert('Erreur lors de l\'inscription : ' + res.status);
        }
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      // Sauvegarde le pseudo localement
      localStorage.setItem('afriarena:myTag', tag);

      alert('✅ Bienvenue ' + tag + ' !\n\nTon profil est enregistré.');
      submitBtn.textContent = '✅ Inscrit !';

      setTimeout(() => {
        window.location.href = 'adversaires.html';
      }, 1500);

    } catch (err) {
      alert('Erreur réseau : vérifie ta connexion');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();