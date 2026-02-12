/**
 * Modulo per il calcolo degli orari di ufficio
 * Replica la logica dell'Excel per calcolare orari di uscita, delta e totali
 */

const Calculator = (() => {
    const PAUSA_STANDARD = 30;
    const ORE_GIORNO_NORMALE = 8 * 60;
    const ORE_VENERDI = 6 * 60;
    const MINUTI_GIORNO = 24 * 60;

    function timeToMinutes(timeString) {
        if (!timeString) return null;
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        return hours * 60 + minutes;
    }

    function minutesToTime(minutes) {
        if (minutes === null || minutes === undefined) return '';
        const isNegative = minutes < 0;
        const absMinutes = Math.abs(minutes);
        const hours = Math.floor(absMinutes / 60);
        const mins = Math.floor(absMinutes % 60);
        const secs = Math.floor((absMinutes % 1) * 60);
        const sign = isNegative ? '-' : '';
        return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function minutesToTimeShort(minutes) {
        if (minutes === null || minutes === undefined) return '';
        const isNegative = minutes < 0;
        const absMinutes = Math.abs(minutes);
        const hours = Math.floor(absMinutes / 60);
        const mins = Math.floor(absMinutes % 60);
        const sign = isNegative ? '-' : '';
        return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    function minutesToOrario(minutes) {
        if (minutes === null || minutes === undefined) return '';
        if (minutes >= MINUTI_GIORNO) {
            return minutesToTimeShort(minutes - MINUTI_GIORNO) + ' (+1)';
        }
        return minutesToTimeShort(minutes);
    }

    function calcolaEccessoPausaPranzo(uscitaPranzo, entrataPranzo, isVenerdi) {
        const uscitaMin = timeToMinutes(uscitaPranzo);
        const entrataMin = timeToMinutes(entrataPranzo);

        if (uscitaMin === null || entrataMin === null) return 0;

        const durataPausa = entrataMin - uscitaMin;
        if (durataPausa < 0) return 0;

        if (isVenerdi) {
            return durataPausa;
        } else {
            return Math.max(0, durataPausa - PAUSA_STANDARD);
        }
    }

    function calcolaOrarioUscitaPrevisto(entrata, uscitaPranzo, entrataPranzo, isVenerdi) {
        const entrataMin = timeToMinutes(entrata);
        if (entrataMin === null) return null;

        const eccesso = calcolaEccessoPausaPranzo(uscitaPranzo, entrataPranzo, isVenerdi);
        const oreStandard = isVenerdi ? ORE_VENERDI : ORE_GIORNO_NORMALE;

        return entrataMin + oreStandard + eccesso;
    }

    function calcolaDeltaGiornaliero(uscitaEffettiva, orarioUscitaPrevisto) {
        const uscitaMin = timeToMinutes(uscitaEffettiva);
        if (uscitaMin === null || orarioUscitaPrevisto === null) return null;

        return uscitaMin - orarioUscitaPrevisto;
    }

    function calcolaDatiGiorno(giornoData, deltaCumulatoPrecedente = 0) {
        const { entrata, uscitaPranzo, entrataPranzo, uscitaEffettiva, isVenerdi } = giornoData;

        const eccesso = calcolaEccessoPausaPranzo(uscitaPranzo, entrataPranzo, isVenerdi);
        const orarioUscitaPrevisto = calcolaOrarioUscitaPrevisto(entrata, uscitaPranzo, entrataPranzo, isVenerdi);
        const deltaGiornaliero = calcolaDeltaGiornaliero(uscitaEffettiva, orarioUscitaPrevisto);
        const deltaCumulato = deltaGiornaliero !== null ? deltaCumulatoPrecedente + deltaGiornaliero : deltaCumulatoPrecedente;

        return {
            eccesso,
            orarioUscitaPrevisto,
            deltaGiornaliero,
            deltaCumulato
        };
    }

    function calcolaUscitaMinimaGiorno3(giorno3Data, deltaCumulatoGiorno2) {
        const orarioUscitaPrevisto = calcolaOrarioUscitaPrevisto(
            giorno3Data.entrata,
            giorno3Data.uscitaPranzo,
            giorno3Data.entrataPranzo,
            giorno3Data.isVenerdi
        );

        if (orarioUscitaPrevisto === null) return null;

        return orarioUscitaPrevisto - deltaCumulatoGiorno2;
    }

    function calcolaTotaleOreSettimanale(giorno1, giorno2, giorno3) {
        const dati1 = calcolaDatiGiorno(giorno1);
        const dati2 = calcolaDatiGiorno(giorno2, dati1.deltaCumulato);
        const dati3 = calcolaDatiGiorno(giorno3, dati2.deltaCumulato);

        if (dati3.deltaGiornaliero === null) return null;

        const oreContratto = 36 * 60;
        const totaleOre = oreContratto + dati3.deltaCumulato;

        return totaleOre;
    }

    return {
        timeToMinutes,
        minutesToTime,
        minutesToTimeShort,
        minutesToOrario,
        calcolaEccessoPausaPranzo,
        calcolaOrarioUscitaPrevisto,
        calcolaDeltaGiornaliero,
        calcolaDatiGiorno,
        calcolaUscitaMinimaGiorno3,
        calcolaTotaleOreSettimanale
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}
