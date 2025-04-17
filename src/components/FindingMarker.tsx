import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import { icons } from '../utils/icons';

// Base64 encoded fallback icons
const FALLBACK_ICONS = {
  // Simple red circle with white border
  fungo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzhlYWEzNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
  // Simple brown circle with white border
  tartufo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzhiNDUxMyIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
  // Simple orange circle with white border
  poi: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iI2Y1YTE0OSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='
};

// Define icon configurations with our utility icons
const ICON_CONFIG = {
  fungo: {
    iconUrl: icons.mushroom,
    fallbackUrl: FALLBACK_ICONS.fungo,
    color: '#8eaa36',
    fallbackChar: '🍄'
  },
  tartufo: {
    iconUrl: icons.truffle,
    fallbackUrl: FALLBACK_ICONS.tartufo,
    color: '#8B4513',
    fallbackChar: '🥔'
  },
  poi: {
    iconUrl: icons.poi,
    fallbackUrl: FALLBACK_ICONS.poi,
    color: '#f5a149',
    fallbackChar: '📍'
  }
} as const;

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

    const type = finding.type.toLowerCase() as keyof typeof ICON_CONFIG;
    const config = ICON_CONFIG[type] || ICON_CONFIG.poi;

    // Crea un'icona semplice come quella del GPS
    const icon = L.icon({
      iconUrl: config.iconUrl,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
      // Add a fallback icon in case the main one fails to load
      iconRetinaUrl: config.fallbackUrl
    });

    console.log('📌 Creating marker with icon URL:', config.iconUrl);

    // Create marker with the icon
    const marker = L.marker([lat, lng], { icon });
    markerRef.current = marker;

    // Add popup
    marker.bindPopup(`
      <div class="finding-popup" style="min-width: 200px; padding: 12px;">
        <h3 style="margin: 0 0 8px 0; color: ${config.color}; font-weight: bold;">
          ${finding.name || finding.type}
        </h3>
        ${finding.description ? 
          `<p style="margin: 0 0 8px 0; color: #666;">${finding.description}</p>` : 
          ''}
        <p style="margin: 0; font-size: 0.8em; color: #666;">
          ${new Date(finding.timestamp).toLocaleString('it-IT')}
        </p>
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
  const type = finding.type.toLowerCase() as keyof typeof ICON_CONFIG;
  const config = ICON_CONFIG[type] || ICON_CONFIG.poi;
  
  console.log('📌 createFindingMarker using icon URL:', config.iconUrl);
  
  // Attempt to preload the icon to check if it's valid
  const img = new Image();
  img.src = config.iconUrl;
  img.onerror = () => {
    console.warn(`🚨 Failed to load icon from ${config.iconUrl}, using fallback`);
  };
  
  return L.icon({
    iconUrl: config.iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    // Add a fallback icon in case the main one fails to load
    iconRetinaUrl: config.fallbackUrl
  });
}; 