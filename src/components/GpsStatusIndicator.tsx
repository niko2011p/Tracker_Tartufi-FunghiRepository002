import React, { useEffect, useState } from 'react';
import { useTrackStore } from '../store/trackStore';
import { Navigation, Signal } from 'lucide-react';
import { useGps } from '../services/GpsService';
import './GpsStatusIndicator.css';

interface GpsStatusIndicatorProps {
  position?: 'default' | 'navigation';
  isAcquiring?: boolean;
  isAvailable?: boolean;
  error?: GeolocationPositionError | Error | null;
  accuracy?: number | null;
  currentPosition?: [number, number];
}

const GpsStatusIndicator: React.FC<GpsStatusIndicatorProps> = ({
  position = 'default',
  isAcquiring = false,
  isAvailable = true,
  error = null,
  accuracy = null,
  currentPosition = [0, 0]
}) => {
  const { gpsStatus } = useTrackStore();
  // Rimuoviamo la logica di visibilità per mantenere l'indicatore sempre visibile
  const [visible, setVisible] = useState(true);
  const [signalStrength, setSignalStrength] = useState<'strong' | 'medium' | 'weak' | 'none'>('none');
  const [coordinates, setCoordinates] = useState<string>('');
  
  useEffect(() => {
    if (currentPosition && currentPosition.length === 2) {
      const [lat, lng] = currentPosition;
      setCoordinates(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, [currentPosition]);

  useEffect(() => {
    if (!isAvailable || error) {
      setSignalStrength('none');
    } else if (isAcquiring) {
      setSignalStrength('weak');
    } else if (accuracy !== null) {
      if (accuracy <= 10) {
        setSignalStrength('strong');
      } else if (accuracy <= 50) {
        setSignalStrength('medium');
      } else {
        setSignalStrength('weak');
      }
    }
  }, [isAvailable, isAcquiring, error, accuracy]);
  
  // Mostra il messaggio quando cambia lo stato GPS (sempre visibile)
  useEffect(() => {
    if (gpsStatus) {
      // Manteniamo l'indicatore sempre visibile
      setVisible(true);
      
      // Determina la forza del segnale in base al tipo di stato
      let currentSignal: 'strong' | 'medium' | 'weak' | 'none' = 'none';
      if (gpsStatus.type === 'success') {
        currentSignal = 'strong';
      } else if (gpsStatus.type === 'warning') {
        currentSignal = 'medium';
      } else if (gpsStatus.type === 'error') {
        currentSignal = 'none';
      } else {
        currentSignal = 'weak';
      }
      
      // Aggiorna la forza del segnale
      setSignalStrength(currentSignal);
      
      // Non c'è alcun timer che nasconde l'indicatore
    }
  }, [gpsStatus]);
  
  // Assicuriamo che l'indicatore sia sempre visibile
  useEffect(() => {
    // Imposta visible a true all'avvio del componente e non lo cambia mai
    setVisible(true);
  }, []);
  
  // Utilizziamo l'hook GPS per ottenere le coordinate in tempo reale
  const {
    position: gpsPosition,
    accuracy: gpsAccuracy,
    isLoading: isAcquiringGps,
    isAvailable: isGpsAvailable
  } = useGps({
    maxRetries: 3,
    retryInterval: 2000,
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 10000
    }
  });

  const getSignalColor = () => {
    switch (signalStrength) {
      case 'strong':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'weak':
        return 'text-orange-500';
      case 'none':
        return 'text-red-500';
    }
  };

  const getStatusText = () => {
    if (isAcquiring) return 'Acquisizione GPS...';
    if (accuracy === null) return 'GPS non disponibile';
    if (accuracy <= 10) return 'Alta precisione';
    if (accuracy <= 30) return 'Precisione media';
    return 'Bassa precisione';
  };

  // Mostra sempre un indicatore di segnale GPS anche quando il messaggio non è visibile
  const renderSignalIndicator = () => {
    // Posizionamento nella parte superiore della pagina, centrato orizzontalmente
    
    // Determina il colore in base alla forza del segnale
    const signalColor = getSignalColor();
    
    // Determina il testo in base alla forza del segnale
    const signalText = getStatusText();
    
    return (
      <div className="fixed z-50 flex flex-col items-center bg-white bg-opacity-80 rounded-lg px-3 py-2 shadow-md" 
           style={{ top: '10px', left: '50%', transform: 'translateX(-50%)', transition: 'all 0.3s ease', opacity: 1, visibility: 'visible' }}>
        <div className="flex items-center">
          <Signal className={`w-6 h-6 ${signalColor}`} />
          {accuracy !== null && (
            <span className="ml-2 text-sm text-gray-600">
              ±{accuracy.toFixed(0)}m
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-gray-600 font-mono">
          {coordinates}
        </div>
      </div>
    );
  };
  
  // Renderizza sia l'indicatore di segnale che il messaggio di stato (sempre visibile)
  return (
    <>
      {/* Indicatore di segnale GPS sempre visibile in alto al centro */}
      <div className="fixed z-50 flex flex-col items-center" 
           style={{ 
             top: '10px', 
             left: '50%', 
             transform: 'translateX(-50%)', 
             backgroundColor: 'rgba(0, 0, 0, 0.6)', /* Sfondo scuro semi-trasparente come la tabellina Dati Traccia */
             borderRadius: '8px',
             padding: '8px 12px',
             boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
             transition: 'all 0.3s ease', 
             opacity: 1, 
             visibility: 'visible' 
           }}>
        <div className="flex items-center">
          <Signal className={`w-6 h-6 ${getSignalColor()}`} />
          {accuracy !== null && (
            <span className="ml-2 text-sm text-white">
              ±{accuracy.toFixed(0)}m
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-white font-mono">
          {coordinates}
        </div>
      </div>
      
      {/* Messaggio di stato sempre visibile */}
      {gpsStatus && (
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