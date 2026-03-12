/**
 * Modulo Messaggistica
 * Chat 1-a-1 tra admin e utenti.
 * - Admin: vede lista utenti approvati, puo' iniziare conversazioni
 * - Utente: vede solo la chat con admin (se esiste), puo' solo rispondere
 * - Admin puo' chiudere/riaprire conversazioni
 * - Real-time via Supabase subscriptions
 */
const Messaging = (() => {
    let _supabase = null;
    let _profilo = null;
    let _isAdmin = false;
    let _subscription = null;
    let _conversazioneAperta = null; // { userId, alias, closed, conversationId }
    let _utentiApprovati = []; // solo per admin

    function init(supabaseClient, profilo) {
        _supabase = supabaseClient;
        _profilo = profilo;
        _isAdmin = profilo.role === 'admin';
        _agganciaEventi();
        _avviaRealtime();
        aggiornaContatore();
    }

    function destroy() {
        if (_subscription) {
            _supabase.removeChannel(_subscription);
            _subscription = null;
        }
        _conversazioneAperta = null;
        _profilo = null;
    }

    // ==========================================
    // REAL-TIME
    // ==========================================

    function _avviaRealtime() {
        _subscription = _supabase
            .channel('messages-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                console.log('Realtime msg event:', payload);
                const msg = payload.new;
                if (msg.receiver_id === _profilo.id) {
                    aggiornaContatore();
                    if (_conversazioneAperta && msg.sender_id === _conversazioneAperta.userId) {
                        _appendMessaggio(msg);
                        _segnaComeLetto(msg.id);
                    }
                }
                if (msg.sender_id === _profilo.id && _conversazioneAperta) {
                    _appendMessaggio(msg);
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations'
            }, (payload) => {
                // Aggiorna stato chiuso/aperto se la conversazione aperta e' stata modificata
                const conv = payload.new;
                if (_conversazioneAperta && conv) {
                    const isMyConv = (conv.admin_id === _profilo.id && conv.user_id === _conversazioneAperta.userId) ||
                                     (conv.user_id === _profilo.id && conv.admin_id === _conversazioneAperta.userId);
                    if (isMyConv) {
                        _conversazioneAperta.closed = conv.closed;
                        _conversazioneAperta.conversationId = conv.id;
                        _aggiornaStatoChat();
                    }
                }
            })
            .subscribe((status, err) => {
                console.log('Realtime subscription:', status, err || '');
            });
    }

    // ==========================================
    // CONTATORE NON LETTI
    // ==========================================

    async function aggiornaContatore() {
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
        modal.classList.remove('hidden');

        if (_isAdmin) {
            await _mostraListaUtenti();
        } else {
            await _mostraChatConAdmin();
        }
    }

    function _chiudiPannello() {
        document.getElementById('modal-messaggi').classList.add('hidden');
        _conversazioneAperta = null;
        aggiornaContatore();
    }

    // ==========================================
    // ADMIN: LISTA UTENTI
    // ==========================================

    async function _mostraListaUtenti() {
        const listaView = document.getElementById('msg-lista-view');
        const chatView = document.getElementById('msg-chat-view');
        listaView.classList.remove('hidden');
        chatView.classList.add('hidden');

        const container = document.getElementById('msg-lista-utenti');
        container.textContent = 'Caricamento...';

        const { data: utenti, error } = await _supabase
            .from('profiles')
            .select('id, alias, nome')
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
        _conversazioneAperta = { userId, alias, closed: false, conversationId: null };

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
            .single();

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
            btnChiudi.textContent = _conversazioneAperta.closed ? 'Riapri' : 'Chiudi';
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
                    closed: false
                }, { onConflict: 'admin_id,user_id' })
                .select('id')
                .single();

            if (convError) {
                console.error('Errore creazione conversazione:', convError);
            } else if (newConv) {
                _conversazioneAperta.conversationId = newConv.id;
            }
        }

        const { error } = await _supabase
            .from('messages')
            .insert({
                sender_id: _profilo.id,
                receiver_id: _conversazioneAperta.userId,
                content: testo
            });

        if (error) {
            console.error('Errore invio messaggio:', error);
            input.value = testo;
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
    // EVENTI
    // ==========================================

    function _agganciaEventi() {
        document.getElementById('msg-toggle').addEventListener('click', _apriPannello);
        document.getElementById('msg-chiudi').addEventListener('click', _chiudiPannello);
        document.getElementById('msg-backdrop').addEventListener('click', _chiudiPannello);
        document.getElementById('msg-btn-indietro').addEventListener('click', _mostraListaUtenti);
        document.getElementById('msg-btn-chiudi-conv').addEventListener('click', _toggleChiudiConversazione);

        document.getElementById('msg-btn-invia').addEventListener('click', _inviaMessaggio);
        document.getElementById('msg-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _inviaMessaggio();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-messaggi');
                if (!modal.classList.contains('hidden')) {
                    _chiudiPannello();
                }
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
