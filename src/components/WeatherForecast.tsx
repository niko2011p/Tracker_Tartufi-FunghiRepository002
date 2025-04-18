import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, Droplets, Wind, ArrowUpDown, Navigation, Compass, Loader2, AlertCircle, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Moon, Sunrise, Sunset } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTrackStore } from '../store/trackStore';
import { useWeatherStore } from '../store/weatherStore';
import { getForecast, getHistoricalWeather, getHourlyForecast } from '../services/weatherService';
import { searchLocations } from '../services/locationSearchService';
import { WeatherData as WeatherDataType, HourlyWeather as HourlyWeatherType } from '../types';
interface WeatherData {
  date: string;
  temp_c: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_kph: number;
  wind_dir: string;
  condition: string;
  location?: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  precip_mm: number;
  // Proprietà opzionali per compatibilità con WeatherAPI
  uv?: number;
  pressure_mb?: number;
  feelslike_c?: number;
  vis_km?: number;
  gust_kph?: number;
  is_day?: number;
  cloud?: number;
  dewpoint_c?: number;
  chance_of_rain?: number;
  // Informazioni lunari e solari
  moonPhase?: string;
  moonIllumination?: number;
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;
}

interface HistoricalWeatherData {
  temperature: number;
  maxTemp: number;
  minTemp: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  cloudCover: number;
  condition: string;
  timestamp: Date;
}

interface WeatherHistoryData {
  date: string;
  maxtemp_c: number;
  mintemp_c: number;
  avgtemp_c: number;
  maxwind_kph: number;
  totalprecip_mm: number;
  avghumidity: number;
  condition: {
    text: string;
    icon: string;
    code: number;
  };
  daily_will_it_rain: number;
  daily_chance_of_rain: number;
  daily_will_it_snow: number;
  daily_chance_of_snow: number;
  uv: number;
}

