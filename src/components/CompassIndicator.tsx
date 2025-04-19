import React, { useEffect, useState, useRef } from 'react';
import { useCompass } from '../services/CompassService';
import './CompassIndicator.css';

interface CompassIndicatorProps {
  position?: 'topRight' | 'default';
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ position = 'default' }) => {
  const { heading, accuracy } = useCompass();
  const [smoothedHeading, setSmoothedHeading] = useState(0);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    console.log('CompassIndicator: Nuovo heading ricevuto:', heading);
  }, [heading]);

  useEffect(() => {
    const updateHeading = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= 50) {
        const targetHeading = heading;
        const currentHeading = smoothedHeading;
        
        // Calcola la differenza minima tra le direzioni
        let diff = targetHeading - currentHeading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        const newHeading = currentHeading + diff * 0.3;
        
        setSmoothedHeading(newHeading);
        lastUpdateRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(updateHeading);
    };

    animationFrameRef.current = requestAnimationFrame(updateHeading);

      return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [heading]);

  const getPositionStyle = () => {
    switch (position) {
      case 'topRight':
        return {
          top: '10px',
          right: '10px',
        };
      default:
        return {
          bottom: '10px',
          right: '10px',
        };
    }
  };

  return (
    <div 
      className="compass-container"
      style={{
        ...getPositionStyle(),
        position: 'absolute',
        zIndex: 1001,
      }}
    >
      <div className="compass-rose">
        {/* Indicatore del Nord */}
        <div className="compass-north">N</div>
        
        {/* Puntatore rosso */}
        <div 
          className="compass-pointer"
        style={{
            transform: `rotate(${smoothedHeading}deg)`,
          }}
        />
        
        {/* Indicatore della direzione attuale */}
        <div className="compass-degree">
          {Math.round(smoothedHeading)}°
        </div>
        
        {/* Indicatore di precisione */}
        {accuracy !== null && (
          <div className="compass-accuracy">
            ±{Math.round(accuracy)}°
          </div>
        )}
      </div>
    </div>
  );
};

export default CompassIndicator;