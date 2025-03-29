import React, { useEffect, useState } from 'react';
import { searchLocations } from '../services/locationSearchService';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Thermometer, 
  MapPin, 
  ArrowUpDown,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Compass,
  Map,
  History,
  ChevronRight
} from 'lucide-react';
import './Meteo.css';

// Costanti per WeatherAPI
const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';
// Logo rimosso come richiesto
import { useTrackStore } from '../store/trackStore';
import { useWeatherStore } from '../store/weatherStore';
import WeatherForecast from './WeatherForecast';
import MoonPhase from './MoonPhase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import { Link, useLocation } from 'react-router-dom';
import PopupNotification from './PopupNotification';
import FixedFooter from './FixedFooter';
import MeteoLogo from './MeteoLogo';

interface WeatherData {
  date: string;
  temp_c: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  precip_mm: number;
  precip_chance: number;
  wind_kph: number;
  wind_dir: string;
  cloud_cover: number;
  condition: string;
  // Informazioni lunari e solari
  moonPhase?: string;
  moonIllumination?: number;
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;
}

interface Location {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

const columnHelper = createColumnHelper<WeatherData>();

const columns = [
  columnHelper.accessor('date', {
    header: 'Data',
    cell: info => format(parseISO(info.getValue()), "d MMMM yyyy", { locale: it }),
  }),
  columnHelper.accessor('precip_mm', {
    header: 'Precipitazioni (mm)',
    cell: info => info.getValue().toFixed(1),
  }),
  columnHelper.accessor('temp_min', {
    header: 'Min °C',
    cell: info => info.getValue().toFixed(1),
  }),
  columnHelper.accessor('temp_max', {
    header: 'Max °C',
    cell: info => info.getValue().toFixed(1),
  }),
  columnHelper.accessor('humidity', {
    header: 'Umidità (%)',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('wind_kph', {
    header: 'Vento (km/h)',
    cell: info => info.getValue().toFixed(1),
  }),
  columnHelper.accessor('wind_dir', {
    header: 'Direzione Vento',
    cell: info => info.getValue(),
  }),
];

// Funzione per tradurre le condizioni meteo in italiano
const translateWeatherCondition = (condition: string): string => {
  const translations: { [key: string]: string } = {
    'clear': 'Sereno',
    'sunny': 'Soleggiato',
    'partly cloudy': 'Parzialmente nuvoloso',
    'cloudy': 'Nuvoloso',
    'overcast': 'Coperto',
    'rain': 'Pioggia',
    'light rain': 'Pioggia leggera',
    'heavy rain': 'Pioggia intensa',
    'snow': 'Neve',
    'light snow': 'Neve leggera',
    'heavy snow': 'Neve intensa',
    'thunderstorm': 'Temporale',
    'mist': 'Nebbia',
    'fog': 'Nebbia fitta',
    'patchy rain possible': 'Possibili piogge sparse',
    'patchy snow possible': 'Possibili nevicate sparse',
    'patchy sleet possible': 'Possibile nevischio sparso',
    'patchy freezing drizzle possible': 'Possibile pioviggine gelata sparsa',
    'thundery outbreaks possible': 'Possibili temporali',
    'blowing snow': 'Neve soffiata',
    'blizzard': 'Bufera di neve',
    'freezing fog': 'Nebbia gelata',
    'patchy light drizzle': 'Pioviggine leggera sparsa',
    'light drizzle': 'Pioviggine leggera',
    'freezing drizzle': 'Pioviggine gelata',
    'heavy freezing drizzle': 'Pioviggine gelata intensa',
    'patchy light rain': 'Pioggia leggera sparsa',
    'moderate rain at times': 'Pioggia moderata a tratti',
    'moderate rain': 'Pioggia moderata',
    'heavy rain at times': 'Pioggia intensa a tratti',
    'light freezing rain': 'Pioggia gelata leggera',
    'moderate or heavy freezing rain': 'Pioggia gelata moderata o intensa',
    'light sleet': 'Nevischio leggero',
    'moderate or heavy sleet': 'Nevischio moderato o intenso',
    'patchy light snow': 'Neve leggera sparsa',
    'patchy moderate snow': 'Neve moderata sparsa',
    'moderate snow': 'Neve moderata',
    'patchy heavy snow': 'Neve intensa sparsa',
    'ice pellets': 'Granelli di ghiaccio',
    'light rain shower': 'Rovescio di pioggia leggero',
    'moderate or heavy rain shower': 'Rovescio di pioggia moderato o intenso',
    'torrential rain shower': 'Rovescio di pioggia torrenziale',
    'light sleet showers': 'Rovesci di nevischio leggeri',
    'moderate or heavy sleet showers': 'Rovesci di nevischio moderati o intensi',
    'light snow showers': 'Rovesci di neve leggeri',
    'moderate or heavy snow showers': 'Rovesci di neve moderati o intensi',
    'light showers of ice pellets': 'Rovesci leggeri di granelli di ghiaccio',
    'moderate or heavy showers of ice pellets': 'Rovesci moderati o intensi di granelli di ghiaccio',
    'patchy light rain with thunder': 'Pioggia leggera sparsa con tuoni',
    'moderate or heavy rain with thunder': 'Pioggia moderata o intensa con tuoni',
    'patchy light snow with thunder': 'Neve leggera sparsa con tuoni',
    'moderate or heavy snow with thunder': 'Neve moderata o intensa con tuoni'
  };

  const lowerCondition = condition.toLowerCase();
  return translations[lowerCondition] || condition;
};

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return <Sun className="w-8 h-8 text-yellow-500" />;
    case 'partly cloudy':
    case 'cloudy':
    case 'overcast':
      return <Cloud className="w-8 h-8 text-gray-500" />;
    case 'rain':
    case 'light rain':
    case 'heavy rain':
      return <CloudRain className="w-8 h-8 text-[#fd9a3c]" />;
    case 'snow':
    case 'light snow':
    case 'heavy snow':
      return <CloudSnow className="w-8 h-8 text-[#fd9a3c]/70" />;
    case 'thunderstorm':
      return <CloudLightning className="w-8 h-8 text-yellow-600" />;
    default:
      return <Cloud className="w-8 h-8 text-gray-500" />;
  }
};

const getWindColor = (speed: number) => {
  if (speed < 20) return 'text-[#8eaa36]';
  if (speed < 40) return 'text-yellow-500';
  if (speed < 60) return 'text-orange-500';
  return 'text-red-500';
};

const getHumidityColor = (humidity: number) => {
  if (humidity < 30) return 'bg-red-100';
  if (humidity < 50) return 'bg-[#8eaa36]/10';
  if (humidity < 70) return 'bg-[#fd9a3c]/10';
  return 'bg-purple-100';
};

function Meteo() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [showHistoricalChart, setShowHistoricalChart] = useState(false);
  const location = useLocation();
  
