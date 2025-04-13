import React, { useEffect, useRef, useState } from 'react';
import { Compass as CompassIcon } from 'lucide-react';
import useButtonConfigStore from '../store/buttonConfigStore';

const Compass: React.FC = () => {
  const compassButton = useButtonConfigStore((state) => state.compassButton);
  const [heading, setHeading] = useState(0);
  const animationRef = useRef<number>();
  const lastHeadingRef = useRef(0);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        // Calcola l'heading usando tutti e tre gli angoli
        const alpha = event.alpha; // rotazione attorno all'asse z
        const beta = event.beta;   // rotazione attorno all'asse x
        const gamma = event.gamma; // rotazione attorno all'asse y

        // Calcola l'heading in base all'orientamento del dispositivo
        let newHeading = alpha;
        
        // Aggiusta l'heading in base all'inclinazione del dispositivo
        if (beta > 0) {
          newHeading = (newHeading + 180) % 360;
        }
        
        // Calcola la differenza minima per la rotazione
        let diff = newHeading - lastHeadingRef.current;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        
        // Aggiorna l'heading con una transizione fluida
        setHeading(prev => {
          const target = prev + diff;
          return target;
        });
        
        lastHeadingRef.current = newHeading;
      }
    };

    // Richiedi i permessi per l'orientamento del dispositivo
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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

  return (
    <div 
      className="fixed z-[2000]"
      style={getPositionStyle(compassButton.position, compassButton.positionType)}
    >
      <div 
        className={`${compassButton.color} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative`}
        style={{
          width: compassButton.size,
          height: compassButton.size,
          ...getShadowStyle(compassButton.shadow)
        }}
      >
        {/* Cerchio esterno */}
        <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>
        
        {/* Indicatore del nord */}
        <div 
          className="absolute top-0 left-1/2 w-1 h-1/2 bg-red-500 origin-bottom"
          style={{ transform: `translateX(-50%) rotate(${heading}deg)` }}
        ></div>
        
        {/* Icona della bussola */}
        <CompassIcon
          size={compassButton.iconSize}
          className={`${compassButton.iconColor} transition-transform duration-300`}
          style={{ transform: `rotate(${-heading}deg)` }}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
};

export default Compass; 