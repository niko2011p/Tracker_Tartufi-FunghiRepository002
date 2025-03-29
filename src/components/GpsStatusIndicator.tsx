import React, { useState, useEffect } from 'react';
import { Navigation, AlertCircle, Loader } from 'lucide-react';

interface GpsStatusIndicatorProps {
  isAcquiring: boolean;
  isAvailable: boolean;
  error?: GeolocationPositionError | Error | null;
  accuracy?: number | null;
}

/**
 * Componente che mostra lo stato dell'acquisizione GPS
 */
const GpsStatusIndicator: React.FC<GpsStatusIndicatorProps> = ({
  isAcquiring,
  isAvailable,
  error,
  accuracy
}) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Resetta la visibilità quando cambiano gli stati
  useEffect(() => {
    if (isAcquiring || !isAvailable || error) {
      setVisible(true);
      setFadeOut(false);
    } else if (isAvailable && !error) {
      // Imposta un timer per nascondere l'indicatore dopo 3 secondi
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setVisible(false), 500); // Durata dell'animazione di fade out
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAcquiring, isAvailable, error]);

  if (!visible) return null;

  // Determina il messaggio e lo stile in base allo stato
  let message = '';
  let icon = null;
  let bgColor = '';
  let textColor = '';

  if (isAcquiring) {
    message = 'Acquisizione posizione GPS in corso...';
    icon = <Loader className="w-5 h-5 animate-spin" />;
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
  } else if (error) {
    message = getErrorMessage(error);
    icon = <AlertCircle className="w-5 h-5" />;
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
  } else if (!isAvailable) {
    message = 'GPS non disponibile. Verifica le impostazioni del dispositivo.';
    icon = <AlertCircle className="w-5 h-5" />;
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-800';
  } else {
    message = `Posizione GPS acquisita${accuracy ? ` (precisione: ${Math.round(accuracy)}m)` : ''}`;
    icon = <Navigation className="w-5 h-5" />;
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
  }

  return (
    <div 
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgColor} ${textColor} px-4 py-2 rounded-full 
                 shadow-md flex items-center gap-2 z-50 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {icon}
      <span className="text-sm font-medium">{message}</span>
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