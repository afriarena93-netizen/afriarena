/* AfriArena — Admin premium */
(function () {
  'use strict';

  const ADMIN_PASSWORD = 'AfriArena2026!';
  const SESSION_KEY = 'afriarena:admin_unlocked';
  const isUnlocked = () => sessionStorage.getItem(SESSION_KEY) === '1';

  // ===== Config Supabase =====
  function getCfg() {
    return window.AFRIARENA_CONFIG || null;
  }

  async function supaFetch(path, options = {}) {
    const cfg = getCfg();
    if (!cfg || !cfg.SUPABASE_URL) return null;
    try {
      const res = await fetch(cfg.SUPABASE_URL + '/rest/v1/' + path, {
        ...options,
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...(options.headers || {})
        }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // ===== Bouton rond discret =====
  function injectFab() {
    if (document.getElementById('admin-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'admin-fab';
    btn.title = 'Administrateur';
    btn.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:9998;
      width:50px;height:50px;border-radius:50%;
      background:rgba(25,26,33,.95);
      border:1px solid rgba(255,255,255,.10);
      color:rgba(245,245,247,.5);font-size:20px;
      cursor:pointer;display:grid;place-items:center;
      box-shadow:0 8px 24px rgba(0,0,0,.4);
      transition:all .2s;backdrop-filter:blur(10px);
    `;
    btn.innerHTML = '⚙';
    btn.onmouseenter = () => {
      btn.style.background = '#FF6B35';
      btn.style.color = '#0b0c10';
      btn.style.transform = 'scale(1.08)';
    };
    btn.onmouseleave = () => {
      if (!isUnlocked()) {
        btn.style.background = 'rgba(25,26,33,.95)';
        btn.style.color = 'rgba(245,245,247,.5)';
      }
      btn.style.transform = 'scale(1)';
    };
    btn.onclick = onFabClick;
    document.body.appendChild(btn);
  }

  function onFabClick() {
    if (isUnlocked()) {
      if (confirm('Mode Admin activé.\n\nSe déconnecter ?')) {
        sessionStorage.removeItem(SESSION_KEY);
        location.reload();
      }
      return;
    }
    showAdminModal();
  }

  // ===== Modale admin premium =====
  function showAdminModal() {
    if (document.getElementById('admin-modal-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'admin-modal-backdrop';
    backdrop.className = 'modal-backdrop open';
    backdrop.innerHTML = `
      <div class="admin-modal">
        <div class="icon">🔐</div>
        <h3>Accès administrateur</h3>
        <p>Entrez le mot de passe pour gérer les joueurs</p>
        <div class="field-wrap">
          <input type="password" id="admin-pwd-input" placeholder="Mot de passe" autocomplete="off">
          <button type="button" class="eye" id="admin-eye">👁</button>
        </div>
        <div class="error" id="admin-error"></div>
        <div class="actions">
          <button type="button" class="cancel" id="admin-cancel">Annuler</button>
          <button type="button" class="confirm" id="admin-confirm">Déverrouiller</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const input = document.getElementById('admin-pwd-input');
    const eye = document.getElementById('admin-eye');
    const error = document.getElementById('admin-error');
    const cancel = document.getElementById('admin-cancel');
    const confirm = document.getElementById('admin-confirm');

    setTimeout(() => input.focus(), 100);

    eye.onclick = () => {
      if (input.type === 'password') {
        input.type = 'text';
        eye.textContent = '🙈';
      } else {
        input.type = 'password';
        eye.textContent = '👁';
      }
    };

    cancel.onclick = () => backdrop.remove();
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    const tryUnlock = () => {
      if (input.value === ADMIN_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, '1');
        backdrop.remove();
        activate();
        if (window.afriToast) window.afriToast('🔓 Mode Admin activé');
      } else {
        error.textContent = '❌ Mot de passe incorrect';
        input.value = '';
        input.focus();
        setTimeout(() => { error.textContent = ''; }, 2500);
      }
    };

    confirm.onclick = tryUnlock;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryUnlock();
    });
  }

  // ===== Activation du mode admin =====
  async function activate() {
    document.body.classList.add('admin-mode');
    await refreshPlayers();
  }

  async function refreshPlayers() {
    const players = await supaFetch('players?select=*&order=created_at.desc');
    const banned = await supaFetch('bans?select=gamertag');
    const bannedNames = banned ? banned.map(b => b.gamertag) : [];

    const container = document.querySelector('.players');
    if (container && players && players.length > 0) {
      container.innerHTML = '';
      players
        .filter(p => !p.is_banned && !bannedNames.includes(p.gamertag))
        .forEach(p => container.appendChild(buildPlayerCard(p)));
    } else {
      addControlsToExistingCards();
    }
  }

  function buildPlayerCard(p) {
    const card = document.createElement('article');
    card.className = 'player';
    card.dataset.filterTarget = '';
    card.style.position = 'relative';

    const initial = (p.gamertag || '?').charAt(0).toUpperCase();
    const dispo = p.availability || 'Disponible maintenant';
    const dispoTone = dispo.includes('maintenant') ? 'positive'
                    : dispo.includes('soir') ? 'info' : 'violet';

    card.innerHTML = `
      <div class="player-avatar">
        ${initial}
        ${dispo.includes('maintenant') ? '<span class="presence"></span>' : ''}
      </div>
      <div class="player-body">
        <div class="player-head">
          <span class="player-name">${p.gamertag}</span>
          <span class="player-meta">${p.city || ''} · ${p.country || ''}</span>
        </div>
        <div class="player-tags">
          <span class="chip ${dispoTone}">${dispo}</span>
          <span class="tag">${p.game || 'Jeu'}</span>
          <span class="tag">${p.level || 'Niveau ?'}</span>
          <span class="tag">★ ${p.rating || '5'}</span>
        </div>
      </div>
      <div class="player-actions">
        <button class="btn btn-primary btn-sm" data-invite="${p.gamertag}">Proposer un match</button>
        <a href="chat.html" class="btn btn-outline btn-sm">Message</a>
      </div>
    `;
    addControls(card, p.gamertag);
    return card;
  }

  function addControlsToExistingCards() {
    document.querySelectorAll('.player').forEach(card => {
      if (card.querySelector('.admin-controls')) return;
      const nameEl = card.querySelector('.player-name');
      if (!nameEl) return;
      addControls(card, nameEl.textContent.trim());
    });
  }

  function addControls(card, name) {
    if (card.querySelector('.admin-controls')) return;

    const wrap = document.createElement('div');
    wrap.className = 'admin-controls';

    const banBtn = document.createElement('button');
    banBtn.type = 'button';
    banBtn.className = 'admin-btn ban';
    banBtn.title = 'Bannir';
    banBtn.textContent = '⛔';
    banBtn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const reason = prompt(`Bannir ${name} ?\n\nRaison (facultatif) :`, '');
      if (reason === null) return;
      await supaFetch('bans', {
        method: 'POST',
        body: JSON.stringify({ gamertag: name, reason })
      });
      await supaFetch(`players?gamertag=eq.${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_banned: true, ban_reason: reason })
      });
      if (window.afriToast) window.afriToast(`⛔ ${name} banni`);
      card.remove();
    };
    wrap.appendChild(banBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'admin-btn del';
    delBtn.title = 'Supprimer';
    delBtn.textContent = '✕';
    delBtn.onclick = async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm(`Supprimer ${name} définitivement ?`)) return;
      await supaFetch(`players?gamertag=eq.${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      if (window.afriToast) window.afriToast(`🗑 ${name} supprimé`);
      card.remove();
    };
    wrap.appendChild(delBtn);

    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
    card.appendChild(wrap);
  }

  // ===== Init =====
  function init() {
    injectFab();
    if (isUnlocked()) {
      activate();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();