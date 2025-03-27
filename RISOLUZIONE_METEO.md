# Risoluzione Problema Pagina Meteo Bianca

## Problema Identificato

La pagina Meteo appare completamente bianca perché la chiave API di WeatherAPI è scaduta o non è più valida. Questo causa errori durante le chiamate API che impediscono il rendering corretto della pagina.

## Soluzione

### 1. Ottenere una Nuova Chiave API

1. Visita [WeatherAPI.com](https://www.weatherapi.com/)
2. Accedi al tuo account o creane uno nuovo se necessario
3. Vai alla sezione "My Account" > "API Keys"
4. Genera una nuova chiave API o verifica lo stato di quella esistente

### 2. Aggiornare il File .env

1. Apri il file `.env` nella directory principale del progetto
2. Sostituisci la chiave API esistente con quella nuova:
   ```
   VITE_WEATHERAPI_KEY=la_tua_nuova_chiave_api
   ```

### 3. Riavviare l'Applicazione

Dopo aver aggiornato la chiave API, riavvia l'applicazione per applicare le modifiche.

### 4. Verifica

Accedi alla pagina Meteo per verificare che funzioni correttamente. Dovresti vedere i dati meteo visualizzati invece della pagina bianca.

## Informazioni Aggiuntive

- La chiave API gratuita di WeatherAPI ha un limite di richieste giornaliere e potrebbe scadere dopo un certo periodo
- Se continui a riscontrare problemi, controlla la console del browser per eventuali errori specifici
- Per ulteriori dettagli sulla risoluzione dei problemi, consulta il file `WEATHER_API_TROUBLESHOOTING.md`