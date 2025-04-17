import React, { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Finding } from '../types';
import './FindingMarker.css';

interface FindingMarkerProps {
  finding: Finding;
}

const createFindingMarker = (finding: Finding) => {
  console.log('🎯 Creating marker for finding:', {
    id: finding.id,
    type: finding.type,
    coordinates: finding.coordinates
  });

  // Use absolute paths for icons
  const iconUrl = finding.type === 'Fungo'
    ? `${window.location.origin}/assets/icons/mushroom-tag-icon.svg`
    : finding.type === 'Tartufo'
      ? `${window.location.origin}/assets/icons/Truffle-tag-icon.svg`
      : `${window.location.origin}/assets/icons/point-of-interest-tag-icon.svg`;

  console.log('🔍 Using icon URL:', {
    type: finding.type,
    iconUrl,
    iconUrlType: typeof iconUrl,
    iconUrlExists: !!iconUrl,
    baseUrl: window.location.origin,
    currentPath: window.location.pathname
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