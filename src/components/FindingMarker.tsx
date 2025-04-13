import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Finding } from '../types/track';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  // Icona personalizzata per Fungo
  const mushroomIcon = L.divIcon({
    className: 'custom-icon',
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#4CAF50" />
        <path d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16C24 20.4183 20.4183 24 16 24C11.5817 24 8 20.4183 8 16Z" fill="#8BC34A" />
        <path d="M16 8C19.3137 8 22 10.6863 22 14V16C22 19.3137 19.3137 22 16 22C12.6863 22 10 19.3137 10 16V14C10 10.6863 12.6863 8 16 8Z" fill="#FFEB3B" />
        <circle cx="16" cy="14" r="2" fill="#795548" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  // Icona personalizzata per Tartufo
  const truffleIcon = L.divIcon({
    className: 'custom-icon',
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#8D6E63" />
        <path d="M16 8C19.3137 8 22 10.6863 22 14C22 17.3137 19.3137 20 16 20C12.6863 20 10 17.3137 10 14C10 10.6863 12.6863 8 16 8Z" fill="#5D4037" />
        <path d="M16 10C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18C13.7909 18 12 16.2091 12 14C12 11.7909 13.7909 10 16 10Z" fill="#3E2723" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  const icon = finding.type === 'Fungo' ? mushroomIcon : truffleIcon;

  return (
    <Marker
      position={[finding.coordinates.latitude, finding.coordinates.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => {
          map.setView([finding.coordinates.latitude, finding.coordinates.longitude], 18);
        }
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold">{finding.name}</h3>
          <p className="text-sm text-gray-600">{finding.description}</p>
          {finding.photo && (
            <img 
              src={finding.photo} 
              alt={finding.name} 
              className="mt-2 rounded-lg max-w-full h-auto"
            />
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default FindingMarker; 