/**
 * Modulo principale dell'applicazione
 * Gestisce l'interfaccia utente e coordina i moduli calculator e storage
 */

const App = (() => {
    let datiCorrente = null;

    function init() {
        datiCorrente = Storage.carica();
        aggiornaUI();
        agganciaEventi();
        registraServiceWorker();
    }

    function agganciaEventi() {
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`giorno${i}-entrata`).addEventListener('input', () => onCampoModificato(i));
            document.getElementById(`giorno${i}-uscita-pranzo`).addEventListener('input', () => onCampoModificato(i));
            document.getElementById(`giorno${i}-entrata-pranzo`).addEventListener('input', () => onCampoModificato(i));
            document.getElementById(`giorno${i}-uscita-effettiva`).addEventListener('input', () => onCampoModificato(i));
        }

        document.getElementById('giorno3-flag-venerdi').addEventListener('change', () => onCampoModificato(3));
        document.getElementById('reset-btn').addEventListener('click', resetSettimana);

        document.querySelectorAll('.btn-reset-giorno').forEach(btn => {
            btn.addEventListener('click', () => {
                const numeroGiorno = parseInt(btn.dataset.giorno);
                resetGiorno(numeroGiorno);
            });
        });

        document.querySelectorAll('.btn-ora-adesso').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, '0');
                    const mm = String(now.getMinutes()).padStart(2, '0');
                    input.value = `${hh}:${mm}`;
                    input.dispatchEvent(new Event('input'));
                }
            });
        });
    }

    function onCampoModificato(numeroGiorno) {
        const giorno = `giorno${numeroGiorno}`;
        datiCorrente[giorno].entrata = document.getElementById(`${giorno}-entrata`).value;
        datiCorrente[giorno].uscitaPranzo = document.getElementById(`${giorno}-uscita-pranzo`).value;
        datiCorrente[giorno].entrataPranzo = document.getElementById(`${giorno}-entrata-pranzo`).value;
        datiCorrente[giorno].uscitaEffettiva = document.getElementById(`${giorno}-uscita-effettiva`).value;

        if (numeroGiorno === 3) {
            datiCorrente[giorno].isVenerdi = document.getElementById('giorno3-flag-venerdi').checked;
        }

        Storage.salva(datiCorrente);
        aggiornaCalcoli();
    }

    function aggiornaUI() {
        for (let i = 1; i <= 3; i++) {
            const giorno = `giorno${i}`;
            document.getElementById(`${giorno}-entrata`).value = datiCorrente[giorno].entrata || '';
            document.getElementById(`${giorno}-uscita-pranzo`).value = datiCorrente[giorno].uscitaPranzo || '';
            document.getElementById(`${giorno}-entrata-pranzo`).value = datiCorrente[giorno].entrataPranzo || '';
            document.getElementById(`${giorno}-uscita-effettiva`).value = datiCorrente[giorno].uscitaEffettiva || '';
        }

        document.getElementById('giorno3-flag-venerdi').checked = datiCorrente.giorno3.isVenerdi || false;

        // Apri il details pranzo se ci sono valori salvati
        for (let i = 1; i <= 3; i++) {
            const giorno = `giorno${i}`;
            const details = document.getElementById(`${giorno}-entrata`).closest('.giorno-body').querySelector('.pranzo-details');
            if (details && (datiCorrente[giorno].uscitaPranzo || datiCorrente[giorno].entrataPranzo)) {
                details.open = true;
            }
        }

        aggiornaCalcoli();
    }

    function aggiornaCalcoli() {
        const dati1 = Calculator.calcolaDatiGiorno(datiCorrente.giorno1);
        const dati2 = Calculator.calcolaDatiGiorno(datiCorrente.giorno2, dati1.deltaCumulato);
        const dati3 = Calculator.calcolaDatiGiorno(datiCorrente.giorno3, dati2.deltaCumulato);

        mostraRisultatiGiorno(1, dati1);
        mostraRisultatiGiorno(2, dati2);
        mostraRisultatiGiorno(3, dati3);

        // Per il giorno 3, l'uscita prevista tiene conto dei delta accumulati
        if (dati3.orarioUscitaPrevisto !== null) {
            const uscitaPrevistaG3 = dati3.orarioUscitaPrevisto - dati2.deltaCumulato;
            document.getElementById('giorno3-uscita-previsto').textContent =
                Calculator.minutesToOrario(uscitaPrevistaG3);

            // L'eccesso/difetto del G3 e' rispetto all'uscita prevista corretta
            // Matematicamente: uscita_eff - (standard - cumulatoG2) = deltaG3 + cumulatoG2 = cumulatoG3
            if (dati3.deltaGiornaliero !== null) {
                document.getElementById('giorno3-delta').textContent =
                    Calculator.minutesToTime(dati3.deltaCumulato);
                const elCumulatoG3 = document.getElementById('giorno3-delta-cumulato');
                if (elCumulatoG3) {
                    elCumulatoG3.textContent = Calculator.minutesToTime(dati3.deltaCumulato);
                }
            }
        }

        const totaleOre = Calculator.calcolaTotaleOreSettimanale(
            datiCorrente.giorno1,
            datiCorrente.giorno2,
            datiCorrente.giorno3
        );

        if (totaleOre !== null) {
            if (totaleOre < 0) {
                document.getElementById('totale-ore').textContent = 'Problema';
                document.getElementById('totale-ore').style.color = 'red';
            } else {
                const ore = Math.floor(totaleOre / 60);
                const minuti = Math.floor(totaleOre % 60);
                document.getElementById('totale-ore').textContent = `${ore}:${String(minuti).padStart(2, '0')}`;
                document.getElementById('totale-ore').style.color = '';
            }
        } else {
            document.getElementById('totale-ore').textContent = '--:--';
            document.getElementById('totale-ore').style.color = '';
        }

        document.getElementById('delta-cumulato-finale').textContent =
            dati3.deltaGiornaliero !== null ? Calculator.minutesToTime(dati3.deltaCumulato) : '--:--:--';
    }

    function mostraRisultatiGiorno(numeroGiorno, dati) {
        const prefisso = `giorno${numeroGiorno}`;

        const eccesso = dati.eccesso !== null && dati.eccesso > 0 ? dati.eccesso : 0;
        document.getElementById(`${prefisso}-eccesso`).textContent =
            eccesso > 0 ? Calculator.minutesToTimeShort(eccesso) : '--:--';

        document.getElementById(`${prefisso}-uscita-previsto`).textContent =
            dati.orarioUscitaPrevisto !== null ? Calculator.minutesToOrario(dati.orarioUscitaPrevisto) : '--:--';

        document.getElementById(`${prefisso}-delta`).textContent =
            dati.deltaGiornaliero !== null ? Calculator.minutesToTime(dati.deltaGiornaliero) : '--:--:--';

        const elCumulato = document.getElementById(`${prefisso}-delta-cumulato`);
        if (elCumulato) {
            elCumulato.textContent =
                dati.deltaGiornaliero !== null ? Calculator.minutesToTime(dati.deltaCumulato) : '--:--:--';
        }
    }

    function resetGiorno(numeroGiorno) {
        const giorno = `giorno${numeroGiorno}`;
        datiCorrente[giorno] = {
            entrata: '',
            uscitaPranzo: '',
            entrataPranzo: '',
            uscitaEffettiva: '',
            isVenerdi: false
        };

        // Chiudi il details pranzo
        const details = document.getElementById(`${giorno}-entrata`).closest('.giorno-body').querySelector('.pranzo-details');
        if (details) details.open = false;

        Storage.salva(datiCorrente);
        aggiornaUI();
    }

    function resetSettimana() {
        if (confirm('Vuoi davvero cancellare tutti i dati della settimana?')) {
            Storage.reset();
            datiCorrente = Storage.carica();
            aggiornaUI();
        }
    }

    function registraServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('Service Worker registrato:', registration.scope))
                .catch(error => console.error('Errore registrazione Service Worker:', error));
        }
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
