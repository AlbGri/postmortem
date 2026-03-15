# Fugit

PWA per la gestione degli orari di ingresso e uscita nei giorni di ufficio.

## Descrizione

Applicazione web progressiva (PWA) per tracciare gli orari di lavoro nei giorni settimanali di ufficio. Navigazione per data tramite calendario mensile interattivo, form giorno singolo con calcoli in tempo reale, riepiloghi settimanale e mensile.

Calcola automaticamente:

- Eccessi pausa pranzo rispetto ai 30 minuti standard
- Orari di uscita previsti (compensati con il delta cumulato dei giorni precedenti)
- Eccesso/Difetto giornaliero e cumulato
- Totale ore settimanale e mensile

## Regole di calcolo

### Giorno normale

- Permanenza standard: 8 ore (pausa pranzo di 30 minuti inclusa)
- Eccesso pausa: tempo oltre i 30 minuti

### Venerdì

- Permanenza standard: 6 ore
- Pausa pranzo: non inclusa (tutto il tempo conta come eccesso)

### Minimo settimanale

Calcolato dinamicamente dai giorni effettivamente compilati:
- Per ogni giorno non-venerdì: 8h
- Per ogni venerdì: 6h

## Funzionalità

- **Calendario mensile** collassabile con delta giornaliero colorato per ogni cella
- **Navigazione tra mesi** con frecce e pulsante "Oggi"
- **Auto-detect venerdì** dalla data (nessun checkbox manuale)
- **Riepilogo settimanale** con lista giorni, delta cumulato e totale ore
- **Riepilogo mensile** con delta cumulato e totale ore del mese
- **Eliminazione dati** con conferma per giorno, settimana e mese
- **Export/Import CSV** per backup e condivisione dati (separatore `;` per Excel italiano)
- **Notifica promemoria uscita** dopo 8h (6h venerdì) dall'orario di entrata (richiede HTTPS)
- **Promemoria geofencing** check GPS ogni 10 minuti tra le 08-10 nei giorni feriali, notifica se nel raggio dell'ufficio (richiede app/tab aperta)
- **Login opzionale** con Supabase per backup cloud e sincronizzazione multi-dispositivo
- **Registrazione con approvazione** manuale da parte dell'admin (no email richiesta)
- **Coda operazioni offline** con sync automatica al ritorno della connessione
- **Messaggistica** admin-utente con gestione conversazioni
- **Gioco Memory** 6x6 con classifica globale e record personale (richiede login)
- **Menu hamburger** con tema, geofencing e sezione Novità
- **Splash screen** con dissolvenza automatica
- Inserimento rapido dell'ora attuale (pulsante "Adesso")
- Pausa pranzo collassabile
- Funzionamento offline tramite Service Worker
- Persistenza dati locale (LocalStorage) + cloud opzionale (Supabase)
- Installabile come app (PWA) con prompt di installazione
- Tema chiaro/scuro con toggle manuale e rispetto preferenza di sistema
- Layout responsive mobile-first
- Accessibilità WCAG 2.1 AA (focus visibili, contrasti verificati, aria-live, prefers-reduced-motion)
- Meta tag di sicurezza e privacy: blocco indicizzazione, blocco crawler AI, referrer policy restrittiva, Content Security Policy (CSP)

## Struttura del progetto

```
fugit/
├── index.html
├── favicon.png
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   ├── calendar.js
│   ├── csv.js
│   ├── geofencing.js
│   ├── notifications.js
│   ├── storage.js
│   ├── theme-switcher.js
│   ├── auth.js
│   ├── api.js
│   ├── messaging.js
│   ├── memory.js
│   ├── modal-utils.js
│   ├── changelog.js
│   ├── splash.js
│   ├── sync-queue.js
│   ├── source-protection-silent.js
│   ├── supabase-config.js
│   └── supabase.min.js
├── sw.js
├── manifest.json
├── LICENSE
├── CHANGELOG.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Utilizzo

1. Aprire l'app nel browser
2. Selezionare un giorno dal calendario mensile (click per espandere)
3. Inserire gli orari di entrata e uscita
4. Opzionalmente inserire la pausa pranzo (click per espandere)
5. I calcoli si aggiornano automaticamente
6. I riepiloghi settimanale e mensile mostrano i totali in basso

I dati vengono salvati automaticamente nel browser (LocalStorage).
Per sincronizzare i dati tra dispositivi, cliccare "Accedi" e creare un account.

## Deploy

**Live**: [albgri.github.io/fugit](https://albgri.github.io/fugit/)

L'app è composta solo da file statici. Può essere servita da qualsiasi web server (GitHub Pages, Codeberg Pages, Netlify, ecc.) oppure aperta direttamente dal file system.

Per il backend cloud è necessario un progetto Supabase con le tabelle `profiles`, `daily_entries` e `memory_scores`.

## Versioni

Vedi [CHANGELOG.md](CHANGELOG.md) per la lista completa delle versioni e delle modifiche.

Tag git di riferimento:
- **v1.0-static**: app statica pre-redesign
- **v2.0-local**: ultima versione solo localStorage, senza Supabase

## Tech Stack

- HTML5
- CSS3
- JavaScript ES6+ (vanilla)
- Service Worker API
- LocalStorage API
- Notification API
- Geolocation API
- Web App Manifest
- Supabase (Auth + PostgreSQL + RLS)

## Licenza

[CC BY-NC-SA 4.0](LICENSE)

## Autore

Alberto G. ([AlbGri](https://github.com/AlbGri))
