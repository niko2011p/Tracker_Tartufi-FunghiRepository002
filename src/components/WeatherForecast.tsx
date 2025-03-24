import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, Droplets, Wind, ArrowUpDown, Navigation, Compass, Loader2, AlertCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTrackStore } from '../store/trackStore';
import { getForecast, getHistoricalWeather, getHourlyForecast } from '../services/weatherService';
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
}

interface HistoricalWeatherData {
  temperature: number;
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
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [hourlyForecast, setHourlyForecast] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const currentTrack = useTrackStore(state => state.currentTrack);

  useEffect(() => {
    const loadWeatherData = async () => {
      if (selectedLocation) {
        setLoading(true);
        setError(null);
        try {
          const locationQuery = `${selectedLocation.lat},${selectedLocation.lon}`;
          
          // Carica previsioni a 3 giorni
          const forecastData = await getForecast(locationQuery);
          setForecast(forecastData);
          console.log('Dati previsioni caricate:', forecastData);
          
          // Carica previsioni orarie
          const hourlyData = await getHourlyForecast(locationQuery);
          setHourlyForecast(hourlyData);
          console.log('Dati previsioni orarie caricate:', hourlyData);
          
          // Carica dati storici (ultimi 7 giorni)
          const historicalWeatherData = await getHistoricalWeather(locationQuery);
          setHistoricalData(historicalWeatherData);
          console.log('Dati storici caricati:', historicalWeatherData);
          
          setLoading(false);
        } catch (error) {
          console.error('Error fetching weather data:', error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('Impossibile caricare i dati meteo. Verifica la configurazione API.');
          }
          setLoading(false);
        }
      } else {
        // Se non c'è una posizione selezionata, prova a usare Roma come default
        try {
          setLoading(true);
          const defaultLocation = { name: 'Roma', lat: 41.9028, lon: 12.4964, country: 'Italia' };
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
          console.error('Error fetching default weather data:', error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('Impossibile caricare i dati meteo. Verifica la configurazione API.');
          }
          setLoading(false);
        }
      }
    };
    loadWeatherData();
  }, [selectedLocation]);

  const renderWeatherIcon = (condition: string) => {
    if (!condition) return <Cloud className="w-8 h-8 text-gray-500" />;
    
    switch (condition.toLowerCase()) {
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
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow':
      case 'light snow':
      case 'heavy snow':
      case 'patchy snow possible':
      case 'patchy light snow':
      case 'moderate or heavy snow showers':
        return <CloudSnow className="w-8 h-8 text-blue-200" />;
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
      return (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{weather.location?.name || 'Posizione attuale'}</h2>
              <p className="text-gray-600">{format(new Date(weather.date), 'EEEE d MMMM yyyy', { locale: it })}</p>
            </div>
            {renderWeatherIcon(weather.condition)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Thermometer className="w-5 h-5 mr-2 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Temperatura</p>
                <p className="font-semibold">{weather.temp_c}°C</p>
                <p className="text-xs text-gray-500">
                  Min: {weather.temp_min}°C / Max: {weather.temp_max}°C
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Umidità</p>
                <p className="font-semibold">{weather.humidity}%</p>
                <p className="text-xs text-gray-500">Precipitazioni: {weather.precip_mm || 0}mm</p>
              </div>
            </div>

            <div className="flex items-center">
              <Wind className="w-5 h-5 mr-2 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Vento</p>
                <p className="font-semibold">{weather.wind_kph} km/h</p>
                <p className="text-xs text-gray-500">Direzione: {weather.wind_dir}</p>
              </div>
            </div>

            <div className="flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Pressione</p>
                <p className="font-semibold">{weather.pressure_mb !== undefined ? `${weather.pressure_mb} mb` : 'N/A'}</p>
                <p className="text-xs text-gray-500">UV: {weather.uv !== undefined ? weather.uv : 'N/A'}</p>
              </div>
            </div>
          </div>

          {hourlyForecast && hourlyForecast.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Previsioni orarie</h3>
              <div className="flex overflow-x-auto space-x-4 pb-2">
                {hourlyForecast.map((hour: any, index: number) => (
                  <div key={index} className="flex-shrink-0 text-center p-2 bg-gray-50 rounded">
                    <p className="text-sm">{format(new Date(hour.time), 'HH:mm')}</p>
                    {renderWeatherIcon(hour.condition?.text || 'cloudy')}
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
            <Loader2 className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
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
            <h3 className="text-lg font-semibold mb-4">Storico ultimi 7 giorni</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Data</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Temperatura</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Umidità</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Precipitazioni</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Vento</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Condizioni</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.slice(0, 7).map((day, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {format(day.timestamp, 'EEEE d MMMM yyyy', { locale: it })}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{day.temperature}°C</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{day.humidity}%</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{day.precipitation} mm</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{day.windSpeed} km/h ({day.windDirection || 'N/A'})</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{day.condition}</td>
                    </tr>
                  ))}
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

  return (
    <div className="container mx-auto px-4 py-8">
      {forecast.length > 0 && (
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={handlePrevDay} 
            disabled={currentIndex === 0}
            className={`p-2 rounded ${currentIndex === 0 ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold">Previsioni a 3 giorni</h2>
            <p className="text-sm text-gray-600">
              Giorno {currentIndex + 1} di {forecast.length}
            </p>
          </div>
          
          <button 
            onClick={handleNextDay} 
            disabled={currentIndex === forecast.length - 1}
            className={`p-2 rounded ${currentIndex === forecast.length - 1 ? 'text-gray-400' : 'text-blue-500 hover:bg-blue-50'}`}
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