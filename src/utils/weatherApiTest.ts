interface ApiTestResult {
  isValid: boolean;
  message: string;
}

export async function testWeatherApiKey(apiKey: string): Promise<ApiTestResult> {
  try {
    // Utilizziamo London come località di test con parametro aqi=no
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=London&aqi=no`
    );

    const data = await response.json();
    
    if (response.ok) {
      return {
        isValid: true,
        message: 'API key is valid and working correctly'
      };
    } else {
      // Handle specific API error cases
      const errorCode = data.error?.code;
      let errorMessage = 'Unknown error';
      
      switch (errorCode) {
        case 2006:
          errorMessage = 'La chiave API è stata disabilitata. Per favore genera una nuova chiave API dal pannello di controllo WeatherAPI.';
          break;
        case 2007:
          errorMessage = 'La chiave API non è valida. Verifica di aver inserito la chiave corretta.';
          break;
        case 2008:
          errorMessage = 'La chiave API è scaduta. Per favore rinnova il tuo abbonamento.';
          break;
        default:
          errorMessage = data.error?.message || 'Errore sconosciuto durante la validazione della chiave API';
      }
      
      return {
        isValid: false,
        message: errorMessage
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Error testing API key: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}