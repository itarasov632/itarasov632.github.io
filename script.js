// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Приложение "Второй учитель" загружено!');
    
    // Добавляем эффект клика на карточки
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Эффект нажатия
            this.style.transform = 'scale(0.98)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            
            // Восстановление через 150ms
            setTimeout(() => {
                this.style.transform = '';
                this.style.boxShadow = '';
            }, 150);
        });
        
        // Подсказка при наведении
        card.addEventListener('mouseenter', function() {
            const title = this.querySelector('h2').textContent;
            console.log(`Переход к разделу: ${title}`);
        });
    });
    
    // Добавляем информацию о времени загрузки
    const footer = document.querySelector('.footer');
    if (footer) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dateElement = document.createElement('div');
        dateElement.style.marginTop = '8px';
        dateElement.style.fontSize = '14px';
        dateElement.style.color = '#aaa';
        dateElement.textContent = `Время открытия: ${timeString}`;
        footer.appendChild(dateElement);
    }
});

