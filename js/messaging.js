/**
 * Modulo Messaggistica
 * Chat 1-a-1 tra admin e utenti.
 * - Admin: vede lista utenti approvati, puo' iniziare conversazioni
 * - Utente: vede solo la chat con admin (se esiste), puo' solo rispondere
 * - Admin puo' chiudere/riaprire conversazioni
 * - Polling per aggiornamenti (ogni 5s chat aperta, ogni 30s contatore)
 */
const Messaging = (() => {
    let _supabase = null;
    let _profilo = null;
    let _isAdmin = false;
    let _conversazioneAperta = null; // { userId, alias, closed, conversationId }
    let _utentiApprovati = []; // solo per admin
    let _pollChatTimer = null;
    let _pollContatoreTimer = null;

    function init(supabaseClient, profilo) {
        _supabase = supabaseClient;
        _profilo = profilo;
        _isAdmin = profilo.role === 'admin';
        _agganciaEventi();
        aggiornaContatore();
        _avviaPollingContatore();
    }

    function destroy() {
        _fermaPollingChat();
        _fermaPollingContatore();
        _conversazioneAperta = null;
        _profilo = null;
    }

    // ==========================================
    // POLLING
    // ==========================================

    function _avviaPollingContatore() {
        _fermaPollingContatore();
        _pollContatoreTimer = setInterval(aggiornaContatore, 30000);
    }

    function _fermaPollingContatore() {
        if (_pollContatoreTimer) {
            clearInterval(_pollContatoreTimer);
            _pollContatoreTimer = null;
        }
    }

    function _avviaPollingChat() {
        _fermaPollingChat();
        _pollChatTimer = setInterval(_pollNuoviMessaggi, 5000);
    }

    function _fermaPollingChat() {
        if (_pollChatTimer) {
            clearInterval(_pollChatTimer);
            _pollChatTimer = null;
        }
    }

    async function _pollNuoviMessaggi() {
        if (!_conversazioneAperta) return;

        const userId = _conversazioneAperta.userId;
        const container = document.getElementById('msg-chat-messaggi');
        const ultimoMsg = container.querySelector('[data-msg-id]:last-child');
        const ultimoId = ultimoMsg ? ultimoMsg.getAttribute('data-msg-id') : null;

        // Cerca messaggi piu' recenti dell'ultimo visualizzato
        let query = _supabase
            .from('messages')
            .select('*')
            .or(
                'and(sender_id.eq.' + _profilo.id + ',receiver_id.eq.' + userId + '),' +
                'and(sender_id.eq.' + userId + ',receiver_id.eq.' + _profilo.id + ')'
            )
            .order('created_at', { ascending: true });

        if (ultimoId) {
            // Prendi solo messaggi con created_at > ultimo messaggio visualizzato
            const ultimoEl = container.querySelector('[data-msg-id="' + ultimoId + '"]');
            if (ultimoEl) {
                const { data: ultimoData } = await _supabase
                    .from('messages')
                    .select('created_at')
                    .eq('id', ultimoId)
                    .single();

                if (ultimoData) {
                    query = query.gt('created_at', ultimoData.created_at);
                }
            }
        }

        const { data: nuovi, error } = await query;
        if (error || !nuovi || nuovi.length === 0) return;

        for (const msg of nuovi) {
            _appendMessaggio(msg);
            if (msg.receiver_id === _profilo.id && !msg.read) {
                _segnaComeLetto(msg.id);
            }
        }

        aggiornaContatore();
    }

    // ==========================================
    // CONTATORE NON LETTI
    // ==========================================

    async function aggiornaContatore() {
        if (!_supabase || !_profilo) return;

        const { count, error } = await _supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', _profilo.id)
            .eq('read', false);

        if (error) {
            console.error('Errore conteggio messaggi:', error);
            return;
        }

        const badge = document.getElementById('msg-badge');
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ==========================================
    // APERTURA PANNELLO
    // ==========================================

    async function _apriPannello() {
        const modal = document.getElementById('modal-messaggi');
        ModalUtils.apri(modal, { onClose: _chiudiPannello });

        if (_isAdmin) {
            await _mostraListaUtenti();
        } else {
            await _mostraChatConAdmin();
        }
    }

    function _chiudiPannello() {
        const modal = document.getElementById('modal-messaggi');
        if (modal.classList.contains('hidden')) return;
        ModalUtils.chiudi(modal);
        _fermaPollingChat();
        _conversazioneAperta = null;
        aggiornaContatore();
    }

    // ==========================================
    // ADMIN: LISTA UTENTI
    // ==========================================

    async function _mostraListaUtenti() {
        _fermaPollingChat();
        _conversazioneAperta = null;

        const listaView = document.getElementById('msg-lista-view');
        const chatView = document.getElementById('msg-chat-view');
        listaView.classList.remove('hidden');
        chatView.classList.add('hidden');

        const container = document.getElementById('msg-lista-utenti');
        container.textContent = 'Caricamento...';

        const { data: utenti, error } = await _supabase
            .from('profiles')
            .select('id, alias')
            .eq('approved', true)
            .neq('id', _profilo.id)
            .order('alias');

        if (error) {
            container.textContent = 'Errore caricamento utenti.';
            console.error('Errore lista utenti:', error);
            return;
        }

        _utentiApprovati = utenti || [];

        if (_utentiApprovati.length === 0) {
            container.textContent = 'Nessun utente approvato.';
            return;
        }

        const { data: nonLetti } = await _supabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', _profilo.id)
            .eq('read', false);

        const contaNonLetti = {};
        if (nonLetti) {
            for (const m of nonLetti) {
                contaNonLetti[m.sender_id] = (contaNonLetti[m.sender_id] || 0) + 1;
            }
        }

        container.textContent = '';
        for (const utente of _utentiApprovati) {
            const btn = document.createElement('button');
            btn.className = 'msg-utente-item';
            const count = contaNonLetti[utente.id] || 0;
            const badgeHtml = count > 0 ? '<span class="msg-utente-badge">' + count + '</span>' : '';
            btn.innerHTML = '<span class="msg-utente-nome">' + _escapeHtml(utente.alias) + '</span>' + badgeHtml;
            btn.addEventListener('click', () => _apriChat(utente.id, utente.alias));
            container.appendChild(btn);
        }

        // Mostra area broadcast per admin
        const broadcastArea = document.getElementById('msg-broadcast-area');
        if (broadcastArea) broadcastArea.classList.remove('hidden');

        // Carica utenti in attesa di approvazione
        await _mostraUtentiInAttesa();
    }

    // ==========================================
    // ADMIN: UTENTI IN ATTESA DI APPROVAZIONE
    // ==========================================

    async function _mostraUtentiInAttesa() {
        const area = document.getElementById('msg-attesa-area');
        const container = document.getElementById('msg-lista-attesa');

        const { data: inAttesa, error } = await _supabase
            .from('profiles')
            .select('id, alias, motivazione, created_at')
            .eq('approved', false)
            .order('created_at');

        if (error || !inAttesa || inAttesa.length === 0) {
            area.classList.add('hidden');
            return;
        }

        area.classList.remove('hidden');
        container.textContent = '';

        for (const utente of inAttesa) {
            const div = document.createElement('div');
            div.className = 'msg-utente-item msg-attesa-item';

            const info = document.createElement('div');
            info.className = 'msg-attesa-info';
            const data = new Date(utente.created_at).toLocaleDateString('it-IT');
            info.innerHTML = '<strong>' + _escapeHtml(utente.alias) + '</strong>' +
                '<br><small>' + data + (utente.motivazione ? ' - ' + _escapeHtml(utente.motivazione) : '') + '</small>';

            const azioni = document.createElement('div');
            azioni.className = 'msg-attesa-azioni';

            const btnApprova = document.createElement('button');
            btnApprova.className = 'msg-attesa-btn msg-attesa-approva';
            btnApprova.textContent = 'Approva';
            btnApprova.addEventListener('click', () => _gestisciApprovazione(utente, div));

            azioni.appendChild(btnApprova);
            div.appendChild(info);
            div.appendChild(azioni);
            container.appendChild(div);
        }
    }

    async function _gestisciApprovazione(utente, elemento) {
        const btn = elemento.querySelector('.msg-attesa-btn');
        btn.disabled = true;

        const { error } = await _supabase
            .from('profiles')
            .update({ approved: true })
            .eq('id', utente.id);

        if (error) {
            console.error('Errore approvazione:', error);
            btn.disabled = false;
            return;
        }

        elemento.remove();

        // Se non ci sono piu' utenti in attesa, nascondi la sezione
        const container = document.getElementById('msg-lista-attesa');
        if (container.children.length === 0) {
            document.getElementById('msg-attesa-area').classList.add('hidden');
        }

        // Aggiorna la lista utenti approvati
        await _mostraListaUtenti();
    }

    // ==========================================
    // UTENTE: CHAT CON ADMIN
    // ==========================================

    async function _mostraChatConAdmin() {
        const { data: messaggi } = await _supabase
            .from('messages')
            .select('sender_id, receiver_id')
            .or('sender_id.eq.' + _profilo.id + ',receiver_id.eq.' + _profilo.id)
            .limit(1);

        if (!messaggi || messaggi.length === 0) {
            const listaView = document.getElementById('msg-lista-view');
            const chatView = document.getElementById('msg-chat-view');
            listaView.classList.remove('hidden');
            chatView.classList.add('hidden');
            document.getElementById('msg-lista-utenti').textContent = 'Nessun messaggio.';
            return;
        }

        const msg = messaggi[0];
        const adminId = msg.sender_id === _profilo.id ? msg.receiver_id : msg.sender_id;

        const { data: adminProfile } = await _supabase
            .from('profiles')
            .select('alias')
            .eq('id', adminId)
            .single();

        const adminAlias = adminProfile ? adminProfile.alias : 'Admin';
        await _apriChat(adminId, adminAlias);
    }

    // ==========================================
    // CHAT
    // ==========================================

    async function _apriChat(userId, alias) {
        _conversazioneAperta = { userId, alias, closed: true, conversationId: null };

        const listaView = document.getElementById('msg-lista-view');
        const chatView = document.getElementById('msg-chat-view');
        listaView.classList.add('hidden');
        chatView.classList.remove('hidden');

        document.getElementById('msg-chat-titolo').textContent = alias;
        document.getElementById('msg-btn-indietro').classList.toggle('hidden', !_isAdmin);

        const container = document.getElementById('msg-chat-messaggi');
        container.textContent = 'Caricamento...';

        // Carica stato conversazione
        const adminId = _isAdmin ? _profilo.id : userId;
        const targetUserId = _isAdmin ? userId : _profilo.id;
        const { data: conv } = await _supabase
            .from('conversations')
            .select('id, closed')
            .eq('admin_id', adminId)
            .eq('user_id', targetUserId)
            .maybeSingle();

        if (conv) {
            _conversazioneAperta.closed = conv.closed;
            _conversazioneAperta.conversationId = conv.id;
        }

        _aggiornaStatoChat();

        // Carica messaggi
        const { data: messaggi, error } = await _supabase
            .from('messages')
            .select('*')
            .or(
                'and(sender_id.eq.' + _profilo.id + ',receiver_id.eq.' + userId + '),' +
                'and(sender_id.eq.' + userId + ',receiver_id.eq.' + _profilo.id + ')'
            )
            .order('created_at', { ascending: true });

        if (error) {
            container.textContent = 'Errore caricamento messaggi.';
            console.error('Errore chat:', error);
            return;
        }

        container.textContent = '';
        if (messaggi) {
            for (const msg of messaggi) {
                _appendMessaggio(msg);
            }
        }

        const nonLetti = (messaggi || []).filter(m => m.receiver_id === _profilo.id && !m.read);
        for (const m of nonLetti) {
            _segnaComeLetto(m.id);
        }

        _scrollChatInFondo();
        if (!_conversazioneAperta.closed || _isAdmin) {
            document.getElementById('msg-input').focus();
        }

        _avviaPollingChat();
    }

    /**
     * Aggiorna la UI della chat in base allo stato aperto/chiuso
     */
    function _aggiornaStatoChat() {
        const inputBar = document.getElementById('msg-input-bar');
        const closedBar = document.getElementById('msg-closed-bar');
        const btnChiudi = document.getElementById('msg-btn-chiudi-conv');

        if (_isAdmin) {
            // Admin vede sempre l'input bar + bottone chiudi/riapri
            inputBar.classList.remove('hidden');
            closedBar.classList.add('hidden');
            btnChiudi.classList.remove('hidden');
            btnChiudi.textContent = _conversazioneAperta.closed ? 'Abilita risposta' : 'Blocca risposta';
        } else {
            // Utente: se chiusa, nascondi input e mostra avviso
            btnChiudi.classList.add('hidden');
            if (_conversazioneAperta.closed) {
                inputBar.classList.add('hidden');
                closedBar.classList.remove('hidden');
            } else {
                inputBar.classList.remove('hidden');
                closedBar.classList.add('hidden');
            }
        }
    }

    function _appendMessaggio(msg) {
        const container = document.getElementById('msg-chat-messaggi');
        if (container.querySelector('[data-msg-id="' + msg.id + '"]')) return;

        const div = document.createElement('div');
        div.className = 'msg-bolla ' + (msg.sender_id === _profilo.id ? 'msg-mio' : 'msg-altro');
        div.setAttribute('data-msg-id', msg.id);

        const ora = new Date(msg.created_at).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });

        div.innerHTML = '<span class="msg-testo">' + _escapeHtml(msg.content) + '</span>' +
                         '<span class="msg-ora">' + ora + '</span>';
        container.appendChild(div);
        _scrollChatInFondo();
    }

    async function _inviaMessaggio() {
        const input = document.getElementById('msg-input');
        const testo = input.value.trim();
        if (!testo || !_conversazioneAperta) return;

        input.value = '';

        // Admin: crea il record conversazione se non esiste ancora
        if (_isAdmin && !_conversazioneAperta.conversationId) {
            const { data: newConv, error: convError } = await _supabase
                .from('conversations')
                .upsert({
                    admin_id: _profilo.id,
                    user_id: _conversazioneAperta.userId,
                    closed: true
                }, { onConflict: 'admin_id,user_id' })
                .select('id')
                .single();

            if (convError) {
                console.error('Errore creazione conversazione:', convError);
            } else if (newConv) {
                _conversazioneAperta.conversationId = newConv.id;
            }
        }

        const { data: msgInserito, error } = await _supabase
            .from('messages')
            .insert({
                sender_id: _profilo.id,
                receiver_id: _conversazioneAperta.userId,
                content: testo
            })
            .select()
            .single();

        if (error) {
            console.error('Errore invio messaggio:', error);
            input.value = testo;
            return;
        }

        // Mostra subito il messaggio inviato senza aspettare il polling
        if (msgInserito) {
            _appendMessaggio(msgInserito);
        }
    }

    /**
     * Admin: chiudi o riapri la conversazione
     */
    async function _toggleChiudiConversazione() {
        if (!_isAdmin || !_conversazioneAperta) return;

        const nuovoStato = !_conversazioneAperta.closed;

        if (_conversazioneAperta.conversationId) {
            const { error } = await _supabase
                .from('conversations')
                .update({ closed: nuovoStato })
                .eq('id', _conversazioneAperta.conversationId);

            if (error) {
                console.error('Errore aggiornamento conversazione:', error);
                return;
            }
        } else {
            // Crea il record se non esiste
            const { data: newConv, error } = await _supabase
                .from('conversations')
                .upsert({
                    admin_id: _profilo.id,
                    user_id: _conversazioneAperta.userId,
                    closed: nuovoStato
                }, { onConflict: 'admin_id,user_id' })
                .select('id')
                .single();

            if (error) {
                console.error('Errore creazione conversazione:', error);
                return;
            }
            _conversazioneAperta.conversationId = newConv.id;
        }

        _conversazioneAperta.closed = nuovoStato;
        _aggiornaStatoChat();
    }

    async function _segnaComeLetto(msgId) {
        await _supabase
            .from('messages')
            .update({ read: true })
            .eq('id', msgId);
    }

    function _scrollChatInFondo() {
        const container = document.getElementById('msg-chat-messaggi');
        container.scrollTop = container.scrollHeight;
    }

    // ==========================================
    // BROADCAST
    // ==========================================

    async function _inviaBroadcast() {
        const input = document.getElementById('msg-broadcast-input');
        const btn = document.getElementById('msg-btn-broadcast');
        const testo = input.value.trim();
        if (!testo || !_isAdmin) return;

        if (_utentiApprovati.length === 0) return;

        btn.disabled = true;
        btn.textContent = 'Invio in corso...';

        let errori = 0;
        for (const utente of _utentiApprovati) {
            // Crea conversazione chiusa solo se non esiste, non tocca quelle esistenti
            await _supabase
                .from('conversations')
                .upsert({
                    admin_id: _profilo.id,
                    user_id: utente.id,
                    closed: true
                }, { onConflict: 'admin_id,user_id', ignoreDuplicates: true });

            // Invia messaggio
            const { error } = await _supabase
                .from('messages')
                .insert({
                    sender_id: _profilo.id,
                    receiver_id: utente.id,
                    content: '[Tutti] ' + testo
                });

            if (error) {
                console.error('Errore broadcast a ' + utente.alias + ':', error);
                errori++;
            }
        }

        btn.disabled = false;
        btn.textContent = 'Invia a tutti';

        if (errori === 0) {
            input.value = '';
            btn.textContent = 'Inviato!';
            setTimeout(() => { btn.textContent = 'Invia a tutti'; }, 2000);
        } else {
            btn.textContent = 'Errore (' + errori + ' falliti)';
            setTimeout(() => { btn.textContent = 'Invia a tutti'; }, 3000);
        }
    }

    // ==========================================
    // EVENTI
    // ==========================================

    function _agganciaEventi() {
        document.getElementById('msg-toggle').addEventListener('click', _apriPannello);
        document.getElementById('msg-chiudi').addEventListener('click', _chiudiPannello);
        document.getElementById('msg-backdrop').addEventListener('click', _chiudiPannello);
        document.getElementById('msg-btn-indietro').addEventListener('click', _mostraListaUtenti);
        document.getElementById('msg-btn-chiudi-conv').addEventListener('click', _toggleChiudiConversazione);

        document.getElementById('msg-btn-invia').addEventListener('click', _inviaMessaggio);
        document.getElementById('msg-btn-broadcast').addEventListener('click', _inviaBroadcast);
        document.getElementById('msg-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _inviaMessaggio();
            }
        });
    }

    // ==========================================
    // UTILITY
    // ==========================================

    function _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { init, destroy, aggiornaContatore };
})();
