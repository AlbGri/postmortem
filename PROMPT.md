# PROMPT - Orari Ufficio PWA

Documento di specifica per lo sviluppo. Da usare insieme a `C:\Alberto\Coding\REGOLE_AI_GITHUB.md` per le regole generali.

---

## Obiettivo

PWA statica per tracciare gli orari di ingresso/uscita nei 3 giorni settimanali di ufficio, calcolare i delta giornalieri e cumulati, e determinare automaticamente l'orario di uscita minimo del terzo giorno per rispettare il vincolo settimanale.

## Contesto lavorativo

- Settimana: 5 giorni lavorativi (3 ufficio + 2 smart working)
- Contratto settimanale: 36 ore (4 giorni x 7h30m + venerdi' 6h)
- I 2 giorni di smart working hanno orario fisso, non vengono tracciati
- L'app traccia solo i 3 giorni di ufficio
- Vincolo: le ore dei 3 giorni di ufficio devono raggiungere un minimo settimanale

## Regole di calcolo

### Ore minime settimanali in ufficio

| Scenario | Calcolo | Minimo |
|---|---|---|
| Terzo giorno NON e' venerdi' | 8h x 3 | 24h |
| Terzo giorno E' venerdi' | 8h x 2 + 6h | 22h |

Nota: le "8 ore" sono di permanenza in ufficio (7h30m lavoro + 30min pausa pranzo inclusa).

### Giorno normale (non venerdi')

- Permanenza standard: **8 ore**
- Pausa pranzo: **30 minuti inclusi** nella permanenza
- Se l'utente fa pausa pranzo:
  - Durata pausa <= 30min: nessun eccesso
  - Durata pausa > 30min: eccesso = durata_pausa - 30min
- Orario di uscita previsto = Entrata + 8h + eccesso_pausa
- La pausa pranzo e' opzionale da inserire (se non inserita, i 30min sono comunque conteggiati)

### Venerdi'

- Permanenza standard: **6 ore**
- Pausa pranzo: **non inclusa** (0 minuti gratis)
- Se l'utente fa pausa pranzo:
  - Eccesso = tutta la durata della pausa
- Orario di uscita previsto = Entrata + 6h + eccesso_pausa

### Eccesso pausa pranzo (formula)

```
se (uscita_pranzo vuota O entrata_pranzo vuota O differenza negativa):
    eccesso = 0
altrimenti se (flag_venerdi attivo):
    eccesso = entrata_pranzo - uscita_pranzo    // tutta la pausa e' eccesso
altrimenti:
    eccesso = max(0, (entrata_pranzo - uscita_pranzo) - 30min)
```

### Delta e cumulato

- **Delta giornaliero** = Uscita effettiva - Orario uscita previsto
  - Positivo: l'utente ha lavorato di piu'
  - Negativo: l'utente ha lavorato di meno
- **Delta cumulato** = somma progressiva dei delta giornalieri

### Terzo giorno (logica speciale)

- L'**orario di uscita minimo** del terzo giorno e' calcolato automaticamente:
  - `uscita_minima_giorno3 = orario_uscita_standard_giorno3 - delta_cumulato_giorno2`
  - Se i primi 2 giorni hai accumulato ore in piu', puoi uscire prima
  - Se hai accumulato ore in meno, devi restare di piu'
- L'utente puo' opzionalmente inserire l'**uscita effettiva** del terzo giorno
  - In tal caso il sistema calcola l'eccesso finale e il **totale ore settimanale**:
  - `totale_ore = 36h + eccesso_finale`
  - Se eccesso_finale < 0: mostrare "Problema" (non hai raggiunto il minimo)

## Input utente (per ogni giorno)

Campi editabili:

| Campo | Giorno 1 | Giorno 2 | Giorno 3 |
|---|---|---|---|
| Entrata | si | si | si |
| Flag venerdi' | no | no | si (opzionale) |
| Uscita pranzo | opzionale | opzionale | opzionale |
| Entrata pranzo | opzionale | opzionale | opzionale |
| Uscita effettiva | si | si | opzionale* |

*L'uscita effettiva del giorno 3 e' opzionale: se non inserita, il sistema mostra solo l'orario minimo di uscita. Se inserita, calcola il totale ore settimanale.

Campi calcolati automaticamente:

- Eccesso pausa pranzo
- Orario di uscita previsto
- Delta giornaliero
- Delta cumulato
- Uscita minima giorno 3
- Totale ore settimanale (se uscita effettiva giorno 3 presente)

## Tech stack

- **HTML/CSS/JS vanilla** - nessun framework, nessun build step
- **LocalStorage** per persistenza dati settimana corrente
- **Service Worker** per funzionamento offline e installabilita'
- **manifest.json** per PWA (installabile su dispositivi)
- Nessun backend, nessuna dipendenza esterna

## Struttura file

```
orari-ufficio/
  index.html          # pagina unica dell'app
  favicon.png         # favicon
  css/
    style.css         # stili
  js/
    app.js            # logica principale e UI
    calculator.js     # logica di calcolo (formule)
    storage.js        # gestione LocalStorage
    theme-switcher.js # gestione tema light/dark
  sw.js               # Service Worker (cache offline)
  manifest.json       # manifest PWA
  icons/
    icon-192.png      # icona PWA 192x192
    icon-512.png      # icona PWA 512x512
  .gitignore
  README.md
```

## UI

- Layout mobile-first, responsivo
- Una sola pagina con i 3 giorni visibili
- Per ogni giorno: campi input per orari, risultati calcolati in tempo reale
- Giorno 3: toggle/checkbox per flag venerdi'
- Sezione riepilogo in fondo: delta cumulato, uscita minima giorno 3, totale ore
- Pulsante "Reset settimana" per pulire tutti i campi
- Tema chiaro, semplice, leggibile

## Persistenza dati

- Salvare in LocalStorage ad ogni modifica di un campo
- Al caricamento pagina, ripristinare i dati salvati
- Chiave LocalStorage: `orari-ufficio-settimana`
- Formato: oggetto JSON con tutti i campi input dei 3 giorni

## Deploy

- **Repository sorgente**: GitHub `AlbGri/orari-ufficio` (da creare manualmente)
- **Hosting**: Codeberg Pages, integrato nel sito esistente [albgri.com](https://albgri.com)
- **URL finale**: `https://albgri.com/orari-ufficio`
- **Sito Codeberg (locale)**: `C:\Alberto\Sito\pages`
- **Procedura deploy**: copiare i file del progetto nella cartella `C:\Alberto\Sito\pages\orari-ufficio\`
  - Codeberg Pages serve automaticamente `index.html` per il path `/orari-ufficio/`
  - Non serve build step: i file vanno copiati cosi' come sono
- **Nota**: il sito usa branch strategy (`main` production, `dev` development) e CI Woodpecker
- **Nota**: il sito ha sezione "Apps" in homepage dove linkare l'app

## Note

- L'Excel di riferimento e' in cartella: `20240708_Calcolo_Ore_Orario_Flessibilita_Settimana_v005.xlsx`
- Il flag venerdi' e' sul giorno 3 perche' se il venerdi' e' in ufficio, e' sempre l'ultimo dei 3 giorni (i giorni si compilano in ordine cronologico)
- I calcoli devono aggiornarsi in tempo reale alla modifica di qualsiasi campo
- Gli orari usano formato HH:MM (24h)
