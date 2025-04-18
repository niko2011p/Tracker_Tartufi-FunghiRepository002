import { WeatherData, HourlyWeather } from '../types';
import { create } from 'zustand';

const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';

interface WeatherAPIError {
  code: number;
  message: string;
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
        chance_of_rain?: number;
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

const formatWeatherData = (data: WeatherAPIResponse, astroData?: any): WeatherData => {
  // Verifica che astroData sia un oggetto valido
  const isValidAstroData = astroData && typeof astroData === 'object';
  
  return {
    temperature: data.current.temp_c,
    humidity: data.current.humidity,
    precipitation: data.current.precip_mm,
    windSpeed: data.current.wind_kph,
    windDirection: data.current.wind_dir,
    cloudCover: data.current.cloud,
    condition: data.current.condition.text,
    conditionIcon: data.current.condition.icon,
    conditionCode: data.current.condition.code,
    timestamp: new Date(data.location.localtime),
    // Dati astronomici con controlli di sicurezza più rigorosi
    moonPhase: isValidAstroData && 'moon_phase' in astroData ? astroData.moon_phase : undefined,
    moonIllumination: isValidAstroData && 'moon_illumination' in astroData && astroData.moon_illumination ? 
      parseInt(astroData.moon_illumination, 10) : undefined,
    moonrise: isValidAstroData && 'moonrise' in astroData ? astroData.moonrise : undefined,
    moonset: isValidAstroData && 'moonset' in astroData ? astroData.moonset : undefined,
    sunrise: isValidAstroData && 'sunrise' in astroData ? astroData.sunrise : undefined,
    sunset: isValidAstroData && 'sunset' in astroData ? astroData.sunset : undefined
  };
};

const formatHourlyWeather = (hour: ForecastResponse['forecast']['forecastday'][0]['hour'][0]): HourlyWeather => ({
  time: hour.time,
  temp_c: hour.temp_c,
  precip_mm: hour.precip_mm,
  humidity: hour.humidity,
  wind_kph: hour.wind_kph,
  wind_dir: hour.wind_dir,
  condition: hour.condition.text,
  conditionIcon: hour.condition.icon,
  conditionCode: hour.condition.code,
  chance_of_rain: hour.chance_of_rain || 0
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
    
    // Ottieni i dati astronomici per la data corrente
    let astroData = null;
    try {
      // Verifica connessione internet prima di fare la richiesta
      if (!navigator.onLine) {
        console.warn('Nessuna connessione internet disponibile per i dati astronomici');
        // Continua senza dati astronomici invece di lanciare un'eccezione
      } else {
        const today = new Date().toISOString().split('T')[0];
        // Aggiungiamo un timeout alla richiesta per evitare blocchi
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondi di timeout
        
        try {
          astroData = await Promise.race([
            getAstroData(location, today),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout nel recupero dei dati astronomici')), 5000))
          ]);
          clearTimeout(timeoutId);
        } catch (timeoutErr) {
          console.warn('Timeout durante il recupero dei dati astronomici:', timeoutErr);
          // Continua senza dati astronomici
        }
      }
    } catch (astroError) {
      console.error('Errore nel recupero dei dati astronomici attuali:', astroError);
      // Continua senza dati astronomici
    }
    
    // Verifica che astroData sia un oggetto valido prima di passarlo a formatWeatherData
    if (astroData && typeof astroData !== 'object') {
      console.warn('Dati astronomici non validi, verranno ignorati');
      astroData = null;
    }
    
    return formatWeatherData(data, astroData);
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
    return await Promise.all(data.forecast.forecastday.map(async day => {
      // Ottieni i dati astronomici per ogni giorno
      let moonPhase = 'N/A';
      let moonIllumination = 0;
      let moonrise = 'N/A';
      let moonset = 'N/A';
      let sunrise = 'N/A';
      let sunset = 'N/A';
      
      try {
        const astroData = await getAstroData(location, day.date);
        moonPhase = astroData.moon_phase || 'N/A';
        moonIllumination = parseInt(astroData.moon_illumination || '0', 10);
        moonrise = astroData.moonrise || 'N/A';
        moonset = astroData.moonset || 'N/A';
        sunrise = astroData.sunrise || 'N/A';
        sunset = astroData.sunset || 'N/A';
      } catch (astroError) {
        console.error('Errore nel recupero dei dati astronomici:', astroError);
      }
      
      return {
        temperature: day.day.avgtemp_c,
        humidity: day.day.avghumidity,
        precipitation: day.day.totalprecip_mm,
        windSpeed: day.day.maxwind_kph,
        windDirection: 'N/A', // Daily forecast doesn't include wind direction
        cloudCover: 0, // Daily forecast doesn't include cloud cover
        condition: day.day.condition.text,
        conditionIcon: day.day.condition.icon,
        conditionCode: day.day.condition.code,
        timestamp: new Date(day.date),
        // Aggiungi i dati astronomici
        moonPhase,
        moonIllumination,
        moonrise,
        moonset,
        sunrise,
        sunset
      };
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
        
        // Recupera anche i dati astronomici per questa data
        let moonPhase = 'N/A';
        let moonIllumination = 0;
        let moonrise = 'N/A';
        let moonset = 'N/A';
        let sunrise = 'N/A';
        let sunset = 'N/A';
        
        try {
          const astroResponse = await fetch(
            `${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}&lang=it`
          );
          
          if (astroResponse.ok) {
            const astroData = await astroResponse.json();
            const astro = astroData.astronomy.astro;
            
            moonPhase = astro.moon_phase || 'N/A';
            moonIllumination = parseInt(astro.moon_illumination || '0', 10);
            moonrise = astro.moonrise || 'N/A';
            moonset = astro.moonset || 'N/A';
            sunrise = astro.sunrise || 'N/A';
            sunset = astro.sunset || 'N/A';
          }
        } catch (astroError) {
          console.error('Errore nel recupero dei dati astronomici storici:', astroError);
        }
        
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
          timestamp: new Date(data.forecast.forecastday[0].date),
          // Aggiungi i dati astronomici
          moonPhase,
          moonIllumination,
          moonrise,
          moonset,
          sunrise,
          sunset
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
  // Dati predefiniti da restituire in caso di errore
  const defaultAstroData = {
    moon_phase: 'New Moon',  // Valore predefinito più sicuro per la fase lunare
    moon_illumination: '0',
    moonrise: 'Non disponibile',
    moonset: 'Non disponibile',
    sunrise: 'Non disponibile',
    sunset: 'Non disponibile'
  };
  
  try {
    if (!WEATHER_API_KEY) {
      console.error('Chiave API WeatherAPI non configurata. Controlla il file .env');
      return {...defaultAstroData};
    }

    // Verifica connessione internet prima di fare la richiesta
    if (!navigator.onLine) {
      console.warn('Nessuna connessione internet disponibile per i dati astronomici');
      return {...defaultAstroData};
    }

    // Aggiungiamo un timeout alla richiesta per evitare blocchi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi di timeout
    
    try {
      const response = await fetch(
        `${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(location)}&dt=${date}&lang=it`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Errore di autenticazione 401 - Unauthorized');
          return {...defaultAstroData};
        }
        
        console.error(`Errore nel recupero dei dati astronomici: ${response.status}`);
        return {...defaultAstroData};
      }
      
      // Parsing della risposta
      const data: AstroResponse = await response.json();
      return data.astronomy.astro;
    } catch (error) {
      console.error('Errore nel recupero dei dati astronomici:', error);
      return {...defaultAstroData};
    }
  } catch (error) {
    console.error('Errore nel recupero dei dati astronomici:', error);
    return {...defaultAstroData};
  }
};

interface WeatherState {
  currentTemperature: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

interface WeatherStore extends WeatherState {
  fetchCurrentWeather: (lat: number, lon: number) => Promise<void>;
}

export const useWeatherStore = create<WeatherStore>((set) => ({
  currentTemperature: null,
  isLoading: false,
  error: null,
  lastUpdate: null,

  fetchCurrentWeather: async (lat: number, lon: number) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`Tentativo di recupero meteo per coordinate: ${lat},${lon}`);
      
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${import.meta.env.VITE_WEATHERAPI_KEY}&q=${lat},${lon}&aqi=no&lang=it`
      );
      
      if (!response.ok) {
        throw new Error(`Errore nel recupero dei dati meteo: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log del payload ricevuto per debug
      console.log('Payload meteo ricevuto:', JSON.stringify(data));
      
      // Validazione dei dati ricevuti con controlli più specifici
      if (!data) {
        throw new Error('Nessun dato ricevuto dall\'API meteo');
      }
      
      if (!data.current) {
        throw new Error('Dati meteo non contengono informazioni correnti');
      }
      
      if (typeof data.current.temp_c !== 'number') {
        throw new Error('Temperatura mancante o non valida nei dati meteo');
      }
      
      set({
        currentTemperature: data.current.temp_c,
        lastUpdate: Date.now(),
        isLoading: false
      });
      
      console.log(`Meteo aggiornato: ${data.current.temp_c}°C`);
    } catch (error) {
      console.error('Errore nel recupero del meteo attuale:', error);
      set({
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
        isLoading: false
      });
    }
  }
}));