import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
import { icons } from '../utils/icons';

// Base64 encoded fallback icons per avere un'alternativa in caso di errore
const FALLBACK_ICONS = {
  // Simple green circle with white border for mushrooms
  fungo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzhlYWEzNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
  // Simple brown circle with white border for truffles
  tartufo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iIzhiNDUxMyIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=',
  // Simple orange circle with white border for POI
  poi: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxMiIgZmlsbD0iI2Y1YTE0OSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='
};

// Definizione della configurazione CSS per ciascun tipo di ritrovamento
const MARKER_COLORS = {
  fungo: {
    color: '#8eaa36',
    fallbackChar: '🍄',
    iconPath: '/assets/icons/mushroom-tag-icon.svg'
  },
  tartufo: {
    color: '#8B4513',
    fallbackChar: '🥔',
    iconPath: '/assets/icons/truffle-tag-icon.svg'
  },
  poi: {
    color: '#f5a149',
    fallbackChar: '📍',
    iconPath: '/assets/icons/point-of-interest-tag-icon.svg'
  }
} as const;

interface FindingMarkerProps {
  finding: Finding;
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    console.log('📌 FindingMarker: Inizializzazione per ', finding);
    
    // Validate coordinates
    if (!finding.coordinates || !Array.isArray(finding.coordinates) || finding.coordinates.length !== 2) {
      console.error('❌ FindingMarker: Coordinate non valide per finding:', finding);
      return;
    }

    const [lat, lng] = finding.coordinates;
    if (isNaN(lat) || isNaN(lng)) {
      console.error('❌ FindingMarker: Coordinate NaN per finding:', finding);
      return;
    }

    // Determine marker type and style
    const type = finding.type.toLowerCase() as keyof typeof MARKER_COLORS;
    const config = MARKER_COLORS[type] || MARKER_COLORS.poi;
    console.log(`📌 FindingMarker: Tipo ${type}, colore ${config.color}`);

    try {
      // Create a CSS-based marker using divIcon
      const customIcon = L.divIcon({
        html: `
          <div class="finding-marker ${type}-marker" style="
            width: 40px;
            height: 40px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: ${config.color}40;
            border-radius: 50%;
            border: 2px solid ${config.color};
          ">
            <div class="finding-pulse" style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background-color: ${config.color}30;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              width: 24px;
              height: 24px;
              background-image: url(${config.iconPath});
              background-size: contain;
              background-position: center;
              background-repeat: no-repeat;
              filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
            "></div>
          </div>
        `,
        className: `finding-icon ${type}-icon`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      console.log('📌 FindingMarker: Creazione marker con CSS, usando icona SVG');

      // Create the marker with the custom icon
      const marker = L.marker([lat, lng], {
        icon: customIcon,
        riseOnHover: true,
        zIndexOffset: 1000
      });
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
          ${finding.photoUrl ? 
            `<img src="${finding.photoUrl}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 4px; margin: 8px 0;" alt="${finding.name || finding.type}">` : 
            ''}
          <p style="margin: 0; font-size: 0.8em; color: #666;">
            ${new Date(finding.timestamp).toLocaleString('it-IT')}
          </p>
        </div>
      `);

      // Add to map
      marker.addTo(map);
      console.log('✅ FindingMarker: Marker aggiunto alla mappa con successo', {
        position: [lat, lng],
        type: finding.type,
        id: finding.id
      });

      // Cleanup
      return () => {
        console.log('🧹 FindingMarker: Rimozione marker dalla mappa', finding.id);
        if (markerRef.current) {
          markerRef.current.remove();
        }
      };
    } catch (error) {
      console.error('❌ FindingMarker: Errore nella creazione del marker:', error);
      return null;
    }
  }, [finding, map]);

  return null;
};

export default FindingMarker;

// Utility function to create a finding marker
export const createFindingMarker = (finding: Finding): L.DivIcon => {
  try {
    console.log('📍 createFindingMarker: Creazione icona per', finding.type);
    console.log('📍 Coordinate del ritrovamento:', finding.coordinates);
    console.log('📍 ID del ritrovamento:', finding.id);
    
    const type = finding.type.toLowerCase() as keyof typeof MARKER_COLORS;
    const config = MARKER_COLORS[type] || MARKER_COLORS.poi;
    
    console.log('📍 Configurazione marker:', { 
      type, 
      color: config.color, 
      iconPath: config.iconPath 
    });
    
    // Create a CSS-based marker with actual SVG icon
    const divIcon = L.divIcon({
      html: `
        <div class="finding-marker ${type}-marker" style="
          width: 40px;
          height: 40px;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: ${config.color}40;
          border-radius: 50%;
          border: 2px solid ${config.color};
        ">
          <div class="finding-pulse" style="
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background-color: ${config.color}30;
            animation: pulse 2s infinite;
          "></div>
          <div style="
            width: 24px;
            height: 24px;
            background-image: url(${config.iconPath});
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
          "></div>
        </div>
      `,
      className: `finding-icon ${type}-icon`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
    
    console.log('✅ Marker creato con successo, classe:', `finding-icon ${type}-icon`);
    return divIcon;
  } catch (error) {
    console.error('❌ createFindingMarker: Errore nella creazione dell\'icona:', error);
    // Fallback to a simple div icon
    return L.divIcon({
      html: `<div style="width:40px;height:40px;background:#f00;border-radius:50%;"></div>`,
      className: 'finding-icon-fallback',
      iconSize: [40, 40]
    });
  }
}; 