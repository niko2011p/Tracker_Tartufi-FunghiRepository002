import React, { useEffect, useState, useRef } from 'react';
import { Signal, Thermometer, Mountain, Route, Timer, Droplets, Gauge } from 'lucide-react';

export interface DataTrackingPanelProps {
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  gpsSignal: 'good' | 'medium' | 'weak';
  direction: number;
  accuracy?: number;
}

const DataTrackingPanel: React.FC<DataTrackingPanelProps> = ({
  latitude,
  longitude,
  speed,
  altitude,
  gpsSignal,
  direction,
  accuracy = 0
}) => {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [smoothDirection, setSmoothDirection] = useState(direction);
  const startTimeRef = useRef<number>(Date.now());
  const lastPositionRef = useRef<[number, number] | null>(null);
  const lastDirectionUpdateRef = useRef<number>(Date.now());

  // Funzione per calcolare la distanza tra due punti in metri
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
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
      const interval = setInterval(fetchWeatherData, 300000);
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

  // Aggiorna la direzione con animazione fluida
  useEffect(() => {
    const updateDirection = () => {
      const now = Date.now();
      const timeDiff = now - lastDirectionUpdateRef.current;
      const step = Math.min(1, timeDiff / 1000); // Transizione di 1 secondo

      // Calcola la differenza più breve tra le direzioni (considerando il wrap-around a 360°)
      let diff = direction - smoothDirection;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      // Interpola linearmente verso la direzione target
      setSmoothDirection(prev => {
        const newDirection = prev + diff * step;
        return newDirection < 0 ? newDirection + 360 : newDirection % 360;
      });

      lastDirectionUpdateRef.current = now;
    };

    const animationFrame = requestAnimationFrame(updateDirection);
    return () => cancelAnimationFrame(animationFrame);
  }, [direction, smoothDirection]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSignalColor = (signal: 'good' | 'medium' | 'weak'): string => {
    switch (signal) {
      case 'good': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'weak': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatAccuracy = (acc: number): string => {
    if (acc === 0) return 'N/D';
    if (acc < 10) return `${acc.toFixed(1)}m`;
    return `${acc.toFixed(0)}m`;
  };

  return (
    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2.5 rounded-xl shadow-lg z-[2000] min-w-[110px]">
      <div className="space-y-2">
        {/* Compass */}
        <div className="relative w-full aspect-square mb-3 flex items-center justify-center">
          <div 
            className="w-full h-full rounded-full border-2 border-white/20 relative"
            style={{ 
              transform: `rotate(${-smoothDirection}deg)`,
              transition: 'transform 0.1s linear'
            }}
          >
            {/* Cardinal points */}
            <div className="absolute inset-0 text-xs font-medium">
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-white/80">N</span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-white/60">E</span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/60">S</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-white/60">O</span>
            </div>
            {/* North pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 origin-bottom">
              <div className="w-full h-full bg-gradient-to-t from-transparent to-red-500" />
            </div>
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80" />
          </div>
        </div>

        {/* GPS Signal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Signal className={`w-4 h-4 ${getSignalColor(gpsSignal)}`} />
            <span className="text-xs font-medium text-white/80">GPS</span>
          </div>
          <span className={`text-xs font-medium ${accuracy < 10 ? 'text-green-400' : accuracy < 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {formatAccuracy(accuracy)}
          </span>
        </div>

        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-medium text-white/80">Temp</span>
          </div>
          <span className="text-xs font-medium text-white">
            {temperature !== null ? `${temperature.toFixed(1)}°` : 'N/D'}
          </span>
        </div>

        {/* Humidity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-white/80">Umidità</span>
          </div>
          <span className="text-xs font-medium text-white">
            {humidity !== null ? `${humidity}%` : 'N/D'}
          </span>
        </div>

        {/* Altitude */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mountain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-white/80">Alt</span>
          </div>
          <span className="text-xs font-medium text-white">
            {altitude.toFixed(0)}m
          </span>
        </div>

        {/* Distance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Route className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-white/80">Dist</span>
          </div>
          <span className="text-xs font-medium text-white">
            {distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance / 1000).toFixed(2)}km`}
          </span>
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-white/80">Tempo</span>
          </div>
          <span className="text-xs font-medium text-white ml-2">
            {formatTime(elapsedTime)}
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-white/80">Vel</span>
          </div>
          <span className="text-xs font-medium text-white">
            {speed === 0 ? '0 km/h' : `${(speed * 3.6).toFixed(1)} km/h`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataTrackingPanel; 