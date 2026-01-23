// Сервис для навигации и работы с URL
class RouterService {
    constructor() {
        this.routes = {
            '/': 'pages/home.html',
            '/alphabet': 'pages/alphabet.html',
            '/letter': 'pages/letter.html'
        };
    }

    // Получить параметры из URL
    getUrlParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }

    // Получить конкретный параметр
    getParam(name, defaultValue = null) {
        const params = this.getUrlParams();
        return params[name] || defaultValue;
    }

    // Перейти на страницу
    navigateTo(path, params = {}) {
        let url = path;
        
        // Добавляем параметры если есть
        if (Object.keys(params).length > 0) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url += '?' + queryString;
        }
        
        window.location.href = url;
    }

    // Вернуться назад
    goBack() {
        window.history.back();
    }

    // Обновить текущую страницу с новыми параметрами
    updateParams(newParams) {
        const currentParams = this.getUrlParams();
        const mergedParams = { ...currentParams, ...newParams };
        const path = window.location.pathname;
        
        this.navigateTo(path, mergedParams);
    }

    // Получить ID буквы из URL
    getLetterId() {
        return parseInt(this.getParam('id', '1'));
    }

    // Проверить, является ли путь текущим
    isCurrentPath(path) {
        return window.location.pathname === path;
    }
}

export const routerService = new RouterService();
