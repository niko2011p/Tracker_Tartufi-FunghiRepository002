import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';
import 'leaflet/dist/leaflet.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!finding.position || !Array.isArray(finding.position) || finding.position.length !== 2) {
      console.error('Invalid position for finding:', finding);
      return;
    }

    const [lat, lng] = finding.position;
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates for finding:', finding);
      return;
    }

    // Create custom icon using CSS class
    const customIcon = L.divIcon({
      className: `finding-marker ${finding.type.toLowerCase()}-marker`,
      html: `<div class="marker-icon"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Create marker
    const marker = L.marker([lat, lng], { icon: customIcon });
    markerRef.current = marker;

    // Add popup with finding details
    marker.bindPopup(`
      <div class="finding-popup">
        <h3>${finding.type}</h3>
        <p>${finding.description || 'No description'}</p>
        <small>${new Date(finding.timestamp).toLocaleString()}</small>
      </div>
    `);

    // Add to map
    marker.addTo(map);

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
  if (!finding.position || !Array.isArray(finding.position) || finding.position.length !== 2) {
    console.error('Invalid position for finding:', finding);
    return null;
  }

  const [lat, lng] = finding.position;
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Invalid coordinates for finding:', finding);
    return null;
  }

  const customIcon = L.divIcon({
    className: `finding-marker ${finding.type.toLowerCase()}-marker`,
    html: `<div class="marker-icon"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const marker = L.marker([lat, lng], { icon: customIcon });
  marker.bindPopup(`
    <div class="finding-popup">
      <h3>${finding.type}</h3>
      <p>${finding.description || 'No description'}</p>
      <small>${new Date(finding.timestamp).toLocaleString()}</small>
    </div>
  `);

  return marker;
}; 