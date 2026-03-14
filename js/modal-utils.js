/**
 * Utility condivisa per modali accessibili WCAG 2.1 AA
 * - Focus trap (Tab/Shift+Tab ciclico dentro la modale)
 * - Escape per chiudere
 * - Focus spostato all'apertura, ripristinato alla chiusura
 * - inert sul contenuto sottostante
 */
const ModalUtils = (() => {
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const _stack = []; // stack modali aperte (per modali annidate)

    /**
     * Apre una modale in modo accessibile.
     * @param {HTMLElement} modal - L'elemento modale (con role="dialog")
     * @param {object} [opts]
     * @param {HTMLElement} [opts.focusEl] - Elemento su cui spostare il focus (default: primo focusable)
     * @param {function} [opts.onClose] - Callback chiamata su Escape o chiusura
     */
    function apri(modal, opts = {}) {
        const trigger = document.activeElement;

        modal.classList.remove('hidden');

        // Rendi inerte il contenuto sottostante
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        [main, header, footer].forEach(el => {
            if (el) el.setAttribute('inert', '');
        });
        // Rendi inerti le altre modali nello stack
        for (const entry of _stack) {
            entry.modal.setAttribute('inert', '');
        }

        const entry = {
            modal,
            trigger,
            onClose: opts.onClose || null,
            _onKeydown: null
        };

        // Focus trap + Escape
        entry._onKeydown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                if (entry.onClose) entry.onClose();
                return;
            }
            if (e.key === 'Tab') {
                _trapFocus(modal, e);
            }
        };
        modal.addEventListener('keydown', entry._onKeydown);

        _stack.push(entry);

        // Sposta focus
        requestAnimationFrame(() => {
            if (opts.focusEl && modal.contains(opts.focusEl)) {
                opts.focusEl.focus();
            } else {
                const primo = modal.querySelector(FOCUSABLE);
                if (primo) primo.focus();
            }
        });
    }

    /**
     * Chiude la modale e ripristina lo stato.
     * @param {HTMLElement} modal - L'elemento modale da chiudere
     */
    function chiudi(modal) {
        const idx = _stack.findIndex(e => e.modal === modal);
        if (idx === -1) return;

        const entry = _stack.splice(idx, 1)[0];
        modal.removeEventListener('keydown', entry._onKeydown);
        modal.classList.add('hidden');

        // Se c'e' una modale sotto nello stack, toglile inert
        if (_stack.length > 0) {
            const sotto = _stack[_stack.length - 1];
            sotto.modal.removeAttribute('inert');
        } else {
            // Ripristina contenuto principale
            const main = document.querySelector('main');
            const header = document.querySelector('header');
            const footer = document.querySelector('footer');
            [main, header, footer].forEach(el => {
                if (el) el.removeAttribute('inert');
            });
        }

        // Ripristina focus al trigger
        if (entry.trigger && typeof entry.trigger.focus === 'function') {
            entry.trigger.focus();
        }
    }

    function _trapFocus(modal, e) {
        const focusabili = Array.from(modal.querySelectorAll(FOCUSABLE))
            .filter(el => !el.closest('.hidden') && !el.closest('[inert]') && el.offsetParent !== null);

        if (focusabili.length === 0) return;

        const primo = focusabili[0];
        const ultimo = focusabili[focusabili.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === primo) {
                e.preventDefault();
                ultimo.focus();
            }
        } else {
            if (document.activeElement === ultimo) {
                e.preventDefault();
                primo.focus();
            }
        }
    }

    return { apri, chiudi };
})();
