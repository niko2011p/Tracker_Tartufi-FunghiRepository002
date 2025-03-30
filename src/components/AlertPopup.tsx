import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Finding } from '../types';

interface AlertPopupProps {
  finding: Finding;
  onClose: () => void;
  onMute: () => void;
  isAudioPlaying: boolean;
}

const AlertPopup: React.FC<AlertPopupProps> = ({ finding, onClose, onMute, isAudioPlaying }) => {
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    setShowPopup(true);
  }, [finding]);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] transition-opacity ${showPopup ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ritrovamento Vicino</h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Chiudi"
            role="button"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Nome</h4>
            <p className="text-gray-600">{finding.name}</p>
          </div>

          <div>
            <h4 className="font-medium">Descrizione</h4>
            <p className="text-gray-600">{finding.description}</p>
          </div>

          {finding.photoUrl && (
            <div>
              <h4 className="font-medium">Foto</h4>
              <img 
                src={finding.photoUrl} 
                alt={finding.name}
                className="mt-2 rounded-lg w-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMute();
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${isAudioPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
              role="button"
              tabIndex={0}
            >
              {isAudioPlaying ? 'Silenzia Alert' : 'Alert Silenziato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertPopup;