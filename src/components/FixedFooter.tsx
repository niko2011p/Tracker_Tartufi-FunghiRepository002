import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map as MapIcon, History, Cloud } from 'lucide-react';

const FixedFooter: React.FC = () => {
  const location = useLocation();

  return (
    <div className="fixed-footer">
      <div className="max-w-7xl mx-auto flex justify-center gap-4">
        <Link
          to="/"
          className={`footer-link ${location.pathname === '/' ? 'active' : ''}`}
          aria-label="Mappa"
        >
          <MapIcon className="w-5 h-5" />
          <span>Mappa</span>
        </Link>
        <Link
          to="/storico"
          className={`footer-link ${location.pathname === '/storico' ? 'active' : ''}`}
          aria-label="Storico"
        >
          <History className="w-5 h-5" />
          <span>Storico</span>
        </Link>
        <Link
          to="/meteo"
          className={`footer-link ${location.pathname === '/meteo' ? 'active' : ''}`}
          aria-label="Meteo"
        >
          <Cloud className="w-5 h-5" />
          <span>Meteo</span>
        </Link>
      </div>
    </div>
  );
};

export default FixedFooter;