import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Validate coordinates
    if (!finding.coordinates || 
        !Array.isArray(finding.coordinates) || 
        finding.coordinates.length !== 2 ||
        typeof finding.coordinates[0] !== 'number' || 
        typeof finding.coordinates[1] !== 'number' ||
        isNaN(finding.coordinates[0]) || 
        isNaN(finding.coordinates[1])) {
      console.error('❌ Invalid coordinates for finding:', {
        id: finding.id,
        coordinates: finding.coordinates
      });
      return;
    }

    console.log('📍 Creating marker for finding:', {
      id: finding.id,
      type: finding.type,
      coordinates: finding.coordinates
    });

    // Create a simple div icon with text
    const icon = L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${finding.type === 'Fungo' ? 'rgba(142, 170, 54, 0.9)' : 'rgba(139, 69, 19, 0.9)'};
          border: 2px solid ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${finding.type === 'Fungo' ? 'F' : 'T'}
        </div>
      `,
      className: 'finding-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Create and add marker to map
    const marker = L.marker(finding.coordinates, { icon });
    marker.addTo(map);
    markerRef.current = marker;

    // Add popup with finding details
    marker.bindPopup(`
      <div style="padding: 8px;">
        <h3 style="margin: 0 0 4px 0;">${finding.name || finding.type}</h3>
        <p style="margin: 0;">${new Date(finding.timestamp).toLocaleString('it-IT')}</p>
      </div>
    `);

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [finding, map]);

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

// Funzione di utilità per creare marker
export const createFindingMarker = (finding: Finding) => {
  const iconUrl = finding.type === 'Fungo' 
    ? '/assets/icons/mushroom-tag-icon.svg'
    : '/assets/icons/Truffle-tag-icon.svg';

  console.log(`🎯 Creating marker for ${finding.type} with icon: ${iconUrl}`);

  // Test di caricamento dell'immagine
  const testImage = new Image();
  testImage.onload = () => console.log(`✅ Icon loaded successfully: ${iconUrl}`);
  testImage.onerror = (e) => console.error(`❌ Failed to load icon: ${iconUrl}`, e);
  testImage.src = iconUrl;

  const iconHtml = `
    <div class="finding-marker" style="
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${finding.type === 'Fungo' ? 'rgba(142, 170, 54, 0.9)' : 'rgba(139, 69, 19, 0.9)'};
      border: 2px solid ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
      border-radius: 50%;
      animation: pulse 2s infinite;
    ">
      <div style="
        width: 32px;
        height: 32px;
        position: relative;
        mask-image: url(${iconUrl});
        -webkit-mask-image: url(${iconUrl});
        mask-size: contain;
        -webkit-mask-size: contain;
        mask-repeat: no-repeat;
        -webkit-mask-repeat: no-repeat;
        mask-position: center;
        -webkit-mask-position: center;
        background-color: white;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      "></div>
    </div>
  `;

  console.log('Generated marker HTML:', iconHtml);

  return L.divIcon({
    html: iconHtml,
    className: 'finding-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}; 