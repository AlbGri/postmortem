# Orari Ufficio

PWA per la gestione degli orari di ingresso e uscita nei giorni di ufficio.

## Descrizione

Applicazione web progressiva (PWA) per tracciare gli orari di lavoro nei 3 giorni settimanali di ufficio. Calcola automaticamente:

- Eccessi pausa pranzo
- Orari di uscita previsti
- Delta giornalieri e cumulati
- Orario minimo di uscita per il terzo giorno
- Totale ore settimanale

## Regole di calcolo

### Ore minime settimanali

- **24 ore** se il terzo giorno NON è venerdì (8h x 3)
- **22 ore** se il terzo giorno è venerdì (8h x 2 + 6h)

### Giorno normale

- Permanenza standard: 8 ore
- Pausa pranzo: 30 minuti inclusi
- Eccesso pausa: tempo oltre i 30 minuti

### Venerdì

- Permanenza standard: 6 ore
- Pausa pranzo: non inclusa
- Eccesso pausa: tutta la durata della pausa

## Caratteristiche

- Funzionamento offline tramite Service Worker
- Persistenza dati locale (LocalStorage)
- Installabile come app (PWA)
- Layout responsive mobile-first
- Nessuna dipendenza esterna

## Struttura del progetto

```
orari-ufficio/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   └── storage.js
├── sw.js
├── manifest.json
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Utilizzo

1. Aprire `index.html` in un browser moderno
2. Inserire gli orari di entrata e uscita per ciascun giorno
3. Opzionalmente inserire pausa pranzo
4. Per il terzo giorno, spuntare "Venerdì" se applicabile
5. I calcoli si aggiornano automaticamente

I dati vengono salvati automaticamente nel browser e persistono tra le sessioni.

## Deploy

### Locale

Aprire `index.html` direttamente nel browser.

### Server web

Servire i file statici tramite qualsiasi web server (GitHub Pages, Codeberg Pages, Netlify, ecc.).

## Tech Stack

- HTML5
- CSS3
- JavaScript ES6+ (vanilla)
- Service Worker API
- LocalStorage API
- Web App Manifest

## Browser supportati

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Licenza

MIT

## Autore

Alberto G. (AlbGri)
