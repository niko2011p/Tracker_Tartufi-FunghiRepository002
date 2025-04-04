# Diagnosi Problema Pagina Bianca

## Problema Identificato

La pagina meteo appare completamente bianca a causa di un problema con la chiave API di WeatherAPI. Il test diretto della chiave API ha restituito un errore **403 Forbidden**, che indica che la chiave API presente nel file `.env` non è più valida o è scaduta.

## Dettagli Tecnici

1. **Errore API**: 403 Forbidden
2. **Causa**: La chiave API WeatherAPI nel file `.env` non è più autorizzata ad accedere al servizio
3. **Impatto**: Il componente Meteo non riesce a caricare i dati e non visualizza correttamente il messaggio di errore, risultando in una pagina bianca

## Soluzione

### 1. Ottenere una Nuova Chiave API

1. Visita [WeatherAPI.com](https://www.weatherapi.com/)
2. Accedi al tuo account o creane uno nuovo se necessario
3. Vai alla sezione "My Account" > "API Keys"
4. Genera una nuova chiave API

### 2. Aggiornare il File .env

1. Apri il file `.env` nella directory principale del progetto
2. Sostituisci la chiave API esistente con quella nuova:
   ```
   VITE_WEATHERAPI_KEY=la_tua_nuova_chiave_api
   ```

### 3. Riavviare l'Applicazione

Dopo aver aggiornato la chiave API, riavvia l'applicazione per applicare le modifiche:

```bash
npm run dev
```

## Verifica della Soluzione

Per verificare che la nuova chiave API funzioni correttamente, puoi eseguire il seguente comando PowerShell:

```powershell
$apiKey = Get-Content .env | Select-String -Pattern 'VITE_WEATHERAPI_KEY=' | ForEach-Object { $_ -replace 'VITE_WEATHERAPI_KEY=', '' };
$testUrl = "https://api.weatherapi.com/v1/current.json?key=$apiKey&q=Rome";
try {
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing;
    Write-Output "Test API: Successo";
    Write-Output "Codice di stato: $($response.StatusCode)";
} catch {
    Write-Output "Test API: Fallito";
    Write-Output "Errore: $($_.Exception.Message)";
}
```

Se il test restituisce "Test API: Successo" e "Codice di stato: 200", la chiave API è valida e l'applicazione dovrebbe funzionare correttamente.

## Prevenzione di Problemi Futuri

1. **Monitoraggio della Chiave API**: Implementa un sistema di monitoraggio periodico per verificare la validità della chiave API
2. **Gestione degli Errori**: Migliora la gestione degli errori nel componente Meteo per visualizzare messaggi di errore chiari invece di una pagina bianca
3. **Cache Locale**: Implementa un sistema di cache più robusto per visualizzare i dati meteo anche quando l'API non è disponibile

## Informazioni Aggiuntive

- Le chiavi API gratuite di WeatherAPI hanno limiti di utilizzo giornalieri e possono scadere dopo un certo periodo
- Se continui a riscontrare problemi dopo aver aggiornato la chiave API, controlla la console del browser per eventuali errori specifici
- Per ulteriori dettagli sulla risoluzione dei problemi, consulta il file `WEATHER_API_TROUBLESHOOTING.md`