// Rimuovo l'indicatore GPS
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, History, Pause, Square, MapPin, AlertCircle } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import TagOptionsPopup from './TagOptionsPopup';
import { useGps } from '../services/GpsService';
// Rimuovo l'import di GpsStatusIndicator

function FloatingMapButtons() {
  const { startTrack, stopTrack, isRecording, currentTrack } = useTrackStore();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [isStartingTrack, setIsStartingTrack] = useState(false);
  
  // Utilizzo dell'hook GPS per gestire l'acquisizione della posizione
  const {
    position,
    error,
    isLoading: isAcquiringGps,
    isAvailable: isGpsAvailable,
    accuracy,
    requestPosition
  } = useGps({
    maxRetries: 3,
    retryInterval: 2000,
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 10000
    }
  });

  const handleStopClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    // Esegui lo stop e chiudi i popup
    stopTrack();
    setShowTagOptions(false);
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
    }, 500);
  };
  
  const handleStopConfirm = () => {
    stopTrack();
    setShowStopConfirm(false);
    setShowTagOptions(false);
  };

  const handleTagClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    setShowTagOptions(true);
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
    }, 500);
  };

  // Gestione dell'avvio della traccia con acquisizione GPS robusta e prevenzione clic multipli
  const handleStartTrack = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    try {
      setIsStartingTrack(true);
      
      // Richiedi la posizione GPS prima di avviare la traccia
      await requestPosition();
      
      // Avvia la traccia solo dopo aver acquisito la posizione
      startTrack();
    } catch (error) {
      console.error('Errore durante l\'avvio della traccia:', error);
      // Anche in caso di errore, avvia comunque la traccia ma con la posizione predefinita
      startTrack();
    } finally {
      setIsStartingTrack(false);
      // Riabilita il pulsante
      if (button) button.disabled = false;
    }
  };

  const handleCenterMap = () => {
    // Get the current position from the track store and center the map on it
    const { currentTrack } = useTrackStore.getState();
    
    // Get all map instances from the document
    const mapInstances = document.querySelectorAll('.leaflet-container');
    if (mapInstances.length > 0) {
      // Get the Leaflet map instance from the DOM element
      const mapInstance = (mapInstances[0] as any)._leaflet_map;
      if (mapInstance) {
        if (currentTrack && currentTrack.coordinates.length > 0) {
          // Use the last recorded position from the track
          const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
          // Center the map on the current position with zoom level 15
          mapInstance.setView(lastPosition, 15, { animate: true, duration: 0.5 });
        } else if (position) {
          // Usa la posizione dal servizio GPS se disponibile
          mapInstance.setView(position, 15, { animate: true, duration: 0.5 });
        } else {
          // Fallback to geolocation API if no track is available
          requestPosition()
            .then(newPosition => {
              mapInstance.setView(newPosition, 15, { animate: true, duration: 0.5 });
            })
            .catch(error => {
              console.error('Error getting current position:', error);
            });
        }
      }
    }
    setShowTagOptions(false);
  };

  return (
    <>
      {/* Rimuovo l'indicatore di stato GPS */}

      {showTagOptions && (
        <TagOptionsPopup 
          onClose={() => setShowTagOptions(false)}
          onCenterMap={handleCenterMap}
        />
      )}
      
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Conferma interruzione</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Sei sicuro di voler interrompere la registrazione della traccia?
            </p>
            <p className="text-gray-600 mb-6">
              La traccia verrà salvata automaticamente nello storico.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleStopConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Interrompi e salva
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-[80px] left-1/2 transform -translate-x-1/2 z-[1001] w-auto">
        {isRecording && (
          <div className="flex flex-col gap-4 items-center pointer-events-none">
            <div className="flex flex-row gap-4 justify-center items-center pointer-events-auto z-[1002]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStopClick(e);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                aria-label="Interrompi tracciamento"
                role="button"
                tabIndex={0}
              >
                <Square className="w-6 h-6" />
                <span>Stop</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTagClick(e);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-[#fd9a3c] text-white shadow-lg hover:bg-[#e88a2c] transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50"
                aria-label="Aggiungi tag"
                role="button"
                tabIndex={0}
              >
                <MapPin className="w-6 h-6" />
                <span>Tag</span>
              </button>
            </div>
          </div>
        )}
        {!isRecording && (
          <div className="flex flex-col gap-4 items-center pointer-events-none">
            <div className="flex flex-row gap-4 justify-center items-center pointer-events-auto z-[1002]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStartTrack(e);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-[#8eaa36] text-white shadow-lg hover:bg-[#7d9830] transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
                aria-label="Inizia tracciamento"
                role="button"
                tabIndex={0}
                disabled={isStartingTrack}
              >
                {isStartingTrack ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Avvio...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>Start</span>
                  </>
                )}
              </button>
              <Link
                to="/storico"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-gray-700 text-white shadow-lg hover:bg-gray-800 transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                aria-label="Visualizza storico"
                role="button"
                tabIndex={0}
              >
                <History className="w-6 h-6" />
                <span>Storico</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default FloatingMapButtons;