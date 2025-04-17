import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';

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

    // Create custom icon using CSS classes
    const iconHtml = `
      <div class="finding-marker ${finding.type.toLowerCase()}-finding">
        <div class="finding-pulse"></div>
        <div class="finding-icon-wrapper">
          <div class="finding-icon ${finding.type.toLowerCase()}-icon"></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: `finding-marker-container ${finding.type.toLowerCase()}-container`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

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
  const iconHtml = `
    <div class="finding-marker ${finding.type.toLowerCase()}-finding">
      <div class="finding-pulse"></div>
      <div class="finding-icon-wrapper">
        <div class="finding-icon ${finding.type.toLowerCase()}-icon"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: `finding-marker-container ${finding.type.toLowerCase()}-container`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}; 