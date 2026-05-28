// Service worker placeholder to prevent 404 logs from previous localhost registrations
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
