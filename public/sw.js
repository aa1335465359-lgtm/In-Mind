// Retire the legacy cache-first shell. It served old HTML referencing stale bundles.
// Diary data lives in encrypted checkpoints, never in this asset cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('inmind-cache-')).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
// No fetch interception: normal HTTP caching owns assets and navigation.
