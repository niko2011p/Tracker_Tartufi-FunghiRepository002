import React, { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';

interface CompassWidgetProps {
  direction: number;
}

const CompassWidget: React.FC<CompassWidgetProps> = ({ direction }) => {
  const [smoothedDirection, setSmoothedDirection] = useState(direction);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timeout = setTimeout(() => setIsAnimating(false), 1000);
    return () => clearTimeout(timeout);
  }, [direction]);

  useEffect(() => {
    const smoothingFactor = 0.1;
    const targetDirection = direction;
    const currentDirection = smoothedDirection;
    
    // Calcola la differenza più breve tra due angoli
    let diff = targetDirection - currentDirection;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    const newDirection = currentDirection + diff * smoothingFactor;
    setSmoothedDirection(newDirection);
  }, [direction]);

  return (
    <div className="absolute top-48 right-4 z-[2000]">
      <div className="bg-black bg-opacity-40 backdrop-blur-md px-2 py-2 rounded-lg shadow-lg">
        <div className="relative w-8 h-8">
          <div 
            className="absolute inset-0 transition-transform duration-1000 ease-out"
            style={{ 
              transform: `rotate(${smoothedDirection}deg)`,
              transformOrigin: 'center'
            }}
          >
            <Compass className="w-8 h-8 text-white" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] font-bold text-white">N</span>
          </div>
        </div>
        <div className="text-[10px] font-medium text-white text-center mt-1">
          {Math.round(smoothedDirection)}°
        </div>
      </div>
    </div>
  );
};

export default CompassWidget; 