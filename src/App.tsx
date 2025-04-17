import React, { useEffect } from 'react';
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
import { UserProvider, useUser } from './context/UserContext';
import PrivateRoute from './routes/PrivateRoute';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Logger from './pages/Logger';
import Settings from './components/Settings';
import MainLayout from './components/MainLayout';
import TrackDetail from './pages/TrackDetail';
import { HomePage } from './pages/HomePage';
import { TrackDetailsPage } from './pages/TrackDetailsPage';
import { useToast } from './components/Toast';
import { Toaster } from './components/ui/toaster';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const { toast } = useToast();

  if (!user) {
    toast({
      title: "Accesso richiesto",
      description: "Effettua l'accesso per continuare",
      variant: "destructive",
    });
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const MainApp: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/navigation"
          element={
            <ProtectedRoute>
              <NavigationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/logger"
          element={
            <ProtectedRoute>
              <Logger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track/:id"
          element={
            <ProtectedRoute>
              <TrackDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finding/:trackId"
          element={
            <ProtectedRoute>
              <FindingForm onClose={() => {}} position={[0, 0]} />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </MainLayout>
  );
};

function App() {
  const { isAuthenticated, checkAuth, loadTracks } = useTrackStore();
  const { ToastProvider } = useToast();

  useEffect(() => {
    // Verifica autenticazione all'avvio
    checkAuth();
    
    // Carica le tracce all'avvio se l'utente è autenticato
    if (isAuthenticated) {
      loadTracks();
    }
  }, [checkAuth, isAuthenticated, loadTracks]);

  const router = createBrowserRouter([
    {
      path: "/",
      element: isAuthenticated ? <HomePage /> : <Login />
    },
    {
      path: "/navigation",
      element: isAuthenticated ? <NavigationPage /> : <Login />
    },
    {
      path: "/track/:trackId",
      element: isAuthenticated ? <TrackDetailsPage /> : <Login />
    },
    {
      path: "/logger",
      element: isAuthenticated ? <Logger /> : <Login />
    }
  ]);

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}

export default App;