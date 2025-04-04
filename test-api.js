// Script per testare la chiave API WeatherAPI
const fetch = require('node-fetch');

// Utilizziamo la chiave API dal file .env
const apiKey = '97959559d86f4d3a975175711252303';
const testUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London&aqi=no`;

console.log('Testando la chiave API WeatherAPI...');
console.log('URL:', testUrl);

fetch(testUrl)
  .then(response => {
    console.log('Stato risposta:', response.status, response.statusText);
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.error('❌ Errore API:', data.error.message);
      console.error('Codice errore:', data.error.code);
      console.log('\nDettagli completi della risposta:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('✅ La chiave API è valida!');
      console.log('Località:', data.location.name);
      console.log('Temperatura:', data.current.temp_c, '°C');
      console.log('Condizioni:', data.current.condition.text);
    }
  })
  .catch(error => {
    console.error('❌ Errore di connessione:', error.message);
  });