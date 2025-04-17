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

    // Determine icon type and create icon HTML
    const iconUrl = `/assets/icons/${finding.type === 'Fungo' ? 'mushroom-tag-icon.svg' : 'Truffle-tag-icon.svg'}`;
    console.log('🎨 Using icon:', iconUrl);

    // Preload the icon
    const preloadIcon = new Image();
    preloadIcon.onload = () => {
      console.log('✅ Icon preloaded successfully:', iconUrl);
      createMarker();
    };
    preloadIcon.onerror = (e) => {
      console.error('❌ Failed to preload icon:', iconUrl, e);
      // Fallback to a default marker
      createMarker(true);
    };
    preloadIcon.src = iconUrl;

    const createMarker = (useFallback = false) => {
      const iconHtml = `
        <div class="finding-marker" style="
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        ">
          <div class="finding-pulse" style="
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
            animation: pulse 2s infinite;
          "></div>
          ${useFallback ? `
            <div style="
              width: 32px;
              height: 32px;
              position: relative;
              z-index: 1000;
              background-color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 16px;
            ">${finding.type === 'Fungo' ? 'F' : 'T'}</div>
          ` : `
            <img 
              src="${iconUrl}" 
              style="
                width: 32px;
                height: 32px;
                position: relative;
                z-index: 1000;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              "
              alt="${finding.type}"
            />
          `}
        </div>
      `;

      // Create marker with validated coordinates
      const marker = L.marker(finding.coordinates, {
        icon: L.divIcon({
          html: iconHtml,
          className: 'finding-marker-container',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      });

      // Add marker to map and store reference
      marker.addTo(map);
      markerRef.current = marker;

      // Verify actual marker position
      const actualPosition = marker.getLatLng();
      console.log('✅ Marker placed at:', {
        intended: finding.coordinates,
        actual: [actualPosition.lat, actualPosition.lng],
        difference: {
          lat: Math.abs(actualPosition.lat - finding.coordinates[0]),
          lng: Math.abs(actualPosition.lng - finding.coordinates[1])
        }
      });

      // Add popup with finding details
      marker.bindPopup(`
        <div class="finding-popup">
          <h3>${finding.name || finding.type}</h3>
          <p>${new Date(finding.timestamp).toLocaleString('it-IT')}</p>
        </div>
      `);
    };

    // Cleanup function
    return () => {
      console.log('🧹 Removing marker for finding:', {
        id: finding.id,
        coordinates: finding.coordinates
      });
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
    ? '/icon/mushroom-tag-icon.svg'
    : '/icon/Truffle-tag-icon.svg';

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