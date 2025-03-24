import { create } from 'zustand';
import { WeatherData, HourlyWeather } from '../types';
import { getCurrentWeather, getForecast, getHistoricalWeather, getHourlyForecast } from '../services/weatherService';

interface WeatherState {
  currentWeather: WeatherData | null;
  forecast: WeatherData[];
  historicalData: WeatherData[];
  hourlyForecast: HourlyWeather[];
  isLoading: boolean;
  error: string | null;
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

  fetchCurrentWeather: async (location: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getCurrentWeather(location);
      set({ currentWeather: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Errore nel recupero del meteo attuale',
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