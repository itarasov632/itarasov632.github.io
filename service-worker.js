// Service Worker для PWA
const CACHE_NAME = 'quran-app-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Файлы для предварительного кэширования
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/pages/alphabet.html',
  '/pages/letter.html',
  '/css/reset.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/layout.css',
  '/css/pages/home.css',
  '/css/pages/alphabet.css',
  '/css/pages/letter.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/data/alphabet-data.js',
  '/js/services/audio-service.js',
  '/js/services/storage-service.js',
  '/js/services/router-service.js',
  '/js/components/letter-grid.js',
  '/js/components/audio-player.js',
  '/js/pages/home-page.js',
  '/js/pages/alphabet-page.js',
  '/js/pages/letter-page.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Установка');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Кэшируем файлы');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => {
        console.log('[Service Worker] Установка завершена');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Активация');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Активация завершена');
      return self.clients.claim();
    })
  );
});

// Стратегия кэширования: Network First, Fallback to Cache
self.addEventListener('fetch', event => {
  // Пропускаем неподходящие запросы
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('chrome-extension') ||
    event.request.url.includes('sockjs-node')
  ) {
    return;
  }

  // Для HTML страниц используем стратегию Network First
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Клонируем ответ для кэширования
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // Если нет сети, пытаемся получить из кэша
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Если страницы нет в кэше, показываем офлайн страницу
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Для статических ресурсов используем Cache First
  if (
    event.request.url.includes('.css') ||
    event.request.url.includes('.js') ||
    event.request.url.includes('.png') ||
    event.request.url.includes('.jpg') ||
    event.request.url.includes('.mp3') ||
    event.request.url.includes('.json')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
              
              return response;
            });
        })
    );
    return;
  }

  // Для остальных запросов просто делаем fetch
  event.respondWith(fetch(event.request));
});

// Сообщения от клиента
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PRELOAD_PAGES') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        const preloadPromises = event.data.pages.map(pageUrl => {
          return fetch(pageUrl)
            .then(response => cache.put(pageUrl, response))
            .catch(err => console.log('Ошибка предзагрузки:', err));
        });
        return Promise.all(preloadPromises);
      })
    );
  }
});

// Фоновая синхронизация (опционально)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

async function syncUserData() {
  // Здесь можно синхронизировать данные пользователя с сервером
  console.log('[Service Worker] Синхронизация данных');
}
