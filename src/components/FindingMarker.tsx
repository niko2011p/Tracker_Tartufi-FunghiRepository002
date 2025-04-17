import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import { getIconUrl } from '../assets/icons';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

// Fallback marker colors
const markerColors = {
  'Fungo': '#8eaa36',
  'Tartufo': '#8B4513',
  'poi': '#ff9800'
};

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

    // Get icon URL using the helper
    const iconUrl = getIconUrl(finding.type);
    console.log('Icon URL:', iconUrl);

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

// Funzione di utilità per creare marker
export const createFindingMarker = (finding: Finding) => {
  const iconUrl = getIconUrl(finding.type);
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