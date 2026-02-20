/**
 * Modulo per export/import dati in formato CSV
 * Separatore: punto e virgola (compatibilita' Excel italiano)
 */

const CsvManager = (() => {
    const SEPARATORE = ';';
    const HEADER = 'Data;Entrata;Uscita Pranzo;Entrata Pranzo;Uscita Effettiva';

    function esporta() {
        const tutti = Storage.caricaTutti();
        const date = Object.keys(tutti).sort();

        if (date.length === 0) {
            alert('Nessun dato da esportare.');
            return;
        }

        const righe = [HEADER];
        for (const dataISO of date) {
            const d = tutti[dataISO];
            righe.push([
                dataISO,
                d.entrata || '',
                d.uscitaPranzo || '',
                d.entrataPranzo || '',
                d.uscitaEffettiva || ''
            ].join(SEPARATORE));
        }

        const csv = '\uFEFF' + righe.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
        const nomeFile = 'orari-ufficio-' + oggi + '.csv';

        const a = document.createElement('a');
        a.href = url;
        a.download = nomeFile;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importa(onComplete) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const dati = _parsaCsv(reader.result);
                if (!dati) return;

                const numGiorni = Object.keys(dati).length;
                if (numGiorni === 0) {
                    alert('Nessun dato valido trovato nel file.');
                    return;
                }

                if (confirm('Importare ' + numGiorni + ' giorni? I dati esistenti per le stesse date verranno sovrascritti.')) {
                    Storage.importaDati(dati);
                    if (onComplete) onComplete();
                }
            };
            reader.readAsText(file, 'UTF-8');
        });

        input.click();
    }

    function _parsaCsv(testo) {
        const righe = testo.replace(/\uFEFF/, '').split(/\r?\n/).filter(r => r.trim());

        if (righe.length < 2) {
            alert('Il file CSV e\' vuoto o non ha dati.');
            return null;
        }

        const dati = {};
        for (let i = 1; i < righe.length; i++) {
            const campi = righe[i].split(SEPARATORE);
            if (campi.length < 1) continue;

            const dataISO = campi[0].trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) continue;

            dati[dataISO] = {
                entrata: _validaOrario(campi[1]),
                uscitaPranzo: _validaOrario(campi[2]),
                entrataPranzo: _validaOrario(campi[3]),
                uscitaEffettiva: _validaOrario(campi[4])
            };
        }

        return dati;
    }

    function _validaOrario(valore) {
        if (!valore) return '';
        const v = valore.trim();
        if (/^\d{2}:\d{2}$/.test(v)) return v;
        return '';
    }

    return {
        esporta,
        importa
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CsvManager;
}
