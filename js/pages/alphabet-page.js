// Логика страницы алфавита
import { LetterGrid } from '../components/letter-grid.js';
import { storageService } from '../services/storage-service.js';
import { routerService } from '../services/router-service.js';

class AlphabetPage {
    constructor() {
        this.letterGrid = null;
        this.init();
    }

    init() {
        this.setupBackButton();
        this.setupLetterGrid();
        this.setupProgress();
        this.setupServiceWorker();
    }

    setupBackButton() {
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                routerService.navigateTo('/index.html');
            });
        }
    }

    setupLetterGrid() {
        // Создаем сетку букв
        this.letterGrid = new LetterGrid('lettersGrid', {
            columns: 4,
            rows: 7,
            showNumbers: false,
            interactive: true
        });
    }

    setupProgress() {
        this.updateProgress();
        
        // Обновляем прогресс при изменении хранилища
        window.addEventListener('storage', (e) => {
            if (e.key === storageService.prefix + 'learned_letters') {
                this.updateProgress();
            }
        });
    }

    updateProgress() {
        const learnedLetters = storageService.getLearnedLetters();
        const progressElement = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressElement && progressText) {
            const percentage = (learnedLetters.length / 28) * 100;
            progressElement.style.width = `${percentage}%`;
            progressText.textContent = `Изучено: ${learnedLetters.length} из 28 букв`;
        }
    }

    setupServiceWorker() {
        // Регистрация Service Worker для этой страницы
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            console.log('Service Worker активен для этой страницы');
        }
    }

    destroy() {
        if (this.letterGrid) {
            this.letterGrid.destroy();
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.alphabetPage = new AlphabetPage();
});
