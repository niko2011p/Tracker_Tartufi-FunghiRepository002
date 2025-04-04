// Script per testare la validità della chiave API WeatherAPI

// Importa dotenv per caricare le variabili d'ambiente dal file .env quando eseguito direttamente con Node.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const testApiKey = async () => {
  // Utilizziamo la variabile d'ambiente invece di una chiave hardcoded
  // Leggiamo direttamente dal file .env per Node.js
  const apiKey = process.env.VITE_WEATHERAPI_KEY || '';
  
  if (!apiKey) {
    console.error('❌ Nessuna chiave API trovata nel file .env');
    console.error('Assicurati che il file .env contenga la variabile VITE_WEATHERAPI_KEY');
    return { valid: false, error: 'Chiave API non trovata' };
  }
  
  console.log('Chiave API trovata:', `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  const testUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London&aqi=no`;
  
  try {
    console.log('Testando la chiave API WeatherAPI...');
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ La chiave API è valida!');
      console.log('Risposta:', data);
      return { valid: true, data };
    } else {
      console.error('❌ Errore API:', data.error?.message || 'Errore sconosciuto');
      console.error('Codice errore:', data.error?.code);
      return { valid: false, error: data.error };
    }
  } catch (error) {
    console.error('❌ Errore di connessione:', error.message);
    return { valid: false, error: error.message };
  }
};

// Esegui il test
testApiKey().then(result => {
  if (!result.valid) {
    console.log('\nSoluzione consigliata:');
    console.log('1. Accedi al tuo account WeatherAPI (https://www.weatherapi.com/)');
    console.log('2. Verifica lo stato del tuo abbonamento');
    console.log('3. Genera una nuova chiave API se necessario');
    console.log('4. Aggiorna il file .env con la nuova chiave API');
  }
});