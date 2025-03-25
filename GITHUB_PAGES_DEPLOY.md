# Deploy su GitHub Pages

Questo documento descrive la configurazione per il deploy automatico dell'applicazione su GitHub Pages.

## Configurazione

Il deploy su GitHub Pages è configurato tramite GitHub Actions. Il workflow è definito nel file `.github/workflows/deploy.yml` e si attiva automaticamente quando viene effettuato un push sul branch `main` o manualmente tramite l'interfaccia di GitHub.

## Come funziona

1. Quando viene effettuato un push sul branch `main`, GitHub Actions avvia automaticamente il workflow di deploy.
2. Il workflow esegue i seguenti passaggi:
   - Checkout del codice sorgente
   - Setup di Node.js
   - Installazione delle dipendenze
   - Build dell'applicazione
   - Upload dell'artefatto di build
   - Deploy su GitHub Pages

## Configurazione Vite

Il file `vite.config.ts` è stato configurato con `base: './'` per garantire che l'applicazione funzioni correttamente quando viene distribuita su GitHub Pages.

## Risoluzione dei problemi

Se il deploy non viene completato correttamente, verificare:

1. Che il repository sia configurato per utilizzare GitHub Pages nelle impostazioni del repository.
2. Che il branch `main` sia selezionato come source per GitHub Pages.
3. Che il workflow di GitHub Actions abbia i permessi necessari per effettuare il deploy.
4. Che non ci siano errori durante la fase di build.

## Note importanti

- Le variabili d'ambiente (come le API key) non sono incluse nel deploy. Assicurarsi di configurare correttamente le variabili d'ambiente nell'ambiente di produzione.
- Il file `.env` è incluso nel `.gitignore` e non viene committato nel repository.