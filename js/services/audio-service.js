// Сервис для работы с аудио
class AudioService {
    constructor() {
        this.currentAudio = null;
        this.isPlaying = false;
    }

    async playLetter(letterId) {
        // Останавливаем текущее воспроизведение
        this.stop();
        
        // Создаем новый аудио элемент
        const audioPath = `assets/audio/letters/${letterId.toString().padStart(2, '0')}.mp3`;
        this.currentAudio = new Audio(audioPath);
        
        try {
            await this.currentAudio.play();
            this.isPlaying = true;
            
            // Вибрация на мобильных
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // Событие окончания
            this.currentAudio.onended = () => {
                this.isPlaying = false;
                this.currentAudio = null;
            };
            
            return true;
        } catch (error) {
            console.error('Ошибка воспроизведения:', error);
            this.currentAudio = null;
            this.isPlaying = false;
            return false;
        }
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.isPlaying = false;
    }

    isCurrentlyPlaying() {
        return this.isPlaying;
    }
}

// Экспортируем синглтон
export const audioService = new AudioService();
