import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface PrivateRouteProps {
  children?: React.ReactNode;
}

/**
 * Componente che protegge le rotte che richiedono autenticazione.
 * Se l'utente non è autenticato, viene reindirizzato alla pagina di login.
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useUser();
  const location = useLocation();

  // Mostra un indicatore di caricamento mentre verifichiamo lo stato di autenticazione
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Se l'utente non è autenticato, reindirizza al login
  if (!isAuthenticated) {
    // Passa il percorso corrente come state per reindirizzare l'utente dopo il login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se l'utente è autenticato, mostra il contenuto della rotta
  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;