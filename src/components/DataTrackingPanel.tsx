import React, { useEffect, useState, useRef } from 'react';
import { Signal, Thermometer, Navigation, Ruler, Timer } from 'lucide-react';

interface DataTrackingPanelProps {
  latitude: number;
  longitude: number;
  speed: number;
  altitude: number;
  gpsSignal: 'good' | 'medium' | 'weak';
}

const DataTrackingPanel: React.FC<DataTrackingPanelProps> = ({
  latitude,
  longitude,
  speed,
  altitude,
  gpsSignal
}) => {
  const [temperature, setTemperature] = useState<number | null>(null);
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

  // Aggiorna la temperatura ogni 5 minuti
  useEffect(() => {
    const fetchTemperature = async () => {
      try {
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=97959559d86f4d3a975175711252303&q=${latitude},${longitude}&aqi=no`);
        const data = await response.json();
        setTemperature(data.current.temp_c);
      } catch (error) {
        console.error('Errore nel recupero della temperatura:', error);
      }
    };

    if (latitude !== 0 && longitude !== 0) {
      fetchTemperature();
      const interval = setInterval(fetchTemperature, 300000); // 5 minuti
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
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[2000] min-w-[200px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Signal className={`w-5 h-5 ${
            gpsSignal === 'good' ? 'text-green-500' :
            gpsSignal === 'medium' ? 'text-yellow-500' :
            'text-red-500'
          }`} />
          <span className="text-sm text-gray-600">
            GPS: {gpsSignal === 'good' ? 'Ottimo' : gpsSignal === 'medium' ? 'Medio' : 'Debole'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Thermometer className="w-5 h-5 text-blue-500" />
          <span className="text-sm">
            {temperature !== null ? `${temperature.toFixed(1)}°C` : 'N/D'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Navigation className="w-5 h-5 text-gray-600" />
          <span className="text-sm">
            {altitude.toFixed(0)}m s.l.m.
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Ruler className="w-5 h-5 text-gray-600" />
          <span className="text-sm">
            {(distance / 1000).toFixed(2)}km
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Timer className="w-5 h-5 text-gray-600" />
          <span className="text-sm">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <div className="text-sm text-gray-600">
          Velocità: {(speed * 3.6).toFixed(1)} km/h
        </div>
      </div>
    </div>
  );
};

export default DataTrackingPanel; 