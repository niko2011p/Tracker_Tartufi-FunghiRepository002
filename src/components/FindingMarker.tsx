import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import mushroomIcon from '../assets/icons/mushroom-tag-icon.svg';
import truffleIcon from '../assets/icons/Truffle-tag-icon.svg';
import poiIcon from '../assets/icons/point-of-interest-tag-icon.svg';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

export const FindingMarker = ({ finding, map }: FindingMarkerProps) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!finding.position || !map) return;

    // Validate coordinates
    if (!Array.isArray(finding.position) || finding.position.length !== 2) {
      console.error('Invalid coordinates format:', finding.position);
      return;
    }

    const [lat, lng] = finding.position;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinate values:', { lat, lng });
      return;
    }

    console.log('Creating marker for finding:', {
      id: finding.id,
      type: finding.type,
      coordinates: finding.position
    });

    // Get the appropriate icon based on finding type
    const iconUrl = finding.type === 'Fungo' 
      ? mushroomIcon
      : finding.type === 'Tartufo'
        ? truffleIcon
        : poiIcon;

    // Create custom icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-container">
          <img src="${iconUrl}" alt="${finding.type} icon" class="marker-icon" />
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Create marker
    const marker = L.marker([lat, lng], { icon: customIcon });
    markerRef.current = marker;

    // Add popup
    marker.bindPopup(`
      <div class="finding-popup">
        <h3>${finding.name || finding.type}</h3>
        <p>${new Date(finding.timestamp).toLocaleString()}</p>
      </div>
    `);

    // Add to map
    marker.addTo(map);

    // Verify marker position
    const actualPos = marker.getLatLng();
    console.log('Marker position verification:', {
      intended: { lat, lng },
      actual: actualPos,
      difference: {
        lat: Math.abs(actualPos.lat - lat),
        lng: Math.abs(actualPos.lng - lng)
      }
    });

    return () => {
      console.log('Cleaning up marker:', {
        id: finding.id,
        type: finding.type,
        position: finding.position
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

// Funzione di utilità per creare marker
export const createFindingMarker = (finding: Finding) => {
  const iconUrl = finding.type === 'Fungo' ? mushroomIcon : finding.type === 'Tartufo' ? truffleIcon : poiIcon;
  console.log(`🎯 Creating marker for ${finding.type} with icon: ${iconUrl}`);

  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container">
        <img src="${iconUrl}" alt="${finding.type} icon" class="marker-icon" />
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  return customIcon;
}; 