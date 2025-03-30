import React, { useState, useEffect } from 'react';
import { useTrackStore } from '../store/trackStore';
import { Navigation } from 'lucide-react';

const GpsStatusIndicator: React.FC = () => {
  const { gpsStatus } = useTrackStore();
  const [visible, setVisible] = useState(false);
  const [signalStrength, setSignalStrength] = useState<'high' | 'medium' | 'low' | 'none'>('none');
  
  // Mostra il messaggio per 3 secondi quando cambia lo stato GPS
  useEffect(() => {
    if (gpsStatus) {
      setVisible(true);
      
      // Determina la forza del segnale in base al tipo di stato
      if (gpsStatus.type === 'success') {
        setSignalStrength('high');
      } else if (gpsStatus.type === 'warning') {
        setSignalStrength('medium');
      } else if (gpsStatus.type === 'error') {
        setSignalStrength('none');
      } else {
        setSignalStrength('low');
      }
      
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gpsStatus]);
  
  // Mostra sempre un indicatore di segnale GPS anche quando il messaggio non è visibile
  const renderSignalIndicator = () => {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center bg-white bg-opacity-80 rounded-full px-3 py-1 shadow-md">
        <Navigation className={`w-4 h-4 mr-1 ${signalStrength === 'none' ? 'text-red-500' : 'text-green-500'}`} />
        <div className="flex space-x-1">
          <div className={`h-3 w-1 rounded-sm ${signalStrength !== 'none' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div className={`h-4 w-1 rounded-sm ${signalStrength === 'medium' || signalStrength === 'high' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <div className={`h-5 w-1 rounded-sm ${signalStrength === 'high' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  };
  
  // Renderizza sia l'indicatore di segnale che il messaggio di stato (se visibile)
  return (
    <>
      {/* Indicatore di segnale GPS sempre visibile */}
      {renderSignalIndicator()}
      
      {/* Messaggio di stato temporaneo */}
      {visible && gpsStatus && (
        <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg z-50 transition-all duration-300 ${
          gpsStatus.type === 'error' ? 'bg-red-500' :
          gpsStatus.type === 'warning' ? 'bg-yellow-500' :
          gpsStatus.type === 'success' ? 'bg-green-500' :
          'bg-blue-500'
        }`}>
          {gpsStatus.message}
        </div>
      )}
    </>
  );
};

/**
 * Funzione per ottenere un messaggio di errore leggibile
 */

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