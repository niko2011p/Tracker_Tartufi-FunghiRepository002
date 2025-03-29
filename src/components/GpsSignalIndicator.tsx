import React from 'react';
import { Navigation } from 'lucide-react';

interface GpsSignalIndicatorProps {
  accuracy: number | null;
  isAcquiringGps: boolean;
}

/**
 * Componente che visualizza l'indicatore del livello del segnale GPS
 */
const GpsSignalIndicator: React.FC<GpsSignalIndicatorProps> = ({ accuracy, isAcquiringGps }) => {
  // Se non stiamo acquisendo il GPS o non abbiamo un valore di precisione, non mostriamo nulla
  if (isAcquiringGps || accuracy === null) return null;
  
  // Determina il livello del segnale in base alla precisione
  // Minore è il valore di accuracy, migliore è il segnale
  let signalLevel = 0;
  let signalColor = '';
  let signalText = '';
  
  if (accuracy <= 5) {
    signalLevel = 4; // Eccellente
    signalColor = '#4CAF50'; // Verde
    signalText = 'Eccellente';
  } else if (accuracy <= 10) {
    signalLevel = 3; // Buono
    signalColor = '#8BC34A'; // Verde chiaro
    signalText = 'Buono';
  } else if (accuracy <= 20) {
    signalLevel = 2; // Discreto
    signalColor = '#FFC107'; // Giallo
    signalText = 'Discreto';
  } else if (accuracy <= 50) {
    signalLevel = 1; // Scarso
    signalColor = '#FF9800'; // Arancione
    signalText = 'Scarso';
  } else {
    signalLevel = 0; // Molto scarso
    signalColor = '#F44336'; // Rosso
    signalText = 'Debole';
  }
  
  // Genera le barre del segnale
  const bars = [];
  for (let i = 0; i < 4; i++) {
    const isActive = i < signalLevel;
    const barHeight = 6 + (i * 3); // Altezza crescente per ogni barra
    
    bars.push(
      <div 
        key={i}
        className="signal-bar"
        style={{
          height: `${barHeight}px`,
          width: '4px',
          backgroundColor: isActive ? signalColor : '#E0E0E0',
          marginLeft: '2px',
          borderRadius: '1px'
        }}
      />
    );
  }
  
  return (
    <div 
      className="gps-signal-indicator"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '8px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'flex-end',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        zIndex: 1000
      }}
    >
      <Navigation size={18} color={signalColor} style={{ marginRight: '6px' }} />
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        {bars}
      </div>
      <div 
        style={{ 
          marginLeft: '6px', 
          fontSize: '12px', 
          color: signalColor,
          fontWeight: 'bold'
        }}
      >
        {signalText} ({Math.round(accuracy)}m)
      </div>
    </div>
  );
};

export default GpsSignalIndicator;