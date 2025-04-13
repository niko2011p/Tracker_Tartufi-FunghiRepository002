import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  position: [number, number];
  type: string;
  map: L.Map;
  onTakePhoto?: () => void;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ position, type, map, onTakePhoto }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Crea l'icona personalizzata in base al tipo
    const iconUrl = type === 'Fungo' 
      ? '/icon/mushroom-tag-icon.svg'
      : type === 'Tartufo'
        ? '/icon/Truffle-tag-icon.svg'
        : '/icon/point-of-interest-tag-icon.svg';

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<img src="${iconUrl}" alt="${type}" style="width: 24px; height: 24px;" />`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    // Crea il marker
    markerRef.current = L.marker(position, { icon: customIcon });

    // Aggiungi il popup
    const popupContent = `
      <div class="p-2">
        <h3 class="font-semibold">${type}</h3>
        <div class="mt-2 flex flex-col gap-2">
          <button 
            onclick="window.dispatchEvent(new CustomEvent('takePhoto', { detail: { type: '${type}' } }))"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Scatta foto
          </button>
        </div>
      </div>
    `;

    markerRef.current.bindPopup(popupContent);

    // Aggiungi il marker alla mappa
    markerRef.current.addTo(map);

    // Gestisci l'evento personalizzato per scattare la foto
    const handleTakePhoto = (event: CustomEvent) => {
      if (event.detail.type === type && onTakePhoto) {
        onTakePhoto();
      }
    };

    window.addEventListener('takePhoto', handleTakePhoto as EventListener);

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      window.removeEventListener('takePhoto', handleTakePhoto as EventListener);
    };
  }, [map, position, type, onTakePhoto]);

  return null;
};

export default FindingMarker; 