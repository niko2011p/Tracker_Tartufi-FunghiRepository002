import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';

// Define static paths for icons
const ICON_PATHS = {
  mushroom: '/assets/icons/mushroom-tag-icon.svg',
  truffle: '/assets/icons/Truffle-tag-icon.svg',
  poi: '/assets/icons/point-of-interest-tag-icon.svg'
} as const;

// Create native icon instances
const mushroomIcon = L.icon({
  iconUrl: ICON_PATHS.mushroom,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const truffleIcon = L.icon({
  iconUrl: ICON_PATHS.truffle,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const poiIcon = L.icon({
  iconUrl: ICON_PATHS.poi,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!finding.coordinates || !Array.isArray(finding.coordinates) || finding.coordinates.length !== 2) {
      console.error('Invalid coordinates for finding:', finding);
      return;
    }

    const [lat, lng] = finding.coordinates;
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates for finding:', finding);
      return;
    }

    // Select icon based on finding type
    const icon = finding.type === 'Fungo' 
      ? mushroomIcon 
      : finding.type === 'Tartufo'
        ? truffleIcon
        : poiIcon;

    console.log('[DEBUG] Creating marker for', finding.type, 'at', [lat, lng], 'with icon:', icon.options.iconUrl);

    // Create marker
    const marker = L.marker([lat, lng], { icon });
    markerRef.current = marker;

    // Add popup
    marker.bindPopup(`
      <div class="finding-popup">
        <h3>${finding.type}</h3>
        <p>${finding.description || 'No description'}</p>
        <small>${new Date(finding.timestamp).toLocaleString()}</small>
      </div>
    `);

    // Add to map
    marker.addTo(map);

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [finding, map]);

  return null;
};

export default FindingMarker;

// Utility function to create a finding marker
export const createFindingMarker = (finding: Finding): L.Icon => {
  const icon = finding.type === 'Fungo' 
    ? mushroomIcon 
    : finding.type === 'Tartufo'
      ? truffleIcon
      : poiIcon;

  console.log('[DEBUG] Selected icon for', finding.type, ':', icon.options.iconUrl);
  return icon;
}; 