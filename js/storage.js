/**
 * Modulo per la gestione della persistenza dati in LocalStorage
 */

const Storage = (() => {
    const STORAGE_KEY = 'orari-ufficio-settimana';

    function salva(dati) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));
        } catch (error) {
            console.error('Errore nel salvataggio dei dati:', error);
        }
    }

    function carica() {
        try {
            const dati = localStorage.getItem(STORAGE_KEY);
            if (dati) {
                return JSON.parse(dati);
            }
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
        }
        return getDatiVuoti();
    }

    function reset() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Errore nella cancellazione dei dati:', error);
        }
    }

    function getDatiVuoti() {
        return {
            giorno1: {
                entrata: '',
                uscitaPranzo: '',
                entrataPranzo: '',
                uscitaEffettiva: '',
                isVenerdi: false
            },
            giorno2: {
                entrata: '',
                uscitaPranzo: '',
                entrataPranzo: '',
                uscitaEffettiva: '',
                isVenerdi: false
            },
            giorno3: {
                entrata: '',
                uscitaPranzo: '',
                entrataPranzo: '',
                uscitaEffettiva: '',
                isVenerdi: false
            }
        };
    }

    return {
        salva,
        carica,
        reset,
        getDatiVuoti
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
