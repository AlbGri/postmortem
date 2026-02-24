/**
 * Modulo principale dell'applicazione
 * Gestisce navigazione per data, form giorno singolo, riepilogo settimanale
 * e integrazione con Supabase (auth + dati)
 *
 * ARCHITETTURA:
 * - localStorage è il "fast storage" (sincrono, usato per render immediato)
 * - Supabase è il "persistent storage" (asincrono, dati condivisi tra dispositivi)
 * - Ad ogni modifica: salva in localStorage (immediato) + Supabase (background)
 * - Al login: scarica dati da Supabase -> popola localStorage
 * - Al logout: pulisce localStorage
 */

const App = (() => {
    const GIORNI_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const GIORNI_IT_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                     'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const TIMEZONE = 'Europe/Rome';

    let dataCorrente = null;
    let deferredPrompt = null;
    let _supabaseClient = null;
    let _isLoggedIn = false;
    let _eventiAppAgganciati = false;

    // ==========================================
    // INIT E AUTH
    // ==========================================

    /**
     * Punto di ingresso dell'app
     * L'app parte sempre in modalità locale.
     * Se c'è una sessione Supabase attiva, attiva il cloud in background.
     */
    async function init() {
        _supabaseClient = supabase.createClient(SupabaseConfig.URL, SupabaseConfig.KEY);
        Auth.init(_supabaseClient);
        Api.init(_supabaseClient);

        _agganciaEventiAuth();
        registraServiceWorker();
        gestisciInstallPrompt();

        // Avvia subito l'app in modalità locale
        _avviaApp();

        // Poi controlla se c'è già una sessione attiva
        const sessione = await Auth.getSessione();
        if (sessione) {
            const profilo = await Auth.getProfilo();
            if (profilo && profilo.approved) {
                await _attivaModalitaCloud(profilo);
            } else if (profilo) {
                _apriAuthModal();
                _mostraAttesa();
            }
        }
    }

    /**
     * Avvia l'app in modalità locale (sempre chiamata)
     * Inizializza calendario, form, eventi
     */
    function _avviaApp() {
        document.getElementById('btn-accedi').classList.remove('hidden');
        document.getElementById('user-bar').classList.add('hidden');

        Storage.migraDatiVecchi();
        dataCorrente = _oggiLavorativoISO();
        Calendar.init('calendario-container', caricaGiorno);
        caricaGiorno(dataCorrente);
        _agganciaEventiApp();
        Notifier.init();
        Geofencing.init();
    }

    /**
     * Attiva la modalità cloud (dopo login o se sessione attiva)
     * Sincronizza dati da Supabase e aggiorna l'header
     */
    async function _attivaModalitaCloud(profilo) {
        _isLoggedIn = true;

        // Sincronizza da Supabase
        const sincOk = await _sincronizzaDaSupabase();
        if (!sincOk) {
            // Utente ha annullato: logout e torna in modalità locale
            await Auth.logout();
            _isLoggedIn = false;
            _chiudiAuthModal();
            caricaGiorno(dataCorrente);
            return;
        }

        // Aggiorna header: nasconde "Accedi", mostra user-bar
        document.getElementById('btn-accedi').classList.add('hidden');
        document.getElementById('app-subtitle').classList.add('hidden');
        document.getElementById('user-bar').classList.remove('hidden');
        document.getElementById('user-alias-display').textContent = profilo.alias;

        // Chiudi modale auth se aperto
        _chiudiAuthModal();

        // Ricarica il giorno corrente con i dati sincronizzati
        caricaGiorno(dataCorrente);
    }

    /**
     * Scarica tutti i dati dell'utente da Supabase
     * e li mette in localStorage (sovrascrive)
     */
    /**
     * @returns {boolean} true se sincronizzazione completata, false se annullata
     */
    async function _sincronizzaDaSupabase() {
        const datiRemoti = await Api.caricaTuttiDati();
        if (!datiRemoti) return true;

        const datiLocali = Storage.caricaTutti();
        const chiaveRemote = new Set(Object.keys(datiRemoti));

        // Trova giorni presenti solo in locale (non nel cloud)
        const giorniSoloLocali = {};
        for (const dataISO in datiLocali) {
            if (!chiaveRemote.has(dataISO)) {
                giorniSoloLocali[dataISO] = datiLocali[dataISO];
            }
        }

        const numSoloLocali = Object.keys(giorniSoloLocali).length;
        if (numSoloLocali > 0) {
            const scelta = await _mostraModalSync(numSoloLocali);
            if (scelta === 'annulla') {
                // Ripristina i dati locali originali e annulla il login
                Storage.sostituisciTutti(datiLocali);
                return false;
            }
            // Supabase è fonte di verità: sostituisci tutto localStorage
            Storage.sostituisciTutti(datiRemoti);
            if (scelta === 'carica') {
                await Api.importaDati(giorniSoloLocali);
                Storage.importaDati(giorniSoloLocali);
            }
            // 'elimina': localStorage ha già solo i dati remoti
        } else {
            // Nessun conflitto: sostituisci direttamente
            Storage.sostituisciTutti(datiRemoti);
        }
        return true;
    }

    /**
     * Mostra il modale di sincronizzazione con 3 opzioni
     * @returns {Promise<'carica'|'elimina'|'annulla'>}
     */
    function _mostraModalSync(numGiorni) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-sync');
            const msg = document.getElementById('sync-msg');
            msg.textContent = 'Hai ' + numGiorni + ' giorn' + (numGiorni === 1 ? 'o salvato' : 'i salvati') +
                ' solo in locale (non present' + (numGiorni === 1 ? 'e' : 'i') + ' nel cloud).';
            modal.classList.remove('hidden');

            function chiudi(scelta) {
                modal.classList.add('hidden');
                document.getElementById('btn-sync-carica').removeEventListener('click', onCarica);
                document.getElementById('btn-sync-elimina').removeEventListener('click', onElimina);
                document.getElementById('btn-sync-annulla').removeEventListener('click', onAnnulla);
                resolve(scelta);
            }
            function onCarica() { chiudi('carica'); }
            function onElimina() { chiudi('elimina'); }
            function onAnnulla() { chiudi('annulla'); }

            document.getElementById('btn-sync-carica').addEventListener('click', onCarica);
            document.getElementById('btn-sync-elimina').addEventListener('click', onElimina);
            document.getElementById('btn-sync-annulla').addEventListener('click', onAnnulla);
        });
    }

    function _mostraLogin() {
        _isLoggedIn = false;
        document.getElementById('btn-accedi').classList.remove('hidden');
        document.getElementById('app-subtitle').classList.remove('hidden');
        document.getElementById('user-bar').classList.add('hidden');
    }

    function _apriAuthModal() {
        const modal = document.getElementById('schermata-auth');
        modal.classList.remove('hidden');
        document.getElementById('form-login').classList.remove('hidden');
        document.getElementById('form-registrazione').classList.add('hidden');
        document.getElementById('schermata-attesa').classList.add('hidden');
        _nascondiErrori();
    }

    function _isSchermataAttesaVisibile() {
        return !document.getElementById('schermata-attesa').classList.contains('hidden');
    }

    function _chiudiAuthModal() {
        document.getElementById('schermata-auth').classList.add('hidden');
        document.getElementById('btn-chiudi-auth').classList.remove('hidden');
    }

    function _mostraRegistrazione() {
        document.getElementById('form-login').classList.add('hidden');
        document.getElementById('form-registrazione').classList.remove('hidden');
        document.getElementById('schermata-attesa').classList.add('hidden');
        _nascondiErrori();
    }

    function _mostraAttesa() {
        document.getElementById('form-login').classList.add('hidden');
        document.getElementById('form-registrazione').classList.add('hidden');
        document.getElementById('schermata-attesa').classList.remove('hidden');
        document.getElementById('btn-chiudi-auth').classList.add('hidden');
    }

    function _mostraErrore(elementId, messaggio) {
        const el = document.getElementById(elementId);
        el.textContent = messaggio;
        el.classList.remove('hidden');
    }

    function _nascondiErrori() {
        document.querySelectorAll('.auth-errore').forEach(el => el.classList.add('hidden'));
    }

    // ==========================================
    // EVENTI AUTH
    // ==========================================

    function _agganciaEventiAuth() {
        // Apri modale auth
        document.getElementById('btn-accedi').addEventListener('click', _apriAuthModal);

        // Chiudi modale auth (bloccato durante schermata di attesa)
        document.getElementById('btn-chiudi-auth').addEventListener('click', () => {
            if (!_isSchermataAttesaVisibile()) _chiudiAuthModal();
        });
        document.getElementById('auth-backdrop').addEventListener('click', () => {
            if (!_isSchermataAttesaVisibile()) _chiudiAuthModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('schermata-auth');
                if (!modal.classList.contains('hidden') && !_isSchermataAttesaVisibile()) {
                    _chiudiAuthModal();
                }
            }
        });

        // Toggle login <-> registrazione
        document.getElementById('link-registrati').addEventListener('click', (e) => {
            e.preventDefault();
            _mostraRegistrazione();
        });
        document.getElementById('link-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('form-login').classList.remove('hidden');
            document.getElementById('form-registrazione').classList.add('hidden');
            _nascondiErrori();
        });

        // Login
        document.getElementById('btn-login').addEventListener('click', _onLogin);
        document.getElementById('login-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') _onLogin();
        });

        // Registrazione
        document.getElementById('btn-registra').addEventListener('click', _onRegistra);

        // Logout
        document.getElementById('btn-logout').addEventListener('click', _onLogout);
        document.getElementById('btn-logout-attesa').addEventListener('click', _onLogout);
    }

    async function _onLogin() {
        _nascondiErrori();
        const alias = document.getElementById('login-alias').value;
        const password = document.getElementById('login-password').value;

        if (!alias || !password) {
            _mostraErrore('login-errore', 'Inserisci alias e password.');
            return;
        }

        const btn = document.getElementById('btn-login');
        btn.disabled = true;
        btn.textContent = 'Accesso...';

        const risultato = await Auth.login(alias, password);

        btn.disabled = false;
        btn.textContent = 'Accedi';

        if (!risultato.ok) {
            _mostraErrore('login-errore', risultato.errore);
            return;
        }

        if (!risultato.approvato) {
            _mostraAttesa();
            return;
        }

        await _attivaModalitaCloud(risultato.profilo);
    }

    async function _onRegistra() {
        _nascondiErrori();
        const nome = document.getElementById('reg-nome').value;
        const alias = document.getElementById('reg-alias').value;
        const password = document.getElementById('reg-password').value;
        const motivazione = document.getElementById('reg-motivazione').value;

        const btn = document.getElementById('btn-registra');
        btn.disabled = true;
        btn.textContent = 'Registrazione...';

        const risultato = await Auth.registra(alias, password, nome, motivazione);

        btn.disabled = false;
        btn.textContent = 'Registrati';

        if (!risultato.ok) {
            _mostraErrore('reg-errore', risultato.errore);
            return;
        }

        _mostraAttesa();
    }

    async function _onLogout() {
        try {
            await Auth.logout();
        } catch (e) {
            // Ignora errori di rete: procedi con la pulizia locale
        }
        if (_isLoggedIn) {
            Storage.cancellaTutti();
        }
        _chiudiAuthModal();
        _mostraLogin();
        caricaGiorno(dataCorrente);
    }

    // ==========================================
    // NAVIGAZIONE DATA
    // ==========================================

    function caricaGiorno(dataISO) {
        dataCorrente = dataISO;
        const dati = Storage.caricaGiorno(dataISO);
        _popolaForm(dati);
        _aggiornaLabelData(dataISO);
        _aggiornaInputData(dataISO);
        _aggiornaTitoloGiorno(dataISO);
        Calendar.setDataSelezionata(dataISO);
        aggiornaCalcoli();
    }

    function _popolaForm(dati) {
        document.getElementById('entrata').value = dati.entrata || '';
        document.getElementById('uscita-pranzo').value = dati.uscitaPranzo || '';
        document.getElementById('entrata-pranzo').value = dati.entrataPranzo || '';
        document.getElementById('uscita-effettiva').value = dati.uscitaEffettiva || '';

        const details = document.getElementById('pranzo-details');
        if (details) {
            details.open = !!(dati.uscitaPranzo || dati.entrataPranzo);
        }
    }

    function _aggiornaLabelData(dataISO) {
        const d = new Date(dataISO + 'T00:00:00');
        const label = `${GIORNI_IT[d.getDay()]} ${d.getDate()} ${MESI_IT[d.getMonth()]} ${d.getFullYear()}`;
        document.getElementById('data-label').textContent = label;
    }

    function _aggiornaInputData(dataISO) {
        document.getElementById('data-selezionata').value = dataISO;
    }

    function _aggiornaTitoloGiorno(dataISO) {
        const d = new Date(dataISO + 'T00:00:00');
        const nome = GIORNI_IT[d.getDay()];
        const isVen = d.getDay() === 5;
        document.getElementById('giorno-titolo').textContent = isVen ? `${nome} (6h)` : nome;
    }

    // ==========================================
    // SALVATAGGIO (dual-write: localStorage + Supabase)
    // ==========================================

    function onCampoModificato() {
        const dati = {
            entrata: document.getElementById('entrata').value,
            uscitaPranzo: document.getElementById('uscita-pranzo').value,
            entrataPranzo: document.getElementById('entrata-pranzo').value,
            uscitaEffettiva: document.getElementById('uscita-effettiva').value
        };

        // 1. Salva in localStorage (immediato, sincrono)
        Storage.salvaGiorno(dataCorrente, dati);

        // 2. Salva su Supabase (asincrono, in background, non bloccante)
        //    Se fallisce, i dati restano in localStorage
        if (_isLoggedIn) {
            Api.salvaGiorno(dataCorrente, dati);
        }

        aggiornaCalcoli();

        if (dati.uscitaEffettiva) {
            Notifier.cancelReminder();
        } else if (dati.entrata) {
            Notifier.scheduleReminder(dataCorrente, dati.entrata, Storage.isVenerdi(dataCorrente));
        } else {
            Notifier.cancelReminder();
        }
    }

    // ==========================================
    // CALCOLI
    // ==========================================

    function aggiornaCalcoli() {
        const giorniSettimana = Storage.caricaSettimana(dataCorrente);

        const giorniPrecedenti = giorniSettimana.filter(g => g.data < dataCorrente);
        let deltaCumulatoPrecedente = 0;
        for (const gp of giorniPrecedenti) {
            const isVen = Storage.isVenerdi(gp.data);
            const risultato = Calculator.calcolaDatiGiorno(
                { ...gp.dati, isVenerdi: isVen },
                deltaCumulatoPrecedente
            );
            deltaCumulatoPrecedente = risultato.deltaCumulato;
        }

        const isVen = Storage.isVenerdi(dataCorrente);
        const datiGiorno = Storage.caricaGiorno(dataCorrente);
        const datiConFlag = { ...datiGiorno, isVenerdi: isVen };
        const risultatoGiorno = Calculator.calcolaDatiGiorno(datiConFlag, deltaCumulatoPrecedente);
        _mostraRisultatiGiorno(risultatoGiorno, deltaCumulatoPrecedente);

        const riepilogo = Calculator.calcolaRiepilogoSettimana(giorniSettimana);
        _mostraRiepilogoSettimana(riepilogo);

        _mostraRiepilogoMensile();

        Calendar.aggiornaDeltas();
    }

    function _mostraRisultatiGiorno(dati, deltaCumulatoPrecedente) {
        const eccesso = dati.eccesso > 0 ? dati.eccesso : 0;
        document.getElementById('eccesso').textContent =
            eccesso > 0 ? Calculator.minutesToTimeShort(eccesso) : '--:--';

        if (dati.orarioUscitaPrevisto !== null) {
            const uscitaCorretta = dati.orarioUscitaPrevisto - deltaCumulatoPrecedente;
            document.getElementById('uscita-previsto').textContent =
                Calculator.minutesToOrario(uscitaCorretta);
        } else {
            document.getElementById('uscita-previsto').textContent = '--:--';
        }

        document.getElementById('delta').textContent =
            dati.deltaGiornaliero !== null ? Calculator.minutesToTime(dati.deltaCumulato) : '--:--:--';

        const avviso = document.getElementById('avviso-minimo');
        if (dati.deltaGiornaliero !== null && dati.deltaGiornaliero < -120) {
            avviso.classList.remove('hidden');
        } else {
            avviso.classList.add('hidden');
        }
    }

    function _mostraRiepilogoSettimana(riepilogo) {
        const { lunedi, venerdi } = Storage.getLunediVenerdi(dataCorrente);
        const lun = new Date(lunedi + 'T00:00:00');
        const ven = new Date(venerdi + 'T00:00:00');
        const range = String(lun.getDate()).padStart(2, '0') + '/' + String(lun.getMonth() + 1).padStart(2, '0') +
            ' - ' + String(ven.getDate()).padStart(2, '0') + '/' + String(ven.getMonth() + 1).padStart(2, '0');

        document.getElementById('riepilogo-settimanale-titolo').textContent = 'Settimana (' + range + ')';

        const container = document.getElementById('riepilogo-giorni');
        container.textContent = '';

        if (riepilogo.giorniCalcolati.length === 0) {
            container.textContent = 'Nessun giorno compilato questa settimana.';
        } else {
            const ul = document.createElement('ul');
            ul.className = 'riepilogo-lista-giorni';
            ul.setAttribute('role', 'list');
            for (const gc of riepilogo.giorniCalcolati) {
                const li = document.createElement('li');
                const d = new Date(gc.data + 'T00:00:00');
                const nomeGiorno = GIORNI_IT_SHORT[d.getDay()];
                const ore = gc.isVenerdi ? '6h' : '8h';
                const deltaText = gc.risultati.deltaGiornaliero !== null
                    ? Calculator.minutesToTime(gc.risultati.deltaGiornaliero)
                    : 'incompleto';
                li.textContent = `${nomeGiorno} ${d.getDate()}/${d.getMonth() + 1} (${ore}): ${deltaText}`;
                if (gc.data === dataCorrente) {
                    li.classList.add('giorno-corrente');
                }
                ul.appendChild(li);
            }
            container.appendChild(ul);
        }

        document.getElementById('delta-cumulato-finale').textContent =
            riepilogo.giorniCalcolati.length > 0
                ? Calculator.minutesToTime(riepilogo.deltaCumulato)
                : '--:--:--';

        const totaleEl = document.getElementById('totale-ore');
        const haGiorniCompleti = riepilogo.giorniCalcolati.some(g => g.risultati.deltaGiornaliero !== null);
        if (haGiorniCompleti) {
            const ore = Math.floor(riepilogo.totaleOreLavorate / 60);
            const min = Math.floor(riepilogo.totaleOreLavorate % 60);
            totaleEl.textContent = `${ore}:${String(min).padStart(2, '0')}`;
            totaleEl.classList.remove('text-error');
        } else {
            totaleEl.textContent = '--:--';
            totaleEl.classList.remove('text-error');
        }

    }

    function _mostraRiepilogoMensile() {
        const d = new Date(dataCorrente + 'T00:00:00');
        const anno = d.getFullYear();
        const mese = d.getMonth();

        document.getElementById('riepilogo-mensile-titolo').textContent =
            'Mese (' + String(mese + 1).padStart(2, '0') + '/' + anno + ')';

        const datiMese = Storage.caricaMese(anno, mese);
        const giorniMese = Object.keys(datiMese).sort().map(data => ({ data, dati: datiMese[data] }));
        const riepilogo = Calculator.calcolaRiepilogoSettimana(giorniMese);

        const container = document.getElementById('riepilogo-giorni-mensile');
        container.textContent = '';

        if (riepilogo.giorniCalcolati.length === 0) {
            container.textContent = 'Nessun giorno compilato questo mese.';
        } else {
            container.textContent = riepilogo.giorniCalcolati.length + ' giorni compilati';
        }

        document.getElementById('delta-cumulato-mensile').textContent =
            riepilogo.giorniCalcolati.length > 0
                ? Calculator.minutesToTime(riepilogo.deltaCumulato)
                : '--:--:--';

        const totaleEl = document.getElementById('totale-ore-mensile');
        const haGiorniCompleti = riepilogo.giorniCalcolati.some(g => g.risultati.deltaGiornaliero !== null);
        if (haGiorniCompleti) {
            const ore = Math.floor(riepilogo.totaleOreLavorate / 60);
            const min = Math.floor(riepilogo.totaleOreLavorate % 60);
            totaleEl.textContent = ore + ':' + String(min).padStart(2, '0');
        } else {
            totaleEl.textContent = '--:--';
        }
    }

    // ==========================================
    // EVENTI APP
    // ==========================================

    function _agganciaEventiApp() {
        if (_eventiAppAgganciati) return;
        _eventiAppAgganciati = true;
        ['entrata', 'uscita-pranzo', 'entrata-pranzo', 'uscita-effettiva'].forEach(id => {
            document.getElementById(id).addEventListener('input', onCampoModificato);
        });

        document.getElementById('btn-reset-giorno').addEventListener('click', resetGiorno);
        document.getElementById('reset-btn').addEventListener('click', resetSettimana);
        document.getElementById('reset-mese-btn').addEventListener('click', resetMese);

        document.getElementById('btn-esporta-csv').addEventListener('click', () => CsvManager.esporta());
        document.getElementById('btn-importa-csv').addEventListener('click', () => {
            CsvManager.importa((datiImportati) => {
                if (_isLoggedIn && datiImportati) {
                    Api.importaDati(datiImportati);
                }
                caricaGiorno(dataCorrente);
            });
        });

        const geoBtn = document.getElementById('geo-toggle');
        if (geoBtn) {
            if (Geofencing.isEnabled()) {
                geoBtn.classList.add('geo-active');
                geoBtn.setAttribute('aria-label', 'Disattiva promemoria posizione');
                geoBtn.setAttribute('aria-pressed', 'true');
                geoBtn.title = 'Disattiva promemoria posizione';
            }
            geoBtn.addEventListener('click', () => Geofencing.toggle());
        }

        document.querySelectorAll('.btn-ora-adesso').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const oraRoma = new Intl.DateTimeFormat('it-IT', {
                        timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(new Date());
                    input.value = oraRoma;
                    input.dispatchEvent(new Event('input'));
                }
            });
        });
    }

    function resetGiorno() {
        const d = new Date(dataCorrente + 'T00:00:00');
        const label = GIORNI_IT[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
        if (confirm('Vuoi davvero cancellare i dati di ' + label + '?')) {
            Storage.cancellaGiorno(dataCorrente);
            if (_isLoggedIn) {
                Api.cancellaGiorno(dataCorrente);
            }
            Notifier.cancelReminder();
            const details = document.getElementById('pranzo-details');
            if (details) details.open = false;
            caricaGiorno(dataCorrente);
        }
    }

    function resetSettimana() {
        const { lunedi, venerdi } = Storage.getLunediVenerdi(dataCorrente);
        const lun = new Date(lunedi + 'T00:00:00');
        const ven = new Date(venerdi + 'T00:00:00');
        const range = lun.getDate() + '/' + (lun.getMonth() + 1) + ' - ' +
            ven.getDate() + '/' + (ven.getMonth() + 1);
        if (confirm('Vuoi davvero cancellare tutti i dati della settimana ' + range + '?')) {
            const giorniSettimana = Storage.caricaSettimana(dataCorrente);
            for (const g of giorniSettimana) {
                Storage.cancellaGiorno(g.data);
                if (_isLoggedIn) {
                    Api.cancellaGiorno(g.data);
                }
            }
            caricaGiorno(dataCorrente);
        }
    }

    function resetMese() {
        const d = new Date(dataCorrente + 'T00:00:00');
        const anno = d.getFullYear();
        const mese = d.getMonth();
        const label = MESI_IT[mese].charAt(0).toUpperCase() + MESI_IT[mese].slice(1) + ' ' + anno;
        if (confirm('Vuoi davvero cancellare tutti i dati di ' + label + '?')) {
            const datiMese = Storage.caricaMese(anno, mese);
            for (const dataISO in datiMese) {
                Storage.cancellaGiorno(dataISO);
                if (_isLoggedIn) {
                    Api.cancellaGiorno(dataISO);
                }
            }
            caricaGiorno(dataCorrente);
        }
    }

    // ==========================================
    // UTILITA
    // ==========================================

    function _oggiISO() {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
    }

    function _oggiLavorativoISO() {
        const oggi = _oggiISO();
        const d = new Date(oggi + 'T00:00:00');
        const giorno = d.getDay();
        if (giorno === 0) d.setDate(d.getDate() - 2);
        else if (giorno === 6) d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // ==========================================
    // SERVICE WORKER & INSTALL
    // ==========================================

    function registraServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('Service Worker registrato:', registration.scope))
                .catch(error => console.error('Errore registrazione Service Worker:', error));
        }
    }

    function gestisciInstallPrompt() {
        const banner = document.getElementById('install-banner');
        const btnInstall = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (banner) banner.classList.remove('hidden');
        });

        if (btnInstall) {
            btnInstall.addEventListener('click', () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(() => {
                        deferredPrompt = null;
                        if (banner) banner.classList.add('hidden');
                    });
                }
            });
        }

        window.addEventListener('appinstalled', () => {
            if (banner) banner.classList.add('hidden');
            deferredPrompt = null;
        });
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
