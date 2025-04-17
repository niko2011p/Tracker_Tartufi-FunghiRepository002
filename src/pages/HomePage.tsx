import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackStore } from '../store/trackStore';
import { Map, Navigation, List, Cloud } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isRecording } = useTrackStore();

  // Se c'è una registrazione in corso, reindirizza alla pagina di navigazione
  React.useEffect(() => {
    if (isRecording) {
      navigate('/navigation');
    }
  }, [isRecording, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Funghi Tracker</h1>
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <button
          onClick={() => navigate('/navigation')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <Map className="w-12 h-12 text-green-600 mb-2" />
          <span className="text-lg font-medium text-gray-700">Nuova Traccia</span>
        </button>

        <button
          onClick={() => navigate('/logger')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <List className="w-12 h-12 text-blue-600 mb-2" />
          <span className="text-lg font-medium text-gray-700">Logger</span>
        </button>

        <button
          onClick={() => navigate('/meteo')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <Cloud className="w-12 h-12 text-gray-600 mb-2" />
          <span className="text-lg font-medium text-gray-700">Meteo</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage; 