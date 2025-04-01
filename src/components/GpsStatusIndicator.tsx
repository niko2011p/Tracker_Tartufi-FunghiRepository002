import React, { useEffect, useState } from 'react';
import { useTrackStore } from '../store/trackStore';
import { Navigation } from 'lucide-react';
import { useGps } from '../services/GpsService';

interface GpsStatusIndicatorProps {
  position?: 'default' | 'navigation';
  isAcquiring?: boolean;
  isAvailable?: boolean;
  error?: GeolocationPositionError | Error | null;
  accuracy?: number | null;
}

const GpsStatusIndicator: React.FC<GpsStatusIndicatorProps> = ({
  position = 'default',
  isAcquiring = false,
  isAvailable = true,
  error = null,
  accuracy = null
}) => {
  const { gpsStatus } = useTrackStore();
  // Rimuoviamo la logica di visibilità per mantenere l'indicatore sempre visibile
  const [visible, setVisible] = useState(true);
  const [signalStrength, setSignalStrength] = useState<'high' | 'medium' | 'low' | 'none'>('none');
  const [signalHistory, setSignalHistory] = useState<string[]>([]);
  
  // Determina la forza del segnale in base all'accuratezza GPS
  useEffect(() => {
    if (accuracy !== null) {
      let currentSignal: 'high' | 'medium' | 'low' | 'none' = 'none';
      
      // Calcola la percentuale di qualità del segnale in base all'accuratezza
      // Minore è l'accuratezza (in metri), migliore è il segnale
      // Consideriamo 30m come 0% e 0m come 100%
      const signalPercentage = Math.max(0, Math.min(100, 100 - (accuracy / 30) * 100));
      
      // Applica le soglie richieste: 0-33% → 1 tacca, 34-66% → 2 tacche, 67-100% → 3 tacche
      if (signalPercentage >= 67) {
        currentSignal = 'high';
      } else if (signalPercentage >= 34) {
        currentSignal = 'medium';
      } else if (signalPercentage > 0) {
        currentSignal = 'low';
      } else {
        currentSignal = 'none';
      }
      
      // Aggiorna la cronologia dei segnali
      setSignalHistory(prev => {
        const newHistory = [...prev, currentSignal].slice(-10);
        const averageSignal = calculateAverageSignal(newHistory);
        setSignalStrength(averageSignal);
        return newHistory;
      });
    }
  }, [accuracy]);
  
  // Funzione per calcolare la forza del segnale media con smoothing
  const calculateAverageSignal = (history: string[]): 'high' | 'medium' | 'low' | 'none' => {
    if (history.length === 0) return 'none';
    
    // Utilizziamo una finestra mobile più ampia (ultimi 10 valori)
    const recentHistory = history.slice(-10);
    
    const counts = recentHistory.reduce((acc, signal) => {
      acc[signal] = (acc[signal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calcola le percentuali per ogni livello di segnale
    const total = recentHistory.length;
    const percentages = Object.entries(counts).map(([signal, count]) => ({
      signal,
      percentage: (count / total) * 100
    }));
    
    // Applica una soglia per determinare il livello del segnale
    if (percentages.find(p => p.signal === 'high' && p.percentage >= 60)) return 'high';
    if (percentages.find(p => p.signal === 'medium' && p.percentage >= 50)) return 'medium';
    if (percentages.find(p => p.signal === 'low' && p.percentage >= 40)) return 'low';
    return 'none';
  };
  
  // Mostra il messaggio quando cambia lo stato GPS (sempre visibile)
  useEffect(() => {
    if (gpsStatus) {
      // Manteniamo l'indicatore sempre visibile
      setVisible(true);
      
      // Determina la forza del segnale in base al tipo di stato
      let currentSignal: 'high' | 'medium' | 'low' | 'none' = 'none';
      if (gpsStatus.type === 'success') {
        currentSignal = 'high';
      } else if (gpsStatus.type === 'warning') {
        currentSignal = 'medium';
      } else if (gpsStatus.type === 'error') {
        currentSignal = 'none';
      } else {
        currentSignal = 'low';
      }
      
      // Aggiorna la cronologia dei segnali con un intervallo più lungo (mantiene gli ultimi 10 valori)
      setSignalHistory(prev => {
        const newHistory = [...prev, currentSignal].slice(-10);
        const averageSignal = calculateAverageSignal(newHistory);
        setSignalStrength(averageSignal);
        return newHistory;
      });
      
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

  // Mostra sempre un indicatore di segnale GPS anche quando il messaggio non è visibile
  const renderSignalIndicator = () => {
    // Posizionamento nella parte superiore della pagina, centrato orizzontalmente
    
    // Determina il colore in base alla forza del segnale
    const signalColor = signalStrength === 'high' ? '#4CAF50' : 
                        signalStrength === 'medium' ? '#FFC107' : 
                        signalStrength === 'low' ? '#FF9800' : 
                        '#F44336';
    
    // Determina il testo in base alla forza del segnale
    const signalText = signalStrength === 'high' ? 'Eccellente' : 
                       signalStrength === 'medium' ? 'Buono' : 
                       signalStrength === 'low' ? 'Discreto' : 
                       'Debole';
    
    return (
      <div className="fixed z-50 flex flex-col items-center bg-white bg-opacity-80 rounded-lg px-3 py-2 shadow-md" 
           style={{ top: '10px', left: '50%', transform: 'translateX(-50%)', transition: 'all 0.3s ease', opacity: 1, visibility: 'visible' }}>
        <div className="flex items-center">
          <Navigation className="w-5 h-5 mr-2" style={{ color: signalColor }} />
          <div className="flex space-x-1 items-end">
            <div className={`h-3 w-1.5 rounded-sm ${signalStrength !== 'none' ? 'bg-current' : 'bg-gray-300'}`} style={{ color: signalColor }}></div>
            <div className={`h-4 w-1.5 rounded-sm ${signalStrength === 'medium' || signalStrength === 'high' ? 'bg-current' : 'bg-gray-300'}`} style={{ color: signalColor }}></div>
            <div className={`h-5 w-1.5 rounded-sm ${signalStrength === 'high' ? 'bg-current' : 'bg-gray-300'}`} style={{ color: signalColor }}></div>
          </div>
          {accuracy !== null && (
            <span className="ml-2 text-xs font-medium" style={{ color: '#f5a149', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {signalText} ({Math.round(accuracy)}m)
            </span>
          )}
        </div>
        {gpsPosition && (
          <div className="text-xs mt-1 font-mono">
            Lat: {gpsPosition[0].toFixed(6)} | Lon: {gpsPosition[1].toFixed(6)}
          </div>
        )}
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
          <Navigation className="w-5 h-5 mr-2" style={{ color: '#f5a149' }} />
          <div className="flex space-x-1 items-end">
            <div className={`h-3 w-1.5 rounded-sm ${signalStrength !== 'none' ? 'bg-current' : 'bg-gray-300'}`} 
                 style={{ color: signalStrength === 'high' ? '#4CAF50' : 
                                 signalStrength === 'medium' ? '#FFC107' : 
                                 signalStrength === 'low' ? '#FF9800' : 
                                 '#F44336' }}></div>
            <div className={`h-4 w-1.5 rounded-sm ${signalStrength === 'medium' || signalStrength === 'high' ? 'bg-current' : 'bg-gray-300'}`} 
                 style={{ color: signalStrength === 'high' ? '#4CAF50' : 
                                 signalStrength === 'medium' ? '#FFC107' : 
                                 signalStrength === 'low' ? '#FF9800' : 
                                 '#F44336' }}></div>
            <div className={`h-5 w-1.5 rounded-sm ${signalStrength === 'high' ? 'bg-current' : 'bg-gray-300'}`} 
                 style={{ color: signalStrength === 'high' ? '#4CAF50' : 
                                 signalStrength === 'medium' ? '#FFC107' : 
                                 signalStrength === 'low' ? '#FF9800' : 
                                 '#F44336' }}></div>
          </div>
          {accuracy !== null && (
            <span className="ml-2 text-xs font-medium text-white">
              {signalStrength === 'high' ? 'Eccellente' : 
               signalStrength === 'medium' ? 'Buono' : 
               signalStrength === 'low' ? 'Discreto' : 
               'Debole'} ({Math.round(accuracy)}m)
            </span>
          )}
        </div>
        {gpsPosition && (
          <div className="text-xs mt-1 font-mono text-white">
            Lat: {gpsPosition[0].toFixed(6)} | Lon: {gpsPosition[1].toFixed(6)}
          </div>
        )}
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