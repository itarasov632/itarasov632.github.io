// Ждем, когда вся страница загрузится
document.addEventListener('DOMContentLoaded', function() {
    // Находим нашу кнопку и текстовый блок
    const button = document.getElementById('myButton');
    const demoText = document.getElementById('demoText');

    // Добавляем действие при нажатии на кнопку
    button.addEventListener('click', function() {
        demoText.textContent = 'Ура! Вы нажали кнопку! 🎉';
        demoText.style.color = '#007aff';
        demoText.style.fontWeight = 'bold';

        // Можно добавить вибрацию (работает на реальном устройстве)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
});