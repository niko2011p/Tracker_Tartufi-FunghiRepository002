import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown, Mountain, Route, Clock, Thermometer, Navigation, Compass } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { useWeatherStore } from '../services/weatherService';
import './TrackingDataPanel.css';

interface TrackingDataState {
  distance: number;
  avgSpeed: number;
  altitude: number;
  duration: string;
  currentSpeed: number;
}

interface RealTimeData {
  lat: number;
  lng: number;
  alt: number;
  speed: number;
}

interface TrackingDataPanelProps {
  realTimeData: {
    lat: number;
    lng: number;
    speed: number;
    alt: number;
  };
}

const TrackingDataPanel: React.FC<TrackingDataPanelProps> = ({ realTimeData }) => {
  // Stato locale per i dati di tracciamento
  const [trackingData, setTrackingData] = useState<TrackingDataState>({
    distance: 0,
    avgSpeed: 0,
    altitude: 0,
    duration: '00:00',
    currentSpeed: 0
  });

  // Array per lo smoothing dell'altitudine
  const [altitudeReadings, setAltitudeReadings] = useState<number[]>([]);
  
  // Ottieni lo stato corrente dal trackStore
  const { currentTrack } = useTrackStore();

  const { currentTemperature, fetchCurrentWeather } = useWeatherStore();

  // Funzione per stabilizzare l'altitudine con media mobile
  const smoothAltitude = useCallback((newReading: number, readings: number[]): number => {
    const MAX_READINGS = 5; // Numero di letture da considerare per lo smoothing
    
    // Aggiungi la nuova lettura all'array
    const updatedReadings = [...readings, newReading].slice(-MAX_READINGS);
    setAltitudeReadings(updatedReadings);
    
    // Calcola la media delle letture disponibili
    const sum = updatedReadings.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / updatedReadings.length);
  }, []);

  // Aggiorna i dati di tracking in tempo reale
  useEffect(() => {
    if (!currentTrack) return; // Uscita anticipata se non c'è una traccia attiva
    
    // Funzione per aggiornare i dati di tracking
    const updateTrackingData = () => {
      try {
        // Ottieni sempre lo stato più recente dallo store
        const { currentTrack } = useTrackStore.getState();
        if (!currentTrack) return;
        
        // Calcola la distanza totale
        const distance = currentTrack.distance;
        
        // Calcola la durata del tracciamento con il timestamp corrente
        const startTime = currentTrack.startTime instanceof Date ? 
          currentTrack.startTime : new Date(currentTrack.startTime);
        const currentTime = new Date();
        const durationMs = currentTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);
        
        // Formatta la durata nel formato HH:mm
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // Calcola la velocità media (km/h) in tempo reale
        const durationHours = durationMs / 3600000;
        const avgSpeed = durationHours > 0 ? distance / durationHours : 0;
        
        // Aggiorna i dati di tracking con valori calcolati
        setTrackingData(prevData => ({
          ...prevData,
          distance,
          avgSpeed,
          duration: formattedDuration,
          currentSpeed: realTimeData?.speed || 0,
          altitude: realTimeData?.alt || prevData.altitude
        }));
      } catch (err) {
        console.error('[TrackingData] Errore nell\'aggiornamento dei dati:', err);
        setTrackingData(prev => ({
          ...prev,
          distance: currentTrack?.distance || 0,
          duration: prev.duration
        }));
      }
    };
    
    // Aggiorna i dati immediatamente all'avvio
    updateTrackingData();
    
    // Aggiorna i dati ogni 500ms (0.5 secondi)
    const timer = setInterval(updateTrackingData, 500);
    
    return () => {
      clearInterval(timer);
    };
  }, [currentTrack, realTimeData]);

  useEffect(() => {
    // Aggiorna la temperatura ogni 5 minuti
    const updateTemperature = () => {
      fetchCurrentWeather(realTimeData?.lat || 0, realTimeData?.lng || 0);
    };

    updateTemperature();
    const interval = setInterval(updateTemperature, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [realTimeData?.lat, realTimeData?.lng, fetchCurrentWeather]);

  // Se non c'è una traccia attiva, mostra valori a zero
  if (!currentTrack) {
    return (
      <div className="tracking-data-panel">
        <div className="tracking-data-grid">
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Route size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="distance-value">0.00 km</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="speed-value">0.0 km/h</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mountain size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="altitude-value">0 m</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="duration-value">00:00</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-data-panel">
      <div className="tracking-data-grid">
        <div className="tracking-data-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Route size={18} className="tracking-data-icon" />
            <p className="tracking-data-value" data-testid="distance-value">{trackingData.distance.toFixed(2)} km</p>
          </div>
        </div>
        <div className="tracking-data-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowUpDown size={18} className="tracking-data-icon" />
            <p className="tracking-data-value" data-testid="speed-value">{trackingData.currentSpeed.toFixed(1)} km/h</p>
          </div>
        </div>
        <div className="tracking-data-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mountain size={18} className="tracking-data-icon" />
            <p className="tracking-data-value" data-testid="altitude-value">{trackingData.altitude} m</p>
          </div>
        </div>
        <div className="tracking-data-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} className="tracking-data-icon" />
            <p className="tracking-data-value" data-testid="duration-value">{trackingData.duration}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingDataPanel;