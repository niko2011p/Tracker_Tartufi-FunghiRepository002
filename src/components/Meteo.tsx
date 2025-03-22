import React, { useEffect, useState } from 'react';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  Thermometer, 
  MapPin, 
  Search, 
  ArrowUpDown,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Compass,
  Map,
  History,
  ChevronRight,
  Navigation
} from 'lucide-react';
import MeteoLogo from './MeteoLogo';
import { useTrackStore } from '../store/trackStore';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const location = useLocation();

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
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}&units=metric`
      );
      
      if (!response.ok) throw new Error('Errore nel recupero della località');
      const locations = await response.json();
      
      if (locations.length > 0) {
        setSelectedLocation({
          name: locations[0].name,
          region: locations[0].region,
          lat: locations[0].lat,
          lon: locations[0].lon
        });
      }
    } catch (err) {
      console.error('Errore nel recupero del nome della località:', err);
    }
  };

  const retryFetch = async (url: string, options = {}, retries = 3): Promise<Response> => {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        lastError = await response.json();
      } catch (error) {
        lastError = error;
        if (i === retries - 1) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error(lastError?.message || 'Errore di rete dopo diversi tentativi');
  };

  const fetchWeatherData = async (latitude?: number, longitude?: number) => {
    try {
      let locationQuery = 'auto:ip';
      let lat = latitude;
      let lon = longitude;
      
      if (!lat || !lon) {
        const currentTrack = useTrackStore.getState().currentTrack;
        const coordinates = currentTrack?.coordinates;
        
        if (coordinates && coordinates.length > 0) {
          const lastPosition = coordinates[coordinates.length - 1];
          locationQuery = `${lastPosition[1]},${lastPosition[0]}`;
          lat = lastPosition[1];
          lon = lastPosition[0];
        } else {
          throw new Error('Posizione non disponibile. Attiva il GPS o seleziona una località.');
        }
      } else {
        locationQuery = `${lat},${lon}`;
      }

      const meteoblueUrl = `https://my.meteoblue.com/packages/basic-1h?apikey=${import.meta.env.VITE_METEOBLUE_API_KEY}&lat=${lat}&lon=${lon}&format=json&temperature=1&windspeed=1&winddirection=1&precipitation=1&humidity=1&clouds=1`;
      
      const meteoblueResponse = await retryFetch(meteoblueUrl);
      const meteoblueData = await meteoblueResponse.json();
      
      if (!meteoblueData || !meteoblueData.data_1h) {
        throw new Error('Dati meteo non validi o incompleti');;
      }
      
      const currentData = meteoblueData.data_1h;
      const currentIndex = new Date().getHours();
      
      setCurrentWeather({
        date: new Date().toISOString(),
        temp_c: currentData.temperature[currentIndex],
        temp_min: Math.min(...currentData.temperature.slice(0, 24)),
        temp_max: Math.max(...currentData.temperature.slice(0, 24)),
        humidity: currentData.relativehumidity[currentIndex],
        precip_mm: currentData.precipitation[currentIndex],
        precip_chance: currentData.precipitation_probability[currentIndex],
        wind_kph: currentData.windspeed[currentIndex] * 3.6,
        wind_dir: (() => {
          const deg = currentData.winddirection[currentIndex];
          if (deg >= 337.5 || deg < 22.5) return 'N';
          if (deg >= 22.5 && deg < 67.5) return 'NE';
          if (deg >= 67.5 && deg < 112.5) return 'E';
          if (deg >= 112.5 && deg < 157.5) return 'SE';
          if (deg >= 157.5 && deg < 202.5) return 'S';
          if (deg >= 202.5 && deg < 247.5) return 'SW';
          if (deg >= 247.5 && deg < 292.5) return 'W';
          return 'NW';
        })(),
        cloud_cover: currentData.clouds[currentIndex],
        condition: meteoblueData.metadata.name
      });

      // Processa i dati delle previsioni per i prossimi giorni
      const processedForecastData = Array.from({ length: 7 }, (_, dayIndex) => {
        const startIndex = dayIndex * 24 + 12; // Prendi i dati per mezzogiorno di ogni giorno
        return {
          date: new Date(Date.now() + dayIndex * 86400000).toISOString(),
          temp_c: currentData.temperature[startIndex],
          temp_min: Math.min(...currentData.temperature.slice(dayIndex * 24, (dayIndex + 1) * 24)),
          temp_max: Math.max(...currentData.temperature.slice(dayIndex * 24, (dayIndex + 1) * 24)),
          humidity: currentData.relativehumidity[startIndex],
          precip_mm: currentData.precipitation[startIndex],
          precip_chance: currentData.precipitation_probability[startIndex],
          wind_kph: currentData.windspeed[startIndex] * 3.6,
          wind_dir: currentData.winddirection[startIndex].toString(),
          cloud_cover: currentData.clouds[startIndex],
          condition: meteoblueData.metadata.name
        };
      });
      setForecast(processedForecastData);

      // Processa i dati storici dalle ultime 24 ore
      const historicalData = Array.from({ length: 24 }, (_, hourIndex) => {
        const dataIndex = (currentIndex - hourIndex + 24) % 24;
        return {
          date: new Date(Date.now() - hourIndex * 3600000).toISOString(),
          temp_c: currentData.temperature[dataIndex],
          temp_min: currentData.temperature[dataIndex],
          temp_max: currentData.temperature[dataIndex],
          humidity: currentData.relativehumidity[dataIndex],
          precip_mm: currentData.precipitation[dataIndex],
          precip_chance: currentData.precipitation_probability[dataIndex],
          wind_kph: currentData.windspeed[dataIndex] * 3.6,
          wind_dir: currentData.winddirection[dataIndex].toString(),
          cloud_cover: currentData.clouds[dataIndex],
          condition: meteoblueData.metadata.name
        };
      });
      setHistoricalData(historicalData.reverse());

      setLoading(false);
    } catch (err) {
      let errorMessage = 'Errore nel caricamento dei dati meteo';
      
      if (err instanceof Error) {
        if (err.message.includes('API key')) {
          errorMessage = 'Chiave API non valida o scaduta. Verifica le impostazioni.';
        } else if (err.message.includes('network') || err.message.includes('rete')) {
          errorMessage = 'Errore di connessione. Verifica la tua connessione internet.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      
      // Dati di fallback per mantenere l'interfaccia funzionante
      if (currentWeather) {
        setForecast([]);
        setHistoricalData([]);
      }
    }
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&limit=5&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}`
      );
      
      if (!response.ok) throw new Error('Errore nella ricerca della località');
      const locations = await response.json();
      
      if (locations.length > 0) {
        const location = locations[0];
        setSelectedLocation({
          name: location.name,
          region: location.region,
          lat: location.lat,
          lon: location.lon
        });
        fetchWeatherData(location.lat, location.lon);
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
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await fetchLocationName(latitude, longitude);
        fetchWeatherData(latitude, longitude);
        setIsGpsLoading(false);
      },
      (err) => {
        let errorMessage = 'Errore durante l\'acquisizione della posizione';
        
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
        
        setError(errorMessage);
        setIsGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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

    fetchWeatherData();
    return () => unsubscribe();
  }, []);

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
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca località..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span>Cerca</span>
              </button>
              <button
                onClick={handleGpsActivation}
                disabled={isGpsLoading}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGpsLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
                <span>Posizione corrente</span>
              </button>
            </div>
          </div>
        </div>

        {currentWeather && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-blue-500" />
                  <h2 className="text-2xl font-semibold">
                    {selectedLocation?.name || 'Posizione attuale'}
                    {selectedLocation && (
                      <span className="block text-sm text-gray-500">
                        {selectedLocation.lat.toFixed(6)}°, {selectedLocation.lon.toFixed(6)}°
                      </span>
                    )}
                  </h2>
                </div>
                <span className="text-gray-500">
                  {format(new Date(), "d MMMM yyyy HH:mm", { locale: it })}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Thermometer className="w-6 h-6 text-orange-500" />
                    <h3 className="font-medium">Temperatura</h3>
                  </div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {currentWeather.temp_c}°C
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Min: {currentWeather.temp_min}°C</span>
                    <span>Max: {currentWeather.temp_max}°C</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CloudRain className="w-6 h-6 text-blue-500" />
                    <h3 className="font-medium">Precipitazioni</h3>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {currentWeather.precip_mm} mm
                  </div>
                  <div className="text-sm text-gray-600">
                    Probabilità: {currentWeather.precip_chance}%
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Wind className="w-6 h-6 text-green-500" />
                    <h3 className="font-medium">Vento</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {currentWeather.wind_kph} km/h
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Compass className="w-4 h-4" />
                    <span>{currentWeather.wind_dir}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Droplets className="w-6 h-6 text-purple-500" />
                    <h3 className="font-medium">Umidità</h3>
                  </div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {currentWeather.humidity}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 rounded-full h-2"
                      style={{ width: `${currentWeather.humidity}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <WeatherForecast />
          <MoonPhase />
        </div>
        
        {/* NOAA Historical Data Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Dati Storici NOAA</h2>
          
          {nearestStations.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona Stazione Meteorologica
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={selectedStation || ''}
                onChange={(e) => setSelectedStation(e.target.value)}
              >
                {nearestStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} ({station.latitude.toFixed(2)}, {station.longitude.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {historicalData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header.isPlaceholder ? null : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">Dati Storici</h3>
                  <span className="text-gray-500">
                    (ultimi 14 giorni {selectedLocation?.name ? `- ${selectedLocation.name}` : ''})
                  </span>
                </div>
              </div>
              <div className="relative">
                <div className="overflow-x-auto table-container">
                  <table className="w-full min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-2">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                <ArrowUpDown className="w-4 h-4" />
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.getRowModel().rows.map(row => {
                        const precipValue = row.original.precip_mm;
                        return (
                          <tr 
                            key={row.id} 
                            className={`hover:bg-gray-50 transition-colors ${
                              precipValue > 0 ? 'bg-blue-50' : ''
                            }`}
                          >
                            {row.getVisibleCells().map(cell => (
                              <td
                                key={cell.id}
                                className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="scroll-indicator">
                  <ChevronRight className="scroll-arrow" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Precedente
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                  >
                    Successivo
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  Pagina {table.getState().pagination.pageIndex + 1} di{' '}
                  {table.getPageCount()}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed footer is now handled by the FixedFooter component */}
    </div>
  );
}

export default Meteo;