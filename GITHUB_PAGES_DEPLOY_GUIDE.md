 è dispo# Guida al Deploy su GitHub Pages

Questo documento fornisce una guida dettagliata per risolvere i problemi di deploy su GitHub Pages per questa applicazione.

## Prerequisiti

1. **Configurazione delle API Key**
   - Assicurati di avere una chiave API valida per WeatherAPI.com
   - La chiave API deve essere configurata come segreto di GitHub

## Configurazione dei Segreti di GitHub

1. **Accedi al repository su GitHub**
   - Vai alla pagina principale del repository su GitHub

2. **Vai alle impostazioni del repository**
   - Clicca su "Settings" nella barra di navigazione in alto

3. **Configura i Segreti**
   - Nel menu laterale, clicca su "Secrets and variables" e poi su "Actions"
   - Clicca su "New repository secret"
   - Inserisci `VITE_WEATHERAPI_KEY` come nome del segreto
   - Inserisci la tua chiave API WeatherAPI come valore del segreto
   - Clicca su "Add secret"

## Verifica del Workflow

1. **Controlla il file di workflow**
   - Assicurati che il file `.github/workflows/deploy.yml` contenga la configurazione corretta per utilizzare il segreto:
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_WEATHERAPI_KEY: ${{ secrets.VITE_WEATHERAPI_KEY }}
   ```

2. **Esegui manualmente il workflow**
   - Vai alla sezione "Actions" del repository
   - Trova il workflow "Deploy to GitHub Pages"
   - Clicca su "Run workflow" e seleziona il branch "main"
   - Clicca su "Run workflow" per avviare manualmente il processo di deploy

3. **Monitora il processo di deploy**
   - Nella sezione "Actions", monitora lo stato del workflow
   - Verifica che non ci siano errori durante il processo di build e deploy

## Risoluzione dei Problemi Comuni

### Errore: "API key not found"

- Verifica che il segreto `VITE_WEATHERAPI_KEY` sia configurato correttamente nelle impostazioni del repository
- Assicurati che il file di workflow utilizzi correttamente il segreto

### Errore: "Build failed"

- Verifica che l'applicazione si compili correttamente in locale
- Controlla che tutte le dipendenze siano installate correttamente
- Assicurati che il file `vite.config.ts` contenga `base: './'`

### Errore: "Deploy failed"

- Verifica che il repository sia configurato per utilizzare GitHub Pages nelle impostazioni
- Controlla che il branch `main` sia selezionato come source per GitHub Pages
- Assicurati che il workflow abbia i permessi necessari per effettuare il deploy

## Note Importanti

- Le variabili d'ambiente sono gestite tramite i segreti di GitHub Actions e non devono essere committate nel repository
- Il file `.env` è incluso nel `.gitignore` e non viene committato nel repository
- Il file `.env.production` può essere utilizzato per configurare le variabili d'ambiente per l'ambiente di produzione locale, ma non viene utilizzato durante il deploy su GitHub Pages