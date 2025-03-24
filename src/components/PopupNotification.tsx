import React, { useEffect, useState } from 'react';
import { X, Wifi, WifiOff, Navigation, NavigationOff } from 'lucide-react';

interface PopupNotificationProps {
  type: 'gps' | 'connection' | 'both';
  onClose: () => void;
}

const PopupNotification: React.FC<PopupNotificationProps> = ({ type, onClose }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
  }, [type]);

  const getMessage = () => {
    switch (type) {
      case 'gps':
        return 'Posizione GPS non disponibile. Verranno mostrati i dati dell\'ultima posizione nota.';
      case 'connection':
        return 'Connessione internet non disponibile. Verranno mostrati i dati in cache.';
      case 'both':
        return 'GPS e connessione non disponibili. Verranno mostrati gli ultimi dati disponibili.';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'gps':
        return <NavigationOff className="w-6 h-6 text-yellow-500" />;
      case 'connection':
        return <WifiOff className="w-6 h-6 text-yellow-500" />;
      case 'both':
        return (
          <div className="flex gap-2">
            <NavigationOff className="w-6 h-6 text-yellow-500" />
            <WifiOff className="w-6 h-6 text-yellow-500" />
          </div>
        );
      default:
        return null;
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 max-w-md w-11/12 z-50 border border-yellow-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <p className="text-sm text-gray-600">{getMessage()}</p>
        </div>
        <button
          onClick={() => {
            setShow(false);
            onClose();
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PopupNotification;