  // Utilizzo lo store condiviso per la località
  const selectedLocation = useWeatherStore(state => state.selectedLocation);
  const setSelectedLocation = useWeatherStore(state => state.setSelectedLocation);

  const table = useReactTable({
    data: historicalData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const fetchLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/search.json?key=${import.meta.env.VITE_WEATHERAPI_KEY}&q=${lat},${lon}`
      );
      
      if (!response.ok) throw new Error('Errore nel recupero della località');
      const locations = await response.json();
      
      if (locations.length > 0) {
        const locationData = {
          name: locations[0].name,
          region: locations[0].region || '',
          lat: locations[0].lat,
          lon: locations[0].lon
        };
        
        // Salva la posizione nello store e nel localStorage
        setSelectedLocation(locationData);
        localStorage.setItem('weatherLocation', JSON.stringify(locationData));
      }
    } catch (err) {
      console.error('Errore nel recupero del nome della località:', err);
      setError('Impossibile determinare la località. Prova a cercarla manualmente.');
    }
  };

  const retryFetch = async (url: string, options = {}, maxRetries = 3) => {
  let lastError;
  let timeoutId: NodeJS.Timeout;

  const controller = new AbortController();
  const signal = controller.signal;

  const fetchWithTimeout = async () => {
    timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 secondi timeout

    try {
      const response = await fetch(url, { ...options, signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetchWithTimeout();
      if (response.ok) return response;
      
      lastError = new Error(`Errore HTTP: ${response.status} - ${response.statusText}`);
      if (response.status === 429) { // Rate limit
        const retryAfter = response.headers.get('Retry-After');
        await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter || '60') * 1000)));
        continue;
      }
      
      // Gestione specifica per errori di autenticazione
      if (response.status === 401) {
        console.error(`Errore di autenticazione 401 - Unauthorized per l'URL: ${url}`);
        console.error('Verifica la chiave API nel file .env (VITE_WEATHERAPI_KEY)');
        break; // Non ritentare errori di autenticazione
      }
      
      if (response.status >= 400 && response.status < 500) break; // Non ritentare altri errori client
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        throw new Error('Timeout: la richiesta sta impiegando troppo tempo');
      }
    }

    if (i < maxRetries - 1) {
      const backoffMs = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(
    lastError?.message || 
    'Impossibile completare la richiesta. Verifica la tua connessione e riprova.'
  );
};

  const CACHE_KEY = 'weatherData';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minuti

const saveToCache = (data: any) => {
  const cacheData = {
    timestamp: Date.now(),
    data: data
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
};

const getFromCache = () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const { timestamp, data } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_EXPIRY) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }

  return data;
};

