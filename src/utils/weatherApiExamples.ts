/**
 * Esempi di chiamate API a WeatherAPI
 * 
 * Questo file contiene esempi di come effettuare le tre principali chiamate API a WeatherAPI:
 * 1. Meteo attuale (current)
 * 2. Previsioni meteo a 3 giorni (forecast)
 * 3. Storico meteo di 7 giorni (history)
 * 4. Dati astronomici (astronomy) - usati per la fase lunare
 */

import { WeatherData, HourlyWeather } from '../types';

// Chiave API da variabile d'ambiente
const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';

// Interfacce per le risposte API
interface WeatherAPIError {
  code: number;
  message: string;
}

interface WeatherAPIResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    temp_c: number;
    humidity: number;
    precip_mm: number;
    wind_kph: number;
    wind_dir: string;
    cloud: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
  };
}

interface ForecastResponse extends WeatherAPIResponse {
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        totalprecip_mm: number;
        avghumidity: number;
        maxwind_kph: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
      hour: Array<{
        time: string;
        temp_c: number;
        precip_mm: number;
        humidity: number;
        wind_kph: number;
        wind_dir: string;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      }>;
    }>;
  };
}

interface HistoryResponse extends WeatherAPIResponse {
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        totalprecip_mm: number;
        avghumidity: number;
        maxwind_kph: number;
        avgvis_km: number;
        maxwind_dir: string;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
    }>;
  };
}

interface AstroResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  astronomy: {
    astro: {
      sunrise: string;
      sunset: string;
      moonrise: string;
      moonset: string;
      moon_phase: string;
      moon_illumination: string;
    };
  };
}

/**
 * Gestione degli errori comuni di WeatherAPI
 */
const handleWeatherAPIError = (error: WeatherAPIError) => {
  if (!WEATHER_API_KEY) {
    throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
  }

  switch (error.code) {
    case 1002:
    case 2006:
    case 2007:
    case 2008:
      throw new Error('Errore di autenticazione: Verifica la chiave API nelle impostazioni o contatta il supporto WeatherAPI.');
    case 1003:
      throw new Error('Parametro località mancante nella richiesta');
    case 1005:
      throw new Error('URL della richiesta API non valido');
    case 1006:
      throw new Error('Località non trovata');
    case 2009:
      throw new Error('Quota giornaliera WeatherAPI superata. Attendi il reset o aggiorna il tuo piano.');
    case 9000:
      throw new Error('JSON non valido nella richiesta bulk. Assicurati che sia un JSON valido con codifica UTF-8.');
    case 9001:
      throw new Error('Troppe località nella richiesta bulk. Mantieni il numero sotto 50 in una singola richiesta.');
    case 9999:
      throw new Error('Errore interno dell\'applicazione WeatherAPI. Riprova più tardi o contatta il supporto.');
    case 401:
      throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
    default:
      throw new Error(`Errore WeatherAPI (${error.code}): ${error.message}`);
  }
};

/**
 * ESEMPIO 1: Meteo attuale (current)
 * 
 * URL: https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=Roma&aqi=no
 * 
 * Parametri:
 * - key: La tua chiave API WeatherAPI
 * - q: Località (può essere nome città, coordinate, codice postale, ecc.)
 * - aqi: Includere dati sulla qualità dell'aria (yes/no)
 */
export const getCurrentWeatherExample = async (location: string): Promise<WeatherData> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    // Costruzione URL
    const url = `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no`;
    console.log('Chiamata API meteo attuale:', url.replace(WEATHER_API_KEY, 'API_KEY_HIDDEN'));
    
    // Esecuzione chiamata
    const response = await fetch(url);
    
    // Gestione errori HTTP
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    // Parsing della risposta
    const data: WeatherAPIResponse = await response.json();
    
    // Formattazione dei dati nel formato interno dell'applicazione
    return {
      temperature: data.current.temp_c,
      humidity: data.current.humidity,
      precipitation: data.current.precip_mm,
      windSpeed: data.current.wind_kph,
      windDirection: data.current.wind_dir,
      cloudCover: data.current.cloud,
      condition: data.current.condition.text,
      timestamp: new Date(data.location.localtime)
    };
  } catch (error) {
    console.error('Errore nel recupero del meteo attuale:', error);
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero del meteo attuale');
  }
};

