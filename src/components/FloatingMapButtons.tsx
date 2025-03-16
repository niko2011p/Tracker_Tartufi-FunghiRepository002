import React from 'react';
import { Link } from 'react-router-dom';
import { Play, History, Pause, Square, MapPin } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import './FloatingMapButtons.css';

function FloatingMapButtons() {
  const { startTrack, pauseTrack, resumeTrack, stopTrack, isRecording, currentTrack, setShowFindingForm } = useTrackStore();

  const handleStopClick = () => {
    if (window.confirm('Sei sicuro di voler interrompere la registrazione della traccia? La traccia verrà salvata automaticamente nello storico.')) {
      stopTrack();
    }
  };

  return (
    <div className="floating-map-buttons">
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
            aria-label="Storico tracce"
          >
            <History className="w-5 h-5" />
            <span>Storico</span>
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
            onClick={() => setShowFindingForm(true)}
            className="floating-button floating-button-finding"
            aria-label="Aggiungi ritrovamento"
          >
            <MapPin className="w-5 h-5" />
            <span>Tag</span>
          </button>
        </>
      )}
    </div>
  );
}

export default FloatingMapButtons;