const fetchWeatherData = async (latitude?: number, longitude?: number) => {
  try {
    setLoading(true);
    setError(null);
    
    let locationQuery = 'auto:ip';
    let lat = latitude;
    let lon = longitude;
    
    // Verifica connessione internet e cache prima di tutto
    if (!navigator.onLine) {
      const cachedData = getFromCache();
      if (cachedData) {
        setCurrentWeather(cachedData.currentWeather);
        setForecast(cachedData.forecast);
        setHistoricalData(cachedData.historicalData);
        setError('Modalità offline: visualizzazione dati in cache');
        setLoading(false);
        return;
      }
      throw new Error('Nessuna connessione internet disponibile');
    }
    
    if (!lat || !lon) {
      // Prima prova a ottenere la posizione dal GPS
      try {
        // Richiedi esplicitamente la posizione GPS all'utente
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        locationQuery = `${lat},${lon}`;
      } catch (gpsError) {
          // Se il GPS fallisce, prova a usare le coordinate del track corrente
          const currentTrack = useTrackStore.getState().currentTrack;
          const coordinates = currentTrack?.coordinates;
          
          if (coordinates && coordinates.length > 0) {
            const lastPosition = coordinates[coordinates.length - 1];
            if (lastPosition && Array.isArray(lastPosition) && lastPosition.length >= 2) {
              locationQuery = `${lastPosition[1]},${lastPosition[0]}`;
              lat = lastPosition[1];
              lon = lastPosition[0];
            } else {
              throw new Error('Formato coordinate non valido nel track corrente');
            }
          } else {
            throw new Error('Posizione non disponibile. Attiva il GPS o seleziona una località.');
          }
        }
      } else if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Coordinate GPS non valide. Riprova o seleziona manualmente una località.');
      } else {
        locationQuery = `${lat},${lon}`;
      }

      // Verifica connessione internet prima di fare la richiesta
      if (!navigator.onLine) {
        const cachedData = getFromCache();
        if (cachedData) {
          setCurrentWeather(cachedData.currentWeather);
          setForecast(cachedData.forecast);
          setHistoricalData(cachedData.historicalData);
          setError('Modalità offline: visualizzazione dati in cache');
          setLoading(false);
          return;
        }
        throw new Error('Nessuna connessione internet disponibile');
      }

      // Costruisci l'URL con tutti i parametri necessari per WeatherAPI
      const weatherApiUrl = `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${locationQuery}&aqi=no`;
      
      // Usa retryFetch con gestione degli errori migliorata
      const weatherResponse = await retryFetch(weatherApiUrl, {}, 3);
      if (!weatherResponse.ok) {
        throw new Error(`Errore API: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }
      const weatherData = await weatherResponse.json();
      
      if (!weatherData || !weatherData.current) {
        throw new Error('Dati meteo non validi o incompleti. Verifica la tua connessione e riprova.');
      }
      
      // Recupera i dati astronomici (fase lunare, alba, tramonto)
      const today = new Date().toISOString().split('T')[0];
      const astronomyUrl = `${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${locationQuery}&dt=${today}`;
      
      // Valori predefiniti per i dati astronomici
      let astroData = {
        moon_phase: 'Unknown',
        moon_illumination: '0',
        moonrise: 'Non disponibile',
        moonset: 'Non disponibile',
        sunrise: 'Non disponibile',
        sunset: 'Non disponibile'
      };
      
      try {
        // Aggiungi un timeout per evitare blocchi indefiniti
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi di timeout
        
        try {
          const astronomyResponse = await retryFetch(astronomyUrl, { signal: controller.signal }, 3);
          clearTimeout(timeoutId);
          
          if (!astronomyResponse.ok) {
            console.error(`Errore API astronomia: ${astronomyResponse.status} ${astronomyResponse.statusText}`);
            // Continuiamo con i dati predefiniti
          } else {
            const astronomyData = await astronomyResponse.json();
            if (astronomyData && astronomyData.astronomy && astronomyData.astronomy.astro) {
              // Copia i dati ricevuti nei dati predefiniti per evitare riferimenti undefined
              const receivedData = astronomyData.astronomy.astro;
              astroData = {
                moon_phase: receivedData.moon_phase || astroData.moon_phase,
                moon_illumination: receivedData.moon_illumination || astroData.moon_illumination,
                moonrise: receivedData.moonrise || astroData.moonrise,
                moonset: receivedData.moonset || astroData.moonset,
                sunrise: receivedData.sunrise || astroData.sunrise,
                sunset: receivedData.sunset || astroData.sunset
              };
            }
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.error('Errore nella richiesta fetch dei dati astronomici:', fetchError);
          // Continuiamo con i dati predefiniti
        }
      } catch (astroError) {
        console.error('Errore nel recupero dei dati astronomici:', astroError);
        // Non interrompiamo il flusso principale se i dati astronomici falliscono
        // Continuiamo con i dati predefiniti già impostati
      }
      
      // Verifica aggiuntiva per assicurarsi che tutti i campi siano validi
      if (typeof astroData !== 'object' || astroData === null) {
        astroData = {
          moon_phase: 'Unknown',
          moon_illumination: '0',
          moonrise: 'Non disponibile',
          moonset: 'Non disponibile',
          sunrise: 'Non disponibile',
          sunset: 'Non disponibile'
        };
      }
      
      // Assicuriamoci che astroData sia un oggetto valido
      if (typeof astroData !== 'object' || astroData === null) {
        astroData = {
          moon_phase: 'Unknown',
          moon_illumination: '0',
          moonrise: 'Non disponibile',
          moonset: 'Non disponibile',
          sunrise: 'Non disponibile',
          sunset: 'Non disponibile'
        };
      }
      
      // Crea l'oggetto currentWeather con controlli di sicurezza per ogni proprietà
      setCurrentWeather({
        date: new Date().toISOString(),
        temp_c: weatherData.current.temp_c,
        temp_min: weatherData.current.temp_c, // WeatherAPI non fornisce min/max nel current
        temp_max: weatherData.current.temp_c, // WeatherAPI non fornisce min/max nel current
        humidity: weatherData.current.humidity,
        precip_mm: weatherData.current.precip_mm,
        precip_chance: weatherData.current.chance_of_rain || 0,
        wind_kph: weatherData.current.wind_kph,
        wind_dir: weatherData.current.wind_dir,
        cloud_cover: weatherData.current.cloud,
        condition: weatherData.current.condition.text,
        // Aggiungi i dati astronomici con controlli di sicurezza più rigorosi
        // Verifica che astroData sia un oggetto valido prima di accedere alle sue proprietà
        moonPhase: (astroData && typeof astroData === 'object' && 'moon_phase' in astroData) ? astroData.moon_phase : 'N/A',
        moonIllumination: (astroData && typeof astroData === 'object' && 'moon_illumination' in astroData) ? 
          (parseInt(astroData.moon_illumination || '0', 10) || 0) : 0,
        moonrise: (astroData && typeof astroData === 'object' && 'moonrise' in astroData) ? astroData.moonrise : 'N/A',
        moonset: (astroData && typeof astroData === 'object' && 'moonset' in astroData) ? astroData.moonset : 'N/A',
        sunrise: (astroData && typeof astroData === 'object' && 'sunrise' in astroData) ? astroData.sunrise : 'N/A',
        sunset: (astroData && typeof astroData === 'object' && 'sunset' in astroData) ? astroData.sunset : 'N/A'
      });

      // Fetch forecast data using WeatherAPI
      const forecastUrl = `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${locationQuery}&days=5&aqi=no&alerts=no`;
      const forecastResponse = await retryFetch(forecastUrl, {}, 3);
      if (!forecastResponse.ok) {
        throw new Error(`Errore API previsioni: ${forecastResponse.status} ${forecastResponse.statusText}`);
      }
      const forecastData = await forecastResponse.json();

      // Process forecast data from WeatherAPI
      const processedForecastData = [];
      forecastData.forecast.forecastday.forEach((day: any) => {
        day.hour.forEach((hour: any) => {
          processedForecastData.push({
            date: new Date(hour.time).toISOString(),
            temp_c: hour.temp_c,
            temp_min: hour.temp_c, // WeatherAPI non fornisce min/max orari
            temp_max: hour.temp_c, // WeatherAPI non fornisce min/max orari
            humidity: hour.humidity,
            precip_mm: hour.precip_mm,
            precip_chance: hour.chance_of_rain,
            wind_kph: hour.wind_kph,
            wind_dir: hour.wind_dir,
            cloud_cover: hour.cloud,
            condition: hour.condition.text
          });
        });
      });
      setForecast(processedForecastData);

      // Fetch historical data using WeatherAPI
      try {
        const historicalUrl = `${BASE_URL}/history.json?key=${WEATHER_API_KEY}&q=${locationQuery}&dt=${format(subDays(new Date(), 7), 'yyyy-MM-dd')}&end_dt=${format(new Date(), 'yyyy-MM-dd')}`;  
        const historicalResponse = await retryFetch(historicalUrl, {}, 3);
        if (!historicalResponse.ok) {
          console.warn(`Avviso: impossibile caricare i dati storici: ${historicalResponse.status} ${historicalResponse.statusText}`);
          // Non interrompere il flusso principale se lo storico fallisce
          setHistoricalData([]);
        } else {
          const historicalData = await historicalResponse.json();
          
          // Process historical data
          const processedHistoricalData: WeatherData[] = [];
          if (historicalData.forecast && historicalData.forecast.forecastday) {
            historicalData.forecast.forecastday.forEach((day: any) => {
              processedHistoricalData.push({
                date: day.date,
                temp_c: day.day.avgtemp_c,
                temp_min: day.day.mintemp_c,
                temp_max: day.day.maxtemp_c,
                humidity: day.day.avghumidity,
                precip_mm: day.day.totalprecip_mm,
                precip_chance: day.day.daily_chance_of_rain || 0,
                wind_kph: day.day.maxwind_kph,
                wind_dir: 'N/A', // WeatherAPI non fornisce direzione del vento nei dati giornalieri
                cloud_cover: 0, // WeatherAPI non fornisce copertura nuvolosa nei dati giornalieri
                condition: day.day.condition.text
              });
            });
          }
          setHistoricalData(processedHistoricalData);
        }
      } catch (histErr) {
        console.warn('Avviso: impossibile caricare i dati storici', histErr);
        // Non interrompere il flusso principale se lo storico fallisce
        setHistoricalData([]);
      }

      // Salva i dati in cache
      saveToCache({
        currentWeather: {
          ...currentWeather,
          date: new Date().toISOString(),
          temp_c: weatherData.current.temp_c,
          temp_min: weatherData.current.temp_c,
          temp_max: weatherData.current.temp_c,
          humidity: weatherData.current.humidity,
          precip_mm: weatherData.current.precip_mm,
          precip_chance: weatherData.current.chance_of_rain || 0,
          wind_kph: weatherData.current.wind_kph,
          wind_dir: weatherData.current.wind_dir,
          cloud_cover: weatherData.current.cloud,
          condition: weatherData.current.condition.text
        },
        forecast: processedForecastData,
        historicalData: historicalData
      });

      setLoading(false);
    } catch (error) {
      let errorMessage = 'Errore nel caricamento dei dati meteo';
      
      if (err instanceof Error) {
        if (err.message.includes('API key')) {
          errorMessage = 'Chiave API non valida o scaduta. Verifica le impostazioni.';
        } else if (err.message.includes('401')) {
          errorMessage = 'Errore di autenticazione 401 - Unauthorized. La chiave API WeatherAPI potrebbe non essere valida o essere scaduta.';
          console.error('Errore di autenticazione WeatherAPI 401 - Unauthorized');
          console.error('Verifica la chiave API nel file .env (VITE_WEATHERAPI_KEY)');
        } else if (err.message.includes('network') || err.message.includes('rete') || err.message.includes('internet')) {
          errorMessage = 'Errore di connessione. Verifica la tua connessione internet.';
        } else if (err.message.includes('Timeout')) {
          errorMessage = 'Timeout della richiesta. Il server meteo potrebbe essere sovraccarico, riprova più tardi.';
        } else if (err.message.includes('AbortError')) {
          errorMessage = 'Richiesta interrotta. Verifica la tua connessione e riprova.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      
      // Prova a recuperare i dati dalla cache come fallback
      const cachedData = getFromCache();
      if (cachedData) {
        setCurrentWeather(cachedData.currentWeather);
        setForecast(cachedData.forecast);
        setHistoricalData(cachedData.historicalData);
        setError('Visualizzazione dati in cache - ' + errorMessage);
      } else {
        // Reset dei dati se non c'è cache
        setCurrentWeather(null);
        setForecast([]);
        setHistoricalData([]);
      }
    }
  };

  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setLocationSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const suggestions = await searchLocations(value);
      setLocationSuggestions(suggestions || []);
    } catch (err) {
      console.error('Errore nella ricerca dei suggerimenti:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setLocationSuggestions([]);
    // Salva la posizione nel localStorage per recuperarla quando l'utente rientra nella pagina
    localStorage.setItem('weatherLocation', JSON.stringify(location));
    fetchWeatherData(location.lat, location.lon);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setError(null);
    try {
      const locations = await searchLocations(searchQuery);
      if (locations && locations.length > 0) {
        handleLocationSelect(locations[0]);
      } else {
        setError('Nessuna località trovata con questo nome');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella ricerca');
    }
  };

  const handleGpsActivation = () => {
    setIsGpsLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Il tuo browser non supporta la geolocalizzazione. Prova a cercare manualmente una località.');
      setIsGpsLoading(false);
      return;
    }
    
    const maxRetries = 3;
    let retryCount = 0;
    
    const tryGetPosition = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await fetchLocationName(latitude, longitude);
            await fetchWeatherData(latitude, longitude);
            setIsGpsLoading(false);
          } catch (err) {
            handleGpsError(new Error('Errore nel recupero dei dati meteo. Prova a cercare manualmente una località.'));
          }
        },
        (err) => {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(tryGetPosition, 1000);
            return;
          }
          handleGpsError(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };
    
    const handleGpsError = (err: Error | GeolocationPositionError) => {
      let errorMessage = 'Errore durante l\'acquisizione della posizione. Prova a cercare manualmente una località.';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato. Prova a cercare manualmente una località nel campo di ricerca qui sopra.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Informazioni sulla posizione non disponibili. Prova a cercare manualmente una località nel campo di ricerca qui sopra.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Tempo scaduto per la richiesta di posizione. Prova a cercare manualmente una località nel campo di ricerca qui sopra.';
            break;
        }
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsGpsLoading(false);
    };
    
    tryGetPosition();
  };

  // Effetto per verificare se esiste già una posizione salvata nello store quando si carica il componente
  useEffect(() => {
    const initializeLocation = async () => {
      // Prima verifica se c'è una posizione selezionata nello store
      if (selectedLocation) {
        console.log('Posizione già selezionata nello store:', selectedLocation.name);
        await fetchWeatherData(selectedLocation.lat, selectedLocation.lon);
        return;
      }
      
      // Se non c'è una posizione nello store, verifica nel localStorage
      const savedLocationData = localStorage.getItem('weatherLocation');
      if (savedLocationData) {
        try {
          const savedLocation = JSON.parse(savedLocationData);
          if (savedLocation && savedLocation.lat && savedLocation.lon) {
            console.log('Recuperata posizione salvata dal localStorage:', savedLocation.name);
            setSelectedLocation(savedLocation);
            await fetchWeatherData(savedLocation.lat, savedLocation.lon);
            return;
          }
        } catch (err) {
          console.error('Errore nel recupero della posizione salvata:', err);
        }
      }
      
      // Se non c'è una posizione salvata, prova a rilevare automaticamente la posizione GPS
      console.log('Nessuna posizione salvata, tentativo di rilevamento GPS automatico...');
      setIsGpsLoading(true);
      
      if (!navigator.geolocation) {
        setError('Il tuo browser non supporta la geolocalizzazione. Prova a cercare manualmente una località.');
        setIsGpsLoading(false);
        return;
      }
      
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        const { latitude, longitude } = position.coords;
        await fetchLocationName(latitude, longitude);
        await fetchWeatherData(latitude, longitude);
      } catch (err) {
        console.error('Errore nel rilevamento automatico della posizione:', err);
        setError('Nessun dato meteo disponibile. Seleziona una località o utilizza la tua posizione attuale per visualizzare i dati meteo.');
      } finally {
        setIsGpsLoading(false);
      }
    };
    
    initializeLocation();
  }, [location.pathname]); // Riesegui quando cambia il pathname (quando l'utente torna nella sezione Meteo)

  // Effetto per inizializzare i dati meteo quando si carica il componente o cambia la posizione
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Verifica se abbiamo una località selezionata
        if (!selectedLocation) {
          console.warn('Nessuna località selezionata per il meteo');
          // Verifica se c'è una posizione salvata nel localStorage prima di richiedere il GPS
          const savedLocationData = localStorage.getItem('weatherLocation');
          if (savedLocationData) {
            try {
              const savedLocation = JSON.parse(savedLocationData);
              if (savedLocation && savedLocation.lat && savedLocation.lon) {
                console.log('Recuperata posizione salvata:', savedLocation.name);
                setSelectedLocation(savedLocation);
                // Carica immediatamente i dati meteo con la posizione salvata
                await fetchWeatherData(savedLocation.lat, savedLocation.lon);
                return;
              }
            } catch (err) {
              console.error('Errore nel recupero della posizione salvata:', err);
            }
          }
          // Se non c'è una posizione salvata o c'è stato un errore, richiedi il GPS
          handleGpsActivation();
          return;
        }
        
        const locationQuery = `${selectedLocation.lat},${selectedLocation.lon}`;
        
        // Recupera il meteo attuale con gestione errori migliorata
        try {
          const weatherData = await retryFetch(
            `${BASE_URL}/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(locationQuery)}&aqi=no&lang=it`
          );
          
          if (!weatherData) throw new Error('Dati meteo non disponibili');
          
          // Formatta i dati meteo
          const formattedWeather = {
            date: new Date().toISOString(),
            temp_c: weatherData.current.temp_c,
            temp_min: weatherData.current.temp_c, // Il meteo attuale non ha min/max
            temp_max: weatherData.current.temp_c,
            humidity: weatherData.current.humidity,
            precip_mm: weatherData.current.precip_mm,
            precip_chance: 0, // Non disponibile nel meteo attuale
            wind_kph: weatherData.current.wind_kph,
            wind_dir: weatherData.current.wind_dir,
            cloud_cover: weatherData.current.cloud,
            condition: weatherData.current.condition.text
          };
          
          setCurrentWeather(formattedWeather);
        } catch (weatherError) {
          console.error('Errore nel recupero del meteo attuale:', weatherError);
          // Non interrompiamo completamente il caricamento, proviamo a continuare con le previsioni
        }
        
        // Recupera le previsioni
        try {
          const forecastData = await retryFetch(
            `${BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(locationQuery)}&days=3&aqi=no&alerts=no&lang=it`
          );
          
          if (forecastData && forecastData.forecast && forecastData.forecast.forecastday) {
            const formattedForecast = await Promise.all(forecastData.forecast.forecastday.map(async (day: any) => {
              // Recupera i dati astronomici per ogni giorno con gestione errori migliorata
              let astroData = {
                moon_phase: 'Non disponibile',
                moon_illumination: '0',
                moonrise: 'Non disponibile',
                moonset: 'Non disponibile',
                sunrise: 'Non disponibile',
                sunset: 'Non disponibile'
              };
              
              try {
                // Utilizziamo un timeout per evitare blocchi indefiniti
                const astroResponse = await Promise.race([
                  fetch(`${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(locationQuery)}&dt=${day.date}&lang=it`),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (astroResponse.ok) {
                  const astroJson = await astroResponse.json();
                  if (astroJson && astroJson.astronomy && astroJson.astronomy.astro) {
                    astroData = astroJson.astronomy.astro;
                  }
                }
              } catch (astroError) {
                console.warn('Errore nel recupero dei dati astronomici:', astroError);
                // Continuiamo con i dati predefiniti
              }
              
              return {
                date: day.date,
                temp_c: day.day.avgtemp_c,
                temp_min: day.day.mintemp_c,
                temp_max: day.day.maxtemp_c,
                humidity: day.day.avghumidity,
                precip_mm: day.day.totalprecip_mm,
                precip_chance: day.day.daily_chance_of_rain,
                wind_kph: day.day.maxwind_kph,
                wind_dir: 'N/A', // Non disponibile nelle previsioni giornaliere
                cloud_cover: 0, // Non disponibile nelle previsioni giornaliere
                condition: day.day.condition.text,
                // Dati astronomici
                moonPhase: astroData.moon_phase || 'Non disponibile',
                moonIllumination: parseInt(astroData.moon_illumination || '0', 10),
                moonrise: astroData.moonrise || 'Non disponibile',
                moonset: astroData.moonset || 'Non disponibile',
                sunrise: astroData.sunrise || 'Non disponibile',
                sunset: astroData.sunset || 'Non disponibile'
              };
            }));
            
            setForecast(formattedForecast);
          }
        } catch (forecastError) {
          console.error('Errore nel recupero delle previsioni:', forecastError);
          // Non interrompiamo completamente il caricamento
        }
        
        // Recupera i dati storici
        try {
          const dates = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (i + 1));
            return date.toISOString().split('T')[0];
          });
          
          const historicalDataPromises = dates.map(async (date) => {
            try {
              const historyData = await retryFetch(
                `${BASE_URL}/history.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(locationQuery)}&dt=${date}&lang=it`
              );
              
              if (!historyData || !historyData.forecast || !historyData.forecast.forecastday || historyData.forecast.forecastday.length === 0) {
                return null;
              }
              
              const dayData = historyData.forecast.forecastday[0].day;
              
              // Recupera i dati astronomici storici con gestione errori migliorata
              let astroData = {
                moon_phase: 'Non disponibile',
                moon_illumination: '0',
                moonrise: 'Non disponibile',
                moonset: 'Non disponibile',
                sunrise: 'Non disponibile',
                sunset: 'Non disponibile'
              };
              
              try {
                const astroResponse = await Promise.race([
                  fetch(`${BASE_URL}/astronomy.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(locationQuery)}&dt=${date}&lang=it`),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                
                if (astroResponse.ok) {
                  const astroJson = await astroResponse.json();
                  if (astroJson && astroJson.astronomy && astroJson.astronomy.astro) {
                    astroData = astroJson.astronomy.astro;
                  }
                }
              } catch (astroError) {
                console.warn('Errore nel recupero dei dati astronomici storici:', astroError);
                // Continuiamo con i dati predefiniti
              }
              
              return {
                date,
                temp_c: dayData.avgtemp_c,
                temp_min: dayData.mintemp_c,
                temp_max: dayData.maxtemp_c,
                humidity: dayData.avghumidity,
                precip_mm: dayData.totalprecip_mm,
                precip_chance: dayData.daily_chance_of_rain || 0,
                wind_kph: dayData.maxwind_kph,
                wind_dir: 'N/A',
                cloud_cover: 0,
                condition: dayData.condition.text,
                // Dati astronomici
                moonPhase: astroData.moon_phase || 'Non disponibile',
                moonIllumination: parseInt(astroData.moon_illumination || '0', 10),
                moonrise: astroData.moonrise || 'Non disponibile',
                moonset: astroData.moonset || 'Non disponibile',
                sunrise: astroData.sunrise || 'Non disponibile',
                sunset: astroData.sunset || 'Non disponibile'
              };
            } catch (dayError) {
              console.warn(`Errore nel recupero dei dati storici per ${date}:`, dayError);
              return null;
            }
          });
          
          const historicalResults = await Promise.all(historicalDataPromises);
          const validHistoricalData = historicalResults.filter(data => data !== null);
          setHistoricalData(validHistoricalData);
        } catch (historicalError) {
          console.error('Errore nel recupero dei dati storici:', historicalError);
          // Non interrompiamo completamente il caricamento
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Errore generale nel caricamento dei dati meteo:', error);
        setError(error instanceof Error ? error.message : 'Errore sconosciuto nel caricamento dei dati meteo');
        setLoading(false);
      }
    };

    fetchData();
  }, [location.pathname, selectedLocation]);

  // Definizione dello stato per le notifiche popup
  const [showNotification, setShowNotification] = useState<'gps' | 'connection' | 'both' | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8eaa36]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4">
        <div className="flex items-center">
          <div className="py-1">
            <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold">Errore</p>
            <p>{error}</p>
            <button 
              onClick={() => fetchWeatherData()} 
              className="mt-2 px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded-md text-sm"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleUseCurrentLocation = () => {
    handleGpsActivation();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 meteo-container">
      <MeteoLogo />
      <div className="meteo-content">
      <div className="container mx-auto px-4 py-6 flex-grow pt-28"> {/* Padding-top aumentato per evitare sovrapposizione con il logo */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-800">Meteo</h1>
          </div>
          
          <div className="w-full md:w-auto flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Cerca località..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fd9a3c]"
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#fd9a3c]"></div>
                </div>
              )}
              
              {locationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {locationSuggestions.map((location, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleLocationSelect(location)}
                    >
                      <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                      <span>{location.name}, {location.region}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSearch}
              className="w-full md:w-auto px-4 py-2 bg-[#fd9a3c] text-white rounded-lg hover:bg-[#e88a2c] transition-colors"
            >
              Cerca
            </button>
            
            <button
              onClick={handleGpsActivation}
              disabled={isGpsLoading}
              className="w-full md:w-auto px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors flex items-center justify-center"
            >
              {isGpsLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Usa GPS
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <div className="flex items-center">
              <div className="py-1">
                <svg
                  className="w-6 h-6 mr-4 text-red-500 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-sm">Prova a selezionare un'altra località o a utilizzare il GPS.</p>
                {error.includes('API') && (
                  <div className="mt-2 text-sm">
                    <p className="font-semibold">Possibili soluzioni:</p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Verifica che la chiave API sia valida nel file .env</li>
                      <li>La chiave API potrebbe essere scaduta, consulta il file WEATHER_API_TROUBLESHOOTING.md</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
      {selectedLocation && (
        <div className="mb-6 bg-[#fd9a3c]/10 p-4 rounded-lg flex items-center">
          <MapPin className="w-5 h-5 text-[#fd9a3c] mr-2" />
          <div>
            <span className="font-medium">{selectedLocation.name}</span>
            {selectedLocation.region && (
              <span className="text-sm text-gray-600"> - {selectedLocation.region}</span>
            )}
          </div>
          <button 
            onClick={handleGpsActivation}
            className="ml-auto text-sm bg-[#fd9a3c]/10 hover:bg-[#fd9a3c]/20 text-[#fd9a3c] py-1 px-3 rounded-full flex items-center"
          >
            <Compass className="w-4 h-4 mr-1" />
            Usa posizione attuale
          </button>
        </div>
      )}
      </div>


      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fd9a3c]"></div>
        </div>
      ) : (
        <div>
          {currentWeather ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">Meteo Real Time - {selectedLocation?.name || 'Posizione attuale'}</h2>
                  <p className="text-sm text-gray-500 mb-4">{format(new Date(), "d MMMM yyyy, HH:mm", { locale: it })}</p>
                  <div className="flex items-center mb-6">
                    <div className="mr-4">
                      {getWeatherIcon(currentWeather.condition)}
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{currentWeather.temp_c.toFixed(1)}°C</div>
                      <div className="text-gray-600">{translateWeatherCondition(currentWeather.condition)}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Thermometer className="w-5 h-5 text-red-500 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Temperatura</div>
                        <div>{currentWeather.temp_c.toFixed(1)}°C</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Droplets className="w-5 h-5 text-[#fd9a3c] mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Umidità</div>
                        <div>{currentWeather.humidity}%</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Wind className={`w-5 h-5 ${getWindColor(currentWeather.wind_kph)} mr-2`} />
                      <div>
                        <div className="text-sm text-gray-500">Vento</div>
                        <div>{currentWeather.wind_kph.toFixed(1)} km/h {currentWeather.wind_dir}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <CloudRain className="w-5 h-5 text-[#fd9a3c]/80 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Precipitazioni</div>
                        <div>{currentWeather.precip_mm.toFixed(1)} mm</div>
                      </div>
                    </div>
                    
                    {/* Dati meteo aggiuntivi */}
                    <div className="flex items-center">
                      <ArrowUpDown className="w-5 h-5 text-purple-500 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Nuvolosità</div>
                        <div>{currentWeather.cloud_cover}%</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Thermometer className="w-5 h-5 text-orange-500 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Probabilità pioggia</div>
                        <div>{currentWeather.precip_chance || 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Fase Lunare</h2>
                  <MoonPhase />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-lg">
              <div className="flex items-center">
                <div className="py-1">
                  <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold">Nessun dato meteo disponibile</p>
                  <p>{error ? error : 'Seleziona una località o utilizza la tua posizione attuale per visualizzare i dati meteo.'}</p>
                  <div className="flex space-x-2 mt-2">
                    <button 
                      onClick={handleGpsActivation}
                      className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 py-1 px-3 rounded text-sm flex items-center"
                    >
                      <Compass className="w-4 h-4 mr-1" />
                      Usa posizione attuale
                    </button>
                    <button
                      onClick={() => setError(null)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm flex items-center"
                    >
                      Riprova
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentWeather && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Previsioni</h2>
                <Link 
                  to="/previsioni" 
                  className="text-[#fd9a3c] hover:text-[#e88a2c] flex items-center"
                >
                  Dettagli <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
              <WeatherForecast />
            </div>
          )}
          
          {currentWeather && historicalData.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Grafico Meteo - {selectedLocation?.name || 'Posizione attuale'}</h2>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData.map(day => ({
                        date: format(parseISO(day.date), 'dd/MM'),
                        temperatura: day.temp_c,
                        umidità: day.humidity,
                        precipitazioni: day.precip_mm
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="temperatura"
                        stroke="#fd9a3c"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="umidità"
                        stroke="#fd9a3c"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="precipitazioni"
                        stroke="#8eaa36"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <FixedFooter />
      </div>
    </div>
  );
}

export default Meteo;