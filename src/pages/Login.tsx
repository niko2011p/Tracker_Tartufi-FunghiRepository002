import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTrackStore } from '../store/trackStore';
import LogoFTL from '../assets/icons/LogoFTL.svg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [hasActiveTrack, setHasActiveTrack] = useState(false);
  
  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { checkTrackOnLogin } = useTrackStore();
  
  // Ottieni il percorso da cui l'utente è stato reindirizzato
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await login(email, password);
      // Verifica se c'è una traccia attiva
      const hasTrack = await checkTrackOnLogin();
      setHasActiveTrack(hasTrack);
      if (hasTrack) {
        setShowTrackDialog(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Credenziali non valide. Riprova.');
      console.error('Errore di login:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackChoice = (continueTrack: boolean) => {
    if (!continueTrack) {
      // Se l'utente non vuole continuare la traccia, la salviamo e la chiudiamo
      const { stopTrack } = useTrackStore.getState();
      stopTrack();
    }
    setShowTrackDialog(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <img src={LogoFTL} alt="Funghi Tracker Logger" className="h-32 w-auto mb-8" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Accedi al tuo account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inserisci le tue credenziali per accedere
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Indirizzo Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#8eaa36] focus:border-[#8eaa36] focus:z-10 sm:text-sm"
                placeholder="Indirizzo Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#8eaa36] focus:border-[#8eaa36] focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#8eaa36] hover:bg-[#7d9830] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8eaa36] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <p className="text-gray-600">
              Per scopi di test, qualsiasi email e password (min. 6 caratteri) funzioneranno
            </p>
          </div>
        </form>
      </div>

      {showTrackDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Traccia attiva rilevata</h2>
            <p className="mb-6 text-gray-600">
              È stata rilevata una traccia attiva. Vuoi continuare la traccia esistente o avviarne una nuova?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleTrackChoice(true)}
                className="flex-1 px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-200"
              >
                Continua traccia
              </button>
              <button
                onClick={() => handleTrackChoice(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Nuova traccia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;