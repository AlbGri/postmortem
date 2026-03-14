const CACHE_NAME = 'orari-ufficio-v22';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/supabase.min.js',
    './js/supabase-config.js',
    './js/theme-switcher.js',
    './js/app.js',
    './js/calculator.js',
    './js/storage.js',
    './js/calendar.js',
    './js/csv.js',
    './js/geofencing.js',
    './js/notifications.js',
    './js/auth.js',
    './js/api.js',
    './js/sync-queue.js',
    './js/messaging.js',
    './js/memory.js',
    './js/changelog.js',
    './js/splash.js',
    './CHANGELOG.md',
    './fonts/Montserrat-Regular.woff2',
    './fonts/Montserrat-Bold.woff2',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './manifest.json',
    './favicon.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    // Le chiamate a Supabase devono SEMPRE andare in rete
    // (non ha senso restituire dati cached dal database)
    if (event.request.url.includes('supabase.co')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Per tutto il resto: cache-first (come prima)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
