# Guida al Deploy su Netlify

Questo documento fornisce una guida dettagliata per configurare e risolvere i problemi di deploy su Netlify per questa applicazione.

## Prerequisiti

1. **Account Netlify**
   - Assicurati di avere un account su [Netlify](https://www.netlify.com/)
   - Collega il tuo account GitHub a Netlify

2. **Configurazione delle API Key**
   - Assicurati di avere una chiave API valida per WeatherAPI.com
   - La chiave API deve essere configurata come variabile d'ambiente su Netlify

## Configurazione delle Variabili d'Ambiente su Netlify

1. **Accedi al tuo account Netlify**
   - Vai su [app.netlify.com](https://app.netlify.com/) e accedi al tuo account

2. **Seleziona il tuo sito**
   - Dalla dashboard, seleziona il sito che hai creato per questa applicazione

3. **Configura le Variabili d'Ambiente**
   - Vai su "Site settings" > "Environment variables"
   - Clicca su "Add a variable"
   - Inserisci `VITE_WEATHERAPI_KEY` come chiave
   - Inserisci la tua chiave API WeatherAPI come valore
   - Clicca su "Save"

4. **Riavvia il Deploy**
   - Vai su "Deploys" nel menu principale
   - Clicca su "Trigger deploy" > "Deploy site"

## Verifica della Configurazione

1. **Controlla i Log di Build**
   - Dopo aver avviato un nuovo deploy, vai su "Deploys" e seleziona l'ultimo deploy
   - Clicca su "Deploy details" per visualizzare i log di build
   - Verifica che non ci siano errori relativi alle variabili d'ambiente

2. **Testa l'Applicazione**
   - Una volta completato il deploy, visita l'URL del tuo sito Netlify
   - Verifica che le funzionalità meteo funzionino correttamente
   - Utilizza la funzione "Test API WeatherAPI" nella pagina Impostazioni per verificare che la chiave API sia configurata correttamente

## Risoluzione dei Problemi Comuni

### Errore: "API key not found" o "API key expired"

1. **Verifica la Variabile d'Ambiente**
   - Controlla che la variabile d'ambiente `VITE_WEATHERAPI_KEY` sia configurata correttamente su Netlify
   - Assicurati che la chiave API sia valida e attiva su WeatherAPI.com

2. **Verifica l'Accesso alla Variabile d'Ambiente nel Codice**
   - Assicurati che il codice acceda correttamente alla variabile d'ambiente con `import.meta.env.VITE_WEATHERAPI_KEY`

3. **Rigenera la Chiave API**
   - Se la chiave risulta scaduta, accedi al tuo account WeatherAPI.com e genera una nuova chiave
   - Aggiorna la variabile d'ambiente su Netlify con la nuova chiave
   - Avvia un nuovo deploy

### Errore: "Build failed"

- Verifica che l'applicazione si compili correttamente in locale
- Controlla che tutte le dipendenze siano installate correttamente
- Assicurati che il file `netlify.toml` sia configurato correttamente

## Note Importanti

- Le variabili d'ambiente sono gestite tramite il pannello di controllo di Netlify e non devono essere committate nel repository
- Il file `.env` è incluso nel `.gitignore` e non viene committato nel repository
- Il file `.env.production` può essere utilizzato per configurare le variabili d'ambiente per l'ambiente di produzione locale, ma non viene utilizzato durante il deploy su Netlify
- Netlify utilizza le variabili d'ambiente configurate nel pannello di controllo durante il processo di build e runtime

## Riferimenti Utili

- [Documentazione Netlify sulle Variabili d'Ambiente](https://docs.netlify.com/configure-builds/environment-variables/)
- [Documentazione Vite sulle Variabili d'Ambiente](https://vitejs.dev/guide/env-and-mode.html)
- [Documentazione WeatherAPI](https://www.weatherapi.com/docs/)