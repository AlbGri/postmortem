# Changelog

## [2.5.0] - 2026-03-14

- Rebranding: "Orari Ufficio" rinominato in "Postmortem" (manifest, title, header, footer, notifiche)
- Splash screen con icona e titolo su sfondo giallo, dissolvenza automatica dopo 1.5s
- Font Montserrat per il titolo: "Post" bold + "mortem" regular
- Disclaimer nel footer: app non ufficiale
- Sottotitolo "Gestione orari settimanali" sempre visibile (anche dopo login)
- Service worker: aggiunti file mancanti alla cache (splash, sync-queue, font, icone)

---

## [2.4.0] - 2026-03-13

- Coda operazioni offline: le scritture fallite vengono salvate e ritentate automaticamente
- Sync login con confronto campo per campo: modale dettagliata per risolvere differenze tra dati locali e cloud
- Protezione cancellazioni offline: i giorni cancellati senza rete non tornano dal cloud al login successivo
- Indicatore visuale nell'header quando ci sono operazioni in attesa di sincronizzazione

---

## [2.3.0] - 2026-03-12

- Menu hamburger nell'header: theme toggle e geofencing toggle raggruppati in un dropdown
- Icona messaggio ridisegnata in CSS puro per visibilita' in dark mode
- Fix: emoji icone con variation selector per rendering monocromatico cross-platform

## [2.2.0] - 2026-03-10

- Messaggistica admin-utente con gestione conversazioni
- Integrazione GitHub Pages con protezioni branch
- Fix: filtro profilo per user ID per supportare policy admin

## [2.1.1] - 2026-02-25

- Promemoria geofencing GPS: notifica entrata se nel raggio dell'ufficio tra le 08:00 e le 10:00 nei giorni feriali
- Avviso visivo se la permanenza è sotto il minimo giornaliero
- Nota trasparenza email sintetica nella form di registrazione
- Fix: problemi cache e form non aggiornato su iOS

## [2.1.0] - 2026-02-21

- Login opzionale con Supabase: backup cloud e sincronizzazione multi-dispositivo
- Registrazione con alias (nessuna email richiesta), approvazione manuale admin
- Sincronizzazione al login con modale per gestione conflitti tra dati locali e cloud
- Pulsante "Adesso" per inserimento rapido ora corrente
- Fix: se oggi è sabato o domenica, seleziona automaticamente il venerdì precedente

## [2.0.0] - 2026-02-20

- Navigazione per data con selettore, frecce e pulsante "Oggi"
- Calendario mensile collassabile con delta giornaliero colorato per ogni cella
- Riepiloghi settimanale e mensile con delta cumulato e totale ore
- Eliminazione dati con conferma per giorno, settimana e mese
- Export/Import CSV (separatore `;`, UTF-8 BOM per Excel italiano)
- Notifica promemoria uscita dopo 8h (6h il venerdì) dall'orario di entrata
- Venerdì rilevato automaticamente dalla data (rimosso checkbox manuale)
- Minimo settimanale calcolato dai giorni effettivamente compilati (non piu' valore fisso)
- Migrazione automatica dal vecchio formato dati

## [1.0.0] - (tag: v1.0-static)

- App statica PWA con 3 giorni fissi settimanali
- Calcolo in tempo reale: delta giornaliero, delta cumulato, uscita prevista, uscita minima terzo giorno
- Gestione pausa pranzo con calcolo eccesso (30 minuti inclusi nei giorni normali, nessun bonus il venerdì)
- Persistenza dati LocalStorage
- Funzionamento offline tramite Service Worker
- Tema chiaro/scuro con rispetto della preferenza di sistema
- Accessibilità WCAG 2.1 AA
- Installabile come PWA
