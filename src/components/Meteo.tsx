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

// Costanti per WeatherAPI
const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';
import MeteoLogo from './MeteoLogo';
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
  columnHelper.accessor('precip_mm', {
    header: 'Precipitazioni (mm)',
    cell: info => info.getValue().toFixed(1),
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
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    case 'snow':
    case 'light snow':
    case 'heavy snow':
      return <CloudSnow className="w-8 h-8 text-blue-300" />;
    case 'thunderstorm':
      return <CloudLightning className="w-8 h-8 text-yellow-600" />;
    default:
      return <Cloud className="w-8 h-8 text-gray-500" />;
  }
};

const getWindColor = (speed: number) => {
  if (speed < 20) return 'text-green-500';
  if (speed < 40) return 'text-yellow-500';
  if (speed < 60) return 'text-orange-500';
  return 'text-red-500';
};

const getHumidityColor = (humidity: number) => {
  if (humidity < 30) return 'bg-red-100';
  if (humidity < 50) return 'bg-green-100';
  if (humidity < 70) return 'bg-blue-100';
  return 'bg-purple-100';
};

function Meteo() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
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
        setSelectedLocation({
          name: locations[0].name,
          region: locations[0].region || '',
          lat: locations[0].lat,
          lon: locations[0].lon
        });
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
        condition: weatherData.current.condition.text
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
    } catch (err) {
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
      setError('Il tuo browser non supporta la geolocalizzazione');
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
            handleGpsError(new Error('Errore nel recupero dei dati meteo'));
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
      let errorMessage = 'Errore durante l\'acquisizione della posizione';
      
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato. Prova a cercare manualmente una località.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Informazioni sulla posizione non disponibili. Prova a cercare manualmente una località.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Tempo scaduto per la richiesta di posizione. Prova a cercare manualmente una località.';
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

  useEffect(() => {
    const unsubscribe = useTrackStore.subscribe(
      (state) => state.currentTrack?.coordinates,
      (coordinates) => {
        if (coordinates && coordinates.length > 0) {
          const lastPosition = coordinates[coordinates.length - 1];
          fetchWeatherData(lastPosition[1], lastPosition[0]);
        }
      }
    );

    // Osserva i cambiamenti della località selezionata nello store
    const unsubscribeLocation = useWeatherStore.subscribe(
      (state) => state.selectedLocation,
      (location) => {
        if (location) {
          fetchWeatherData(location.lat, location.lon);
        }
      }
    );

    fetchWeatherData();
    return () => {
      unsubscribe();
      unsubscribeLocation();
    };
  }, []);

  // Definizione dello stato per le notifiche popup
  const [showNotification, setShowNotification] = useState<'gps' | 'connection' | 'both' | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16">
      {showNotification && (
        <PopupNotification
          type={showNotification}
          onClose={() => setShowNotification(null)}
        />
      )}
      {error && (
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
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">

        {currentWeather && (
          <>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold">
                    {selectedLocation?.name || 'Posizione attuale'}
                    {selectedLocation && (
                      <span className="block text-xs text-gray-500">
                        {selectedLocation.lat.toFixed(4)}°, {selectedLocation.lon.toFixed(4)}°
                      </span>
                    )}
                  </h2>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-medium text-blue-600 mb-1">Condizioni in tempo reale</h3>
                  <span className="text-base font-bold text-gray-700">
                    {format(new Date(), "d MMMM yyyy HH:mm", { locale: it })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Thermometer className="w-5 h-5 text-orange-500" />
                    <h3 className="text-sm font-medium">Temperatura</h3>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {currentWeather.temp_c}°C
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Min: {currentWeather.temp_min}°C</span>
                    <span>Max: {currentWeather.temp_max}°C</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CloudRain className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-medium">Precipitazioni</h3>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {currentWeather.precip_mm} mm
                  </div>
                  <div className="text-xs text-gray-600">
                    Probabilità: {currentWeather.precip_chance}%
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wind className="w-5 h-5 text-green-500" />
                    <h3 className="text-sm font-medium">Vento</h3>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {currentWeather.wind_kph.toFixed(1)} km/h
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Compass className="w-3 h-3" />
                    <span>{currentWeather.wind_dir}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-medium">Umidità</h3>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {currentWeather.humidity}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 rounded-full h-1.5"
                      style={{ width: `${currentWeather.humidity}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-3">
          <WeatherForecast />
        </div>
        
        {/* Sezione rimossa: Dati Storici NOAA */}

            {/* Tabella Dati Storici rimossa come richiesto */}
          </>
        )}
      </div>
      <FixedFooter />
    </div>
  );
}

export default Meteo;