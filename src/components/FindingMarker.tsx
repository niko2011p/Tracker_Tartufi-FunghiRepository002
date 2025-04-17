import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Finding } from '../types';
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

// Funzione createFindingIcon aggiornata con LOG
const createFindingIcon = (type: 'Fungo' | 'Tartufo' | 'poi', isLoaded: boolean = false) => {
  // Use absolute paths for icons
  const iconUrl = type === 'Fungo'
    ? `${window.location.origin}/assets/icons/mushroom-tag-icon.svg`
    : type === 'Tartufo'
      ? `${window.location.origin}/assets/icons/Truffle-tag-icon.svg`
      : `${window.location.origin}/assets/icons/point-of-interest-tag-icon.svg`;

  // Enhanced debug logging
  console.group(`[createFindingIcon] Debug Session - ${new Date().toISOString()}`);
  console.log('🔍 Basic Information:', {
    type,
    isLoaded,
    timestamp: new Date().toISOString()
  });

  console.log('🌐 URL Analysis:', {
    iconUrl,
    iconUrlType: typeof iconUrl,
    iconUrlExists: !!iconUrl,
    iconUrlLength: iconUrl?.length,
    iconUrlStartsWith: iconUrl?.startsWith('http'),
    iconUrlEndsWith: iconUrl?.endsWith('.svg'),
    baseUrl: window.location.origin,
    currentPath: window.location.pathname,
    fullUrl: iconUrl
  });

  // Preload the icon image
  const preloadIcon = new Image();
  preloadIcon.src = iconUrl;

  return new Promise<L.DivIcon>((resolve) => {
    preloadIcon.onload = () => {
      console.log('✅ Icon Load Success:', {
        type,
        iconUrl,
        dimensions: {
          width: preloadIcon.width,
          height: preloadIcon.height,
          naturalWidth: preloadIcon.naturalWidth,
          naturalHeight: preloadIcon.naturalHeight
        },
        loadTime: performance.now(),
        complete: preloadIcon.complete
      });

      resolve(new L.DivIcon({
        html: `
          <div class="finding-icon-wrapper ${type.toLowerCase()}-finding">
            <div class="finding-icon-pulse"></div>
            <img
              src="${iconUrl}"
              width="24"
              height="24"
              alt="${type} Icon"
              onerror="(function(e) {
                console.error('[createFindingIcon] Image Load Error:', {
                  src: e.target.src,
                  type: '${type}',
                  timestamp: new Date().toISOString(),
                  error: e.target.error,
                  status: e.target.status
                });
                e.target.style.display = 'none';
                e.target.parentElement.style.backgroundColor = '${markerColors[type] || '#ff0000'}';
              })(event)"
            />
          </div>
        `,
        className: 'finding-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      }));
    };

    preloadIcon.onerror = (error) => {
      console.error('❌ Icon Load Failure:', {
        type,
        iconUrl,
        error: error,
        timestamp: new Date().toISOString(),
        errorEvent: {
          type: error.type,
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno
        }
      });

      // Return fallback marker
      resolve(new L.DivIcon({
        html: `
          <div style="
            background-color: ${markerColors[type] || '#ff0000'};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
          ">
            ${type.charAt(0)}
          </div>
        `,
        className: 'error-finding-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      }));
    };
  }).finally(() => {
    console.groupEnd();
  });
};

export const FindingMarker = ({ finding, map }: FindingMarkerProps) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!finding.position || !map) return;

    // Enhanced coordinate validation logging
    console.group(`[FindingMarker] Marker Creation - ${finding.id}`);
    console.log('📍 Coordinate Validation:', {
      position: finding.position,
      isValidArray: Array.isArray(finding.position),
      arrayLength: finding.position?.length,
      lat: finding.position[0],
      lng: finding.position[1],
      latType: typeof finding.position[0],
      lngType: typeof finding.position[1],
      latIsNaN: isNaN(finding.position[0]),
      lngIsNaN: isNaN(finding.position[1])
    });

    if (!Array.isArray(finding.position) || finding.position.length !== 2) {
      console.error('❌ Invalid coordinates format:', finding.position);
      console.groupEnd();
      return;
    }

    const [lat, lng] = finding.position;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.error('❌ Invalid coordinate values:', { lat, lng });
      console.groupEnd();
      return;
    }

    console.log('🎯 Marker Creation:', {
      id: finding.id,
      type: finding.type,
      coordinates: finding.position,
      timestamp: new Date().toISOString()
    });

    // Create marker with async icon loading
    createFindingIcon(finding.type).then(icon => {
      const marker = L.marker([lat, lng], { icon });
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

      // Enhanced position verification
      const actualPos = marker.getLatLng();
      console.log('📐 Position Verification:', {
        intended: { lat, lng },
        actual: actualPos,
        difference: {
          lat: Math.abs(actualPos.lat - lat),
          lng: Math.abs(actualPos.lng - lng)
        },
        verificationTime: new Date().toISOString()
      });
    });

    return () => {
      console.log('🧹 Cleanup:', {
        id: finding.id,
        type: finding.type,
        position: finding.position,
        cleanupTime: new Date().toISOString()
      });
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      console.groupEnd();
    };
  }, [finding, map]);

  return null;
};

// Funzione di utilità per creare marker
export const createFindingMarker = (finding: Finding) => {
  return createFindingIcon(finding.type);
}; 