/**
 * ESEMPIO 2: Previsioni meteo a 3 giorni (forecast)
 * 
 * URL: https://api.weatherapi.com/v1/forecast.json?key=YOUR_API_KEY&q=Roma&days=3&aqi=no&alerts=yes
 * 
 * Parametri:
 * - key: La tua chiave API WeatherAPI
 * - q: Località (può essere nome città, coordinate, codice postale, ecc.)
 * - days: Numero di giorni di previsione (1-10)
 * - aqi: Includere dati sulla qualità dell'aria (yes/no)
 * - alerts: Includere avvisi meteo (yes/no)
 */
export const getForecastExample = async (location: string, days: number = 3): Promise<WeatherData[]> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    // Costruzione URL
    const url = `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=${days}&aqi=no&alerts=yes`;
    console.log('Chiamata API previsioni:', url.replace(WEATHER_API_KEY, 'API_KEY_HIDDEN'));
    
    // Esecuzione chiamata
    const response = await fetch(url);
    
    // Gestione errori HTTP
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    // Parsing della risposta
    const data: ForecastResponse = await response.json();
    
    // Formattazione dei dati nel formato interno dell'applicazione
    return data.forecast.forecastday.map(day => ({
      temperature: day.day.avgtemp_c,
      humidity: day.day.avghumidity,
      precipitation: day.day.totalprecip_mm,
      windSpeed: day.day.maxwind_kph,
      windDirection: 'N/A', // Le previsioni giornaliere non includono direzione del vento
      cloudCover: 0, // Le previsioni giornaliere non includono copertura nuvolosa
      condition: day.day.condition.text,
      timestamp: new Date(day.date)
    }));
  } catch (error) {
    console.error('Errore nel recupero delle previsioni:', error);
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero delle previsioni');
  }
};

/**
 * ESEMPIO 3: Storico meteo (history)
 * 
 * URL: https://api.weatherapi.com/v1/history.json?key=YOUR_API_KEY&q=Roma&dt=2025-03-17
 * 
 * Parametri:
 * - key: La tua chiave API WeatherAPI
 * - q: Località (può essere nome città, coordinate, codice postale, ecc.)
 * - dt: Data nel formato YYYY-MM-DD
 */
export const getHistoricalWeatherExample = async (location: string, date: string): Promise<WeatherData> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    // Costruzione URL
    const url = `${BASE_URL}/history.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}&aqi=no&alerts=no`;
    console.log('Chiamata API storico:', url.replace(WEATHER_API_KEY, 'API_KEY_HIDDEN'));
    
    // Esecuzione chiamata
    const response = await fetch(url);
    
    // Gestione errori HTTP
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    // Parsing della risposta
    const data: HistoryResponse = await response.json();
    const dayData = data.forecast.forecastday[0].day;
    
    // Formattazione dei dati nel formato interno dell'applicazione
    return {
      temperature: dayData.avgtemp_c,
      humidity: dayData.avghumidity,
      precipitation: dayData.totalprecip_mm,
      windSpeed: dayData.maxwind_kph,
      windDirection: dayData.maxwind_dir || 'N/A',
      cloudCover: dayData.avgvis_km,
      condition: dayData.condition.text,
      timestamp: new Date(data.forecast.forecastday[0].date)
    };
  } catch (error) {
    console.error('Errore nel recupero dei dati storici:', error);
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero dei dati storici');
  }
};

/**
 * ESEMPIO 4: Dati astronomici (astronomy) - usati per la fase lunare
 * 
 * URL: https://api.weatherapi.com/v1/astronomy.json?key=YOUR_API_KEY&q=Roma&dt=2025-03-17
 * 
 * Parametri:
 * - key: La tua chiave API WeatherAPI
 * - q: Località (può essere nome città, coordinate, codice postale, ecc.)
 * - dt: Data nel formato YYYY-MM-DD
 */
export const getAstroDataExample = async (location: string, date: string): Promise<AstroResponse['astronomy']['astro']> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    // Costruzione URL
    const url = `${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}`;
    console.log('Chiamata API astronomia:', url.replace(WEATHER_API_KEY, 'API_KEY_HIDDEN'));
    
    // Esecuzione chiamata
    const response = await fetch(url);
    
    // Gestione errori HTTP
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta.