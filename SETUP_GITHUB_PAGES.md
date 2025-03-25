# Configurazione GitHub Pages

Questo documento fornisce istruzioni dettagliate su come configurare correttamente GitHub Pages per questo repository.

## Passi per configurare GitHub Pages

1. **Accedi al repository su GitHub**
   - Vai alla pagina principale del repository su GitHub

2. **Vai alle impostazioni del repository**
   - Clicca su "Settings" nella barra di navigazione in alto

3. **Configura GitHub Pages**
   - Scorri verso il basso fino alla sezione "GitHub Pages"
   - In "Source", seleziona "GitHub Actions" come fonte di deploy
   - Se richiesto, conferma la scelta

4. **Verifica la configurazione del workflow**
   - Vai alla sezione "Actions" del repository
   - Verifica che il workflow "Deploy to GitHub Pages" sia presente e attivo
   - Se non è presente, assicurati che il file `.github/workflows/deploy.yml` sia stato correttamente committato nel repository

5. **Esegui manualmente il workflow (opzionale)**
   - Nella sezione "Actions", trova il workflow "Deploy to GitHub Pages"
   - Clicca su "Run workflow" e seleziona il branch "main"
   - Clicca su "Run workflow" per avviare manualmente il processo di deploy

6. **Verifica lo stato del deploy**
   - Nella sezione "Actions", monitora lo stato del workflow
   - Una volta completato con successo, il sito sarà disponibile all'URL indicato nelle impostazioni di GitHub Pages

## Risoluzione dei problemi comuni

### Il workflow fallisce durante la build

- Verifica che tutte le dipendenze siano correttamente installate
- Controlla che il comando `npm run build` funzioni correttamente in locale
- Assicurati che il file `vite.config.ts` contenga `base: './'`

### Il sito viene deployato ma non funziona correttamente

- Verifica che i percorsi relativi siano corretti
- Controlla che le API key necessarie siano configurate correttamente
- Assicurati che il file `.env` sia configurato correttamente in locale e che le variabili d'ambiente siano gestite correttamente in produzione

### Il workflow non si avvia automaticamente

- Verifica che il branch specificato nel workflow sia corretto
- Controlla che i permessi del repository siano configurati correttamente
- Assicurati che il workflow sia abilitato nelle impostazioni del repository