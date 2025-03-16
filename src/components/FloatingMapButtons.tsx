import React from 'react';
import { Link } from 'react-router-dom';
import { Play, History } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import './FloatingMapButtons.css';

function FloatingMapButtons() {
  const { startTrack } = useTrackStore();

  return (
    <div className="floating-map-buttons">
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
    </div>
  );
}

export default FloatingMapButtons;