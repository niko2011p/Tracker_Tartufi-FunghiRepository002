import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, History, Pause, Square, MapPin, AlertCircle } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import './FloatingMapButtons.css';
import TagOptionsPopup from './TagOptionsPopup';

function FloatingMapButtons() {
  const { startTrack, pauseTrack, resumeTrack, stopTrack, isRecording, isPaused, currentTrack } = useTrackStore();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);

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
        } else {
          // Fallback to geolocation API if no track is available
          navigator.geolocation.getCurrentPosition(
            (position) => {
              mapInstance.setView(
                [position.coords.latitude, position.coords.longitude],
                15,
                { animate: true, duration: 0.5 }
              );
            },
            (error) => {
              console.error('Error getting current position:', error);
            }
          );
        }
      }
    }
    setShowTagOptions(false);
  };

  return (
    <>
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
        {isRecording && !isPaused && (
          <div className="floating-map-buttons">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                pauseTrack();
              }}
              className="unified-button pause"
              aria-label="Pausa tracciamento"
            >
              <Pause className="w-7 h-7" />
              <span>Pausa</span>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleStopClick();
              }}
              className="unified-button stop"
              aria-label="Interrompi tracciamento"
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
        )}
        
        {!isRecording && (
          <div className="floating-map-buttons">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                startTrack();
              }}
              className="unified-button start"
              aria-label="Avvia tracciamento"
            >
              <Play className="w-7 h-7" />
              <span>Start Track</span>
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
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            resumeTrack();
          }}
          className={`unified-button resume ${isPaused ? 'visible' : ''}`}
          aria-label="Riprendi tracciamento"
        >
          <Play className="w-7 h-7" />
          <span>Riavvia</span>
        </button>
      </div>
    </>
  );
}

export default FloatingMapButtons;