// Ce fichier est volontairement simple : il sert juste à dire au téléphone
// "ce site peut être installé comme une application".
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  // Pas de mise en cache spéciale pour l'instant : on laisse tout passer normalement.
  event.respondWith(fetch(event.request));
});
