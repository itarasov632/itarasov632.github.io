// Обновляем только ранее установленный worker приложения. Новую регистрацию не создаём.
(() => {
    if (!('serviceWorker' in navigator)) return;
    const workerUrl = new URL('../service-worker.js', document.currentScript.src).href;
    const refresh = () => navigator.serviceWorker.getRegistrations()
        .then(registrations => Promise.all(registrations
            .filter(registration => [registration.active, registration.waiting, registration.installing]
                .some(worker => worker && worker.scriptURL === workerUrl))
            .map(registration => registration.update())))
        .catch(() => {}); // Офлайн обновление повторится при восстановлении сети.
    window.addEventListener('pageshow', refresh);
    window.addEventListener('online', refresh);
})();
