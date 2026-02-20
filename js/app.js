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
        Calendar.init('calendario-container', caricaGiorno);
        caricaGiorno(dataCorrente);
        agganciaEventi();
        Notifier.init();
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

        if (dati.uscitaEffettiva) {
            Notifier.cancelReminder();
        } else if (dati.entrata) {
            Notifier.scheduleReminder(dataCorrente, dati.entrata, Storage.isVenerdi(dataCorrente));
        } else {
            Notifier.cancelReminder();
        }
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

    // --- EVENTI ---

    function agganciaEventi() {
        ['entrata', 'uscita-pranzo', 'entrata-pranzo', 'uscita-effettiva'].forEach(id => {
            document.getElementById(id).addEventListener('input', onCampoModificato);
        });

        document.getElementById('btn-reset-giorno').addEventListener('click', resetGiorno);
        document.getElementById('reset-btn').addEventListener('click', resetSettimana);
        document.getElementById('reset-mese-btn').addEventListener('click', resetMese);

        document.getElementById('btn-esporta-csv').addEventListener('click', () => CsvManager.esporta());
        document.getElementById('btn-importa-csv').addEventListener('click', () => {
            CsvManager.importa(() => caricaGiorno(dataCorrente));
        });

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
            }
            caricaGiorno(dataCorrente);
        }
    }

    // --- UTILITA ---

    function _oggiISO() {
        // Intl con locale sv-SE produce formato YYYY-MM-DD nativo
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
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
