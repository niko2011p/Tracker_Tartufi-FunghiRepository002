// Script per testare la validità della chiave API WeatherAPI

const testApiKey = async () => {
  // Utilizziamo la variabile d'ambiente invece di una chiave hardcoded
  const apiKey = typeof import.meta !== 'undefined' ? import.meta.env.VITE_WEATHERAPI_KEY : process.env.VITE_WEATHERAPI_KEY || '';
  const testUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=Rome`;
  
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