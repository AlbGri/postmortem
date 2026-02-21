/**
 * Modulo per la visualizzazione del calendario mensile
 * Griglia mese con delta giornaliero colorato per ogni cella
 */

const Calendar = (() => {
    const GIORNI_HEADER = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const GIORNI_COMPLETI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const MESI_IT = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    const TIMEZONE = 'Europe/Rome';

    let meseCorrente = null;
    let dataSelezionata = null;
    let onGiornoSelezionato = null;
    let containerEl = null;

    function init(containerId, callback) {
        containerEl = document.getElementById(containerId);
        onGiornoSelezionato = callback;
        const oggi = _oggiISO();
        const parts = oggi.split('-');
        meseCorrente = { anno: parseInt(parts[0]), mese: parseInt(parts[1]) - 1 };
        dataSelezionata = oggi;
        _renderCalendario();
    }

    function setDataSelezionata(dataISO) {
        const vecchia = dataSelezionata;
        dataSelezionata = dataISO;

        _aggiornaSommario();

        const parts = dataISO.split('-');
        const anno = parseInt(parts[0]);
        const mese = parseInt(parts[1]) - 1;

        if (anno !== meseCorrente.anno || mese !== meseCorrente.mese) {
            meseCorrente = { anno, mese };
            _renderCalendario();
            return;
        }

        if (vecchia) {
            const cellaVecchia = containerEl.querySelector('[data-date="' + vecchia + '"]');
            if (cellaVecchia) cellaVecchia.classList.remove('selezionato');
        }
        const cellaNuova = containerEl.querySelector('[data-date="' + dataISO + '"]');
        if (cellaNuova) cellaNuova.classList.add('selezionato');
    }

    function aggiornaDeltas() {
        _caricaDeltasMese();
    }

    function navigaMese(offset) {
        meseCorrente.mese += offset;
        if (meseCorrente.mese > 11) {
            meseCorrente.mese = 0;
            meseCorrente.anno++;
        } else if (meseCorrente.mese < 0) {
            meseCorrente.mese = 11;
            meseCorrente.anno--;
        }
        _renderCalendario();
    }

    function vaiAOggi() {
        let oggi = _oggiISO();
        const d = new Date(oggi + 'T00:00:00');
        const giorno = d.getDay();
        if (giorno === 0) { d.setDate(d.getDate() - 2); oggi = _toISO(d); }
        else if (giorno === 6) { d.setDate(d.getDate() - 1); oggi = _toISO(d); }
        const parts = oggi.split('-');
        meseCorrente = { anno: parseInt(parts[0]), mese: parseInt(parts[1]) - 1 };
        dataSelezionata = oggi;
        _renderCalendario();
        if (onGiornoSelezionato) onGiornoSelezionato(oggi);
    }

    function _toISO(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // --- Funzioni private ---

    function _oggiISO() {
        return new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(new Date());
    }

    function _formatDataCompleta(dataISO) {
        const d = new Date(dataISO + 'T00:00:00');
        return GIORNI_COMPLETI[d.getDay()] + ' ' + d.getDate() + ' ' +
            MESI_IT[d.getMonth()] + ' ' + d.getFullYear();
    }

    function _aggiornaSommario() {
        const summary = containerEl.querySelector('.calendario-summary-testo');
        if (summary) summary.textContent = _formatDataCompleta(dataSelezionata);
    }

    function _renderCalendario() {
        const vecchioDetails = containerEl.querySelector('.calendario-details');
        const eraAperto = vecchioDetails ? vecchioDetails.open : false;

        containerEl.textContent = '';

        const details = document.createElement('details');
        details.className = 'calendario-details';
        if (eraAperto) details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'calendario-summary';

        const testo = document.createElement('span');
        testo.className = 'calendario-summary-testo';
        testo.textContent = _formatDataCompleta(dataSelezionata);

        const freccia = document.createElement('span');
        freccia.className = 'calendario-summary-freccia';
        freccia.setAttribute('aria-hidden', 'true');
        freccia.textContent = '\u25B6';

        summary.appendChild(testo);
        summary.appendChild(freccia);
        details.appendChild(summary);

        const content = document.createElement('div');
        content.className = 'calendario-content';

        content.appendChild(_creaHeader());
        content.appendChild(_creaAzioni());
        content.appendChild(_creaGriglia());

        details.appendChild(content);
        containerEl.appendChild(details);

        _caricaDeltasMese();
    }

    function _creaHeader() {
        const header = document.createElement('div');
        header.className = 'calendario-header';

        const btnPrec = document.createElement('button');
        btnPrec.type = 'button';
        btnPrec.className = 'btn-nav-mese';
        btnPrec.setAttribute('aria-label', 'Mese precedente');
        btnPrec.textContent = '\u25C0';
        btnPrec.addEventListener('click', () => navigaMese(-1));

        const label = document.createElement('span');
        label.className = 'calendario-mese-label';
        label.id = 'mese-label';
        label.textContent = MESI_IT[meseCorrente.mese] + ' ' + meseCorrente.anno;

        const btnSucc = document.createElement('button');
        btnSucc.type = 'button';
        btnSucc.className = 'btn-nav-mese';
        btnSucc.setAttribute('aria-label', 'Mese successivo');
        btnSucc.textContent = '\u25B6';
        btnSucc.addEventListener('click', () => navigaMese(1));

        header.appendChild(btnPrec);
        header.appendChild(label);
        header.appendChild(btnSucc);

        return header;
    }

    function _creaAzioni() {
        const div = document.createElement('div');
        div.className = 'calendario-azioni';

        const btnOggi = document.createElement('button');
        btnOggi.type = 'button';
        btnOggi.className = 'btn-oggi';
        btnOggi.textContent = 'Oggi';
        btnOggi.addEventListener('click', vaiAOggi);

        div.appendChild(btnOggi);
        return div;
    }

    function _creaGriglia() {
        const griglia = document.createElement('div');
        griglia.className = 'calendario-griglia';
        griglia.setAttribute('role', 'grid');
        griglia.setAttribute('aria-label', 'Calendario mensile');

        for (let i = 0; i < 7; i++) {
            const th = document.createElement('span');
            th.className = 'calendario-giorno-header';
            th.setAttribute('role', 'columnheader');
            if (i >= 5) th.classList.add('weekend-header');
            th.textContent = GIORNI_HEADER[i];
            griglia.appendChild(th);
        }

        const primoGiorno = new Date(meseCorrente.anno, meseCorrente.mese, 1);
        const offsetInizio = (primoGiorno.getDay() + 6) % 7;
        const giorniNelMese = new Date(meseCorrente.anno, meseCorrente.mese + 1, 0).getDate();
        const oggi = _oggiISO();

        for (let i = 0; i < offsetInizio; i++) {
            const vuoto = document.createElement('span');
            vuoto.className = 'calendario-giorno vuoto';
            griglia.appendChild(vuoto);
        }

        for (let g = 1; g <= giorniNelMese; g++) {
            const cella = _creaGiornoCell(g, oggi);
            griglia.appendChild(cella);
        }

        const celleUsate = offsetInizio + giorniNelMese;
        const celleMancanti = celleUsate % 7 === 0 ? 0 : 7 - (celleUsate % 7);
        for (let i = 0; i < celleMancanti; i++) {
            const vuoto = document.createElement('span');
            vuoto.className = 'calendario-giorno vuoto';
            griglia.appendChild(vuoto);
        }

        return griglia;
    }

    function _creaGiornoCell(giorno, oggi) {
        const dataISO = meseCorrente.anno + '-' +
            String(meseCorrente.mese + 1).padStart(2, '0') + '-' +
            String(giorno).padStart(2, '0');

        const dayOfWeek = new Date(dataISO + 'T00:00:00').getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const el = document.createElement(isWeekend ? 'span' : 'button');
        el.className = 'calendario-giorno';
        el.setAttribute('data-date', dataISO);

        if (!isWeekend) {
            el.type = 'button';
            el.addEventListener('click', () => _onClickGiorno(dataISO));
        }

        if (isWeekend) {
            el.classList.add('weekend');
            el.setAttribute('aria-disabled', 'true');
        }

        if (dataISO === oggi) el.classList.add('oggi');
        if (dataISO === dataSelezionata) el.classList.add('selezionato');

        const numero = document.createElement('span');
        numero.className = 'calendario-giorno-numero';
        numero.textContent = giorno;

        const delta = document.createElement('span');
        delta.className = 'calendario-giorno-delta';

        el.appendChild(numero);
        el.appendChild(delta);

        return el;
    }

    function _onClickGiorno(dataISO) {
        const vecchia = containerEl.querySelector('.selezionato');
        if (vecchia) vecchia.classList.remove('selezionato');

        const nuova = containerEl.querySelector('[data-date="' + dataISO + '"]');
        if (nuova) nuova.classList.add('selezionato');

        dataSelezionata = dataISO;

        const details = containerEl.querySelector('.calendario-details');
        if (details) details.open = false;

        _aggiornaSommario();

        if (onGiornoSelezionato) onGiornoSelezionato(dataISO);
    }

    function _caricaDeltasMese() {
        const datiMese = Storage.caricaMese(meseCorrente.anno, meseCorrente.mese);

        const celle = containerEl.querySelectorAll('[data-date]');
        celle.forEach(cella => {
            const dataISO = cella.getAttribute('data-date');
            const deltaEl = cella.querySelector('.calendario-giorno-delta');
            if (!deltaEl) return;

            const dati = datiMese[dataISO];
            if (!dati) {
                deltaEl.textContent = '';
                deltaEl.className = 'calendario-giorno-delta';
                return;
            }

            const isVen = Storage.isVenerdi(dataISO);
            const datiConFlag = {
                entrata: dati.entrata,
                uscitaPranzo: dati.uscitaPranzo,
                entrataPranzo: dati.entrataPranzo,
                uscitaEffettiva: dati.uscitaEffettiva,
                isVenerdi: isVen
            };

            const risultati = Calculator.calcolaDatiGiorno(datiConFlag, 0);
            const minuti = risultati.deltaGiornaliero;

            deltaEl.textContent = _formatDeltaBreve(minuti);
            deltaEl.className = 'calendario-giorno-delta';
            if (minuti !== null && minuti >= 0) deltaEl.classList.add('delta-positivo');
            if (minuti !== null && minuti < 0) deltaEl.classList.add('delta-negativo');
        });
    }

    function _formatDeltaBreve(minuti) {
        if (minuti === null || minuti === undefined) return '';
        const segno = minuti >= 0 ? '+' : '-';
        const abs = Math.abs(minuti);
        const ore = Math.floor(abs / 60);
        const min = Math.floor(abs % 60);
        if (ore > 0) return segno + ore + 'h' + min + 'm';
        return segno + min + 'm';
    }

    return {
        init,
        setDataSelezionata,
        aggiornaDeltas,
        navigaMese,
        vaiAOggi
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calendar;
}
