(function () {
  'use strict';

  const ROOM_DEFAULT = 'Général';
  const REFRESH_MS = 3000;

  let currentRoom = ROOM_DEFAULT;
  let lastMessageCount = 0;
  let avatarsMap = {}; // Annuaire des avatars : { gamertag: avatar_url }
let replyingTo = null; // Stocke le message auquel on répond
  
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
  // === MODÉRATION : Liste de mots interdits (modifiable) ===
const MOTS_INTERDITS = [
  'connard', 'connasse', 'salaud', 'salope', 'pute', 'putain',
  'enculé', 'encule', 'nique', 'niquer', 'ntm', 'fdp', 'pd',
  'bâtard', 'batard', 'abruti', 'débile', 'debile', 'idiot',
  'imbécile', 'imbecile', 'crétin', 'cretin', 'merde', 'chier',
  'fils de pute', 'ta gueule', 'ferme ta gueule', 'va te faire'
];

function contientInsulte(texte) {
  const t = texte.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Enlève les accents
  return MOTS_INTERDITS.some(mot => {
    const m = mot.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return t.includes(m);
  });
}

// === ANTI-SPAM : Mémoire des derniers messages envoyés ===
let derniersMessages = []; // { contenu, timestamp }

function estSpam(texte) {
  const maintenant = Date.now();
  // On garde seulement les messages des 10 dernières secondes
  derniersMessages = derniersMessages.filter(m => maintenant - m.timestamp < 10000);
  
  // Règle 1 : Plus de 5 messages en 10 secondes = spam
  if (derniersMessages.length >= 5) return true;
  
  // Règle 2 : Le même message répété 3 fois = spam
  const memeContenu = derniersMessages.filter(m => m.contenu === texte).length;
  if (memeContenu >= 2) return true;
  
  return false;
}
  // === RÉPONSE : Mémoriser le message auquel on répond ===
function setReply(message) {
  replyingTo = message;
  let bar = document.getElementById('reply-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'reply-bar';
    bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#191A21;border-left:3px solid #FF6B35;border-radius:8px;margin-bottom:8px;font-size:12px;color:#aaa;';
    const form = document.querySelector('[data-chat-form]');
    if (form) form.parentNode.insertBefore(bar, form);
  }
  bar.innerHTML = `
    <span>↩ Réponse à <strong style="color:#FF6B35;">${escapeHtml(message.gamertag)}</strong> : ${escapeHtml(message.content.substring(0, 40))}${message.content.length > 40 ? '...' : ''}</span>
    <button type="button" id="cancel-reply" style="background:none;border:none;color:#FF5050;cursor:pointer;font-size:16px;">✕</button>
  `;
  bar.style.display = 'flex';
  document.getElementById('cancel-reply').onclick = function () {
    replyingTo = null;
    bar.style.display = 'none';
  };
}

  // === Charge les avatars de tous les joueurs ===
  async function loadAvatars() {
    const players = await supaFetch('players?select=gamertag,avatar_url');
    if (!players) return;
    avatarsMap = {};
    players.forEach(p => {
      if (p.avatar_url) {
        avatarsMap[p.gamertag] = p.avatar_url;
      }
    });
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

    const avatarUrl = avatarsMap[m.gamertag];
    const avatarHTML = avatarUrl
      ? `<img src="${avatarUrl}" alt="${m.gamertag}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initial;

    let replyHTML = '';
    if (m.reply_to_tag) {
      replyHTML = `
        <div style="background:rgba(255,107,53,0.08);border-left:3px solid #FF6B35;padding:6px 10px;border-radius:6px;margin-bottom:6px;font-size:12px;color:#aaa;">
          ↩ <strong style="color:#FF6B35;">${escapeHtml(m.reply_to_tag)}</strong>
          <p style="margin-top:2px;color:#888;">${escapeHtml(m.reply_to_content || '')}</p>
        </div>
      `;
    }

    let actionsHTML = '';
    if (isSelf) {
      actionsHTML = `
        <div class="msg-actions">
          <button data-reply-msg="${m.id}" type="button">↩ Répondre</button>
          <button data-delete-msg-supa="${m.id}" type="button">Supprimer</button>
        </div>
      `;
    } else {
      actionsHTML = `
        <div class="msg-actions">
          <button data-reply-msg="${m.id}" type="button">↩ Répondre</button>
        </div>
      `;
    }

    msg.innerHTML = `
      <div class="msg-avatar">${avatarHTML}</div>
      <div>
        <div class="msg-head">
          <span class="msg-name">${escapeHtml(m.gamertag)}</span>
          <span class="msg-time">${time}</span>
        </div>
        ${replyHTML}
        <div class="msg-body">${escapeHtml(m.content)}</div>
        ${actionsHTML}
      </div>
    `;
    body.appendChild(msg);
  });

  body.scrollTop = body.scrollHeight;
  }

async function sendMessage(content) {
  // Modération
  if (contientInsulte(content)) {
    if (window.afriToast) window.afriToast('🚫 Message bloqué : langage inapproprié');
    return false;
  }
  if (estSpam(content)) {
    if (window.afriToast) window.afriToast('⏳ Doucement ! Tu envoies trop de messages.');
    return false;
  }

  const tag = getMyTag();

  const messageData = {
    room: currentRoom,
    gamertag: tag,
    content: content
  };

  // Si on répond à un message, on ajoute les infos
  if (replyingTo) {
    messageData.reply_to = replyingTo.id;
    messageData.reply_to_content = replyingTo.content.substring(0, 100);
    messageData.reply_to_tag = replyingTo.gamertag;
  }

  const res = await supaFetch('messages', {
    method: 'POST',
    body: JSON.stringify(messageData)
  });

  if (res) {
    derniersMessages.push({ contenu: content, timestamp: Date.now() });
    replyingTo = null;
    const bar = document.getElementById('reply-bar');
    if (bar) bar.style.display = 'none';
  }

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
    loadAvatars(); // <-- On charge les avatars au démarrage
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
