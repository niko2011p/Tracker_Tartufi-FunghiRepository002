import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Finding } from '../types';
import mushroomIconUrl from '../assets/icons/mushroom-tag-icon.svg';
import truffleIconUrl from '../assets/icons/Truffle-tag-icon.svg';
import poiIconUrl from '../assets/icons/point-of-interest-tag-icon.svg';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
}

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
                e.target.parentElement.style.backgroundColor = '${finding.type === 'Fungo' ? '#8eaa36' : finding.type === 'Tartufo' ? '#8B4513' : '#ff9800'}';
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
            background-color: ${finding.type === 'Fungo' ? '#8eaa36' : finding.type === 'Tartufo' ? '#8B4513' : '#ff9800'};
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
            ${finding.type.charAt(0)}
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

const createFindingMarker = (finding: Finding) => {
  console.log('🎯 Creating marker for finding:', {
    id: finding.id,
    type: finding.type,
    coordinates: finding.coordinates
  });

  const iconUrl = finding.type === 'Fungo'
    ? mushroomIconUrl
    : finding.type === 'Tartufo'
      ? truffleIconUrl
      : poiIconUrl;

  console.log('🔍 Using icon URL:', {
    type: finding.type,
    iconUrl,
    iconUrlType: typeof iconUrl,
    iconUrlExists: !!iconUrl
  });

  return new L.DivIcon({
    html: `
      <div class="finding-icon-wrapper ${finding.type.toLowerCase()}-finding">
        <div class="finding-icon-pulse"></div>
        <img
          src="${iconUrl}"
          width="24"
          height="24"
          alt="${finding.type} Icon"
          onerror="(function(e) {
            console.error('[createFindingMarker] Image Load Error:', {
              src: e.target.src,
              type: '${finding.type}',
              timestamp: new Date().toISOString()
            });
            e.target.style.display = 'none';
            e.target.parentElement.style.backgroundColor = '${finding.type === 'Fungo' ? '#8eaa36' : finding.type === 'Tartufo' ? '#8B4513' : '#ff9800'}';
          })(event)"
        />
      </div>
    `,
    className: 'finding-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export const FindingMarker: React.FC<FindingMarkerProps> = ({ finding }) => {
  const [marker, setMarker] = useState<L.Marker | null>(null);

  useEffect(() => {
    console.log('📍 FindingMarker mounted:', {
      id: finding.id,
      type: finding.type,
      coordinates: finding.coordinates
    });

    if (!finding.coordinates || !Array.isArray(finding.coordinates) || finding.coordinates.length !== 2) {
      console.error('❌ Invalid coordinates:', finding.coordinates);
      return;
    }

    const newMarker = L.marker(finding.coordinates, {
      icon: createFindingMarker(finding)
    });

    newMarker.bindPopup(`
      <div class="p-2">
        <h3 class="font-semibold">${finding.name || finding.type}</h3>
        ${finding.description ? `<p class="text-sm mt-1">${finding.description}</p>` : ''}
        <p class="text-xs text-gray-500 mt-1">
          ${new Date(finding.timestamp).toLocaleString('it-IT')}
        </p>
      </div>
    `);

    setMarker(newMarker);

    return () => {
      if (newMarker) {
        newMarker.remove();
      }
    };
  }, [finding]);

  if (!marker) {
    return null;
  }

  return <Marker position={finding.coordinates} icon={marker.getIcon()} />;
}; 