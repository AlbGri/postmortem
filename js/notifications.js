/**
 * Modulo per la notifica promemoria uscita
 * Quando l'utente inserisce l'orario di entrata per oggi,
 * dopo 8h (6h il venerdì) mostra una notifica per ricordare l'uscita
 */

const Notifier = (() => {
    const STORAGE_KEY = 'orari-ufficio-reminder';
    const TIMEZONE = 'Europe/Rome';

    let timerId = null;

    function init() {
        const reminder = _caricaReminder();
        if (!reminder) return;

        const ora = Date.now();
        const diff = reminder.targetTimestamp - ora;

        if (diff > 0) {
            _avviaTimer(diff);
        } else if (diff > -5 * 60 * 1000) {
            _mostraNotifica(reminder.dataISO);
        } else {
            _cancellaReminder();
        }
    }

    function scheduleReminder(dataISO, entrataValue, isVenerdi) {
        const oggi = _oggiISO();
        if (dataISO !== oggi) return;

        const [ore, minuti] = entrataValue.split(':').map(Number);
        if (isNaN(ore) || isNaN(minuti)) return;

        const oraEntrata = new Date();
        oraEntrata.setHours(ore, minuti, 0, 0);

        const ritardoMs = (isVenerdi ? 6 : 8) * 60 * 60 * 1000;
        const targetTimestamp = oraEntrata.getTime() + ritardoMs;

        const diff = targetTimestamp - Date.now();
        if (diff <= 0) return;

        _cancellaTimer();

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ dataISO, targetTimestamp }));
        } catch (e) { /* noop */ }

        _avviaTimer(diff);
        _richiediPermesso();
    }

    function cancelReminder() {
        _cancellaTimer();
        _cancellaReminder();
    }

    function _avviaTimer(delayMs) {
        _cancellaTimer();
        timerId = setTimeout(() => {
            const reminder = _caricaReminder();
            if (reminder) {
                _mostraNotifica(reminder.dataISO);
            }
        }, delayMs);
    }

    function _cancellaTimer() {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    }

    function _mostraNotifica(dataISO) {
        _cancellaReminder();

        const dati = Storage.caricaGiorno(dataISO);
        if (dati.uscitaEffettiva) return;

        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted' && navigator.serviceWorker) {
            navigator.serviceWorker.ready.then(function (reg) {
                reg.showNotification('Orari Ufficio', {
                    body: 'Ricordati di inserire l\'orario di uscita!',
                    icon: './favicon.png'
                });
            });
        }
    }

    function _richiediPermesso() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function _caricaReminder() {
        try {
            const dati = localStorage.getItem(STORAGE_KEY);
            if (dati) return JSON.parse(dati);
        } catch (e) { /* noop */ }
        return null;
    }

    function _cancellaReminder() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* noop */ }
    }

    function _oggiISO() {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
    }

    return {
        init,
        scheduleReminder,
        cancelReminder
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notifier;
}
