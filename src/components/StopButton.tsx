import React, { useState } from 'react';
import { Square } from 'lucide-react';
import useButtonConfigStore from '../store/buttonConfigStore';
import { useTrackStore } from '../store/trackStore';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import { useNavigate } from 'react-router-dom';

const StopButton: React.FC = () => {
  const stopButton = useButtonConfigStore((state) => state.stopButton);
  const { stopTrack, currentTrack, currentPosition } = useTrackStore();
  const addTrack = useTrackHistoryStore((state) => state.addTrack);
  const navigate = useNavigate();
  const [isPulsing, setIsPulsing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const getButtonShapeClass = (borderRadius: number | undefined) => {
    const radius = borderRadius ?? 15;
    if (radius === 50) return 'rounded-full';
    if (radius === 0) return 'rounded-none';
    return `rounded-[${radius}px]`;
  };

  const getPositionStyle = (position: { x: number; y: number }, positionType: 'percentage' | 'pixels') => {
    if (positionType === 'percentage') {
      return {
        top: `${position.y}%`,
        left: `${position.x}%`,
        transform: 'translate(-50%, -50%)'
      };
    }
    return {
      top: `${position.y}px`,
      left: `${position.x}px`,
      transform: 'translate(-50%, -50%)'
    };
  };

  const getShadowStyle = (shadow: { color: string; blur: number; spread: number }) => {
    return {
      boxShadow: `0 0 ${shadow.blur}px ${shadow.spread}px ${shadow.color}`
    };
  };

  const handleClick = () => {
    setIsPulsing(true);
    setShowConfirmDialog(true);
    setTimeout(() => {
      setIsPulsing(false);
    }, 300);
  };

  const handleConfirm = async () => {
    if (currentTrack) {
      try {
        console.log('Stopping track and saving...');
        
        // Prima interrompi il tracking e ottieni la traccia completata
        const completedTrack = await stopTrack();
        
        if (completedTrack) {
          console.log('Track completed, saving to history...');
          
          // Salva la traccia completata
          addTrack({
            ...completedTrack,
            endTime: new Date().toISOString(),
            endPosition: currentPosition
          });
          
          console.log('Track saved, navigating to logger...');
          
          // Reindirizza alla pagina Logger
          navigate('/logger');
        } else {
          console.error('Failed to complete track');
        }
      } catch (error) {
        console.error('Errore durante il salvataggio della traccia:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div 
        className="fixed z-[2000]" 
        style={getPositionStyle(stopButton.position, stopButton.positionType)}
      >
        <button
          onClick={handleClick}
          className={`${stopButton.color} ${getButtonShapeClass(stopButton.borderRadius)} flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative`}
          style={{
            width: stopButton.size,
            height: stopButton.size,
            ...getShadowStyle(stopButton.shadow)
          }}
        >
          <div className={`absolute inset-0 ${getButtonShapeClass(stopButton.borderRadius)} ${stopButton.color.replace('bg-', 'bg-')}/20 ${isPulsing ? 'animate-ping' : ''}`}></div>
          <Square
            size={stopButton.iconSize}
            className={`${stopButton.iconColor} transition-transform duration-300 ${isPulsing ? 'animate-bounce' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Conferma Interruzione</h3>
            <p className="text-gray-600 mb-6">Vuoi interrompere la traccia e salvare i dati sul Logger?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                Salva Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StopButton; 