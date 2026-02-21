/**
 * Configurazione Supabase
 *
 * URL: l'indirizzo del tuo progetto Supabase (ogni progetto ha un URL unico)
 * KEY: la chiave pubblica (publishable) - sicura da mettere nel frontend
 *      perché le RLS proteggono i dati, non la chiave
 * EMAIL_DOMAIN: dominio fittizio per le email sintetiche
 *      (l'utente digita solo l'alias, noi generiamo alias@orari-ufficio.app)
 */
const SupabaseConfig = {
    URL: 'https://rhssnwcmlxcmlphvdezh.supabase.co',
    KEY: 'sb_publishable_f6WIwmsZZvkbDciMzNqnlQ_nuNzAGXF',
    EMAIL_DOMAIN: 'orari-ufficio.app'
};