interface Location {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface LocationSuggestion {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  country: string;
  region: string;
}

const WeatherForecast: React.FC = () => {
  // Funzione per tradurre le fasi lunari in italiano
  const getItalianPhase = (phase: string): string => {
    const phases: { [key: string]: string } = {
      'New Moon': 'Luna Nuova',
      'Waxing Crescent': 'Luna Crescente',
      'First Quarter': 'Primo Quarto',
      'Waxing Gibbous': 'Gibbosa Crescente',
      'Full Moon': 'Luna Piena',
      'Waning Gibbous': 'Gibbosa Calante',
      'Last Quarter': 'Ultimo Quarto',
      'Waning Crescent': 'Luna Calante',
      // Aggiungi varianti per compatibilità con WeatherAPI
      'New': 'Luna Nuova',
      'Waxing crescent': 'Luna Crescente',
      'First quarter': 'Primo Quarto',
      'Waxing gibbous': 'Gibbosa Crescente',
      'Full': 'Luna Piena',
      'Waning gibbous': 'Gibbosa Calante',
      'Last quarter': 'Ultimo Quarto',
      'Waning crescent': 'Luna Calante'
    };
    return phases[phase] || phase;
  };
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [hourlyForecast, setHourlyForecast] = useState<any[]>([]);
  const [filteredHourlyForecast, setFilteredHourlyForecast] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const currentTrack = useTrackStore(state => state.currentTrack);
  
  // Utilizzo lo store condiviso per la località
  const selectedLocation = useWeatherStore(state => state.selectedLocation);
  const setSelectedLocation = useWeatherStore(state => state.setSelectedLocation);

  useEffect(() => {
    const loadWeatherData = async () => {
      if (selectedLocation) {
        setLoading(true);
        setError(null);
        try {
          const locationQuery = `${selectedLocation.lat},${selectedLocation.lon}`;
          
          console.log('[WeatherForecast] Loading forecast, hourly, and historical data...');
          // Load forecast, hourly, and historical data first
          const [forecastData, hourlyData, historicalWeatherData] = await Promise.all([
            getForecast(locationQuery),
            getHourlyForecast(locationQuery),
            getHistoricalWeather(locationQuery)
          ]);
          
          setForecast(forecastData);
          console.log('[WeatherForecast] Dati previsioni caricate:', forecastData);
          setHourlyForecast(hourlyData);
          console.log('[WeatherForecast] Dati previsioni orarie caricate:', hourlyData);
          setHistoricalData(historicalWeatherData);
          console.log('[WeatherForecast] Dati storici caricati:', historicalWeatherData);
          
          // Now, attempt to load current weather separately with specific error handling
          try {
            console.log('[WeatherForecast] Attempting to load current weather via store...');
            await useWeatherStore.getState().fetchCurrentWeather(locationQuery);
             console.log('[WeatherForecast] Current weather loaded successfully via store.');
          } catch (currentWeatherError) {
            // Log the specific error received from the store/service
            console.warn(`[WeatherForecast] Fallback: Failed to load current weather. Error: ${currentWeatherError instanceof Error ? currentWeatherError.message : String(currentWeatherError)}`);
            setError(`Meteo corrente non disponibile (${currentWeatherError instanceof Error ? currentWeatherError.message : 'Errore sconosciuto'}). Vengono mostrati i dati di previsione.`); // Set a specific error message
            
            // Use forecast data as fallback (no state change needed here as fetchCurrentWeather in store handles setting currentWeather to null)
            if (forecastData && forecastData.length > 0) {
              console.log('[WeatherForecast] Using forecast data as fallback for display.');
            }
          }
          
        } catch (error) {
          // This outer catch handles errors from getForecast, getHourly, getHistorical
          console.error('[WeatherForecast] Error fetching forecast/hourly/historical data:', error);
          if (error instanceof Error) {
             // Avoid setting a generic error if a specific one was already set by the inner catch
            if (!error) {
                 setError(error.message); 
            }
          } else if (!error) {
            setError('Impossibile caricare dati meteo principali. Verifica la configurazione API.');
          }
        } finally {
          setLoading(false); // Ensure loading is always set to false
        }
      } else {
        console.log('[WeatherForecast] No selected location. Attempting default/GPS...');
        // Se non c'è una posizione selezionata, prova a usare Roma come default
        try {
          setLoading(true);
          const defaultLocation = { name: 'Roma', lat: 41.9028, lon: 12.4964, country: 'Italia' };
          console.log('[WeatherForecast] Using default location: Roma');
          setSelectedLocation(defaultLocation);
          
          const locationQuery = `${defaultLocation.lat},${defaultLocation.lon}`;
          
          // Carica previsioni a 3 giorni
          const forecastData = await getForecast(locationQuery);
          setForecast(forecastData);
          
          // Carica previsioni orarie
          const hourlyData = await getHourlyForecast(locationQuery);
          setHourlyForecast(hourlyData);
          
          // Carica dati storici
          const historicalWeatherData = await getHistoricalWeather(locationQuery);
          setHistoricalData(historicalWeatherData);
          
          setLoading(false);
        } catch (error) {
          console.error('[WeatherForecast] Error setting default location:', error);
          setError('Impossibile determinare la località predefinita.');
          setLoading(false);
        }
      }
    };
    loadWeatherData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]); // Keep dependency array minimal
  
  // Filtra le previsioni orarie in base al giorno selezionato
  useEffect(() => {
    if (hourlyForecast.length > 0 && forecast.length > 0) {
      // Ottieni la data del giorno selezionato
      const selectedDate = forecast[currentIndex].timestamp;
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      // Filtra le previsioni orarie per mostrare solo quelle del giorno selezionato
      const filteredHours = hourlyForecast.filter(hour => {
        const hourDate = new Date(hour.time).toISOString().split('T')[0];
        return hourDate === selectedDateStr;
      });
      
      setFilteredHourlyForecast(filteredHours);
    }
  }, [hourlyForecast, forecast, currentIndex]);

  // Funzione per determinare il colore del vento in base alla velocità
  const getWindColor = (speed: number) => {
    if (speed < 20) return 'text-[#8eaa36]';
    if (speed < 40) return 'text-yellow-500';
    if (speed < 60) return 'text-orange-500';
    return 'text-red-500';
  };

  // Funzione per determinare il colore dell'umidità in base alla percentuale
  const getHumidityColor = (humidity: number) => {
    if (humidity < 30) return 'text-red-500';
    if (humidity < 50) return 'text-[#8eaa36]';
    if (humidity < 70) return 'text-[#fd9a3c]';
    return 'text-purple-500';
  };

  // Funzione per ottenere il colore di sfondo in base all'umidità
  const getHumidityBackgroundColor = (humidity: number) => {
    if (humidity < 30) return 'bg-red-100';
    if (humidity < 50) return 'bg-[#8eaa36]/10';
    if (humidity < 70) return 'bg-[#fd9a3c]/10';
    return 'bg-purple-100';
  };

  // Funzione per renderizzare l'icona direzionale del vento
  const renderWindDirectionIcon = (direction: string, speed: number) => {
    const colorClass = getWindColor(speed);
    
    // Determina l'icona in base alla direzione del vento
    switch(direction) {
      case 'N':
        return <ArrowUp className={`w-4 h-4 ${colorClass}`} />;
      case 'NE':
        return <ArrowUp className={`w-4 h-4 ${colorClass} rotate-45`} />;
      case 'E':
        return <ArrowRight className={`w-4 h-4 ${colorClass}`} />;
      case 'SE':
        return <ArrowRight className={`w-4 h-4 ${colorClass} rotate-45`} />;
      case 'S':
        return <ArrowDown className={`w-4 h-4 ${colorClass}`} />;
      case 'SW':
        return <ArrowDown className={`w-4 h-4 ${colorClass} rotate-45`} />;
      case 'W':
        return <ArrowLeft className={`w-4 h-4 ${colorClass}`} />;
      case 'NW':
        return <ArrowLeft className={`w-4 h-4 ${colorClass} rotate-45`} />;
      default:
        return <Compass className={`w-4 h-4 ${colorClass}`} />;
    }
  };

  const renderWeatherIcon = (weather: WeatherData | HourlyWeatherType) => {
    // Se abbiamo l'icona dalla API, usiamo quella
    if (weather.conditionIcon) {
      // Le icone dell'API WeatherAPI sono URL come //cdn.weatherapi.com/weather/64x64/day/116.png
      // Dobbiamo assicurarci che l'URL sia completo con https:
      const iconUrl = weather.conditionIcon.startsWith('//') 
        ? `https:${weather.conditionIcon}` 
        : weather.conditionIcon.startsWith('http') 
          ? weather.conditionIcon 
          : `https:${weather.conditionIcon}`;
      
      return <img src={iconUrl} alt={weather.condition || 'Weather condition'} className="w-8 h-8" onError={(e) => {
        console.error('Error loading weather icon:', e);
        // Fallback to default icon on error
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement?.appendChild(
          document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        );
      }} />;
    }
    
    // Fallback alle icone locali se non abbiamo l'icona dall'API
    if (!weather.condition) return <Cloud className="w-8 h-8 text-gray-500" />;
    
    switch (weather.condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'partly cloudy':
      case 'cloudy':
      case 'overcast':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'light rain':
      case 'moderate rain':
      case 'heavy rain':
      case 'light drizzle':
      case 'patchy rain possible':
      case 'patchy light rain':
      case 'moderate rain at times':
      case 'heavy rain at times':
        return <CloudRain className="w-8 h-8 text-[#fd9a3c]" />;
      case 'snow':
      case 'light snow':
      case 'heavy snow':
      case 'patchy snow possible':
      case 'patchy light snow':
      case 'moderate or heavy snow showers':
        return <CloudSnow className="w-8 h-8 text-[#fd9a3c]/70" />;
      case 'thunderstorm':
      case 'thundery outbreaks possible':
      case 'patchy light rain with thunder':
      case 'moderate or heavy rain with thunder':
        return <CloudLightning className="w-8 h-8 text-yellow-600" />;
      default:
        return <Cloud className="w-8 h-8 text-gray-500" />;
    }
  };

  const renderWeatherDetails = (weather: WeatherData) => {
    if (!weather) return null;

    try {
      // Estrai la data dalla timestamp
      const date = weather.timestamp.toISOString().split('T')[0];
      
      return (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedLocation?.name || 'Posizione attuale'}</h2>
              <p className="text-gray-600">{format(weather.timestamp, 'EEEE d MMMM yyyy', { locale: it })}</p>
            </div>
            {renderWeatherIcon(weather)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Thermometer className="w-5 h-5 mr-2 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Temperatura</p>
                <p className="font-semibold">{weather.temperature}°C</p>
                <p className="text-xs text-gray-500">
                  Temperatura media giornaliera
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-[#fd9a3c]" />
              <div>
                <p className="text-sm text-gray-600">Umidità</p>
                <p className="font-semibold">{weather.humidity}%</p>
                <p className="text-xs text-gray-500">Precipitazioni: {weather.precipitation || 0}mm</p>
              </div>
            </div>

            <div className="flex items-center">
              <Wind className="w-5 h-5 mr-2 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Vento</p>
                <p className="font-semibold">{weather.windSpeed} km/h</p>
                <p className="text-xs text-gray-500">Direzione: {weather.windDirection}</p>
              </div>
            </div>

            <div className="flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Nuvolosità</p>
                <p className="font-semibold">{weather.cloudCover}%</p>
                <p className="text-xs text-gray-500">Condizioni: {weather.condition}</p>
              </div>
            </div>
            
            {/* Dati astronomici */}
            <div className="flex items-center">
              <Moon className="w-5 h-5 mr-2 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Fase Lunare</p>
                <p className="font-semibold">{getItalianPhase(weather.moonPhase) || 'Luna Nuova'}</p>
                <p className="text-xs text-gray-500">Illuminazione: {typeof weather.moonIllumination === 'number' ? weather.moonIllumination : 0}%</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex mr-2">
                <Sunrise className="w-5 h-5 text-orange-500" />
                <Sunset className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Alba/Tramonto</p>
                <p className="text-xs text-gray-500">Alba: {weather.sunrise || 'N/A'}</p>
                <p className="text-xs text-gray-500">Tramonto: {weather.sunset || 'N/A'}</p>
              </div>
            </div>
          </div>

          {filteredHourlyForecast && filteredHourlyForecast.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Previsioni orarie - {format(forecast[currentIndex].timestamp, 'EEEE d MMMM', { locale: it })}</h3>
              <div className="flex overflow-x-auto space-x-4 pb-2">
                {filteredHourlyForecast.map((hour: any, index: number) => (
                  <div key={index} className="flex-shrink-0 text-center p-2 bg-gray-50 rounded">
                    <p className="text-sm">{format(new Date(hour.time), 'HH:mm')}</p>
                    {renderWeatherIcon(hour)}
                    <p className="font-semibold">{hour.temp_c}°C</p>
                    <p className="text-xs text-gray-500">{hour.chance_of_rain || 0}% pioggia</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Errore nel rendering dei dettagli meteo:', error);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-lg font-medium text-red-700 mb-2">Errore nella visualizzazione dei dati meteo</h4>
          <p className="text-red-600">Si è verificato un errore durante la visualizzazione dei dati meteo. Riprova più tardi.</p>
        </div>
      );
    }
  };

  const renderContent = () => {
    try {
      if (loading) {
        return (
          <div className="text-center py-4">
            <Loader2 className="animate-spin h-8 w-8 text-[#fd9a3c] mx-auto" />
            <p className="mt-2 text-gray-600">Caricamento dati meteo...</p>
          </div>
        );
      }

      if (error) {
        return (
          <div className="text-center py-4 text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="mt-2">{error}</p>
          </div>
        );
      }

      if (historicalData && historicalData.length > 0) {
        return (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Storico ultimi 7 giorni - {selectedLocation?.name || 'Posizione attuale'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Data</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <CloudRain className="w-4 h-4 mr-1 text-[#fd9a3c]" />
                        <span>Precipitazioni</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Thermometer className="w-4 h-4 mr-1 text-red-500" />
                        <span>Temp. max</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Thermometer className="w-4 h-4 mr-1 text-[#fd9a3c]" />
                        <span>Temp. min</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Droplets className="w-4 h-4 mr-1 text-teal-500" />
                        <span>Umidità</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Wind className="w-4 h-4 mr-1 text-gray-500" />
                        <span>Vento</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Cloud className="w-4 h-4 mr-1 text-gray-500" />
                        <span>Condizioni</span>
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                      <div className="flex items-center">
                        <Moon className="w-4 h-4 mr-1 text-yellow-500" />
                        <span>Fase Lunare</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.slice(0, 7).map((day, index) => {
                    // Determina la classe di colore in base alla quantità di precipitazioni
                    let precipClass = '';
                    let textColor = '';
                    
                    if (day.precipitation > 0) {
                      if (day.precipitation > 20) {
                        precipClass = 'bg-[#0288D1]';
                        textColor = 'text-white';
                      } else if (day.precipitation > 10) {
                        precipClass = 'bg-[#81D4FA]';
                      } else {
                        precipClass = 'bg-[#E0F7FA]';
                      }
                    }
                    
                    return (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} ${precipClass} ${textColor} transition-colors duration-300`}
                      >
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-gray-600">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                              </svg>
                            </span>
                            <div className="flex flex-col leading-tight">
                              <span className="font-medium text-gray-900">{format(day.timestamp, 'EEEE', { locale: it })}</span>
                              <span className="text-xs text-gray-500">{format(day.timestamp, 'd MMM yyyy', { locale: it })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className={`flex items-center ${day.precipitation > 0 ? 'font-semibold' : ''}`}>
                            <CloudRain className={`w-4 h-4 mr-1 ${day.precipitation > 0 ? 'text-[#fd9a3c]' : 'text-gray-400'}`} />
                            <span className={`px-2 py-1 rounded ${day.precipitation > 20 ? 'bg-[#0288D1] text-white' : day.precipitation > 10 ? 'bg-[#81D4FA]' : day.precipitation > 0 ? 'bg-[#E0F7FA]' : ''}`}>
                              {day.precipitation} mm
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Thermometer className="w-4 h-4 mr-1 text-red-500" />
                            <span className={`font-medium px-2 py-1 rounded ${day.maxTemp > 25 ? 'bg-red-100' : day.maxTemp > 15 ? 'bg-yellow-100' : 'bg-blue-100'}`}>{day.maxTemp}°C</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Thermometer className="w-4 h-4 mr-1 text-[#fd9a3c]" />
                            <span className={`font-medium px-2 py-1 rounded ${day.minTemp < 5 ? 'bg-[#fd9a3c]/10' : day.minTemp < 10 ? 'bg-[#8eaa36]/10' : 'bg-yellow-100'}`}>{day.minTemp}°C</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Droplets className={`w-4 h-4 mr-1 ${getHumidityColor(day.humidity)}`} />
                            <span className={`font-medium px-2 py-1 rounded-full ${getHumidityBackgroundColor(day.humidity)}`}>{day.humidity}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            {renderWindDirectionIcon(day.windDirection || 'N/A', day.windSpeed)}
                            <span className="ml-2">{day.windSpeed} km/h ({day.windDirection || 'N/A'})</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            {renderWeatherIcon(day)}
                            <span className="ml-2">{day.condition}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Moon className="w-4 h-4 mr-1 text-yellow-500" />
                            <div className="flex flex-col">
                              <span>{getItalianPhase(day.moonPhase) || 'N/A'}</span>
                              <span>{day.moonIllumination || 0}% illuminazione</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      return null;
    } catch (error) {
      console.error('Errore nel rendering dei dati storici:', error);
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-lg font-medium text-red-700 mb-2">Errore nella visualizzazione dei dati storici</h4>
          <p className="text-red-600">Si è verificato un errore durante la visualizzazione dei dati storici. Riprova più tardi.</p>
        </div>
      );
    }
  };

  const handlePrevDay = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (currentIndex < forecast.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const searchLocations = async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/search.json?key=${import.meta.env.VITE_WEATHERAPI_KEY}&q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) throw new Error('Errore nella ricerca delle località');
      const locations = await response.json();
      
      return locations.map((loc: any) => ({
        name: loc.name,
        region: loc.region || '',
        country: loc.country || '',
        lat: loc.lat,
        lon: loc.lon
      }));
    } catch (err) {
      console.error('Errore nella ricerca delle località:', err);
      return [];
    }
  };

  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoadingLocation(true);
    try {
      const suggestions = await searchLocations(value);
      setSuggestions(suggestions || []);
    } catch (err) {
      console.error('Errore nella ricerca dei suggerimenti:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setSuggestions([]);
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

  const handleGpsLocation = () => {
    setIsLoadingLocation(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Il tuo browser non supporta la geolocalizzazione');
      setIsLoadingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locations = await searchLocations(`${latitude},${longitude}`);
          if (locations && locations.length > 0) {
            handleLocationSelect(locations[0]);
          } else {
            // Se non trova una località specifica, usa le coordinate
            setSelectedLocation({
              name: 'Posizione attuale',
              lat: latitude,
              lon: longitude,
              country: ''
            });
          }
          setIsLoadingLocation(false);
        } catch (err) {
          setError('Errore nel recupero della località');
          setIsLoadingLocation(false);
        }
      },
      (err) => {
        let errorMessage = 'Errore durante l\'acquisizione della posizione';
        if (err instanceof GeolocationPositionError) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permesso di geolocalizzazione negato';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Informazioni sulla posizione non disponibili';
              break;
            case err.TIMEOUT:
              errorMessage = 'Tempo scaduto per la richiesta di posizione';
              break;
          }
        }
        setError(errorMessage);
        setIsLoadingLocation(false);
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Cerca località..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#fd9a3c] focus:border-[#fd9a3c]"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                {suggestions.map((location, index) => (
                  <button
                    key={`${location.name}-${index}`}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{location.name}</div>
                      {location.region && (
                        <div className="text-sm text-gray-600">{location.region}, {location.country}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#fd9a3c] text-white rounded-lg hover:bg-[#e88a2c] transition-colors duration-400 flex items-center justify-center gap-2"
          >
            <span>Cerca</span>
          </button>
          <button
            onClick={handleGpsLocation}
            className="px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400 flex items-center justify-center gap-2"
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Compass className="w-5 h-5" />
                <span>Usa GPS</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {forecast.length > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={handlePrevDay} 
            disabled={currentIndex === 0}
            className={`p-2 rounded ${currentIndex === 0 ? 'text-gray-400' : 'text-[#fd9a3c] hover:bg-[#fd9a3c]/10'}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">Previsioni a 3 giorni - {selectedLocation?.name || 'Posizione attuale'}</h2>
            <p className="text-sm text-gray-600">
              Giorno {currentIndex + 1} di {forecast.length}
            </p>
          </div>
          
          <button 
            onClick={handleNextDay} 
            disabled={currentIndex === forecast.length - 1}
            className={`p-2 rounded ${currentIndex === forecast.length - 1 ? 'text-gray-400' : 'text-[#fd9a3c] hover:bg-[#fd9a3c]/10'}`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {forecast.length > 0 && renderWeatherDetails(forecast[currentIndex])}
      {renderContent()}
    </div>
  );
};

export default WeatherForecast;