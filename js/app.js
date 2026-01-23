// Главный файл инициализации приложения
import { routerService } from './services/router-service.js';
import { storageService } from './services/storage-service.js';

class QuranApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupApp();
        this.setupServiceWorker();
        this.setupAnalytics();
        this.setupErrorHandling();
    }

    setupApp() {
        // Устанавливаем тему
        this.setupTheme();
        
        // Проверяем PWA режим
        if (this.isStandalonePWA()) {
            document.body.classList.add('pwa-mode');
            console.log('Приложение запущено в PWA режиме');
        }
        
        // Проверяем интернет соединение
        this.setupOfflineDetection();
    }

    setupTheme() {
        // Сохраняем предпочтения темы
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        
        const savedTheme = storageService.get('theme', 'auto');
        if (savedTheme === 'dark' || (savedTheme === 'auto' && prefersDark.matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        
        // Слушаем изменения темы
        prefersDark.addEventListener('change', (e) => {
            if (storageService.get('theme', 'auto') === 'auto') {
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }

    isStandalonePWA() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    setupOfflineDetection() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            document.body.classList.toggle('offline', !isOnline);
            
            if (!isOnline) {
                this.showOfflineMessage();
            } else {
                this.hideOfflineMessage();
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    showOfflineMessage() {
        let message = document.getElementById('offlineMessage');
        if (!message) {
            message = document.createElement('div');
            message.id = 'offlineMessage';
            message.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff9500;
                color: white;
                text-align: center;
                padding: 8px;
                font-size: 14px;
                z-index: 1000;
            `;
            message.textContent = 'Вы в офлайн режиме. Некоторые функции могут быть недоступны.';
            document.body.appendChild(message);
        }
    }

    hideOfflineMessage() {
        const message = document.getElementById('offlineMessage');
        if (message) {
            message.remove();
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('../service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker зарегистрирован для всего приложения');
                    
                    // Проверяем обновления
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateNotification();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('Ошибка регистрации ServiceWorker:', error);
                });
            
            // Сообщения от Service Worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'CACHE_READY') {
                    console.log('Кэш готов, приложение может работать офлайн');
                }
            });
        }
    }

    showUpdateNotification() {
        if (confirm('Доступна новая версия приложения. Обновить?')) {
            window.location.reload();
        }
    }

    setupAnalytics() {
        // Простая аналитика без сторонних сервисов
        this.trackPageView();
        this.trackUserActions();
    }

    trackPageView() {
        const pageData = {
            path: window.location.pathname,
            params: routerService.getUrlParams(),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            isPWA: this.isStandalonePWA()
        };
        
        // Сохраняем в локальное хранилище
        const pageViews = storageService.get('page_views', []);
        pageViews.push(pageData);
        storageService.set('page_views', pageViews.slice(-100)); // Храним последние 100
    }

    trackUserActions() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            const isButton = target.tagName === 'BUTTON' || target.closest('button');
            const isLink = target.tagName === 'A' || target.closest('a');
            
            if (isButton || isLink) {
                const actionData = {
                    type: isButton ? 'button_click' : 'link_click',
                    text: target.textContent.trim(),
                    href: target.href || target.closest('a')?.href,
                    timestamp: new Date().toISOString()
                };
                
                const userActions = storageService.get('user_actions', []);
                userActions.push(actionData);
                storageService.set('user_actions', userActions.slice(-50));
            }
        });
    }

    setupErrorHandling() {
        // Глобальная обработка ошибок
        window.addEventListener('error', (event) => {
            console.error('Глобальная ошибка:', event.error);
            
            const errorData = {
                message: event.error?.message || event.message,
                stack: event.error?.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString()
            };
            
            const errors = storageService.get('app_errors', []);
            errors.push(errorData);
            storageService.set('app_errors', errors.slice(-20));
        });
        
        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Необработанный промис:', event.reason);
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.quranApp = new QuranApp();
});

// Экспортируем для использования в других модулях
export { QuranApp };
