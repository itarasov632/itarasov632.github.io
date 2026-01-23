// Логика главной страницы
import { routerService } from '../services/router-service.js';

class HomePage {
    constructor() {
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupInstallPrompt();
        this.setupServiceWorker();
    }

    setupNavigation() {
        // Обработка кликов по карточкам
        document.addEventListener('click', (event) => {
            const card = event.target.closest('.feature-card');
            if (card) {
                const cardType = card.dataset.type;
                this.handleCardClick(cardType);
            }
        });
    }

    handleCardClick(type) {
        switch (type) {
            case 'alphabet':
                routerService.navigateTo('/pages/alphabet.html');
                break;
            case 'tajweed':
                // TODO: Добавить страницу таджвида
                console.log('Таджвид - в разработке');
                break;
            case 'surahs':
                // TODO: Добавить страницу сур
                console.log('Суры - в разработке');
                break;
        }
    }

    setupInstallPrompt() {
        // Показываем подсказку об установке PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Предотвращаем автоматический показ
            e.preventDefault();
            deferredPrompt = e;
            
            // Показываем свою кнопку установки
            this.showInstallButton();
        });
        
        // Обработка установки
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('Пользователь установил PWA');
                    installButton.style.display = 'none';
                }
                
                deferredPrompt = null;
            });
        }
        
        // Для iOS показываем инструкцию
        if (this.isIOS()) {
            this.showIOSInstallHint();
        }
    }

    showInstallButton() {
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.textContent = '📱 Установить приложение';
        }
    }

    showIOSInstallHint() {
        const iosHint = document.getElementById('iosInstallHint');
        if (iosHint) {
            iosHint.style.display = 'block';
            iosHint.innerHTML = `
                <strong>Для установки на iOS:</strong><br>
                1. Нажмите кнопку "Поделиться" в Safari<br>
                2. Выберите "На экран «Домой»"<br>
                3. Нажмите "Добавить"
            `;
        }
    }

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('../service-worker.js')
                    .then(registration => {
                        console.log('ServiceWorker зарегистрирован:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Ошибка регистрации ServiceWorker:', error);
                    });
            });
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new HomePage();
});
