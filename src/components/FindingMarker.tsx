import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { FindingType } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  position: [number, number];
  type: FindingType;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ position, type, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Crea l'icona personalizzata in base al tipo di ritrovamento
    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="marker-container">
          <div class="marker-icon ${type.toLowerCase()}">
            <img 
              src="/icon/${type.toLowerCase()}-tag-icon.svg" 
              alt="${type}" 
              class="w-6 h-6"
            />
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // Crea il marker
    markerRef.current = L.marker(position, { icon }).addTo(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [position, type, map]);

  return null;
};

export default FindingMarker; 