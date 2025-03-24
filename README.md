# Funghi Tracker Logger

Un'applicazione web per il tracciamento e la registrazione delle attività di ricerca funghi e tartufi, con funzionalità meteo integrate.

## Funzionalità

- 🗺️ Tracciamento GPS dei percorsi
- 🌤️ Previsioni meteo in tempo reale
- 🌙 Fasi lunari
- 📍 Punti di interesse
- 📝 Registrazione ritrovamenti
- 📊 Storico delle tracce
- 🔔 Notifiche

## Requisiti

- Node.js (versione 16 o superiore)
- npm
- Chiave API OpenWeather

## Installazione

1. Clona il repository:
```bash
git clone [url-repository]
cd [nome-directory]
```

2. Installa le dipendenze:
```bash
npm install
```

3. Crea un file `.env` nella root del progetto e aggiungi la tua chiave API OpenWeather:
```
VITE_OPENWEATHER_API_KEY=la_tua_chiave_api
```

4. Avvia l'applicazione in modalità sviluppo:
```bash
npm run dev
```

## Build

Per creare una build di produzione:
```bash
npm run build
```

## Tecnologie Utilizzate

- React
- TypeScript
- Vite
- Tailwind CSS
- OpenWeather API

## Sicurezza

- Le chiavi API sono gestite tramite variabili d'ambiente
- Il file `.env` è incluso nel `.gitignore`
- I dati sensibili non vengono esposti nel codice sorgente

## Licenza

Questo progetto è distribuito con licenza MIT.