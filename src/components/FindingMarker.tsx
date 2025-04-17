import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';

// Define icon paths and fallback colors
const ICON_CONFIG = {
  fungo: {
    iconPath: '/assets/icons/mushroom-tag-icon.svg',
    color: '#8eaa36',
    fallbackChar: '🍄'
  },
  tartufo: {
    iconPath: '/assets/icons/truffle-tag-icon.svg',
    color: '#8B4513',
    fallbackChar: '🥔'
  },
  poi: {
    iconPath: '/assets/icons/point-of-interest-tag-icon.svg',
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

    // Create custom icon with fallback
    const iconHtml = `
      <div class="finding-marker ${type}-finding" style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
      ">
        <div class="finding-pulse" style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: ${config.color}40;
          animation: pulse 2s infinite;
        "></div>
        <div class="finding-icon-wrapper" style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        ">
          <div class="finding-icon" style="
            width: 32px;
            height: 32px;
            background-image: url('${config.iconPath}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <div class="finding-icon-fallback" style="
              display: none;
              font-size: 24px;
              text-align: center;
              line-height: 32px;
            ">${config.fallbackChar}</div>
          </div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: `finding-marker-container ${type}-container`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    // Create marker
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

    // Add error handling for icon loading
    const iconElement = marker.getElement()?.querySelector('.finding-icon') as HTMLElement;
    const fallbackElement = marker.getElement()?.querySelector('.finding-icon-fallback') as HTMLElement;
    
    if (iconElement && fallbackElement) {
      const checkIconLoading = () => {
        const computedStyle = window.getComputedStyle(iconElement);
        const backgroundImage = computedStyle.backgroundImage;
        
        if (backgroundImage === 'none' || backgroundImage.includes('data:image/gif;base64')) {
          iconElement.style.backgroundImage = 'none';
          fallbackElement.style.display = 'block';
          console.warn(`Icon failed to load for ${finding.type}, using fallback`);
        }
      };

      // Check after a short delay to allow for loading
      setTimeout(checkIconLoading, 500);
    }

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

  const iconHtml = `
    <div class="finding-marker ${type}-finding" style="
      position: relative;
      width: 40px;
      height: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
    ">
      <div class="finding-pulse" style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${config.color}40;
        animation: pulse 2s infinite;
      "></div>
      <div class="finding-icon-wrapper" style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      ">
        <div class="finding-icon" style="
          width: 32px;
          height: 32px;
          background-image: url('${config.iconPath}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">
          <div class="finding-icon-fallback" style="
            display: none;
            font-size: 24px;
            text-align: center;
            line-height: 32px;
          ">${config.fallbackChar}</div>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: `finding-marker-container ${type}-container`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}; 