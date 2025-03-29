import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, History, Pause, Square, MapPin, AlertCircle } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import './FloatingMapButtons.css';
import TagOptionsPopup from './TagOptionsPopup';
import { useGps } from '../services/GpsService';
import GpsStatusIndicator from './GpsStatusIndicator';

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

  const handleStopClick = () => {
    setShowStopConfirm(true);
  };
  
  const handleStopConfirm = () => {
    stopTrack();
    setShowStopConfirm(false);
  };

  const handleTagClick = () => {
    setShowTagOptions(true);
  };

  // Gestione dell'avvio della traccia con acquisizione GPS robusta
  const handleStartTrack = async () => {
    try {
      setIsStartingTrack(true);
      
      // Richiedi la posizione GPS prima di avviare la traccia
      await requestPosition();
      
      // Avvia la traccia solo dopo aver acquisito la posizione
      startTrack();
    } catch (error) {
      console.error('Errore durante l\'avvio della traccia:', error);
      // Anche in caso di errore, avvia comunque la traccia ma con la posizione predefinita
      // L'utente vedrà l'indicatore di errore GPS
      startTrack();
    } finally {
      setIsStartingTrack(false);
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
      {/* Indicatore di stato GPS */}
      <GpsStatusIndicator 
        isAcquiring={isAcquiringGps || isStartingTrack}
        isAvailable={isGpsAvailable}
        error={error}
        accuracy={accuracy}
      />

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
      <div className="floating-map-buttons-container">
        {isRecording && (
          <div className="floating-map-buttons">
            <div className="button-group">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!e.target.closest('.unified-button.stop')) return;
                  handleStopClick();
                }}
                className="unified-button stop"
                aria-label="Interrompi tracciamento"
                role="button"
                tabIndex={0}
              >
                <Square className="w-7 h-7" />
                <span>Stop</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTagClick();
                }}
                className="unified-button tag"
                aria-label="Aggiungi tag"
              >
                <MapPin className="w-7 h-7" />
                <span>Tag</span>
              </button>
            </div>
          </div>
        )}
        
        {!isRecording && (
          <div className="floating-map-buttons">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleStartTrack();
              }}
              className={`unified-button start ${isStartingTrack ? 'opacity-75 cursor-wait' : ''}`}
              aria-label="Avvia tracciamento"
              disabled={isStartingTrack}
            >
              {isStartingTrack ? (
                <>
                  <div className="w-7 h-7 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                  <span>Acquisizione GPS...</span>
                </>
              ) : (
                <>
                  <Play className="w-7 h-7" />
                  <span>Start Track</span>
                </>
              )}
            </button>
            
            <Link
              to="/storico"
              className="unified-button logger"
              aria-label="Vai al logger"
            >
              <History className="w-7 h-7" />
              <span>Logger</span>
            </Link>
          </div>
        )}
        

      </div>
    </>
  );
}

export default FloatingMapButtons;