import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Map as MapIcon, History, Cloud, Settings, Menu, X } from 'lucide-react';
import Map from './components/Map';
import TrackingControls from './components/TrackingControls';
import StoricoTracce from './components/StoricoTracce';
import Meteo from './components/Meteo';
import Impostazioni from './components/Impostazioni';

function NavLink({ to, icon: Icon, text }: { to: string; icon: React.ElementType; text: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center px-3 sm:px-4 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-green-100 text-green-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5 sm:mr-2" />
      <span className="hidden sm:inline">{text}</span>
    </Link>
  );
}

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-green-600 shadow-sm fixed top-0 left-0 right-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <h1 className="text-xl sm:text-2xl md:text-[2.4rem] font-bold text-white font-roboto tracking-wide truncate">
                Tracker Funghi e Tartufi
              </h1>
              
              <button 
                className="sm:hidden p-2 text-white hover:text-gray-200"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>

              <nav className="hidden sm:flex space-x-1 md:space-x-2">
                <NavLink to="/" icon={MapIcon} text="Mappa" />
                <NavLink to="/storico" icon={History} text="Storico" />
                <NavLink to="/meteo" icon={Cloud} text="Meteo" />
                <NavLink to="/impostazioni" icon={Settings} text="Impostazioni" />
              </nav>
            </div>

            {isMenuOpen && (
              <nav className="sm:hidden py-2 space-y-1 bg-white rounded-lg shadow-lg mb-4">
                <Link 
                  to="/" 
                  className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MapIcon className="w-5 h-5 mr-3" />
                  Mappa
                </Link>
                <Link 
                  to="/storico" 
                  className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <History className="w-5 h-5 mr-3" />
                  Storico
                </Link>
                <Link 
                  to="/meteo" 
                  className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Cloud className="w-5 h-5 mr-3" />
                  Meteo
                </Link>
                <Link 
                  to="/impostazioni" 
                  className="flex items-center px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Impostazioni
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main className="flex-1 pt-[72px]">
          <Routes>
            <Route
              path="/"
              element={
                <div className="relative h-screen">
                  <Map />
                  <TrackingControls />
                </div>
              }
            />
            <Route path="/storico" element={<StoricoTracce />} />
            <Route path="/meteo" element={<Meteo />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;