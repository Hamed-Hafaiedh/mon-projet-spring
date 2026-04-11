document.addEventListener('DOMContentLoaded', () => {
    const THEME_KEY = 'parkings_theme';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';

    function applyTheme(theme) {
        const isDark = theme === THEME_DARK;
        document.body.classList.toggle('theme-dark', isDark);
        localStorage.setItem(THEME_KEY, isDark ? THEME_DARK : THEME_LIGHT);
        syncToggleLabels(isDark);
    }

    function syncToggleLabels(isDark) {
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        toggleButtons.forEach(button => {
            button.textContent = isDark ? 'Mode clair' : 'Mode sombre';
            button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        });
    }

    function resolveInitialTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === THEME_DARK || savedTheme === THEME_LIGHT) {
            return savedTheme;
        }

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? THEME_DARK : THEME_LIGHT;
    }

    function toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        applyTheme(isDark ? THEME_LIGHT : THEME_DARK);
    }

    function bindThemeToggleButtons(scope) {
        const root = scope || document;
        const toggleButtons = root.querySelectorAll ? root.querySelectorAll('[data-theme-toggle]') : [];
        toggleButtons.forEach(button => {
            if (button.dataset.themeBound === '1') {
                return;
            }
            button.addEventListener('click', toggleTheme);
            button.dataset.themeBound = '1';
        });

        syncToggleLabels(document.body.classList.contains('theme-dark'));
    }

    const initialTheme = resolveInitialTheme();
    applyTheme(initialTheme);
    bindThemeToggleButtons(document);

    window.ThemeManager = {
        applyTheme,
        toggleTheme,
        bindThemeToggleButtons
    };
});
