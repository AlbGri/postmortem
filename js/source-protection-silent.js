/**
 * File: source-protection-silent.js
 * Author: AlbGri
 * Copyright: (c) 2026 Alberto G. - Licensed under CC BY-NC-SA 4.0
 * Description: Protezione sorgente silenziosa per sottoprogetti.
 *              Blocca DevTools e menu contestuale senza mostrare modal.
 *              Disabilitata automaticamente in ambiente development.
 */

(function() {
    'use strict';

    // Rileva ambiente development dall'URL
    var url = window.location.href;
    var isDev = url.indexOf('localhost') !== -1 ||
                url.indexOf('127.0.0.1') !== -1 ||
                url.indexOf('@dev') !== -1 ||
                url.indexOf('/dev/') !== -1 ||
                url.indexOf('/dev') !== -1 ||
                url.indexOf('preview') !== -1;

    if (isDev) {
        console.info('[source-protection-silent] DISABILITATA (ambiente development)');
        return;
    }

    console.info('[source-protection-silent] ATTIVA (ambiente production)');

    // Blocca menu contestuale (click destro)
    document.addEventListener('contextmenu', function(e) {
        if (!e.ctrlKey) e.preventDefault();
    });

    // Blocca scorciatoie DevTools (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+Shift+J, Ctrl+Shift+C)
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C')
        ) {
            e.preventDefault();
            return false;
        }
    }, true);
})();
