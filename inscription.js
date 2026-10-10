/* AfriArena — Inscription avec compte sécurisé */
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
    const password = document.getElementById('reg-pwd')?.value;
    const country = document.getElementById('reg-country')?.value;
    const city = document.getElementById('reg-city')?.value.trim();
    const game = document.getElementById('reg-game')?.value;
    const gameId = document.getElementById('reg-game-id')?.value.trim();

    if (!tag || !city || !email || !password) {
      alert('Pseudo, email, mot de passe et ville sont obligatoires');
      return;
    }

    if (password.length < 6) {
      alert('Le mot de passe doit faire au moins 6 caractères');
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
      // 1. On crée d'abord le compte sécurisé (email + mot de passe)
      const authRes = await fetch(cfg.SUPABASE_URL + '/auth/v1/signup', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        alert('Erreur : ' + (authData.msg || authData.error_description || 'Impossible de créer le compte'));
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      const userId = authData.user ? authData.user.id : authData.id;
            // 2. On enregistre le profil du joueur dans la table "players"
      const profileRes = await fetch(cfg.SUPABASE_URL + '/rest/v1/players', {
        method: 'POST',
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          gamertag: tag,
          city: city,
          country: country || 'Togo',
          game: game || 'Free Fire',
          level: gameId || 'Niveau ?',
          availability: 'Disponible maintenant',
          rating: 5.0,
          matches_count: 0
        })
      });

      if (!profileRes.ok) {
        if (profileRes.status === 409) {
          alert('Ce pseudo est déjà pris. Choisis-en un autre.');
        } else {
          alert('Erreur lors de la création du profil : ' + profileRes.status);
        }
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }

      // 3. On sauvegarde le pseudo et l'ID du compte localement
      localStorage.setItem('afriarena:myTag', tag);
      localStorage.setItem('afriarena:userId', userId);

      alert('✅ Bienvenue ' + tag + ' !\n\nTon compte est créé. Tu vas être redirigé.');
      submitBtn.textContent = '✅ Inscrit !';

      setTimeout(() => {
        window.location.href = 'adversaires.html';
      }, 1500);

    } catch (err) {
      console.error('Erreur inscription:', err);
      alert('Erreur réseau : vérifie ta connexion');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();
