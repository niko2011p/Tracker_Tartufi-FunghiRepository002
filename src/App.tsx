import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Map as MapIcon, History, Cloud, Settings, Menu, X } from 'lucide-react';
import Map from './components/Map';
import TrackingControls from './components/TrackingControls';
import FloatingMapButtons from './components/FloatingMapButtons';
import StoricoTracce from './components/StoricoTracce';
import Meteo from './components/Meteo';
import Impostazioni from './components/Impostazioni';
import FixedFooter from './components/FixedFooter';
import MapLogo from './components/MapLogo';
import PausePage from './components/PausePage';
import FindingForm from './components/FindingForm';
import { useTrackStore } from './store/trackStore';
import './components/FixedFooter.css';

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

function MainApp() {
  const { currentTrack, showFindingForm, setShowFindingForm } = useTrackStore();
  const isPaused = currentTrack?.isPaused;

  // If track is paused, show the pause page
  if (isPaused) {
    return <PausePage />;
  }

  return (
    <div className="relative h-screen w-full">
      <Map />
      <MapLogo />
      <FloatingMapButtons />
      <TrackingControls />
      {showFindingForm && <FindingForm onClose={() => setShowFindingForm(false)} />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col has-fixed-footer">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/storico" element={<StoricoTracce />} />
            <Route path="/meteo" element={<Meteo />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
          </Routes>
        </main>
        <FixedFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;