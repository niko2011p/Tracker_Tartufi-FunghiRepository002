import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Thermometer, Droplets, Wind, ArrowUpDown, Navigation, Compass } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTrackStore } from '../store/trackStore';

interface WeatherData {
  date: string;
  temp_c: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_kph: number;
  wind_dir: string;
  condition: string;
  location: string;
  station_id: string;
  water_level?: number;
  current_speed?: number;
  current_direction?: string;
  tide_type?: 'high' | 'low';
  tide_time?: string;
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

interface NOAAStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
}

const WeatherForecast: React.FC = () => {
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const currentTrack = useTrackStore(state => state.currentTrack);

  const findNearestStation = async (lat: number, lon: number): Promise<{ noaaStation: NOAAStation | null; coopsStation: NOAAStation | null }> => {
    try {
      // Validate coordinates
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        console.error('Coordinate non valide:', { lat, lon });
        return { noaaStation: null, coopsStation: null };
      }

      // Calculate a bounding box around the point (roughly 50km)
      const latDiff = 0.45; // ~50km in latitude
      const lonDiff = 0.45 / Math.cos(lat * Math.PI / 180); // Adjust for longitude
      
      const stations = [
        { id: '8454000', name: 'Providence, RI', lat: 41.8071, lng: -71.4012 },
        { id: '8447930', name: 'Woods Hole, MA', lat: 41.5236, lng: -70.6711 },
        { id: '8449130', name: 'Nantucket Island, MA', lat: 41.2850, lng: -70.0967 },
        // Add more stations as needed
      ];

      // Find nearest station using Haversine formula for more accurate distance calculation
      const nearestStation = stations.reduce((nearest, station) => {
        const R = 6371; // Earth's radius in km
        const dLat = (station.lat - lat) * Math.PI / 180;
        const dLon = (station.lng - lon) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(station.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return !nearest || distance < nearest.distance
          ? { ...station, distance }
          : nearest;
      }, null as (NOAAStation | null));

      if (!nearestStation || nearestStation.distance > 100) {
        console.warn('Nessuna stazione trovata entro 100km dalle coordinate fornite');
        return { noaaStation: null, coopsStation: null };
      }

      return { noaaStation: nearestStation, coopsStation: nearestStation };
    } catch (error) {
      console.error('Error finding nearest station:', error);
      return { noaaStation: null, coopsStation: null };
    }
  };


  const retryFetch = async (url: string, options = {}, retries = 3): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Errore di rete dopo diversi tentativi');
  };

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);

      // Find nearest stations
      const { noaaStation, coopsStation } = await findNearestStation(lat, lon);
      
      if (!coopsStation) {
        throw new Error('Nessuna stazione COOPS trovata nelle vicinanze');
      }

      // Fetch weather data from COOPS API
      const [weatherData, tidalData] = await Promise.all([
        { temp_c: 0, temp_min: 0, temp_max: 0, humidity: 0, wind_kph: 0, wind_dir: 'N', condition: 'Non disponibile' },
        { predictions: [] }
      ]);

      // Process current weather data
      const currentData: WeatherData = {
        date: new Date().toISOString(),
        temp_c: weatherData.temp_c || 0,
        temp_min: weatherData.temp_min || 0,
        temp_max: weatherData.temp_max || 0,
        humidity: weatherData.humidity || 0,
        wind_kph: weatherData.wind_kph || 0,
        wind_dir: weatherData.wind_dir || 'N',
        condition: weatherData.condition || 'Non disponibile',
        location: coopsStation.name,
        station_id: coopsStation.id,
        water_level: weatherData.water_level,
        current_speed: weatherData.current_speed,
        current_direction: weatherData.current_direction
      };

      // Process tidal predictions for the next 7 days
      const processedForecast = tidalData.predictions.map(pred => ({
        date: pred.time,
        temp_c: weatherData.temp_c || 0,
        temp_min: weatherData.temp_min || 0,
        temp_max: weatherData.temp_max || 0,
        humidity: weatherData.humidity || 0,
        wind_kph: weatherData.wind_kph || 0,
        wind_dir: weatherData.wind_dir || 'N',
        condition: 'Previsione marea',
        location: coopsStation.name,
        station_id: coopsStation.id,
        water_level: pred.height,
        tide_type: pred.type,
        tide_time: pred.time
      }));

      setForecast([currentData, ...processedForecast]);
    } catch (err) {
      console.error('Errore nel recupero dei dati meteo:', err);
      setError('Errore nel caricamento dei dati meteo. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const getWindColor = (windSpeed: number): string => {
    if (windSpeed < 10) return 'text-green-500';
    if (windSpeed < 20) return 'text-yellow-500';
    if (windSpeed < 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const renderWeatherCard = (data: WeatherData) => {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{format(new Date(data.date), 'EEEE d MMMM', { locale: it })}</h3>
            <p className="text-sm text-gray-600">{data.location}</p>
          </div>
          {getWeatherIcon(data.condition)}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <Thermometer className="w-5 h-5 mr-2 text-red-500" />
            <span>{data.temp_c.toFixed(1)}°C</span>
          </div>
          
          <div className="flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-blue-500" />
            <span>{data.humidity}%</span>
          </div>
          
          <div className="flex items-center">
            <Wind className={`w-5 h-5 mr-2 ${getWindColor(data.wind_kph)}`} />
            <span>{data.wind_kph.toFixed(1)} km/h {data.wind_dir}</span>
          </div>
          
          {data.water_level !== undefined && (
            <div className="flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2 text-blue-700" />
              <span>Livello acqua: {data.water_level.toFixed(2)}m</span>
            </div>
          )}
          
          {data.current_speed !== undefined && (
            <div className="flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-indigo-600" />
              <span>Corrente: {data.current_speed.toFixed(1)} nodi {data.current_direction}</span>
            </div>
          )}
          
          {data.tide_type && (
            <div className="flex items-center col-span-2">
              <Compass className="w-5 h-5 mr-2 text-teal-600" />
              <span>Marea {data.tide_type === 'high' ? 'Alta' : 'Bassa'} alle {format(new Date(data.tide_time || ''), 'HH:mm', { locale: it })}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(forecast.length - 1, prev + 1));
  };

  const translateWeatherCondition = (condition: string): string => {
    const translations: { [key: string]: string } = {
      'clear sky': 'Sereno',
      'few clouds': 'Poco nuvoloso',
      'scattered clouds': 'Nuvole sparse',
      'broken clouds': 'Nuvoloso',
      'overcast clouds': 'Coperto',
      'light rain': 'Pioggia leggera',
      'moderate rain': 'Pioggia moderata',
      'heavy intensity rain': 'Pioggia forte',
      'very heavy rain': 'Pioggia molto forte',
      'extreme rain': 'Pioggia estrema',
      'freezing rain': 'Pioggia gelata',
      'light intensity shower rain': 'Rovesci leggeri',
      'shower rain': 'Rovesci',
      'heavy intensity shower rain': 'Rovesci intensi',
      'thunderstorm': 'Temporale',
      'thunderstorm with light rain': 'Temporale con pioggia leggera',
      'thunderstorm with rain': 'Temporale con pioggia',
      'thunderstorm with heavy rain': 'Temporale con pioggia forte',
      'light snow': 'Neve leggera',
      'snow': 'Neve',
      'heavy snow': 'Neve forte',
      'sleet': 'Nevischio',
      'light shower sleet': 'Nevischio leggero',
      'shower sleet': 'Nevischio forte',
      'mist': 'Foschia',
      'fog': 'Nebbia',
      'haze': 'Foschia'
    };
    return translations[condition.toLowerCase()] || condition;
  };

  const getWeatherIcon = (condition: string) => {
  const conditionLower = condition.toLowerCase();
  switch (true) {
    case conditionLower.includes('sereno') || conditionLower.includes('clear'):
      return <Sun className="w-8 h-8 text-yellow-500" />;
    case conditionLower.includes('nuvol') || conditionLower.includes('cloud'):
      return <Cloud className="w-8 h-8 text-gray-500" />;
    case conditionLower.includes('pioggia') || conditionLower.includes('rain'):
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    case conditionLower.includes('neve') || conditionLower.includes('snow'):
      return <CloudSnow className="w-8 h-8 text-blue-300" />;
    case conditionLower.includes('temporale') || conditionLower.includes('thunder'):
      return <CloudLightning className="w-8 h-8 text-yellow-600" />;
    default:
      return <Cloud className="w-8 h-8 text-gray-500" />;
  }
  };

  const navigateForecast = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < forecast.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [currentTrack?.coordinates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

  const currentDay = forecast[currentIndex];

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}`
      );
      if (!response.ok) throw new Error('Errore nella ricerca delle località');
      const data = await response.json();
      setSuggestions(data.map((item: any) => ({
        name: item.name,
        lat: item.lat,
        lon: item.lon,
        country: item.country,
        state: item.state
      })));
    } catch (err) {
      console.error('Errore nella ricerca:', err);
      setError('Errore nella ricerca delle località');
    }
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setSuggestions([]);
    fetchWeatherData(location.lat, location.lon);
  };

  const getCurrentPosition = () => {
    setIsLoadingLocation(true);
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata dal browser');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}`
          );
          if (!response.ok) throw new Error('Errore nel recupero della località');
          const [data] = await response.json();
          setSelectedLocation({
            name: data.name,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            country: data.country,
            state: data.state
          });
          setSearchQuery(data.name);
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        } catch (err) {
          console.error('Errore nel recupero della posizione:', err);
          setError('Errore nel recupero della posizione');
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (err) => {
        console.error('Errore nella geolocalizzazione:', err);
        setError('Errore nell\'accesso alla posizione');
        setIsLoadingLocation(false);
      }
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cerca località..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full px-4 py-2 text-left hover:bg-indigo-50 focus:outline-none focus:bg-indigo-50"
                >
                  {suggestion.name}, {suggestion.state || suggestion.country}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => handleSearch(searchQuery)}
            className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cerca
          </button>
          <button
            onClick={getCurrentPosition}
            disabled={isLoadingLocation}
            className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
          >
            {isLoadingLocation ? 'Ricerca...' : 'Posizione attuale'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-center py-4">{error}</div>
      ) : forecast.length > 0 ? (
        <>
          {/* Current Weather Widget */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Condizioni Attuali</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                {getWeatherIcon(forecast[currentIndex].condition)}
                <div className="ml-4">
                  <div className="text-2xl font-bold">{forecast[currentIndex].temp_c.toFixed(1)}°C</div>
                  <div className="text-gray-600">{forecast[currentIndex].condition}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Thermometer className="w-5 h-5 text-gray-500 mr-2" />
                  <span>Min: {forecast[currentIndex].temp_min.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center">
                  <Thermometer className="w-5 h-5 text-gray-500 mr-2" />
                  <span>Max: {forecast[currentIndex].temp_max.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center">
                  <Droplets className="w-5 h-5 text-gray-500 mr-2" />
                  <span>Umidità: {forecast[currentIndex].humidity}%</span>
                </div>
                <div className="flex items-center">
                  <Wind className="w-5 h-5 text-gray-500 mr-2" />
                  <span>Vento: {forecast[currentIndex].wind_kph.toFixed(1)} km/h {forecast[currentIndex].wind_dir}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast Widget */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Previsioni a 7 Giorni</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(forecast.length - 1, currentIndex + 1))}
                  disabled={currentIndex === forecast.length - 1}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-4">
              {forecast.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`p-2 rounded-lg text-center transition-colors ${index === currentIndex ? 'bg-indigo-100' : 'hover:bg-gray-50'}`}
                >
                  <div className="text-sm font-medium">
                    {format(new Date(day.date), 'EEE', { locale: it })}
                  </div>
                  <div className="my-2">{getWeatherIcon(day.condition)}</div>
                  <div className="text-sm">{day.temp_max.toFixed(0)}°</div>
                  <div className="text-sm text-gray-500">{day.temp_min.toFixed(0)}°</div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-indigo-900">Previsioni Meteo</h3>
          <p className="text-sm text-indigo-600">{currentDay.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateForecast('prev')}
            disabled={currentIndex === 0}
            className="p-1 rounded-full hover:bg-indigo-100 disabled:opacity-50"
            aria-label="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5 text-indigo-600" />
          </button>
          <span className="text-sm font-medium text-indigo-800">
            {format(new Date(currentDay.date), 'EEEE d MMMM', { locale: it })}
          </span>
          <button
            onClick={() => navigateForecast('next')}
            disabled={currentIndex === forecast.length - 1}
            className="p-1 rounded-full hover:bg-indigo-100 disabled:opacity-50"
            aria-label="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5 text-indigo-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            {getWeatherIcon(currentDay.condition)}
            <div className="mt-2 text-center">
              <p className="text-lg font-medium text-indigo-900">{translateWeatherCondition(currentDay.condition)}</p>
              <p className="text-3xl font-bold text-indigo-700">{currentDay.temp_c.toFixed(1)}°C</p>
              <p className="text-sm text-indigo-600">
                Min: {currentDay.temp_min.toFixed(1)}°C | Max: {currentDay.temp_max.toFixed(1)}°C
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
            <span className="text-indigo-900">Umidità</span>
            <span className="font-medium text-indigo-700">{currentDay.humidity}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
            <span className="text-indigo-900">Stazione NOAA</span>
            <span className="font-medium text-indigo-700">{currentDay.station_id}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
            <span className="text-indigo-900">Vento</span>
            <span className="font-medium text-indigo-700">
              {currentDay.wind_kph} km/h {currentDay.wind_dir}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {forecast.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-indigo-600' : 'bg-indigo-200'}`}
            aria-label={`Vai al giorno ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default WeatherForecast;