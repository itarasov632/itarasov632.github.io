// Компонент сетки букв
import { getAllLetters } from '../data/alphabet-data.js';
import { routerService } from '../services/router-service.js';

class LetterGrid {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            columns: 4,
            rows: 7,
            showNumbers: false,
            interactive: true,
            ...options
        };
        
        if (!this.container) {
            console.error(`Контейнер с id "${containerId}" не найден`);
            return;
        }
        
        this.letters = getAllLetters();
        this.init();
    }

    init() {
        this.render();
        if (this.options.interactive) {
            this.addEventListeners();
        }
    }

    render() {
        // Создаем сетку
        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = `repeat(${this.options.columns}, 1fr)`;
        this.container.style.gridTemplateRows = `repeat(${this.options.rows}, 1fr)`;
        this.container.style.gap = '1px';
        this.container.style.backgroundColor = 'var(--color-border)';
        
        // Очищаем контейнер
        this.container.innerHTML = '';
        
        // Добавляем ячейки с буквами
        this.letters.forEach(letter => {
            const cell = this.createLetterCell(letter);
            this.container.appendChild(cell);
        });
    }

    createLetterCell(letter) {
        const cell = document.createElement('div');
        cell.className = 'letter-cell';
        cell.dataset.letterId = letter.id;
        
        // Добавляем номер если нужно
        if (this.options.showNumbers) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'letter-number';
            numberSpan.textContent = letter.id;
            numberSpan.style.cssText = `
                position: absolute;
                top: 4px;
                left: 4px;
                font-size: 12px;
                color: var(--color-text-secondary);
            `;
            cell.appendChild(numberSpan);
        }
        
        // Добавляем букву
        const letterSpan = document.createElement('span');
        letterSpan.className = 'letter-symbol';
        letterSpan.textContent = letter.letter;
        letterSpan.style.cssText = `
            font-family: var(--font-arabic);
            font-size: 44px;
            font-weight: 400;
        `;
        cell.appendChild(letterSpan);
        
        return cell;
    }

    addEventListeners() {
        this.container.addEventListener('click', (event) => {
            const cell = event.target.closest('.letter-cell');
            if (cell) {
                const letterId = cell.dataset.letterId;
                this.onLetterClick(letterId);
            }
        });
    }

    onLetterClick(letterId) {
        // Переходим на страницу буквы
        routerService.navigateTo('/letter.html', { id: letterId });
        
        // Вибрация
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    destroy() {
        this.container.innerHTML = '';
        this.container.style.cssText = '';
    }
}

export { LetterGrid };
