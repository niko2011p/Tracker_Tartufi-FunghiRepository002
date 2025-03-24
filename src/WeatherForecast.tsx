import React from 'react';
import { useWeatherStore } from './store/weatherStore';

interface WeatherForecastProps {
  historicalData?: {
    date: string;
    temperature: number;
    humidity: number;
  }[];
}

export const WeatherForecast: React.FC<WeatherForecastProps> = ({ historicalData }) => {
  const { currentWeather, forecast, isLoading, error } = useWeatherStore();
  
  if (isLoading) {
    return <div className="p-4">Caricamento previsioni...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Errore: {error}</div>;
  }
  
  return (
    <>
      <div className="weather-container">
        <h2>Previsioni Meteo Correnti</h2>
        {/* Implementazione meteo corrente */}
      </div>

      {historicalData && (
        <div className="historical-data">
          <h3>Dati Storici</h3>
          <ul>
            {historicalData.map((data, index) => (
              <li key={index}>
                {data.date}: {data.temperature}°C, {data.humidity}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};