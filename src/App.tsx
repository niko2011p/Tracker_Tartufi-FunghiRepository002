import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Map as MapIcon, History, Cloud, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import Map from './components/Map';
import TrackingControls from './components/TrackingControls';
import FloatingMapButtons from './components/FloatingMapButtons';
import StoricoTracce from './components/StoricoTracce';
import Meteo from './components/Meteo';
import Impostazioni from './components/Impostazioni';
import FixedFooter from './components/FixedFooter';
import MapLogo from './components/MapLogo';
import PausePage from './components/PausePage';
import NavigationPage from './components/NavigationPage';
import FindingForm from './components/FindingForm';
import ScrollToTop from './components/ScrollToTop';
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
  const { currentTrack, showFindingForm, setShowFindingForm, isRecording } = useTrackStore();
  const isPaused = currentTrack?.isPaused;

  // If track is paused, show the pause page
  if (isPaused) {
    return <PausePage />;
  }
  
  // If track is recording (active navigation), show the navigation page
  if (isRecording) {
    return <NavigationPage />;
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
        <ScrollToTop />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/storico" element={<StoricoTracce />} />
            <Route path="/meteo" element={<Meteo />} />
            <Route path="/settings" element={<Impostazioni />} />
          </Routes>
        </main>
        <FixedFooter />
      </div>
    </BrowserRouter>
  );
}

export default App;