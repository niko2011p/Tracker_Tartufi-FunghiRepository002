import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import mushroomIconUrl from '../assets/icons/mushroom-tag-icon.svg?url';
import truffleIconUrl from '../assets/icons/Truffle-tag-icon.svg?url';
import poiIconUrl from '../assets/icons/point-of-interest-tag-icon.svg?url';
import './FindingMarker.css';
import 'leaflet/dist/leaflet.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

// Create icon instances
const mushroomIcon = L.icon({
  iconUrl: mushroomIconUrl,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const truffleIcon = L.icon({
  iconUrl: truffleIconUrl,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const poiIcon = L.icon({
  iconUrl: poiIconUrl,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

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

    console.log('[DEBUG] Using icon for', finding.type, ':', icon.options.iconUrl);

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
export const createFindingMarker = (finding: Finding, map: L.Map): L.Marker | null => {
  if (!finding.coordinates || !Array.isArray(finding.coordinates) || finding.coordinates.length !== 2) {
    console.error('Invalid coordinates for finding:', finding);
    return null;
  }

  const [lat, lng] = finding.coordinates;
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid coordinates for finding:', finding);
    return null;
  }

  // Select icon based on finding type
  const icon = finding.type === 'Fungo' 
    ? mushroomIcon 
    : finding.type === 'Tartufo'
      ? truffleIcon
      : poiIcon;

  console.log('[DEBUG] Using icon for', finding.type, ':', icon.options.iconUrl);

  const marker = L.marker([lat, lng], { icon });
  marker.bindPopup(`
    <div class="finding-popup">
      <h3>${finding.type}</h3>
      <p>${finding.description || 'No description'}</p>
      <small>${new Date(finding.timestamp).toLocaleString()}</small>
    </div>
  `);

  return marker;
}; 