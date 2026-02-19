/**
 * Modulo principale dell'applicazione
 * Gestisce navigazione per data, form giorno singolo e riepilogo settimanale
 */

const App = (() => {
    const GIORNI_IT = ['Domenica', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato'];
    const GIORNI_IT_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const MESI_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                     'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const TIMEZONE = 'Europe/Rome';

    let dataCorrente = null;
    let deferredPrompt = null;

    function init() {
        Storage.migraDatiVecchi();
        dataCorrente = _oggiISO();
        caricaGiorno(dataCorrente);
        agganciaEventi();
        registraServiceWorker();
        gestisciInstallPrompt();
    }

    // --- NAVIGAZIONE DATA ---

    function caricaGiorno(dataISO) {
        dataCorrente = dataISO;
        const dati = Storage.caricaGiorno(dataISO);
        _popolaForm(dati);
        _aggiornaLabelData(dataISO);
        _aggiornaInputData(dataISO);
        _aggiornaTitoloGiorno(dataISO);
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

    // --- SALVATAGGIO ---

    function onCampoModificato() {
        const dati = {
            entrata: document.getElementById('entrata').value,
            uscitaPranzo: document.getElementById('uscita-pranzo').value,
            entrataPranzo: document.getElementById('entrata-pranzo').value,
            uscitaEffettiva: document.getElementById('uscita-effettiva').value
        };
        Storage.salvaGiorno(dataCorrente, dati);
        aggiornaCalcoli();
    }

    // --- CALCOLI ---

    function aggiornaCalcoli() {
        const giorniSettimana = Storage.caricaSettimana(dataCorrente);

        // Delta cumulato dei giorni precedenti al giorno corrente
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

        // Calcolo giorno corrente
        const isVen = Storage.isVenerdi(dataCorrente);
        const datiGiorno = Storage.caricaGiorno(dataCorrente);
        const datiConFlag = { ...datiGiorno, isVenerdi: isVen };
        const risultatoGiorno = Calculator.calcolaDatiGiorno(datiConFlag, deltaCumulatoPrecedente);
        _mostraRisultatiGiorno(risultatoGiorno, deltaCumulatoPrecedente);

        // Riepilogo settimanale
        const riepilogo = Calculator.calcolaRiepilogoSettimana(giorniSettimana);
        _mostraRiepilogoSettimana(riepilogo);
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
    }

    function _mostraRiepilogoSettimana(riepilogo) {
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

        // Delta cumulato finale
        document.getElementById('delta-cumulato-finale').textContent =
            riepilogo.giorniCalcolati.length > 0
                ? Calculator.minutesToTime(riepilogo.deltaCumulato)
                : '--:--:--';

        // Totale ore
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

        // Uscita minima ultimo giorno
        _mostraUscitaMinima(riepilogo);
    }

    function _mostraUscitaMinima(riepilogo) {
        const container = document.getElementById('uscita-minima-container');
        const valore = document.getElementById('uscita-minima');
        const gc = riepilogo.giorniCalcolati;

        if (gc.length < 2) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        const ultimo = gc[gc.length - 1];
        const penultimoCumulato = gc[gc.length - 2].risultati.deltaCumulato;
        const datiUltimo = Storage.caricaGiorno(ultimo.data);

        const uscitaMin = Calculator.calcolaUscitaMinima(datiUltimo, ultimo.data, penultimoCumulato);

        valore.textContent = uscitaMin !== null
            ? Calculator.minutesToOrario(uscitaMin)
            : '--:--';
    }

    // --- EVENTI ---

    function agganciaEventi() {
        ['entrata', 'uscita-pranzo', 'entrata-pranzo', 'uscita-effettiva'].forEach(id => {
            document.getElementById(id).addEventListener('input', onCampoModificato);
        });

        document.getElementById('data-selezionata').addEventListener('change', (e) => {
            if (e.target.value) caricaGiorno(e.target.value);
        });
        document.getElementById('btn-giorno-precedente').addEventListener('click', () => {
            caricaGiorno(_giornoAdiacente(dataCorrente, -1));
        });
        document.getElementById('btn-giorno-successivo').addEventListener('click', () => {
            caricaGiorno(_giornoAdiacente(dataCorrente, +1));
        });
        document.getElementById('btn-oggi').addEventListener('click', () => {
            caricaGiorno(_oggiISO());
        });

        document.getElementById('btn-reset-giorno').addEventListener('click', resetGiorno);
        document.getElementById('reset-btn').addEventListener('click', resetSettimana);

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
        Storage.cancellaGiorno(dataCorrente);
        const details = document.getElementById('pranzo-details');
        if (details) details.open = false;
        caricaGiorno(dataCorrente);
    }

    function resetSettimana() {
        if (confirm('Vuoi davvero cancellare tutti i dati della settimana?')) {
            const giorniSettimana = Storage.caricaSettimana(dataCorrente);
            for (const g of giorniSettimana) {
                Storage.cancellaGiorno(g.data);
            }
            caricaGiorno(dataCorrente);
        }
    }

    // --- UTILITA ---

    function _oggiISO() {
        // Intl con locale sv-SE produce formato YYYY-MM-DD nativo
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
    }

    function _giornoAdiacente(dataISO, offset) {
        const d = new Date(dataISO + 'T00:00:00');
        d.setDate(d.getDate() + offset);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // --- SERVICE WORKER & INSTALL ---

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
