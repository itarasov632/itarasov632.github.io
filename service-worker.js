// Имя кэша
const CACHE_NAME = 'quran-app-v1';

// Файлы для кэширования
const urlsToCache = [
  '/',
  '/index.html',
  '/alphabet.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэшируем файлы');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Удаляем старый кэш:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Стратегия кэширования: Сначала кэш, потом сеть
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если файл найден в кэше, возвращаем его
        if (response) {
          return response;
        }
        
        // Иначе загружаем из сети
        return fetch(event.request).then(response => {
          // Не кэшируем аудио и изображения динамически
          if (!event.request.url.includes('/assets/')) {
            return response;
          }
          
          // Кэшируем статические ресурсы
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
      .catch(() => {
        // Офлайн-страница (можно добавить кастомную)
        return caches.match('/index.html');
      })
  );
});
