/* AfriArena — Authentification globale */
(function () {
  'use strict';

  window.afriAuth = {
    getMyTag: function () {
      return localStorage.getItem('afriarena:myTag') || null;
    },
    getToken: function () {
      return localStorage.getItem('afriarena:accessToken') || null;
    },
    getUserId: function () {
      return localStorage.getItem('afriarena:userId') || null;
    },
    isLogged: function () {
      return !!localStorage.getItem('afriarena:accessToken');
    },
    requireLogin: function () {
      if (!this.isLogged()) {
        alert('Tu dois te connecter pour accéder à cette page.');
        window.location.href = 'connexion.html';
        return false;
      }
      return true;
    },
    logout: function () {
      localStorage.removeItem('afriarena:accessToken');
      localStorage.removeItem('afriarena:userId');
      localStorage.removeItem('afriarena:myTag');
      window.location.href = 'index.html';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const tag = window.afriAuth.getMyTag();

    // 1. Menu desktop (en haut à droite)
    const navActions = document.querySelector('.nav-actions');
    if (navActions && tag) {
      navActions.innerHTML =
        '<a href="profil.html" class="btn btn-ghost btn-sm">👤 ' + tag + '</a>' +
        '<button class="btn btn-primary btn-sm" id="logout-btn">Se déconnecter</button>';
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
          if (confirm('Se déconnecter ?')) window.afriAuth.logout();
        });
      }
    }

    // 2. Menu mobile (les 3 lignes)
    const mobileNav = document.querySelector('[data-mobile-nav]');
    if (mobileNav && tag) {
      // Cacher les anciens boutons "Se connecter" et "Rejoindre"
      const oldBtns = mobileNav.querySelectorAll('a[href="connexion.html"]');
      oldBtns.forEach(function (btn) {
        btn.style.display = 'none';
      });

      const userBlock = document.createElement('div');
      userBlock.style.padding = '12px 0';
      userBlock.style.borderTop = '1px solid rgba(255,255,255,0.1)';
      userBlock.style.marginTop = '12px';
      userBlock.innerHTML =
        '<a href="profil.html" style="display:block;padding:10px 0;color:#FF6B35;font-weight:600;">👤 ' + tag + '</a>' +
        '<button id="mobile-logout-btn" style="width:100%;padding:10px;background:#191A21;border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;cursor:pointer;">Se déconnecter</button>';
      mobileNav.appendChild(userBlock);

      const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function () {
          if (confirm('Se déconnecter ?')) window.afriAuth.logout();
        });
      }
    }
  });
})();
