# Orari Ufficio

PWA per la gestione degli orari di ingresso e uscita nei giorni di ufficio.

## Descrizione

Applicazione web progressiva (PWA) per tracciare gli orari di lavoro nei 3 giorni settimanali di ufficio. Calcola automaticamente:

- Eccessi pausa pranzo rispetto ai 30 minuti standard
- Orari di uscita previsti per ogni giorno
- Uscita a pareggio nel giorno 2 (compensa il delta del giorno 1)
- Uscita prevista corretta nel giorno 3 (tiene conto dei delta accumulati)
- Eccesso/Difetto giornaliero e cumulato
- Totale ore settimanale

## Regole di calcolo

### Ore minime settimanali

- **24 ore** se il terzo giorno NON e' venerdi (8h x 3)
- **22 ore** se il terzo giorno e' venerdi (8h x 2 + 6h)

### Giorno normale

- Permanenza standard: 8 ore (pausa pranzo di 30 minuti inclusa)
- Eccesso pausa: tempo oltre i 30 minuti

### Venerdi

- Permanenza standard: 6 ore
- Pausa pranzo: non inclusa (tutto il tempo conta come eccesso)

## Funzionalita

- Inserimento rapido dell'ora attuale (click sull'orologio)
- Pausa pranzo collassabile
- Reset per singolo giorno o per tutta la settimana
- Uscita a pareggio (giorno 2): orario di uscita per compensare il giorno precedente
- Uscita prevista corretta (giorno 3): tiene conto dei delta dei giorni 1 e 2
- Funzionamento offline tramite Service Worker
- Persistenza dati locale (LocalStorage)
- Installabile come app (PWA) con prompt di installazione
- Tema chiaro/scuro con toggle manuale e rispetto preferenza di sistema
- Layout responsive mobile-first
- Accessibilita' WCAG 2.1 AA (focus visibili, contrasti verificati, aria-live, prefers-reduced-motion)
- Nessuna dipendenza esterna
- Meta tag di sicurezza e privacy: blocco indicizzazione motori di ricerca, blocco crawler AI (GPTBot, Google-Extended, CCBot, anthropic-ai, Claude-Web, PerplexityBot, Bytespider), referrer policy restrittiva, Content Security Policy (CSP)

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
2. Inserire gli orari di entrata e uscita per ciascun giorno
3. Opzionalmente inserire la pausa pranzo (click per espandere)
4. Per il terzo giorno, spuntare "Venerdi" se applicabile
5. I calcoli si aggiornano automaticamente

I dati vengono salvati automaticamente nel browser e persistono tra le sessioni.

## Deploy

L'app e' composta solo da file statici. Puo' essere servita da qualsiasi web server (GitHub Pages, Codeberg Pages, Netlify, ecc.) oppure aperta direttamente dal file system.

## Tech Stack

- HTML5
- CSS3
- JavaScript ES6+ (vanilla)
- Service Worker API
- LocalStorage API
- Web App Manifest

## Supportami

Se trovi utile questo progetto, offrimi un caffe:

- [Revolut](https://revolut.me/albert9u1r)

## Licenza

[MIT](LICENSE)

## Autore

Alberto G. ([AlbGri](https://github.com/AlbGri))
