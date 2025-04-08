import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import './UnifiedButtons.css';

// Stile per il contenitore principale con sfondo verde
const mapContainerStyle = {
  backgroundColor: '#8eaa36',
  height: '100vh',
  width: '100vw',
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  margin: 0,
  padding: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

// Stile per il logo centrale
const logoStyle = {
  position: 'absolute' as const,
  top: '10%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '200px',
  height: 'auto',
  zIndex: 11,
};

// Stile per i pulsanti principali
const buttonContainerStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '20px',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  zIndex: 12,
};

const buttonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '15px 30px',
  backgroundColor: 'white',
  color: '#8eaa36',
  borderRadius: '50px',
  fontWeight: 'bold' as const,
  fontSize: '18px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  border: 'none',
  cursor: 'pointer',
  width: '220px',
  transition: 'all 0.2s ease',
};

const buttonHoverStyle = {
  backgroundColor: '#f5f5f5',
  transform: 'translateY(-2px)',
  boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
};

const iconStyle = {
  marginRight: '10px',
};

export default function Map() {
  const navigate = useNavigate();
  const { startTrack } = useTrackStore();
  const [hoverAvvio, setHoverAvvio] = useState(false);
  const [hoverLogger, setHoverLogger] = useState(false);

  const handleStartTrack = () => {
    startTrack();
  };

  const handleNavigateToLogger = () => {
    navigate('/storico');
  };

  return (
    <div style={mapContainerStyle}>
      {/* Logo in alto al centro */}
      <img 
        src="/icon/LogoFTL.svg" 
        alt="Logo FTL" 
        style={logoStyle} 
      />
      
      {/* Contenitore dei pulsanti principali */}
      <div style={buttonContainerStyle}>
        <button 
          onClick={handleStartTrack}
          style={{
            ...buttonStyle,
            ...(hoverAvvio ? buttonHoverStyle : {}),
          }}
          onMouseEnter={() => setHoverAvvio(true)}
          onMouseLeave={() => setHoverAvvio(false)}
        >
          <Play style={iconStyle} size={24} />
          Avvio Traccia
        </button>
        
        <button 
          onClick={handleNavigateToLogger}
          style={{
            ...buttonStyle,
            ...(hoverLogger ? buttonHoverStyle : {}),
          }}
          onMouseEnter={() => setHoverLogger(true)}
          onMouseLeave={() => setHoverLogger(false)}
        >
          <History style={iconStyle} size={24} />
          Logger
        </button>
      </div>
    </div>
  );
}