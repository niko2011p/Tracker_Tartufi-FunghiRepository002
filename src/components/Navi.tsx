import { useNavigate } from 'react-router-dom';
import { Navigation, FileText } from 'lucide-react';

// Stile per il contenitore principale
const naviContainerStyle = {
  backgroundImage: 'url(/icon/SfondoAPP.svg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
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
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: '2rem' as const,
};

// Stile base per i pulsanti
const baseButtonStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  borderRadius: '1rem',
  cursor: 'pointer',
  transition: 'transform 0.2s',
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  gap: '0.5rem',
};

// Stile per il pulsante Start Navi (30% più grande)
const startNaviStyle = {
  ...baseButtonStyle,
  backgroundColor: '#94ae43',
  width: '180px',
  height: '180px',
};

// Stile per il pulsante Logger (30% più piccolo)
const loggerStyle = {
  ...baseButtonStyle,
  backgroundColor: '#f5a149',
  width: '126px',
  height: '126px',
};

export default function Navi() {
  const navigate = useNavigate();

  return (
    <div style={naviContainerStyle}>
      <button 
        style={startNaviStyle}
        onClick={() => navigate('/NavigationPage')}
      >
        <Navigation size={48} />
        Start Navi
      </button>
      <button 
        style={loggerStyle}
        onClick={() => navigate('/logger')}
      >
        <FileText size={32} />
        <span>Logger</span>
      </button>
    </div>
  );
}