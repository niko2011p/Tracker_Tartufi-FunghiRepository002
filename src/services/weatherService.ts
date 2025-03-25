import { WeatherData, HourlyWeather } from '../types';

const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';

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

const formatWeatherData = (data: WeatherAPIResponse): WeatherData => ({
  temperature: data.current.temp_c,
  humidity: data.current.humidity,
  precipitation: data.current.precip_mm,
  windSpeed: data.current.wind_kph,
  windDirection: data.current.wind_dir,
  cloudCover: data.current.cloud,
  condition: data.current.condition.text,
  conditionIcon: data.current.condition.icon,
  conditionCode: data.current.condition.code,
  timestamp: new Date(data.location.localtime)
});

const formatHourlyWeather = (hour: ForecastResponse['forecast']['forecastday'][0]['hour'][0]): HourlyWeather => ({
  time: hour.time,
  temp_c: hour.temp_c,
  precip_mm: hour.precip_mm,
  humidity: hour.humidity,
  wind_kph: hour.wind_kph,
  wind_dir: hour.wind_dir,
  condition: hour.condition.text,
  conditionIcon: hour.condition.icon,
  conditionCode: hour.condition.code
});

export const getCurrentWeather = async (location: string): Promise<WeatherData> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    const response = await fetch(
      `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&aqi=no&lang=it`
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    const data: WeatherAPIResponse = await response.json();
    return formatWeatherData(data);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero del meteo attuale');
  }
};

export const getForecast = async (location: string): Promise<WeatherData[]> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    const response = await fetch(
      `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no&lang=it`
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    const data: ForecastResponse = await response.json();
    return data.forecast.forecastday.map(day => ({
      temperature: day.day.avgtemp_c,
      humidity: day.day.avghumidity,
      precipitation: day.day.totalprecip_mm,
      windSpeed: day.day.maxwind_kph,
      windDirection: 'N/A', // Daily forecast doesn't include wind direction
      cloudCover: 0, // Daily forecast doesn't include cloud cover
      condition: day.day.condition.text,
      conditionIcon: day.day.condition.icon,
      conditionCode: day.day.condition.code,
      timestamp: new Date(day.date)
    }));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero delle previsioni');
  }
};

export const getHistoricalWeather = async (location: string): Promise<WeatherData[]> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (i + 1));
      return date.toISOString().split('T')[0];
    });

    const historicalData = await Promise.all(
      dates.map(async (date) => {
        const response = await fetch(
          `${BASE_URL}/history.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}&aqi=no&alerts=no&lang=it`
        );
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error('Errore di autenticazione 401 - Unauthorized');
            throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
          }
          
          const error = await response.json();
          handleWeatherAPIError(error.error);
        }
        
        const data: ForecastResponse = await response.json();
        const dayData = data.forecast.forecastday[0].day;
        
        return {
          temperature: dayData.avgtemp_c,
          maxTemp: dayData.maxtemp_c,
          minTemp: dayData.mintemp_c,
          humidity: dayData.avghumidity,
          precipitation: dayData.totalprecip_mm,
          windSpeed: dayData.maxwind_kph,
          windDirection: 'N/A', // WeatherAPI non fornisce maxwind_dir nei dati storici
          cloudCover: 0, // WeatherAPI non fornisce avgvis_km nei dati storici
          condition: dayData.condition.text,
          conditionIcon: dayData.condition.icon,
          conditionCode: dayData.condition.code,
          timestamp: new Date(data.forecast.forecastday[0].date)
        };
      })
    );

    return historicalData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero dei dati storici');
  }
};

export const getHourlyForecast = async (location: string): Promise<HourlyWeather[]> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    const response = await fetch(
      `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=yes&lang=it`
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    const data: ForecastResponse = await response.json();
    // Estrai tutte le ore dai 3 giorni di previsione
    const allHours: HourlyWeather[] = [];
    data.forecast.forecastday.forEach(day => {
      day.hour.forEach(hour => {
        allHours.push(formatHourlyWeather(hour));
      });
    });
    return allHours;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero delle previsioni orarie');
  }
};

// Funzione per ottenere i dati astro (fase lunare, alba, tramonto)
export const getAstroData = async (location: string, date: string): Promise<any> => {
  try {
    if (!WEATHER_API_KEY) {
      throw new Error('Chiave API WeatherAPI non configurata. Controlla il file .env');
    }

    const response = await fetch(
      `${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}&lang=it`
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Errore di autenticazione 401 - Unauthorized');
        throw new Error('Errore di autenticazione: La chiave API non è valida o è scaduta. Verifica le impostazioni.');
      }
      
      const error = await response.json();
      handleWeatherAPIError(error.error);
    }
    
    const data = await response.json();
    return data.astronomy.astro;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Errore nel recupero dei dati astronomici');
  }
};