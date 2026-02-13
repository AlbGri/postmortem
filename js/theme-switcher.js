/**
 * Modulo per la gestione del tema light/dark
 * Pattern IIFE come gli altri moduli del progetto
 * Compatibile CSP: script-src 'self' - nessuno stile inline
 */

(function () {
    'use strict';

    const CONFIG = {
        storageKey: 'orari-ufficio-theme',
        themes: { LIGHT: 'light', DARK: 'dark' },
        animationDuration: 600
    };

    const DOM = {
        root: document.documentElement,
        toggleBtn: null,
        themeIcon: null
    };

    let currentTheme = null;

    function detectPreferredTheme() {
        try {
            const saved = localStorage.getItem(CONFIG.storageKey);
            if (saved === CONFIG.themes.LIGHT || saved === CONFIG.themes.DARK) {
                return saved;
            }
        } catch (e) {
            // localStorage non disponibile
        }

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? CONFIG.themes.DARK : CONFIG.themes.LIGHT;
    }

    function applyTheme(theme, animate) {
        if (theme !== CONFIG.themes.LIGHT && theme !== CONFIG.themes.DARK) {
            return;
        }

        DOM.root.setAttribute('data-theme', theme);
        currentTheme = theme;

        updateIcon(theme, animate);
        updateAriaLabel(theme);

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content',
                theme === CONFIG.themes.DARK ? '#1e1e1e' : '#2c3e50'
            );
        }

        try {
            localStorage.setItem(CONFIG.storageKey, theme);
        } catch (e) {
            // localStorage non disponibile
        }
    }

    function updateIcon(theme, animate) {
        if (!DOM.themeIcon) return;
        DOM.themeIcon.classList.remove('light', 'dark', 'rotating');
        DOM.themeIcon.classList.add(theme);

        if (animate) {
            DOM.themeIcon.classList.add('rotating');
            setTimeout(function () {
                DOM.themeIcon.classList.remove('rotating');
            }, CONFIG.animationDuration);
        }
    }

    function updateAriaLabel(theme) {
        if (!DOM.toggleBtn) return;
        const nextTheme = theme === CONFIG.themes.LIGHT ? 'scura' : 'chiara';
        DOM.toggleBtn.setAttribute('aria-label', 'Passa alla modalit\u00e0 ' + nextTheme);
    }

    function toggleTheme() {
        const newTheme = currentTheme === CONFIG.themes.LIGHT
            ? CONFIG.themes.DARK
            : CONFIG.themes.LIGHT;
        applyTheme(newTheme, true);
    }

    function handleSystemThemeChange() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', function (event) {
            try {
                const saved = localStorage.getItem(CONFIG.storageKey);
                if (saved) return;
            } catch (e) {
                // localStorage non disponibile
            }
            const systemTheme = event.matches ? CONFIG.themes.DARK : CONFIG.themes.LIGHT;
            applyTheme(systemTheme, false);
        });
    }

    function initDOMCache() {
        DOM.toggleBtn = document.getElementById('theme-toggle');
        DOM.themeIcon = document.getElementById('theme-icon');
    }

    function initEventListeners() {
        if (!DOM.toggleBtn) return;

        DOM.toggleBtn.addEventListener('click', function (event) {
            event.preventDefault();
            toggleTheme();
        });

        DOM.toggleBtn.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleTheme();
            }
        });
    }

    function init() {
        initDOMCache();
        const preferredTheme = detectPreferredTheme();
        applyTheme(preferredTheme, false);
        initEventListeners();
        handleSystemThemeChange();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
