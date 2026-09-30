/* AfriArena — Chat connecté à Supabase */
(function () {
  'use strict';

  const ROOM_DEFAULT = 'Général';
  const REFRESH_MS = 3000;

  let currentRoom = ROOM_DEFAULT;
  let lastMessageCount = 0;

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

  function getMyTag() {
    let tag = localStorage.getItem('afriarena:myTag');
    if (!tag || tag.trim() === '' || tag === 'Anonyme') {
      tag = prompt('Ton pseudo pour discuter :');
      if (tag && tag.trim()) {
        tag = tag.trim();
        localStorage.setItem('afriarena:myTag', tag);
      } else {
        tag = 'Anonyme';
      }
    }
    return tag;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function loadMessages() {
    const messages = await supaFetch(
      `messages?room=eq.${encodeURIComponent(currentRoom)}&deleted_at=is.null&order=created_at.asc&limit=100`
    );
    if (!messages) return;
    renderMessages(messages);
  }

  function renderMessages(messages) {
    const body = document.querySelector('.chat-body');
    if (!body) return;

    if (messages.length === lastMessageCount) return;
    lastMessageCount = messages.length;

    body.innerHTML = '';
    const myTag = getMyTag();

    messages.forEach((m) => {
      const isSelf = m.gamertag === myTag;
      const msg = document.createElement('div');
      msg.className = 'msg' + (isSelf ? ' self' : '');
      msg.dataset.msgId = m.id;

      const time = new Date(m.created_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
      });
      const initial = (m.gamertag || '?').charAt(0).toUpperCase();

      msg.innerHTML = `
        <div class="msg-avatar">${initial}</div>
        <div>
          <div class="msg-head">
            <span class="msg-name">${escapeHtml(m.gamertag)}</span>
            <span class="msg-time">${time}</span>
          </div>
          <div class="msg-body">${escapeHtml(m.content)}</div>
          ${isSelf ? `
            <div class="msg-actions">
              <button data-delete-msg-supa="${m.id}" type="button">Supprimer</button>
            </div>
          ` : ''}
        </div>
      `;
      body.appendChild(msg);
    });

    body.scrollTop = body.scrollHeight;
  }

  async function sendMessage(content) {
    const tag = getMyTag();
    const res = await supaFetch('messages', {
      method: 'POST',
      body: JSON.stringify({
        room: currentRoom,
        gamertag: tag,
        content: content
      })
    });
    return !!res;
  }

  async function deleteMessage(id) {
    const myTag = getMyTag();
    const result = await supaFetch(`messages?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        deleted_at: new Date().toISOString(),
        deleted_by: myTag
      })
    });
    if (!result) {
      if (window.afriToast) window.afriToast('❌ Erreur suppression');
      return;
    }
    if (window.afriToast) window.afriToast('🗑 Message supprimé');
    lastMessageCount = -1;
    await loadMessages();
  }

  function bindRoomSwitcher() {
    document.querySelectorAll('.room-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const roomName = el.childNodes[0].textContent.trim();
        if (!roomName) return;
        currentRoom = roomName;
        lastMessageCount = -1;
        document.querySelectorAll('.room-item').forEach(r => r.classList.remove('active'));
        el.classList.add('active');
        const titleEl = document.querySelector('.chat-head h2');
        if (titleEl) titleEl.textContent = 'Salon ' + roomName;
        loadMessages();
      });
    });
  }

  function bindForm() {
    const form = document.querySelector('[data-chat-form]');
    if (!form) return;
    const textarea = form.querySelector('textarea');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = textarea.value.trim();
      if (!content) return;
      textarea.value = '';
      const ok = await sendMessage(content);
      if (ok) {
        lastMessageCount = -1;
        await loadMessages();
      } else {
        if (window.afriToast) window.afriToast('❌ Erreur envoi');
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-msg-supa]');
    if (!btn) return;
    const id = btn.getAttribute('data-delete-msg-supa');
    if (!confirm('Supprimer ce message ?')) return;
    deleteMessage(id);
  });

  function init() {
    if (!document.querySelector('.chat-body')) return;
    bindRoomSwitcher();
    bindForm();
    loadMessages();
    setInterval(loadMessages, REFRESH_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        lastMessageCount = -1;
        loadMessages();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();