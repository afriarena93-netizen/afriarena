/* AfriArena — Contenu dynamique par jeu */
(function () {
  'use strict';

  const GAMES = {
    freefire: {
      name: 'Free Fire', short: 'FF',
      grad: 'linear-gradient(135deg,#FF6B35,#FF8457)',
      heroGrad: 'linear-gradient(135deg,rgba(255,107,53,.22),transparent 70%)',
      desc: 'Battle royale mobile · hub principal du Togo.',
      membres: 412, enLigne: 38, matchs: 124,
      modes: ['1v1', '2v2', 'Squad'],
      regles: 'Room ID + mot de passe partagés dans le Match Center.',
      plateformes: 'Mobile · BlueStacks'
    },
    efootball: {
      name: 'eFootball', short: 'eF',
      grad: 'linear-gradient(135deg,#78B7FF,#CC8CFF)',
      heroGrad: 'linear-gradient(135deg,rgba(120,183,255,.22),transparent 70%)',
      desc: 'Football 1v1 sur mobile et console.',
      membres: 268, enLigne: 24, matchs: 87,
      modes: ['1v1', '2v2'],
      regles: 'Match amical avec code de room.',
      plateformes: 'Mobile · Console'
    },
    fcmobile: {
      name: 'FC Mobile', short: 'FC',
      grad: 'linear-gradient(135deg,#B8F27C,#78B7FF)',
      heroGrad: 'linear-gradient(135deg,rgba(184,242,124,.20),transparent 70%)',
      desc: 'Football virtuel sur mobile. Duels et tournois.',
      membres: 195, enLigne: 17, matchs: 62,
      modes: ['1v1', '2v2'],
      regles: 'Invitation joueur à joueur.',
      plateformes: 'Mobile'
    },
    bloodstrike: {
      name: 'Blood Strike', short: 'BS',
      grad: 'linear-gradient(135deg,#CC8CFF,#FF6B35)',
      heroGrad: 'linear-gradient(135deg,rgba(204,140,255,.22),transparent 70%)',
      desc: 'FPS mobile nerveux, rapide et compétitif.',
      membres: 142, enLigne: 11, matchs: 45,
      modes: ['1v1', '2v2', 'Squad'],
      regles: 'Room personnalisée avec ID et mot de passe.',
      plateformes: 'Mobile'
    },
    callofduty: {
      name: 'Call of Duty Mobile', short: 'CD',
      grad: 'linear-gradient(135deg,#FF8457,#CC8CFF)',
      heroGrad: 'linear-gradient(135deg,rgba(255,132,87,.22),transparent 70%)',
      desc: 'FPS compétitif de référence.',
      membres: 231, enLigne: 20, matchs: 78,
      modes: ['1v1', 'Squad'],
      regles: 'Salon privé créé par l’hôte.',
      plateformes: 'Mobile'
    },
    pubg: {
      name: 'PUBG Mobile', short: 'PB',
      grad: 'linear-gradient(135deg,#78B7FF,#B8F27C)',
      heroGrad: 'linear-gradient(135deg,rgba(120,183,255,.20),transparent 70%)',
      desc: 'Battle royale classique. Squad et solo.',
      membres: 318, enLigne: 29, matchs: 96,
      modes: ['Solo', 'Duo', 'Squad'],
      regles: 'Room avec mot de passe fournie par l’hôte.',
      plateformes: 'Mobile'
    }
  };

  const slug = document.body.dataset.game;
  if (!slug || !GAMES[slug]) return;
  const game = GAMES[slug];

  document.querySelectorAll('[data-game-name]').forEach(el => el.textContent = game.name);
  document.querySelectorAll('[data-game-desc]').forEach(el => el.textContent = game.desc);
  document.querySelectorAll('[data-game-short]').forEach(el => el.textContent = game.short);
  document.querySelectorAll('[data-game-membres]').forEach(el => el.textContent = game.membres);
  document.querySelectorAll('[data-game-online]').forEach(el => el.textContent = game.enLigne);
  document.querySelectorAll('[data-game-matchs]').forEach(el => el.textContent = game.matchs);
  document.querySelectorAll('[data-game-icon]').forEach(el => { el.style.background = game.grad; el.textContent = game.short; });
  document.querySelectorAll('[data-game-hero]').forEach(el => el.style.setProperty('--hero-grad', game.heroGrad));
  document.querySelectorAll('[data-game-title]').forEach(el => el.textContent = game.name);
  document.title = game.name + ' — AfriArena';

  const modesEl = document.querySelector('[data-game-modes]');
  if (modesEl) {
    modesEl.innerHTML = game.modes.map(m => `<span class="chip">${m}</span>`).join('');
  }

  const reglesEl = document.querySelector('[data-game-regles]');
  if (reglesEl) reglesEl.textContent = game.regles;
  const platEl = document.querySelector('[data-game-plateformes]');
  if (platEl) platEl.textContent = game.plateformes;
})();