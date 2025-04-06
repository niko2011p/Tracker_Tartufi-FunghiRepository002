import React, { useState, useEffect } from 'react';

interface CompassIndicatorProps {
  position?: 'topLeft' | 'topRight';
}

const CompassIndicator: React.FC<CompassIndicatorProps> = ({ position = 'topLeft' }) => {
  const [heading, setHeading] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    // Verifica se l'API DeviceOrientation è supportata
    if (window.DeviceOrientationEvent) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        // Alpha è la direzione della bussola (0-360)
        if (event.alpha !== null) {
          // Normalizza l'angolo per puntare al Nord
          // In DeviceOrientation, alpha=0 è Nord, ma ruota in senso antiorario
          // Per la visualizzazione, vogliamo che la bussola punti al Nord quando è a 0 gradi
          setHeading(360 - event.alpha);
        }
      };

      window.addEventListener('deviceorientation', handleOrientation, true);

      // Fallback per dispositivi che non supportano l'evento deviceorientation
      setTimeout(() => {
        if (heading === 0) {
          // Simula una rotazione lenta per dispositivi che non supportano l'orientamento
          let simulatedHeading = 0;
          const interval = setInterval(() => {
            simulatedHeading = (simulatedHeading + 1) % 360;
            setHeading(simulatedHeading);
          }, 100);

          return () => clearInterval(interval);
        }
      }, 1000);

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    } else {
      setIsSupported(false);
      // Fallback: rotazione simulata per dispositivi che non supportano l'orientamento
      let simulatedHeading = 0;
      const interval = setInterval(() => {
        simulatedHeading = (simulatedHeading + 1) % 360;
        setHeading(simulatedHeading);
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  // Posizionamento fisso a destra ma più in alto
  const positionStyle = { top: '100px', right: '10px' };

  return (
    <div 
      className="compass-indicator"
      style={{
        position: 'absolute',
        ...positionStyle,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', /* Sfondo scuro semi-trasparente come la tabellina Dati Traccia */
        borderRadius: '50%',
        width: '56px', /* Ridotta del 30% come richiesto */
        height: '56px', /* Ridotta del 30% come richiesto */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1000,
        transition: 'transform 0.3s ease-out'
      }}
    >
      <div 
        style={{
          transform: `rotate(${heading}deg)`,
          transition: 'transform 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%'
        }}
      >
        <img 
          src="/CompassIco.svg" 
          alt="Compass" 
          style={{ 
            width: '45px',
            height: '45px',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))'
          }} 
        />
      </div>
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '6px',
          height: '6px',
          backgroundColor: '#f5a149',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001
        }}
      />
      {/* Rimossi i punti cardinali come richiesto */}
    </div>
  );
};

export default CompassIndicator;