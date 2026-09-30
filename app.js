/* AfriArena — Interactions globales */
(function () {
  'use strict';

    const WHATSAPP_GROUP_URL =
  'https://chat.whatsapp.com/I6kGwyWqHCB2cw0ATzcVn5?s=cl&p=a&mlu=4&ilr=4';

  document.querySelectorAll('[data-whatsapp]').forEach((el) => {
    el.href = WHATSAPP_GROUP_URL;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });

  const burger = document.querySelector('[data-burger]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.innerHTML = open
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
    });
  }

  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  window.afriToast = function (message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(window.__afriToastT);
    window.__afriToastT = setTimeout(() => toast.classList.remove('show'), 2200);
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const value = btn.getAttribute('data-copy');
    navigator.clipboard.writeText(value).then(
      () => window.afriToast('Copié : ' + value),
      () => window.afriToast('Impossible de copier')
    );
  });

  const searchInput = document.querySelector('[data-filter-search]');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('[data-filter-target]').forEach((el) => {
        const text = el.textContent.toLowerCase();
        el.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }

  document.querySelectorAll('[data-tabs]').forEach((tabsEl) => {
    tabsEl.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('[data-tab-panel]').forEach((p) => {
          p.hidden = p.getAttribute('data-tab-panel') !== target;
        });
      });
    });
  });
})();
