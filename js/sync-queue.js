/**
 * Coda persistente per operazioni Supabase fallite
 * Salva in localStorage le scritture (save/delete) non riuscite
 * e le ritenta al prossimo successo o al login.
 */
const SyncQueue = (() => {
    const QUEUE_KEY = 'orari-ufficio-sync-queue';

    function _carica() {
        try {
            const data = localStorage.getItem(QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    function _salva(coda) {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(coda));
        } catch (e) {
            console.error('SyncQueue: errore salvataggio coda', e);
        }
    }

    /**
     * Accoda un'operazione fallita.
     * Se esiste gia' un'operazione sullo stesso giorno, la sostituisce
     * (l'ultima modifica e' quella che conta).
     */
    function accoda(tipo, dataISO, payload) {
        const coda = _carica();
        const filtrata = coda.filter(op => op.dataISO !== dataISO);
        filtrata.push({ tipo, dataISO, payload, ts: Date.now() });
        _salva(filtrata);
        aggiornaIndicatore();
    }

    /**
     * Ritenta tutte le operazioni in coda, in ordine.
     * Restituisce true se la coda e' stata svuotata completamente.
     */
    async function processa() {
        const coda = _carica();
        if (coda.length === 0) return true;

        const fallite = [];
        for (const op of coda) {
            let ok = false;
            if (op.tipo === 'save') {
                ok = await Api.salvaGiorno(op.dataISO, op.payload);
            } else if (op.tipo === 'delete') {
                ok = await Api.cancellaGiorno(op.dataISO);
            }
            if (!ok) fallite.push(op);
        }
        _salva(fallite);
        aggiornaIndicatore();
        return fallite.length === 0;
    }

    /**
     * Restituisce le date dei giorni cancellati in coda.
     * Usato dalla sync al login per non ripristinare dal cloud
     * giorni che l'utente ha cancellato offline.
     */
    function getCancellazioniPendenti() {
        return _carica()
            .filter(op => op.tipo === 'delete')
            .map(op => op.dataISO);
    }

    function haOperazioniPendenti() {
        return _carica().length > 0;
    }

    function svuota() {
        _salva([]);
        aggiornaIndicatore();
    }

    function aggiornaIndicatore() {
        const el = document.getElementById('sync-pending');
        if (!el) return;
        const n = _carica().length;
        if (n > 0) {
            el.classList.remove('hidden');
            el.title = n + ' operazion' + (n === 1 ? 'e' : 'i') + ' in attesa di sincronizzazione';
        } else {
            el.classList.add('hidden');
        }
    }

    return { accoda, processa, getCancellazioniPendenti, haOperazioniPendenti, svuota, aggiornaIndicatore };
})();
