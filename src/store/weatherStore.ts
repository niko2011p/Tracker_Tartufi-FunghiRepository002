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
  fetchCurrentWeather: (location: string) => Promise<void>;
  fetchForecast: (location: string) => Promise<void>;
  fetchHistoricalData: (location: string) => Promise<void>;
  fetchHourlyForecast: (location: string) => Promise<void>;
  clearError: () => void;
}

export const useWeatherStore = create<WeatherState>()((set) => ({
  currentWeather: null,
  forecast: [],
  historicalData: [],
  hourlyForecast: [],
  isLoading: false,
  error: null,
  selectedLocation: null,
  
  setSelectedLocation: (location: Location) => set({ selectedLocation: location }),

  fetchCurrentWeather: async (location: string) => {
    console.log(`[useWeatherStore] Fetching current weather for: ${location}`);
    set({ isLoading: true, error: null });
    try {
      const data = await getCurrentWeather(location);
      console.log('[useWeatherStore] Data received from service:', data);
      set({ currentWeather: data, isLoading: false, error: null });
    } catch (error) {
      console.error('[useWeatherStore] Error fetching current weather:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Errore sconosciuto nel recupero del meteo attuale',
        isLoading: false,
        currentWeather: null
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