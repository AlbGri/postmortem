# Orari Ufficio

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

### Venerdi

- Permanenza standard: 6 ore
- Pausa pranzo: non inclusa (tutto il tempo conta come eccesso)

### Minimo settimanale

Calcolato dinamicamente dai giorni effettivamente compilati:
- Per ogni giorno non-venerdi: 8h
- Per ogni venerdi: 6h

## Funzionalita

- **Calendario mensile** collassabile con delta giornaliero colorato per ogni cella
- **Navigazione tra mesi** con frecce e pulsante "Oggi"
- **Auto-detect venerdi** dalla data (nessun checkbox manuale)
- **Riepilogo settimanale** con lista giorni, delta cumulato e totale ore
- **Riepilogo mensile** con delta cumulato e totale ore del mese
- **Eliminazione dati** con conferma per giorno, settimana e mese
- **Export/Import CSV** per backup e condivisione dati (separatore `;` per Excel italiano)
- **Notifica promemoria uscita** dopo 8h (6h venerdi) dall'orario di entrata (richiede HTTPS)
- Inserimento rapido dell'ora attuale (click sull'orologio)
- Pausa pranzo collassabile
- Funzionamento offline tramite Service Worker
- Persistenza dati locale (LocalStorage) per data ISO
- Installabile come app (PWA) con prompt di installazione
- Tema chiaro/scuro con toggle manuale e rispetto preferenza di sistema
- Layout responsive mobile-first
- Accessibilita' WCAG 2.1 AA (focus visibili, contrasti verificati, aria-live, prefers-reduced-motion)
- Nessuna dipendenza esterna
- Meta tag di sicurezza e privacy: blocco indicizzazione, blocco crawler AI, referrer policy restrittiva, Content Security Policy (CSP)

## Struttura del progetto

```
orari-ufficio/
├── index.html
├── favicon.png
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   ├── calendar.js
│   ├── csv.js
│   ├── notifications.js
│   ├── storage.js
│   └── theme-switcher.js
├── sw.js
├── manifest.json
├── LICENSE
├── PROMPT.md
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

I dati vengono salvati automaticamente nel browser e persistono tra le sessioni.

## Deploy

L'app e' composta solo da file statici. Puo' essere servita da qualsiasi web server (GitHub Pages, Codeberg Pages, Netlify, ecc.) oppure aperta direttamente dal file system.

## Tech Stack

- HTML5
- CSS3
- JavaScript ES6+ (vanilla)
- Service Worker API
- LocalStorage API
- Notification API
- Web App Manifest

## Supportami

Se trovi utile questo progetto, offrimi un caffe:

- [Revolut](https://revolut.me/albert9u1r)

## Licenza

[MIT](LICENSE)

## Autore

Alberto G. ([AlbGri](https://github.com/AlbGri))
