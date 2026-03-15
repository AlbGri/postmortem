/**
 * Modulo per promemoria geofencing
 * Tra le 08:00 e le 10:00 dei giorni feriali, controlla la posizione GPS
 * ogni 10 minuti. Se l'utente è nel raggio della posizione salvata e non ha
 * ancora compilato l'entrata di oggi, mostra una notifica (max 1 al giorno).
 * La posizione di riferimento viene salvata dall'utente al momento dell'attivazione.
 */

const Geofencing = (() => {
    const STORAGE_KEY = 'orari-ufficio-geofencing';
    const LAST_CHECK_KEY = 'orari-ufficio-geofencing-lastcheck';
    const NOTIFIED_KEY = 'orari-ufficio-geofencing-notified';
    const OFFICE_LAT_KEY = 'orari-ufficio-geofencing-lat';
    const OFFICE_LNG_KEY = 'orari-ufficio-geofencing-lng';
    const TIMEZONE = 'Europe/Rome';

    const RADIUS_METERS = 200;
    const CHECK_INTERVAL_MS = 10 * 60 * 1000;
    const HOUR_START = 8;
    const HOUR_END = 10;

    let _intervalId = null;

    function init() {
        if (!_isEnabled()) return;
        _startMonitoring();
    }

    function toggle() {
        if (_isEnabled()) {
            _disable();
        } else {
            _requestAndEnable();
        }
    }

    function isEnabled() {
        return _isEnabled();
    }

    function _isEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function _getSavedPosition() {
        try {
            const lat = localStorage.getItem(OFFICE_LAT_KEY);
            const lng = localStorage.getItem(OFFICE_LNG_KEY);
            if (lat === null || lng === null) return null;
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
        } catch (e) {
            return null;
        }
    }

    function _requestAndEnable() {
        if (!('geolocation' in navigator)) {
            alert('Il tuo browser non supporta la geolocalizzazione.');
            return;
        }

        const conferma = confirm(
            'Sei in ufficio adesso? Vuoi salvare questa posizione come riferimento per le notifiche?\n\nRiceverai un promemoria tra le 8 e le 10 nei giorni feriali se non hai ancora inserito l\u2019entrata.'
        );
        if (!conferma) return;

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                try {
                    localStorage.setItem(STORAGE_KEY, 'true');
                    localStorage.setItem(OFFICE_LAT_KEY, String(pos.coords.latitude));
                    localStorage.setItem(OFFICE_LNG_KEY, String(pos.coords.longitude));
                } catch (e) { /* noop */ }

                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }

                _updateButton(true);
                _startMonitoring();
            },
            function () {
                alert('Permesso geolocalizzazione negato. La funzione non può essere attivata.');
            },
            { timeout: 10000 }
        );
    }

    function _disable() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_CHECK_KEY);
            localStorage.removeItem(NOTIFIED_KEY);
            localStorage.removeItem(OFFICE_LAT_KEY);
            localStorage.removeItem(OFFICE_LNG_KEY);
        } catch (e) { /* noop */ }
        _stopMonitoring();
        _updateButton(false);
    }

    function _startMonitoring() {
        _stopMonitoring();
        _tick();
        _intervalId = setInterval(_tick, 60 * 1000);
    }

    function _stopMonitoring() {
        if (_intervalId !== null) {
            clearInterval(_intervalId);
            _intervalId = null;
        }
    }

    function _tick() {
        if (!_isEnabled()) return;
        if (!_getSavedPosition()) return;
        if (!_isFeriale()) return;
        if (!_isInTimeWindow()) return;
        if (_isThrottled()) return;
        if (_entrataGiaCompilata()) return;
        if (_giaNotificatoOggi()) return;

        _checkPosition();
    }

    function _isFeriale() {
        const dayStr = new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            timeZone: TIMEZONE
        }).format(new Date());
        return dayStr !== 'Sat' && dayStr !== 'Sun';
    }

    function _isInTimeWindow() {
        const hour = _currentHourRome();
        return hour >= HOUR_START && hour < HOUR_END;
    }

    function _currentHourRome() {
        const parts = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: false,
            timeZone: TIMEZONE
        }).formatToParts(new Date());
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].type === 'hour') return parseInt(parts[i].value, 10);
        }
        return -1;
    }

    function _isThrottled() {
        try {
            const last = localStorage.getItem(LAST_CHECK_KEY);
            if (!last) return false;
            return (Date.now() - parseInt(last, 10)) < CHECK_INTERVAL_MS;
        } catch (e) {
            return false;
        }
    }

    function _saveLastCheck() {
        try {
            localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        } catch (e) { /* noop */ }
    }

    function _giaNotificatoOggi() {
        try {
            return localStorage.getItem(NOTIFIED_KEY) === _oggiISO();
        } catch (e) {
            return false;
        }
    }

    function _segnaNotificatoOggi() {
        try {
            localStorage.setItem(NOTIFIED_KEY, _oggiISO());
        } catch (e) { /* noop */ }
    }

    function _entrataGiaCompilata() {
        const oggi = _oggiISO();
        const dati = Storage.caricaGiorno(oggi);
        return !!(dati && dati.entrata);
    }

    function _oggiISO() {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
    }

    function _checkPosition() {
        const office = _getSavedPosition();
        if (!office) return;

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                _saveLastCheck();
                const dist = _haversine(
                    pos.coords.latitude, pos.coords.longitude,
                    office.lat, office.lng
                );
                if (dist <= RADIUS_METERS) {
                    _mostraNotifica();
                    _segnaNotificatoOggi();
                }
            },
            function (error) {
                if (error.code === error.PERMISSION_DENIED) {
                    _disable();
                }
            },
            { timeout: 15000, maximumAge: 60000 }
        );
    }

    function _haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = Math.PI / 180;
        const dLat = (lat2 - lat1) * toRad;
        const dLon = (lon2 - lon1) * toRad;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function _mostraNotifica() {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        if (!navigator.serviceWorker) return;

        navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification('Ora et Labora', {
                body: 'Sei in ufficio! Ricordati di inserire l\u2019orario di entrata.',
                icon: './favicon.png'
            });
        });
    }

    function _updateButton(enabled) {
        const btn = document.getElementById('geo-toggle');
        if (!btn) return;
        btn.setAttribute('aria-pressed', String(enabled));
        if (enabled) {
            btn.classList.add('geo-active');
            btn.setAttribute('aria-label', 'Disattiva promemoria posizione');
            btn.title = 'Disattiva promemoria posizione';
        } else {
            btn.classList.remove('geo-active');
            btn.setAttribute('aria-label', 'Attiva promemoria posizione');
            btn.title = 'Attiva promemoria posizione';
        }
    }

    return {
        init: init,
        toggle: toggle,
        isEnabled: isEnabled
    };
})();
