/**
 * Modulo per la gestione della persistenza dati in LocalStorage
 * Modello dati: dizionario { "YYYY-MM-DD": { entrata, uscitaPranzo, entrataPranzo, uscitaEffettiva } }
 */

const Storage = (() => {
    const STORAGE_KEY = 'orari-ufficio-giorni';
    const OLD_STORAGE_KEY = 'orari-ufficio-settimana';

    function caricaGiorno(dataISO) {
        const tutti = _caricaTutti();
        return tutti[dataISO] || getDatiGiornoVuoti();
    }

    function salvaGiorno(dataISO, datiGiorno) {
        const tutti = _caricaTutti();
        if (_isGiornoVuoto(datiGiorno)) {
            delete tutti[dataISO];
        } else {
            tutti[dataISO] = datiGiorno;
        }
        _salvaTutti(tutti);
    }

    function caricaSettimana(dataISO) {
        const tutti = _caricaTutti();
        const { lunedi, venerdi } = getLunediVenerdi(dataISO);
        const risultato = [];
        const d = new Date(lunedi + 'T00:00:00');
        const fine = new Date(venerdi + 'T00:00:00');
        while (d <= fine) {
            const iso = _toISO(d);
            if (tutti[iso]) {
                risultato.push({ data: iso, dati: tutti[iso] });
            }
            d.setDate(d.getDate() + 1);
        }
        return risultato;
    }

    function cancellaGiorno(dataISO) {
        const tutti = _caricaTutti();
        delete tutti[dataISO];
        _salvaTutti(tutti);
    }

    function getDatiGiornoVuoti() {
        return {
            entrata: '',
            uscitaPranzo: '',
            entrataPranzo: '',
            uscitaEffettiva: ''
        };
    }

    function migraDatiVecchi() {
        try {
            if (localStorage.getItem(OLD_STORAGE_KEY)) {
                localStorage.removeItem(OLD_STORAGE_KEY);
                return true;
            }
        } catch (e) { /* noop */ }
        return false;
    }

    function caricaMese(anno, mese) {
        const tutti = _caricaTutti();
        const risultato = {};
        const prefisso = anno + '-' + String(mese + 1).padStart(2, '0') + '-';
        for (const dataISO in tutti) {
            if (dataISO.startsWith(prefisso)) {
                risultato[dataISO] = tutti[dataISO];
            }
        }
        return risultato;
    }

    function isVenerdi(dataISO) {
        return new Date(dataISO + 'T00:00:00').getDay() === 5;
    }

    function caricaTutti() {
        return _caricaTutti();
    }

    function importaDati(datiObj) {
        const tutti = _caricaTutti();
        for (const dataISO in datiObj) {
            if (!_isGiornoVuoto(datiObj[dataISO])) {
                tutti[dataISO] = datiObj[dataISO];
            }
        }
        _salvaTutti(tutti);
    }

    function sostituisciTutti(datiObj) {
        const nuovi = {};
        for (const dataISO in datiObj) {
            if (!_isGiornoVuoto(datiObj[dataISO])) {
                nuovi[dataISO] = datiObj[dataISO];
            }
        }
        _salvaTutti(nuovi);
    }

    function cancellaTutti() {
        _salvaTutti({});
    }

    // --- Funzioni private ---

    function _caricaTutti() {
        try {
            const dati = localStorage.getItem(STORAGE_KEY);
            if (dati) return JSON.parse(dati);
        } catch (e) {
            console.error('Errore nel caricamento dei dati:', e);
        }
        return {};
    }

    function _salvaTutti(obj) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            console.error('Errore nel salvataggio dei dati:', e);
        }
    }

    function _isGiornoVuoto(dati) {
        return !dati.entrata && !dati.uscitaPranzo && !dati.entrataPranzo && !dati.uscitaEffettiva;
    }

    function getLunediVenerdi(dataISO) {
        const d = new Date(dataISO + 'T00:00:00');
        const giorno = d.getDay();
        // getDay(): 0=dom, 1=lun, ..., 6=sab
        const offsetLunedi = giorno === 0 ? -6 : 1 - giorno;
        const lunedi = new Date(d);
        lunedi.setDate(d.getDate() + offsetLunedi);
        const venerdi = new Date(lunedi);
        venerdi.setDate(lunedi.getDate() + 4);
        return {
            lunedi: _toISO(lunedi),
            venerdi: _toISO(venerdi)
        };
    }

    function _toISO(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return {
        caricaGiorno,
        salvaGiorno,
        caricaSettimana,
        caricaMese,
        getLunediVenerdi,
        cancellaGiorno,
        getDatiGiornoVuoti,
        migraDatiVecchi,
        isVenerdi,
        caricaTutti,
        importaDati,
        sostituisciTutti,
        cancellaTutti
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
