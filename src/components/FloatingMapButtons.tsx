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
      <div className={`floating-map-buttons ${isPaused ? 'paused' : ''}`}>
      {!isRecording ? (
        // Buttons when not recording
        <>
          <button
            onClick={startTrack}
            className="floating-button floating-button-start"
            aria-label="Avvia traccia"
          >
            <Play className="w-5 h-5" />
            <span>Avvia</span>
          </button>
          
          <Link
            to="/storico"
            className="floating-button floating-button-history"
            aria-label="Logger"
          >
            <History className="w-5 h-5" />
            <span className="text-[#4b5320]">Logger</span>
          </Link>
        </>
      ) : (
        // Buttons when recording
        <>
          <button
            onClick={isRecording ? pauseTrack : resumeTrack}
            className="floating-button floating-button-pause"
            aria-label={isRecording ? "Pausa traccia" : "Riprendi traccia"}
          >
            <Pause className="w-5 h-5" />
            <span>Pausa</span>
          </button>
          
          <button
            onClick={handleStopClick}
            className="floating-button floating-button-stop"
            aria-label="Interrompi traccia"
          >
            <Square className="w-5 h-5" />
            <span>Stop</span>
          </button>

          <button
            onClick={handleTagClick}
            className="floating-button floating-button-finding"
            aria-label="Opzioni Tag"
          >
            <MapPin className="w-5 h-5" />
            <span>Tag</span>
          </button>
        </>
      )}
    </div>
    </>
  );
}

export default FloatingMapButtons;