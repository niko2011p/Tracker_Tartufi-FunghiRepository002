import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import MainLayout from './components/MainLayout';
import Login from './pages/Login';
import NavigationPage from './pages/NavigationPage';
import Logger from './pages/Logger';
import TrackDetails from './components/TrackDetails';
import HomePage from './pages/HomePage';
import FindingForm from './components/FindingForm';
import { toast } from './components/ui/use-toast';
import { Toaster } from './components/ui/toaster';
import { useTrackStore } from './store/trackStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();

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

const TrackDetailsWrapper: React.FC = () => {
  const { id } = useParams();
  const { tracks } = useTrackStore();
  const track = tracks.find(t => t.id === id);

  if (!track) {
    return <Navigate to="/logger" />;
  }

  return <TrackDetails track={track} onClose={() => window.history.back()} />;
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <BrowserRouter>
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
                  <TrackDetailsWrapper />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </MainLayout>
      </BrowserRouter>
    </UserProvider>
  );
};

export default App; 