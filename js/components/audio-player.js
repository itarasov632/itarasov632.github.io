// Компонент аудио плеера
import { audioService } from '../services/audio-service.js';

class AudioPlayer {
    constructor(buttonId, letterId) {
        this.button = document.getElementById(buttonId);
        this.letterId = letterId;
        
        if (!this.button) {
            console.error(`Кнопка с id "${buttonId}" не найдена`);
            return;
        }
        
        this.init();
    }

    init() {
        this.render();
        this.addEventListeners();
        this.updateState();
    }

    render() {
        this.button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span class="visually-hidden">Воспроизвести</span>
        `;
        
        this.button.setAttribute('aria-label', 'Воспроизвести произношение буквы');
        this.button.setAttribute('role', 'button');
        this.button.setAttribute('tabindex', '0');
    }

    addEventListeners() {
        this.button.addEventListener('click', () => this.play());
        this.button.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.play();
            }
        });
    }

    async play() {
        if (audioService.isCurrentlyPlaying()) {
            audioService.stop();
            this.updateState(false);
            return;
        }
        
        const success = await audioService.playLetter(this.letterId);
        this.updateState(success && audioService.isCurrentlyPlaying());
        
        if (success) {
            // Обновляем состояние когда аудио закончится
            setTimeout(() => {
                this.updateState(false);
            }, 3000); // Примерное время воспроизведения
        }
    }

    updateState(isPlaying = false) {
        if (isPlaying) {
            this.button.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <span class="visually-hidden">Остановить</span>
            `;
            this.button.setAttribute('aria-label', 'Остановить воспроизведение');
            this.button.style.opacity = '0.8';
        } else {
            this.render();
            this.button.style.opacity = '1';
        }
    }

    setLetterId(newLetterId) {
        this.letterId = newLetterId;
        this.updateState(false);
    }

    destroy() {
        this.button.removeEventListener('click', () => this.play());
        this.button.removeEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.play();
            }
        });
    }
}

export { AudioPlayer };
