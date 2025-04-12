import React, { useEffect, useState, useRef } from 'react';
import { Signal, Thermometer, Mountain, Route, Timer, Droplets, Gauge } from 'lucide-react';

interface DataTrackingPanelProps {
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  gpsSignal: 'good' | 'medium' | 'weak';
  accuracy?: number;
}

const DataTrackingPanel: React.FC<DataTrackingPanelProps> = ({
  latitude,
  longitude,
  speed,
  altitude,
  gpsSignal,
  accuracy = 0
}) => {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<[number, number] | null>(null);

  // Funzione per calcolare la distanza tra due punti in metri
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // raggio della Terra in metri
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Aggiorna la temperatura e l'umidità ogni 5 minuti
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=97959559d86f4d3a975175711252303&q=${latitude},${longitude}&aqi=no`);
        const data = await response.json();
        setTemperature(data.current.temp_c);
        setHumidity(data.current.humidity);
      } catch (error) {
        console.error('Errore nel recupero dei dati meteo:', error);
      }
    };

    if (latitude !== 0 && longitude !== 0) {
      fetchWeatherData();
      const interval = setInterval(fetchWeatherData, 300000); // 5 minuti
      return () => clearInterval(interval);
    }
  }, [latitude, longitude]);

  // Aggiorna la distanza quando cambia la posizione
  useEffect(() => {
    if (latitude !== 0 && longitude !== 0) {
      if (lastPositionRef.current) {
        const [lastLat, lastLon] = lastPositionRef.current;
        const newDistance = calculateDistance(lastLat, lastLon, latitude, longitude);
        setDistance(prev => prev + newDistance);
      }
      lastPositionRef.current = [latitude, longitude];
    }
  }, [latitude, longitude]);

  // Aggiorna il tempo trascorso ogni secondo
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-4 right-4 bg-black bg-opacity-40 backdrop-blur-md px-2 py-2 rounded-lg shadow-lg z-[2000] min-w-[98px]">
      <div className="space-y-1.5">
        <div className="flex items-center">
          <Signal className={`w-3.5 h-3.5 ${
            gpsSignal === 'good' ? 'text-green-400' :
            gpsSignal === 'medium' ? 'text-yellow-400' :
            'text-red-400'
          }`} />
          <span className="text-[10px] font-medium text-white ml-auto">
            {accuracy > 0 ? `${accuracy.toFixed(0)}m` : 'N/D'}
          </span>
        </div>

        <div className="flex items-center">
          <Thermometer className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {temperature !== null ? `${temperature.toFixed(1)}°` : 'N/D'}
          </span>
        </div>

        <div className="flex items-center">
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {humidity !== null ? `${humidity.toFixed(0)}%` : 'N/D'}
          </span>
        </div>

        <div className="flex items-center">
          <Mountain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {altitude.toFixed(0)}m
          </span>
        </div>

        <div className="flex items-center">
          <Route className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {(distance / 1000).toFixed(1)}km
          </span>
        </div>

        <div className="flex items-center">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <div className="flex items-center">
          <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[10px] font-medium text-white ml-auto">
            {(speed * 3.6).toFixed(0)}km/h
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataTrackingPanel; 