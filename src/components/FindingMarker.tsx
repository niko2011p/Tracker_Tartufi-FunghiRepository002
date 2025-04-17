import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker | null>(null);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [iconError, setIconError] = useState(false);

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

    // Create icon
    const iconUrl = finding.type === 'Fungo' 
      ? '/assets/icons/mushroom-tag-icon.svg'
      : '/assets/icons/Truffle-tag-icon.svg';

    console.log('🎨 Using icon:', iconUrl);

    const icon = new L.Icon({
      iconUrl: iconUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
      className: 'finding-marker-icon'
    });

    // Create marker with icon
    const marker = L.marker(finding.coordinates, { icon });

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
  .finding-marker-icon {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    animation: pulse 2s infinite;
  }

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
`;
document.head.appendChild(style);

export default FindingMarker;

// Funzione di utilità per creare marker
export const createFindingMarker = (finding: Finding) => {
  const iconUrl = finding.type === 'Fungo' 
    ? '/assets/icons/mushroom-tag-icon.svg'
    : '/assets/icons/Truffle-tag-icon.svg';

  console.log(`🎯 Creating marker for ${finding.type} with icon: ${iconUrl}`);

  const icon = new L.Icon({
    iconUrl: iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: 'finding-marker-icon'
  });

  return icon;
}; 