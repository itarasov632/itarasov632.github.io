// Завершаем работу старого quran-app worker, удалённого из проекта в январе 2026.
// Сохранение файла по прежнему URL позволяет обновить уже установленные PWA.
const DHIKR_VERSION = '20261027-1';
const refreshPaths = new Set(['/', '/index.html', '/pages/dhikr.html']);
const stalePaths = new Set([
    ...refreshPaths,
    '/assets/audio/dhikr/istiadhah.ogg',
    '/assets/audio/dhikr/istiadhah.mp3'
]);

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            const names = await caches.keys();
            await Promise.all(names.filter(name => name.startsWith('quran-app-')).map(async name => {
                const cache = await caches.open(name);
                const requests = await cache.keys();
                await Promise.all(requests.filter(request => {
                    const url = new URL(request.url);
                    return url.origin === self.location.origin && stalePaths.has(url.pathname);
                }).map(request => cache.delete(request)));
            }));
        } catch (_) {} // Недоступный CacheStorage не должен мешать отключению старого worker.
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: 'window' });
        await self.registration.unregister();
        await Promise.all(clients.map(client => {
            const url = new URL(client.url);
            if (url.origin !== self.location.origin || !refreshPaths.has(url.pathname)) return;
            url.searchParams.set('v', DHIKR_VERSION);
            return client.navigate(url.href).catch(() => {});
        }));
    })());
});
// Без обработчика fetch: браузер сам обслуживает Range-запросы MP3 в Safari.
