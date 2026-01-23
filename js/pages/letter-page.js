// Логика страницы буквы
import { getLetterById, getNextLetterId, getPrevLetterId } from '../data/alphabet-data.js';
import { AudioPlayer } from '../components/audio-player.js';
import { routerService } from '../services/router-service.js';
import { storageService } from '../services/storage-service.js';

class LetterPage {
    constructor() {
        this.letterId = null;
        this.letterData = null;
        this.audioPlayer = null;
        this.init();
    }

    init() {
        this.loadLetterData();
        this.setupNavigation();
        this.renderLetter();
        this.setupAudioPlayer();
        this.loadMakhrajImage();
        this.setupServiceWorker();
    }

    loadLetterData() {
        this.letterId = routerService.getLetterId();
        this.letterData = getLetterById(this.letterId);
        
        if (!this.letterData) {
            console.error(`Буква с ID ${this.letterId} не найдена`);
            routerService.navigateTo('/pages/alphabet.html');
            return;
        }
    }

    setupNavigation() {
        // Кнопка назад
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                e.preventDefault();
                routerService.navigateTo('/pages/alphabet.html');
            });
        }

        // Кнопки навигации по буквам
        this.setupLetterNavigation();
    }

    setupLetterNavigation() {
        const prevButton = document.getElementById('prevLetter');
        const nextButton = document.getElementById('nextLetter');
        
        const prevId = getPrevLetterId(this.letterId);
        const nextId = getNextLetterId(this.letterId);
        
        if (prevButton) {
            if (prevId) {
                prevButton.addEventListener('click', () => {
                    routerService.navigateTo('/pages/letter.html', { id: prevId });
                });
                prevButton.classList.remove('disabled');
                prevButton.setAttribute('aria-label', `Предыдущая буква: ${getLetterById(prevId).name}`);
            } else {
                prevButton.classList.add('disabled');
                prevButton.setAttribute('aria-disabled', 'true');
            }
        }
        
        if (nextButton) {
            if (nextId) {
                nextButton.addEventListener('click', () => {
                    routerService.navigateTo('/pages/letter.html', { id: nextId });
                });
                nextButton.classList.remove('disabled');
                nextButton.setAttribute('aria-label', `Следующая буква: ${getLetterById(nextId).name}`);
            } else {
                nextButton.classList.add('disabled');
                nextButton.setAttribute('aria-disabled', 'true');
            }
        }
    }

    renderLetter() {
        // Обновляем заголовок страницы
        document.title = `${this.letterData.letter} - ${this.letterData.name} | Арабский алфавит`;
        
        // Заполняем данные буквы
        this.updateElement('letterSymbol', this.letterData.letter);
        this.updateElement('letterName', this.letterData.name);
        this.updateElement('letterTranscription', this.letterData.transcription);
        
        // Формы написания
        this.updateElement('formInitial', this.letterData.forms.initial);
        this.updateElement('formMedial', this.letterData.forms.medial);
        this.updateElement('formFinal', this.letterData.forms.final);
        
        // Описание (если нужно)
        const descriptionElement = document.getElementById('letterDescription');
        if (descriptionElement) {
            descriptionElement.textContent = this.letterData.description;
        }
    }

    updateElement(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    setupAudioPlayer() {
        this.audioPlayer = new AudioPlayer('playButton', this.letterId);
    }

    async loadMakhrajImage() {
        const imageContainer = document.getElementById('makhrajImage');
        if (!imageContainer) return;
        
        const imageName = this.letterData.imageFile;
        const imagePath = `assets/images/makhraj/${imageName}`;
        
        try {
            // Пробуем загрузить изображение
            const img = new Image();
            img.src = imagePath;
            img.alt = `Махрадж буквы ${this.letterData.name}`;
            img.loading = 'lazy';
            
            img.onload = () => {
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);
                imageContainer.classList.remove('error');
            };
            
            img.onerror = () => {
                imageContainer.innerHTML = '<div class="makhraj-error">error</div>';
                imageContainer.classList.add('error');
            };
            
            // Таймаут на случай долгой загрузки
            setTimeout(() => {
                if (!img.complete) {
                    imageContainer.innerHTML = '<div class="makhraj-error">error</div>';
                    imageContainer.classList.add('error');
                }
            }, 3000);
            
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            imageContainer.innerHTML = '<div class="makhraj-error">error</div>';
            imageContainer.classList.add('error');
        }
    }

    setupServiceWorker() {
        // Предзагрузка соседних букв для быстрой навигации
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const prevId = getPrevLetterId(this.letterId);
            const nextId = getNextLetterId(this.letterId);
            
            const pagesToPreload = [];
            if (prevId) pagesToPreload.push(`/pages/letter.html?id=${prevId}`);
            if (nextId) pagesToPreload.push(`/pages/letter.html?id=${nextId}`);
            
            // Можно отправить сообщение Service Worker для предзагрузки
            navigator.serviceWorker.controller.postMessage({
                type: 'PRELOAD_PAGES',
                pages: pagesToPreload
            });
        }
    }

    destroy() {
        if (this.audioPlayer) {
            this.audioPlayer.destroy();
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.letterPage = new LetterPage();
    
    // Обновляем страницу при изменении параметров URL
    window.addEventListener('popstate', () => {
        window.letterPage.destroy();
        window.letterPage = new LetterPage();
    });
});
