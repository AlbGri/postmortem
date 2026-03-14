/**
 * Modulo gioco Memory
 * Griglia 6x6 (18 coppie emoji), timer, mosse, record personale, classifica top 10
 * Accessibile solo a utenti autenticati
 */
const Memory = (() => {
    const EMOJI = [
        '\u{1F9D9}', '\u{1F9DD}', '\u{1F9DB}', '\u{1F9DC}', '\u{1F9DA}', '\u{1F409}',
        '\u{1F984}', '\u{1F47B}', '\u{1F480}', '\u{1F3F0}', '\u2694\uFE0F', '\u{1F6E1}\uFE0F',
        '\u{1F52E}', '\u{1FA84}', '\u{1F451}', '\u{1F48E}', '\u{1F9DE}', '\u{1F344}'
    ];
    const GRID_SIZE = 36;
    const PAIRS = 18;

    let _supabase = null;
    let _carte = [];
    let _scoperte = [];
    let _abbinate = new Set();
    let _bloccato = false;
    let _mosse = 0;
    let _timerStart = null;
    let _timerInterval = null;
    let _tempoSecondi = 0;
    let _recordPersonale = null;

    function init(supabaseClient) {
        _supabase = supabaseClient;
    }

    function apri() {
        const modal = document.getElementById('modal-memory');
        ModalUtils.apri(modal, {
            focusEl: document.getElementById('memory-btn-gioca'),
            onClose: chiudi
        });
        _mostraSchermataInizio();
    }

    function chiudi() {
        _fermaTimer();
        const modal = document.getElementById('modal-memory');
        if (modal.classList.contains('hidden')) return;
        ModalUtils.chiudi(modal);
    }

    // === SCHERMATE ===

    function _mostraSchermataInizio() {
        document.getElementById('memory-gioco').classList.add('hidden');
        document.getElementById('memory-fine').classList.add('hidden');
        document.getElementById('memory-classifica').classList.add('hidden');
        document.getElementById('memory-inizio').classList.remove('hidden');
        _caricaClassifica('memory-classifica-inizio');
    }

    function _mostraSchermataGioco() {
        document.getElementById('memory-inizio').classList.add('hidden');
        document.getElementById('memory-fine').classList.add('hidden');
        document.getElementById('memory-classifica').classList.add('hidden');
        document.getElementById('memory-gioco').classList.remove('hidden');
    }

    function _mostraSchermataFine() {
        document.getElementById('memory-gioco').classList.add('hidden');
        document.getElementById('memory-fine').classList.remove('hidden');

        const minuti = Math.floor(_tempoSecondi / 60);
        const secondi = _tempoSecondi % 60;
        const tempoStr = String(minuti).padStart(2, '0') + ':' + String(secondi).padStart(2, '0');

        document.getElementById('memory-fine-tempo').textContent = tempoStr;
        document.getElementById('memory-fine-mosse').textContent = _mosse;

        const recordEl = document.getElementById('memory-fine-record');
        if (_recordPersonale && _recordPersonale.time_seconds <= _tempoSecondi) {
            const recMin = Math.floor(_recordPersonale.time_seconds / 60);
            const recSec = Math.round(_recordPersonale.time_seconds % 60);
            recordEl.textContent = 'Record personale: ' +
                String(recMin).padStart(2, '0') + ':' + String(recSec).padStart(2, '0') +
                ' (' + _recordPersonale.moves + ' mosse)';
        } else {
            recordEl.textContent = 'Nuovo record personale!';
        }

        _caricaClassifica('memory-classifica-fine');
    }

    function _mostraSchermataClassifica() {
        document.getElementById('memory-inizio').classList.add('hidden');
        document.getElementById('memory-gioco').classList.add('hidden');
        document.getElementById('memory-fine').classList.add('hidden');
        document.getElementById('memory-classifica').classList.remove('hidden');
        _caricaClassifica('memory-classifica-completa');
    }

    // === LOGICA GIOCO ===

    function _iniziaPartita() {
        _mosse = 0;
        _tempoSecondi = 0;
        _timerStart = null;
        _scoperte = [];
        _abbinate = new Set();
        _bloccato = false;

        document.getElementById('memory-mosse').textContent = '0';
        document.getElementById('memory-timer').textContent = '00:00';

        _carte = _generaCarte();
        _renderGriglia();
        _mostraSchermataGioco();
    }

    function _generaCarte() {
        const coppie = [];
        for (let i = 0; i < PAIRS; i++) {
            coppie.push(i, i);
        }
        // Fisher-Yates shuffle
        for (let i = coppie.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coppie[i], coppie[j]] = [coppie[j], coppie[i]];
        }
        return coppie;
    }

    function _renderGriglia() {
        const griglia = document.getElementById('memory-griglia');
        griglia.textContent = '';

        for (let i = 0; i < GRID_SIZE; i++) {
            const carta = document.createElement('button');
            carta.className = 'memory-carta';
            carta.dataset.indice = i;
            carta.setAttribute('aria-label', 'Carta ' + (i + 1));

            const fronte = document.createElement('span');
            fronte.className = 'memory-carta-fronte';
            fronte.textContent = EMOJI[_carte[i]];

            const retro = document.createElement('span');
            retro.className = 'memory-carta-retro';

            carta.appendChild(fronte);
            carta.appendChild(retro);
            carta.addEventListener('click', () => _onClickCarta(i));
            griglia.appendChild(carta);
        }
    }

    function _onClickCarta(indice) {
        if (_bloccato) return;
        if (_abbinate.has(indice)) return;
        if (_scoperte.includes(indice)) return;

        // Avvia timer al primo click
        if (!_timerStart) {
            _timerStart = Date.now();
            _timerInterval = setInterval(_aggiornaTimer, 1000);
        }

        _scoperte.push(indice);
        _scopriCarta(indice);

        if (_scoperte.length === 2) {
            _mosse++;
            document.getElementById('memory-mosse').textContent = _mosse;

            const [primo, secondo] = _scoperte;
            if (_carte[primo] === _carte[secondo]) {
                _abbinate.add(primo);
                _abbinate.add(secondo);
                _scoperte = [];

                if (_abbinate.size === GRID_SIZE) {
                    _fermaTimer();
                    setTimeout(() => _finePartita(), 500);
                }
            } else {
                _bloccato = true;
                setTimeout(() => {
                    _copriCarta(primo);
                    _copriCarta(secondo);
                    _scoperte = [];
                    _bloccato = false;
                }, 800);
            }
        }
    }

    function _scopriCarta(indice) {
        const carte = document.querySelectorAll('.memory-carta');
        carte[indice].classList.add('memory-carta-scoperta');
    }

    function _copriCarta(indice) {
        const carte = document.querySelectorAll('.memory-carta');
        carte[indice].classList.remove('memory-carta-scoperta');
    }

    // === TIMER ===

    function _aggiornaTimer() {
        _tempoSecondi = Math.floor((Date.now() - _timerStart) / 1000);
        const min = Math.floor(_tempoSecondi / 60);
        const sec = _tempoSecondi % 60;
        document.getElementById('memory-timer').textContent =
            String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function _fermaTimer() {
        if (_timerInterval) {
            clearInterval(_timerInterval);
            _timerInterval = null;
        }
        // Calcola tempo finale preciso
        if (_timerStart) {
            _tempoSecondi = Math.floor((Date.now() - _timerStart) / 1000);
        }
    }

    // === FINE PARTITA E SALVATAGGIO ===

    async function _finePartita() {
        await _salvaScore();
        await _caricaRecordPersonale();
        _mostraSchermataFine();
    }

    async function _salvaScore() {
        if (!_supabase) return;
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) return;

            await _supabase.from('memory_scores').insert({
                user_id: session.user.id,
                time_seconds: _tempoSecondi,
                moves: _mosse
            });
        } catch (e) {
            console.error('Errore salvataggio score memory:', e);
        }
    }

    async function _caricaRecordPersonale() {
        if (!_supabase) return;
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            if (!session) return;

            const { data } = await _supabase
                .from('memory_scores')
                .select('time_seconds, moves')
                .eq('user_id', session.user.id)
                .order('time_seconds', { ascending: true })
                .limit(1);

            _recordPersonale = data && data.length > 0 ? data[0] : null;
        } catch (e) {
            console.error('Errore caricamento record memory:', e);
        }
    }

    // === CLASSIFICA ===

    async function _caricaClassifica(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.textContent = 'Caricamento...';

        if (!_supabase) {
            container.textContent = 'Classifica non disponibile.';
            return;
        }

        try {
            // Top 10 migliori tempi singoli + conteggio partite per giocatore
            const { data, error } = await _supabase.rpc('memory_classifica');

            if (error || !data || data.length === 0) {
                container.textContent = data && data.length === 0
                    ? 'Nessuna partita ancora.'
                    : 'Errore caricamento classifica.';
                return;
            }

            container.textContent = '';
            const tabella = document.createElement('table');
            tabella.className = 'memory-classifica-tabella';

            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th>#</th><th>Giocatore</th><th>Tempo</th><th>Mosse</th><th>Partite</th></tr>';
            tabella.appendChild(thead);

            const tbody = document.createElement('tbody');
            data.forEach((riga, i) => {
                const tr = document.createElement('tr');
                const min = Math.floor(riga.best_time / 60);
                const sec = Math.round(riga.best_time % 60);
                const tempoStr = String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
                tr.innerHTML = '<td>' + (i + 1) + '</td>' +
                    '<td>' + _escapeHtml(riga.alias) + '</td>' +
                    '<td>' + tempoStr + '</td>' +
                    '<td>' + riga.best_moves + '</td>' +
                    '<td>' + riga.total_games + '</td>';
                tbody.appendChild(tr);
            });
            tabella.appendChild(tbody);
            container.appendChild(tabella);
        } catch (e) {
            console.error('Errore classifica memory:', e);
            container.textContent = 'Errore caricamento classifica.';
        }
    }

    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // === EVENTI ===

    function agganciaEventi() {
        document.getElementById('memory-btn-gioca').addEventListener('click', _iniziaPartita);
        document.getElementById('memory-btn-classifica').addEventListener('click', _mostraSchermataClassifica);
        document.getElementById('memory-btn-rigioca').addEventListener('click', _iniziaPartita);
        document.getElementById('memory-btn-fine-classifica').addEventListener('click', _mostraSchermataClassifica);
        document.getElementById('memory-btn-torna').addEventListener('click', _mostraSchermataInizio);
        document.getElementById('memory-btn-chiudi').addEventListener('click', chiudi);

        // Backdrop click disabilitato: chiusura solo tramite pulsante X
    }

    return { init, apri, chiudi, agganciaEventi };
})();
