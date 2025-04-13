import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types/track';

interface FindingMarkerProps {
  finding: Finding;
  onClick?: () => void;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, onClick }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 ${
            finding.type === 'Fungo' ? 'bg-[#8eaa36]' : 'bg-[#8B4513]'
          }">
            <img src="${
              finding.type === 'Fungo' 
                ? '/icon/mushroom-tag-icon.svg' 
                : '/icon/Truffle-tag-icon.svg'
            }" alt="${finding.type}" class="w-6 h-6" />
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      markerRef.current = L.marker(
        [finding.coordinates.lat, finding.coordinates.lng],
        { icon }
      ).addTo(map);

      if (onClick) {
        markerRef.current.on('click', onClick);
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [finding, onClick]);

  return null;
};

export default FindingMarker; 