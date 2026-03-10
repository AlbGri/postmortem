/**
 * Modulo di autenticazione
 * Gestisce login, registrazione, sessione e profilo utente
 *
 * CONCETTO: email sintetiche
 * Supabase Auth richiede un'email per registrarsi/accedere.
 * Noi generiamo automaticamente alias@orari-ufficio.app
 * così l'utente digita solo alias + password.
 *
 * CONCETTO: profilo + approvazione
 * Alla registrazione, si crea:
 * 1. Un account in auth.users (gestito da Supabase)
 * 2. Una riga in profiles (gestita da noi) con approved=false
 * L'admin approva manualmente dalla dashboard Supabase.
 */
const Auth = (() => {
    let _supabase = null;

    function init(supabaseClient) {
        _supabase = supabaseClient;
    }

    /**
     * Converte un alias nel formato email sintetica
     * "Pippo" -> "pippo@orari-ufficio.app"
     */
    function _aliasToEmail(alias) {
        return alias.toLowerCase().trim() + '@' + SupabaseConfig.EMAIL_DOMAIN;
    }

    /**
     * Registra un nuovo utente
     * 1. Crea account Supabase Auth con email sintetica
     * 2. Crea profilo nella tabella profiles con approved=false
     *
     * @param {string} alias - Nome visibile nell'app (unico)
     * @param {string} password - Minimo 6 caratteri
     * @param {string} nome - Nome proprio
     * @param {string} motivazione - Campo libero, opzionale
     * @returns {{ ok: boolean, errore?: string }}
     */
    async function registra(alias, password, nome, motivazione) {
        alias = alias.trim();
        nome = nome.trim();

        if (!alias || !password || !nome) {
            return { ok: false, errore: 'Alias, nome e password sono obbligatori.' };
        }

        if (alias.length < 2) {
            return { ok: false, errore: 'L\'alias deve avere almeno 2 caratteri.' };
        }

        if (password.length < 6) {
            return { ok: false, errore: 'La password deve avere almeno 6 caratteri.' };
        }

        // signUp() crea l'account in auth.users
        // Se l'email esiste già, restituisce errore
        const email = _aliasToEmail(alias);

        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes('already') || error.status === 422) {
                return { ok: false, errore: 'Questo alias è già in uso.' };
            }
            return { ok: false, errore: 'Errore registrazione: ' + error.message };
        }

        // data.user.id è l'UUID generato da Supabase Auth
        // Lo usiamo come chiave primaria in profiles
        const { error: profileError } = await _supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                alias: alias,
                nome: nome,
                motivazione: motivazione || null
            });

        if (profileError) {
            // Se il profilo fallisce (es. alias duplicato per UNIQUE constraint),
            // l'utente Auth esiste ma non ha profilo - situazione da gestire
            if (profileError.message.includes('unique') || profileError.message.includes('duplicate')) {
                return { ok: false, errore: 'Questo alias è già in uso.' };
            }
            return { ok: false, errore: 'Errore creazione profilo: ' + profileError.message };
        }

        return { ok: true };
    }

    /**
     * Login con alias + password
     * 1. Autentica con email sintetica
     * 2. Carica il profilo
     * 3. Controlla se è approvato
     *
     * @returns {{ ok: boolean, approvato?: boolean, profilo?: object, errore?: string }}
     */
    async function login(alias, password) {
        const email = _aliasToEmail(alias.trim());

        // signInWithPassword() verifica email+password
        // Se corretti, crea una sessione (token salvato in localStorage da Supabase)
        const { error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            return { ok: false, errore: 'Alias o password non validi.' };
        }

        const profilo = await getProfilo();
        if (!profilo) {
            return { ok: false, errore: 'Profilo non trovato. Contatta l\'amministratore.' };
        }

        return { ok: true, approvato: profilo.approved, profilo: profilo };
    }

    /**
     * Logout - cancella la sessione
     * Supabase rimuove il token da localStorage
     */
    async function logout() {
        await _supabase.auth.signOut();
    }

    /**
     * Controlla se c'è una sessione attiva
     * getSession() legge da localStorage (veloce, nessuna chiamata HTTP)
     * Ritorna null se non c'è sessione
     */
    async function getSessione() {
        const { data } = await _supabase.auth.getSession();
        return data.session;
    }

    /**
     * Carica il profilo dell'utente corrente dalla tabella profiles
     * Grazie alle RLS, la query restituisce solo il profilo dell'utente loggato
     * (la policy filtra automaticamente per id = auth.uid())
     */
    async function getProfilo() {
        const sessione = await getSessione();
        if (!sessione) return null;
        const { data, error } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', sessione.user.id)
            .single();

        if (error) return null;
        return data;
    }

    return { init, registra, login, logout, getSessione, getProfilo };
})();
