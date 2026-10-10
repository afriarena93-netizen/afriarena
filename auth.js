/* AfriArena — Authentification globale */
(function () {
  'use strict';

  window.afriAuth = {
    // Retourne le pseudo du joueur connecté
    getMyTag: function () {
      return localStorage.getItem('afriarena:myTag') || null;
    },

    // Retourne le token de connexion
    getToken: function () {
      return localStorage.getItem('afriarena:accessToken') || null;
    },

    // Retourne l'ID utilisateur
    getUserId: function () {
      return localStorage.getItem('afriarena:userId') || null;
    },

    // Vérifie si le joueur est connecté
    isLogged: function () {
      return !!localStorage.getItem('afriarena:accessToken');
    },

    // Force la connexion (redirige vers connexion.html)
    requireLogin: function () {
      if (!this.isLogged()) {
        alert('Tu dois te connecter pour accéder à cette page.');
        window.location.href = 'connexion.html';
        return false;
      }
      return true;
    },

    // Déconnexion
    logout: function () {
      localStorage.removeItem('afriarena:accessToken');
      localStorage.removeItem('afriarena:userId');
      localStorage.removeItem('afriarena:myTag');
      window.location.href = 'index.html';
    }
  };

  // ===== Affichage de la nav (connecté / pas connecté) =====
  document.addEventListener('DOMContentLoaded', function () {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    const tag = window.afriAuth.getMyTag();

    if (tag) {
      navActions.innerHTML =
        '<a href="profil.html" class="btn btn-ghost btn-sm">👤 ' + tag + '</a>' +
        '<button class="btn btn-primary btn-sm" id="logout-btn">Se déconnecter</button>';
      
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          if (confirm('Se déconnecter ?')) {
            window.afriAuth.logout();
          }
        });
      }
    }
  });
})();
