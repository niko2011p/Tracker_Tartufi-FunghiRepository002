# Risoluzione Problemi API WeatherAPI

## Errore 401 - Unauthorized

Se stai riscontrando l'errore "401 - Unauthorized" durante l'utilizzo del servizio meteo, segui questi passaggi per risolvere il problema:

### 1. Verifica la validità della chiave API

La chiave API potrebbe essere scaduta o non essere più valida. Per verificare la validità della chiave API, esegui lo script di validazione:

```bash
node src/utils/apiKeyValidator.js
```

### 2. Rinnova la chiave API

Se la chiave API non è più valida, segui questi passaggi per rinnovarla:

1. Accedi al tuo account su [WeatherAPI.com](https://www.weatherapi.com/)
2. Vai alla sezione "My Account" > "API Keys"
3. Genera una nuova chiave API o rinnova quella esistente
4. Copia la nuova chiave API

### 3. Aggiorna il file .env

Sostituisci la vecchia chiave API con quella nuova nel file `.env` nella directory principale del progetto:

```
VITE_WEATHERAPI_KEY=la_tua_nuova_chiave_api
```

### 4. Riavvia l'applicazione

Dopo aver aggiornato la chiave API, riavvia l'applicazione per applicare le modifiche.

### 5. Verifica i limiti del piano

Se continui a ricevere errori di autenticazione, potrebbe essere necessario verificare i limiti del tuo piano su WeatherAPI.com. Alcuni piani hanno limiti sul numero di richieste che puoi effettuare al giorno o al mese.

### 6. Controlla la formattazione dell'URL

Assicurati che l'URL utilizzato per le richieste API sia formattato correttamente e che tutti i parametri siano codificati correttamente.

### 7. Verifica la connessione di rete

Assicurati di avere una connessione internet attiva e stabile quando utilizzi il servizio meteo.

## Contatti

Se hai bisogno di ulteriore assistenza, contatta il supporto di WeatherAPI.com o il team di sviluppo dell'applicazione.