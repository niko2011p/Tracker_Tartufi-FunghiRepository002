import React, { useEffect, useState, useRef } from 'react';
import { useTrackStore } from '../store/trackStore';

interface CompassIndicatorProps {
  position?: 'topRight' | 'default';
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ position = 'default' }) => {
  const { currentDirection } = useTrackStore();
  const [smoothedDirection, setSmoothedDirection] = useState(0);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const updateDirection = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      // Aggiorna solo ogni 100ms per fluidità
      if (timeSinceLastUpdate >= 100) {
        const targetDirection = currentDirection || 0;
        const currentDirectionValue = smoothedDirection;
        
        // Calcola la differenza minima tra le direzioni
        let diff = targetDirection - currentDirectionValue;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        // Applica un fattore di smoothing (0.2 = 20% del cambiamento per frame)
        const newDirection = currentDirectionValue + diff * 0.2;
        
        setSmoothedDirection(newDirection);
        lastUpdateRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateDirection);
    };

    animationFrameRef.current = requestAnimationFrame(updateDirection);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentDirection]);

  const getPositionStyle = () => {
    switch (position) {
      case 'topRight':
        return {
          top: '200px',
          right: '10px',
        };
      default:
        return {
          bottom: '200px',
          right: '10px',
          transform: 'translateY(50%)',
        };
    }
  };

  return (
    <div
      className="fixed z-50 bg-black bg-opacity-60 rounded-full p-2 shadow-lg"
      style={{
        ...getPositionStyle(),
        transition: 'transform 0.1s ease-out',
      }}
    >
      <div className="relative">
        {/* Indicatore del Nord */}
        <div 
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold"
          style={{ transform: 'translateX(-50%)' }}
        >
          N
        </div>
        {/* Indicatore della direzione attuale */}
        <div 
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs"
          style={{ transform: 'translateX(-50%)' }}
        >
          {Math.round(smoothedDirection)}°
        </div>
        <img
          src="/icon/CompassIco.svg"
          alt="Bussola"
          className="w-8 h-8"
          style={{
            transform: `rotate(${-smoothedDirection}deg)`, // Rotazione inversa per mantenere il Nord in alto
            transition: 'transform 0.1s ease-out',
          }}
        />
      </div>
    </div>
  );
};

export default CompassIndicator;