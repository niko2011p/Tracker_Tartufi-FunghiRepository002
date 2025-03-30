import React, { useState, useEffect } from 'react';
import { useTrackStore } from '../store/trackStore';

const GpsStatusIndicator: React.FC = () => {
  const { gpsStatus } = useTrackStore();
  const [visible, setVisible] = useState(false);
  
  // Mostra il messaggio per 3 secondi quando cambia lo stato GPS
  useEffect(() => {
    if (gpsStatus) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gpsStatus]);
  
  if (!visible || !gpsStatus) return null;
  
  // Determina il colore in base allo stato
  const getStatusColor = () => {
    switch (gpsStatus.type) {
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'success':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg z-50 transition-all duration-300 ${getStatusColor()}`}>
      {gpsStatus.message}
    </div>
  );
};

/**
 * Funzione per ottenere un messaggio di errore leggibile
 */
function getErrorMessage(error: GeolocationPositionError | Error): string {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Accesso al GPS negato. Verifica i permessi del browser.';
      case error.POSITION_UNAVAILABLE:
        return 'Posizione non disponibile. Verifica la connessione GPS.';
      case error.TIMEOUT:
        return 'Timeout durante l\'acquisizione della posizione.';
      default:
        return 'Errore durante l\'acquisizione della posizione GPS.';
    }
  } else {
    return error.message || 'Errore durante l\'acquisizione della posizione GPS.';
  }
}

export default GpsStatusIndicator;