import React from 'react';

// Import from new icons utility
import { icons } from '../utils/icons';

const MapLogo: React.FC = () => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
      <img 
        src={icons.logo} 
        alt="Funghi Tracker Logger" 
        className="h-32 w-auto" 
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      />
    </div>
  );
};

export default MapLogo;