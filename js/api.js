/**
 * Modulo API per comunicazione con Supabase
 * CRUD operazioni sulla tabella daily_entries
 *
 * CONCETTO: mapping nomi campi
 * Nel database usiamo snake_case (uscita_pranzo) - convenzione SQL
 * Nel frontend usiamo camelCase (uscitaPranzo) - convenzione JavaScript
 * Questo modulo traduce tra i due formati.
 *
 * CONCETTO: upsert
 * "upsert" = INSERT + UPDATE. Se la riga non esiste, la crea.
 * Se esiste già (stessa combinazione user_id + date), la aggiorna.
 * Evita di dover fare prima un SELECT per controllare.
 *
 * CONCETTO: RLS trasparenti
 * Non scriviamo mai "WHERE user_id = ..." nelle query.
 * Le RLS lo fanno automaticamente: ogni SELECT restituisce solo
 * le righe dell'utente loggato, ogni INSERT/UPDATE/DELETE
 * funziona solo sulle proprie righe.
 */
const Api = (() => {
    let _supabase = null;

    function init(supabaseClient) {
        _supabase = supabaseClient;
    }

    /**
     * Ottiene l'ID dell'utente corrente dalla sessione
     * Necessario per INSERT (user_id è NOT NULL nella tabella)
     */
    async function _getUserId() {
        const { data } = await _supabase.auth.getSession();
        return data.session?.user?.id || null;
    }

    /**
     * Converte una riga del database nel formato localStorage
     * DB: { date: "2026-02-20", entrata: "08:30:00", uscita_pranzo: "12:30:00", ... }
     * App: { entrata: "08:30", uscitaPranzo: "12:30", ... }
     */
    function _dbRowToApp(row) {
        return {
            entrata: row.entrata ? row.entrata.substring(0, 5) : '',
            uscitaPranzo: row.uscita_pranzo ? row.uscita_pranzo.substring(0, 5) : '',
            entrataPranzo: row.entrata_pranzo ? row.entrata_pranzo.substring(0, 5) : '',
            uscitaEffettiva: row.uscita ? row.uscita.substring(0, 5) : ''
        };
    }

    /**
     * Converte i dati dell'app nel formato database
     * Valori vuoti ('') diventano null (convenzione SQL)
     */
    function _appToDbRow(dataISO, dati, userId) {
        return {
            user_id: userId,
            date: dataISO,
            entrata: dati.entrata || null,
            uscita_pranzo: dati.uscitaPranzo || null,
            entrata_pranzo: dati.entrataPranzo || null,
            uscita: dati.uscitaEffettiva || null
        };
    }

    /**
     * Carica TUTTI i dati dell'utente da Supabase
     * Usato al login per popolare localStorage
     * Equivale a: SELECT * FROM daily_entries WHERE user_id = me ORDER BY date
     * (il WHERE user_id è applicato automaticamente dalle RLS)
     *
     * @returns {Object|null} Dizionario { "2026-02-20": { entrata, ... }, ... }
     */
    async function caricaTuttiDati() {
        const { data, error } = await _supabase
            .from('daily_entries')
            .select('date, entrata, uscita_pranzo, entrata_pranzo, uscita')
            .order('date');

        if (error) {
            console.error('Errore caricamento dati:', error);
            return null;
        }

        const risultato = {};
        for (const row of data) {
            risultato[row.date] = _dbRowToApp(row);
        }
        return risultato;
    }

    /**
     * Salva un giorno su Supabase (upsert)
     * Se il giorno non esiste: INSERT
     * Se il giorno esiste già: UPDATE
     *
     * @param {string} dataISO - "2026-02-20"
     * @param {Object} dati - { entrata, uscitaPranzo, entrataPranzo, uscitaEffettiva }
     */
    async function salvaGiorno(dataISO, dati) {
        const userId = await _getUserId();
        if (!userId) return false;

        const row = _appToDbRow(dataISO, dati, userId);

        const { error } = await _supabase
            .from('daily_entries')
            .upsert(row, { onConflict: 'user_id,date' });

        if (error) {
            console.error('Errore salvataggio giorno:', error);
            return false;
        }
        return true;
    }

    /**
     * Cancella un giorno da Supabase
     * Equivale a: DELETE FROM daily_entries WHERE date = dataISO AND user_id = me
     */
    async function cancellaGiorno(dataISO) {
        const { error } = await _supabase
            .from('daily_entries')
            .delete()
            .eq('date', dataISO);

        if (error) {
            console.error('Errore cancellazione giorno:', error);
            return false;
        }
        return true;
    }

    /**
     * Importa un set di dati in blocco (upsert multiplo)
     * Usato per la migrazione localStorage -> Supabase
     *
     * @param {Object} datiObj - Dizionario { "2026-02-20": { entrata, ... }, ... }
     */
    async function importaDati(datiObj) {
        const userId = await _getUserId();
        if (!userId) return false;

        const rows = [];
        for (const dataISO in datiObj) {
            const dati = datiObj[dataISO];
            if (dati.entrata || dati.uscitaPranzo || dati.entrataPranzo || dati.uscitaEffettiva) {
                rows.push(_appToDbRow(dataISO, dati, userId));
            }
        }

        if (rows.length === 0) return true;

        const { error } = await _supabase
            .from('daily_entries')
            .upsert(rows, { onConflict: 'user_id,date' });

        if (error) {
            console.error('Errore importazione dati:', error);
            return false;
        }
        return true;
    }

    return { init, caricaTuttiDati, salvaGiorno, cancellaGiorno, importaDati };
})();
