import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track, Finding } from '../types';
import { icons } from '../utils/icons';

interface MapProps {
  track: Track;
  onTakePhoto?: (findingId: string) => void;
}

const Map: React.FC<MapProps> = ({ track, onTakePhoto }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    console.log('Map component mounted/updated');
    console.log('Findings:', track.findings);
    console.log('Coordinates:', track.coordinates);

    if (!mapContainerRef.current) return;

    // Inizializza la mappa se non esiste
    if (!mapRef.current) {
      console.log('Initializing map...');
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      });

      // Aggiungi il layer di base
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Rimuovi il layer della traccia precedente se esiste
    if (trackLayerRef.current) {
      map.removeLayer(trackLayerRef.current);
    }

    // Rimuovi i marker precedenti se esistono
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }

    // Crea un nuovo layer per i marker
    markersRef.current = L.layerGroup().addTo(map);

    // Se ci sono coordinate, disegna la traccia
    if (track.coordinates && track.coordinates.length > 0) {
      console.log('Adding track polyline with coordinates:', track.coordinates);
      // Converti le coordinate nel formato corretto per Leaflet
      const latLngs = track.coordinates.map(coord => [coord[0], coord[1]]);

      // Crea il layer della traccia
      trackLayerRef.current = L.polyline(latLngs, {
        color: '#FF9800',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(map);

      // Aggiungi i marker per i ritrovamenti
      track.findings.forEach(finding => {
        if (finding.coordinates) {
          console.log('Processing finding:', finding);
          console.log('Finding coordinates:', finding.coordinates);
          
          // Verify coordinates are valid numbers
          if (!Array.isArray(finding.coordinates) || 
              finding.coordinates.length !== 2 || 
              typeof finding.coordinates[0] !== 'number' || 
              typeof finding.coordinates[1] !== 'number') {
            console.error('Invalid coordinates for finding:', finding);
            return;
          }

          // Create the icon HTML
          const type = finding.type.toLowerCase();
          const color = type === 'fungo' ? '#8eaa36' : '#8B4513';
          const emoji = type === 'fungo' ? '🍄' : '🥔';
          
          console.log('📌 Map: Creazione marker con CSS per finding di tipo', type);

          const iconHtml = `
            <div class="finding-marker ${type}-marker" style="
              width: 40px;
              height: 40px;
              position: relative;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: ${color}40;
              border-radius: 50%;
              border: 2px solid ${color};
            ">
              <div class="finding-pulse" style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background-color: ${color}30;
                animation: pulse 2s infinite;
              "></div>
              <div style="
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                color: ${color};
              ">${emoji}</div>
            </div>
          `;

          // Create the custom icon
          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'finding-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          });

          // Create and add the marker
          const marker = L.marker(finding.coordinates, {
            icon: customIcon,
            riseOnHover: true,
            zIndexOffset: 1000
          });

          // Add popup with finding details
          marker.bindPopup(`
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">${finding.name}</h3>
              ${finding.description ? `<p style="margin: 0 0 8px 0; color: #666;">${finding.description}</p>` : ''}
              ${finding.photoUrl ? `<img src="${finding.photoUrl}" style="max-width: 200px; margin-bottom: 8px; border-radius: 4px;" alt="${finding.name}">` : ''}
              <p style="margin: 0; font-size: 0.8em; color: #666;">
                ${new Date(finding.timestamp).toLocaleString('it-IT')}
              </p>
            </div>
          `);

          marker.addTo(markersRef.current);
          console.log('Added marker for finding:', finding.id);
        } else {
          console.warn('Finding has no coordinates:', finding);
        }
      });

      // Centra la mappa sulla traccia
      const bounds = trackLayerRef.current.getBounds();
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16
      });
    }

    return () => {
      console.log('Cleaning up map...');
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [track, onTakePhoto]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full bg-white"
      style={{ minHeight: '300px' }}
    />
  );
};

export default Map;