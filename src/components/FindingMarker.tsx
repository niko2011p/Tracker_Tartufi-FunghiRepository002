import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  position: [number, number];
  type: 'Fungo' | 'Tartufo' | 'poi';
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
      className: `custom-div-icon ${type.toLowerCase()}-finding`,
      html: `
        <div class="finding-icon-wrapper" style="
          display: flex;
          justify-content: center;
          align-items: center;
          width: 32px;
          height: 32px;
          position: relative;
        ">
          <div class="finding-icon-pulse" style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${type === 'Fungo' ? '#8eaa36' : type === 'Tartufo' ? '#8B4513' : '#f5a149'}40;
            animation: pulse 2s infinite;
          "></div>
          <img 
            src="${iconUrl}" 
            alt="${type}" 
            style="
              width: 24px;
              height: 24px;
              position: relative;
              z-index: 1;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              transition: transform 0.2s ease;
            "
            onmouseover="this.style.transform='scale(1.1)'"
            onmouseout="this.style.transform='scale(1)'"
          />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    // Crea il marker
    markerRef.current = L.marker(position, { icon: customIcon });

    // Aggiungi il popup
    const popupContent = `
      <div class="p-2">
        <h3 class="font-semibold">${type}</h3>
        <div class="mt-2 flex flex-col gap-2">
          ${onTakePhoto ? `
            <button 
              onclick="window.dispatchEvent(new CustomEvent('takePhoto', { detail: { type: '${type}' } }))"
              class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Scatta foto
            </button>
          ` : ''}
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

// Aggiungi lo stile CSS per l'animazione pulse
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.2;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.5;
    }
  }

  .finding-icon-wrapper {
    transition: transform 0.2s ease;
  }

  .finding-icon-wrapper:hover {
    transform: scale(1.1);
  }
`;
document.head.appendChild(style);

export default FindingMarker; 