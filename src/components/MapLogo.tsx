import React from 'react';

const MapLogo: React.FC = () => {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
      <img 
        src="/icon/LogoFTL.svg" 
        alt="Fungo Track Logger Logo" 
        className="h-32 w-auto" 
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      />
    </div>
  );
};

export default MapLogo;