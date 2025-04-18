import { create } from 'zustand';
import { WeatherData, HourlyWeather } from '../types';
import { getCurrentWeather, getForecast, getHistoricalWeather, getHourlyForecast } from '../services/weatherService';

interface Location {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

interface WeatherState {
  currentWeather: WeatherData | null;
  forecast: WeatherData[];
  historicalData: WeatherData[];
  hourlyForecast: HourlyWeather[];
  isLoading: boolean;
  error: string | null;
  selectedLocation: Location | null;
  setSelectedLocation: (location: Location) => void;
  fetchCurrentWeather: (lat: number, lon: number) => Promise<void>;
  fetchForecast: (location: string) => Promise<void>;
  fetchHistoricalData: (location: string) => Promise<void>;
  fetchHourlyForecast: (location: string) => Promise<void>;
  clearError: () => void;
  currentTemperature: number | null;
  lastUpdate: number | null;
}

export const useWeatherStore = create<WeatherState>()((set) => ({
  currentWeather: null,
  forecast: [],
  historicalData: [],
  hourlyForecast: [],
  isLoading: false,
  error: null,
  selectedLocation: null,
  currentTemperature: null,
  lastUpdate: null,
  
  setSelectedLocation: (location: Location) => set({ selectedLocation: location }),

  fetchCurrentWeather: async (lat: number, lon: number) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log(`Tentativo di recupero meteo per coordinate: ${lat},${lon}`);
      
      // Validazione delle coordinate
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        throw new Error('Coordinate non valide per il recupero del meteo');
      }
      
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
      
      // Verifica che la posizione restituita corrisponda a quella richiesta
      if (!data.location || 
          Math.abs(data.location.lat - lat) > 0.1 || 
          Math.abs(data.location.lon - lon) > 0.1) {
        console.warn('Posizione restituita non corrisponde a quella richiesta:', {
          richiesta: { lat, lon },
          restituita: data.location
        });
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
  },

  fetchForecast: async (location: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getForecast(location);
      set({ forecast: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore nel recupero delle previsioni',
        isLoading: false 
      });
    }
  },

  fetchHistoricalData: async (location: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getHistoricalWeather(location);
      set({ historicalData: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore nel recupero dei dati storici',
        isLoading: false 
      });
    }
  },

  fetchHourlyForecast: async (location: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getHourlyForecast(location);
      set({ hourlyForecast: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore nel recupero delle previsioni orarie',
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null })
}));