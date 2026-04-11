(function configureApi(windowObj) {
    const explicitApiUrl = (windowObj.__API_URL__ || '').trim();

    if (explicitApiUrl) {
        windowObj.APP_CONFIG = { API_URL: explicitApiUrl };
        return;
    }

    const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(windowObj.location.hostname);
    const fallbackApiUrl = isLocalHost
        ? 'http://localhost:8080/api'
        : windowObj.location.origin.replace(/\/$/, '') + '/api';

    windowObj.APP_CONFIG = { API_URL: fallbackApiUrl };
})(window);

