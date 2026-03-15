# Changelog

## [2.7.0] - 2026-03-15

- Rimosso campo nome dalla registrazione per maggiore privacy
- Modale Privacy accessibile dal menu hamburger
- Geofencing: la posizione di riferimento viene salvata dall'utente al momento dell'attivazione

---

## [2.6.2] - 2026-03-14

- Bottone "Salva App" nell'header per aggiungere la PWA alla Home del telefono
- Istruzioni contestuali per iOS e Android se il browser non supporta l'installazione nativa

---

## [2.6.1] - 2026-03-14

- Modali navigabili da tastiera e compatibili con screen reader
- Fix contrasto colori in calendario, messaggi, footer e carte Memory
- Fix allineamento icone nel menu hamburger

---

## [2.6.0] - 2026-03-14

- Gioco Memory 6x6 con classifica globale e record personale

---

## [2.5.0] - 2026-03-14

- Splash screen con dissolvenza automatica

---

## [2.4.0] - 2026-03-13

- Supporto offline: le operazioni fallite vengono salvate e ritentate automaticamente
- Sync al login: modale per risolvere differenze tra dati locali e cloud
- I giorni cancellati offline non ricompaiono dal cloud al login successivo
- Indicatore visuale nell'header quando ci sono operazioni in coda

---

## [2.3.0] - 2026-03-12

- Menu hamburger nell'header con tema e geofencing raggruppati
- Fix visibilità icone in dark mode

## [2.2.0] - 2026-03-10

- Messaggistica admin-utente con gestione conversazioni

## [2.1.1] - 2026-02-25

- Promemoria GPS: notifica entrata nel raggio dell'ufficio (08:00-10:00, giorni feriali)
- Avviso visivo se la permanenza è sotto il minimo giornaliero
- Fix cache e form non aggiornato su iOS

## [2.1.0] - 2026-02-21

- Login opzionale: backup cloud e sincronizzazione multi-dispositivo
- Registrazione con alias, approvazione manuale admin
- Modale per gestione conflitti tra dati locali e cloud al login
- Pulsante "Adesso" per inserimento rapido ora corrente
- Fix: weekend seleziona automaticamente il venerdì precedente

## [2.0.0] - 2026-02-20

- Navigazione per data con selettore, frecce e pulsante "Oggi"
- Calendario mensile collassabile con delta giornaliero colorato
- Riepiloghi settimanale e mensile con delta cumulato e totale ore
- Eliminazione dati con conferma per giorno, settimana e mese
- Export/Import CSV compatibile con Excel italiano
- Notifica promemoria uscita dopo 8h (6h il venerdì)
- Venerdì rilevato automaticamente dalla data
- Minimo settimanale calcolato dai giorni effettivamente compilati
- Migrazione automatica dal vecchio formato dati

## [1.0.0] - 2026-02-13

- Calcolo ore in tempo reale: delta giornaliero, cumulato, uscita prevista e minima
- Gestione pausa pranzo (30 min inclusi nei giorni normali, esclusa il venerdì)
- Funzionamento offline, installabile come PWA
- Tema chiaro/scuro con rispetto della preferenza di sistema
- Persistenza dati in locale
