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
  const iconUrl = type === 'Fungo'
    ? '/assets/icons/mushroom-tag-icon.svg'
    : type === 'Tartufo'
      ? '/assets/icons/Truffle-tag-icon.svg'
      : '/assets/icons/point-of-interest-tag-icon.svg';

  // Debug logging
  console.log(`[createFindingIcon] Debug Info:`, {
    type,
    isLoaded,
    iconUrl,
    iconUrlType: typeof iconUrl,
    iconUrlExists: !!iconUrl,
    iconUrlLength: iconUrl?.length,
    iconUrlStartsWith: iconUrl?.startsWith('/'),
    iconUrlEndsWith: iconUrl?.endsWith('.svg')
  });

  if (!iconUrl || typeof iconUrl !== 'string') {
    console.error(`[createFindingIcon] ERRORE: iconUrl non valido!`, {
      type,
      iconUrl,
      iconUrlType: typeof iconUrl
    });
    
    // Fallback marker con indicatore visivo dell'errore
    return new L.DivIcon({
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
    });
  }

  // Verifica se l'URL è assoluto o relativo
  const isAbsoluteUrl = iconUrl.startsWith('http://') || iconUrl.startsWith('https://');
  console.log(`[createFindingIcon] URL Analysis:`, {
    isAbsoluteUrl,
    baseUrl: window.location.origin,
    fullUrl: isAbsoluteUrl ? iconUrl : `${window.location.origin}${iconUrl}`
  });

  return new L.DivIcon({
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
              timestamp: new Date().toISOString()
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
  });
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

    // Create marker with debug icon
    const marker = L.marker([lat, lng], { 
      icon: createFindingIcon(finding.type)
    });
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
  return createFindingIcon(finding.type);
}; 