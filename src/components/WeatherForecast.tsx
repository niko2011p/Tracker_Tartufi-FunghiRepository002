import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTrackStore } from '../store/trackStore';

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
  condition: string;
  location: string;
}

const WeatherForecast: React.FC = () => {
  const [forecast, setForecast] = useState<WeatherData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      const currentTrack = useTrackStore.getState().currentTrack;
      const coordinates = currentTrack?.coordinates;
      
      let locationQuery = 'auto:ip';
      if (coordinates && coordinates.length > 0) {
        const lastPosition = coordinates[coordinates.length - 1];
        locationQuery = `${lastPosition[1]},${lastPosition[0]}`;
      }

      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=e57f461f9d4245158e5100345250803&q=${locationQuery}&days=7&aqi=no&alerts=no`
      );

      if (!response.ok) throw new Error('Errore nel caricamento delle previsioni meteo');
      const data = await response.json();

      const forecastData = data.forecast.forecastday.map((day: any) => ({
        date: day.date,
        temp_c: day.day.avgtemp_c,
        temp_min: day.day.mintemp_c,
        temp_max: day.day.maxtemp_c,
        humidity: day.day.avghumidity,
        precip_mm: day.day.totalprecip_mm,
        precip_chance: day.day.daily_chance_of_rain,
        wind_kph: day.day.maxwind_kph,
        wind_dir: day.hour[12].wind_dir,
        condition: day.day.condition.text,
        location: `${data.location.name}, ${data.location.region}`
      }));

      setForecast(forecastData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setLoading(false);
    }
  };

  const translateWeatherCondition = (condition: string): string => {
    const translations: { [key: string]: string } = {
      'clear': 'Sereno',
      'sunny': 'Soleggiato',
      'partly cloudy': 'Parzialmente nuvoloso',
      'cloudy': 'Nuvoloso',
      'overcast': 'Coperto',
      'rain': 'Pioggia',
      'light rain': 'Pioggia leggera',
      'moderate rain': 'Pioggia moderata',
      'heavy rain': 'Pioggia forte',
      'patchy rain nearby': 'Pioggia sparsa nelle vicinanze',
      'snow': 'Neve',
      'light snow': 'Neve leggera',
      'heavy snow': 'Neve forte',
      'thunderstorm': 'Temporale',
      'mist': 'Foschia',
      'fog': 'Nebbia'
    };
    return translations[condition.toLowerCase()] || condition;
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

  const navigateForecast = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < forecast.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

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

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
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
            <span className="text-indigo-900">Probabilità di pioggia</span>
            <span className="font-medium text-indigo-700">{currentDay.precip_chance}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
            <span className="text-indigo-900">Precipitazioni</span>
            <span className="font-medium text-indigo-700">{currentDay.precip_mm.toFixed(1)} mm</span>
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