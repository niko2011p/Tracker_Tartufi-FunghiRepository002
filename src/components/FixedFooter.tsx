import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navigation, History, Cloud, Settings } from 'lucide-react';

const FixedFooter: React.FC = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md py-2 px-4 z-[1000]">
      <div className="max-w-7xl mx-auto flex justify-evenly px-0">
        <Link
          to="/"
          className={`flex flex-col items-center px-4 py-3 flex-1 text-center transition-colors ${location.pathname === '/' ? 'bg-green-50 text-[#8eaa36]' : 'text-gray-600 hover:bg-gray-100'}`}
          aria-label="Navi"
        >
          <Navigation className="w-8 h-8" />
          <span className="text-sm mt-1 font-medium">Navi</span>
        </Link>
        <Link
          to="/storico"
          className={`flex flex-col items-center px-4 py-3 flex-1 text-center transition-colors ${location.pathname === '/storico' ? 'bg-green-50 text-[#8eaa36]' : 'text-gray-600 hover:bg-gray-100'}`}
          aria-label="Logger"
        >
          <History className="w-8 h-8" />
          <span className="text-sm mt-1 font-medium">Logger</span>
        </Link>
        <Link
          to="/meteo"
          className={`flex flex-col items-center px-4 py-3 flex-1 text-center transition-colors ${location.pathname === '/meteo' ? 'bg-green-50 text-[#8eaa36]' : 'text-gray-600 hover:bg-gray-100'}`}
          aria-label="Meteo"
        >
          <Cloud className="w-8 h-8" />
          <span className="text-sm mt-1 font-medium">Meteo</span>
        </Link>
        <Link
          to="/settings"
          className={`flex flex-col items-center px-4 py-3 flex-1 text-center transition-colors ${location.pathname === '/settings' ? 'bg-green-50 text-[#8eaa36]' : 'text-gray-600 hover:bg-gray-100'}`}
          aria-label="Settings"
        >
          <Settings className="w-8 h-8" />
          <span className="text-sm mt-1 font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default FixedFooter;