import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation, History, Cloud, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import Navi from './components/Navi';
import TrackingControls from './components/TrackingControls';
import FloatingMapButtons from './components/FloatingMapButtons';
import Meteo from './components/Meteo';
import MapLogo from './components/MapLogo';
import NavigationPage from './pages/NavigationPage';
import FindingForm from './components/FindingForm';
import ScrollToTop from './components/ScrollToTop';
import { useTrackStore } from './store/trackStore';

// Importazione dei componenti per l'autenticazione
import { UserProvider } from './context/UserContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Logger from './components/Logger';
import Settings from './components/Settings';
import MainLayout from './components/MainLayout';
import TrackDetail from './pages/TrackDetail';

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
  const { showFindingForm, setShowFindingForm, isRecording } = useTrackStore();
  
  // If track is recording (active navigation), show the navigation page
  if (isRecording) {
    return <NavigationPage />;
  }

  return (
    <div className="relative h-screen w-full">
      <Navi />
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
      <ScrollToTop />
      <UserProvider>
        <MainLayout>
          <Routes>
            {/* Rotte pubbliche */}
            <Route path="/login" element={<Login />} />
            
            {/* Rotte protette */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<MainApp />} />
              <Route path="/NavigationPage" element={<NavigationPage />} />
              <Route path="/logger" element={<Logger />} />
              <Route path="/meteo" element={<Meteo />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/track/:id" element={<TrackDetail />} />
            </Route>
            
            {/* Reindirizzamento per rotte non trovate */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;