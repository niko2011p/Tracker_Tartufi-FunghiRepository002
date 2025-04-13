import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track, Finding } from '../types';

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

    // Rimuovi i marker precedenti se esistono
    if (markersRef.current) {
      console.log('Removing previous markers layer');
      map.removeLayer(markersRef.current);
    }

    // Crea un nuovo layer per i marker
    markersRef.current = L.layerGroup().addTo(map);
    console.log('Created new markers layer:', markersRef.current);

    // Se ci sono coordinate, disegna la traccia
    if (track.coordinates && track.coordinates.length > 0) {
      console.log('Adding track polyline with coordinates:', track.coordinates);
      const latLngs = track.coordinates.map(coord => [coord[0], coord[1]]);

      // Crea il layer della traccia
      trackLayerRef.current = L.polyline(latLngs, {
        color: '#FF9800',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(map);

      // Verifica che il layer group sia stato aggiunto correttamente alla mappa
      console.log('Layer group added to map:', {
        layerGroup: markersRef.current,
        mapLayers: map.getLayers(),
        layerCount: markersRef.current.getLayers().length
      });

      // Aggiungi i marker per i ritrovamenti
      if (track.findings && track.findings.length > 0) {
        console.log('Adding markers for findings:', track.findings.length);
        track.findings.forEach(finding => {
          if (finding.coordinates) {
            console.log('Processing finding:', finding);
            console.log('Finding coordinates:', finding.coordinates);
            
            // Verifica che le coordinate siano valide
            if (!Array.isArray(finding.coordinates) || 
                finding.coordinates.length !== 2 || 
                typeof finding.coordinates[0] !== 'number' || 
                typeof finding.coordinates[1] !== 'number') {
              console.error('Invalid coordinates for finding:', finding);
              return;
            }

            // Crea l'icona HTML
            const iconUrl = `/icon/${finding.type === 'Fungo' ? 'mushroom-tag-icon.svg' : 'Truffle-tag-icon.svg'}`;
            console.log('Using icon URL:', iconUrl);

            const iconHtml = `
              <div class="finding-marker" style="
                width: 40px;
                height: 40px;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
              ">
                <div class="finding-pulse" style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  background: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
                  animation: pulse 2s infinite;
                "></div>
                <img 
                  src="${iconUrl}" 
                  style="
                    width: 32px;
                    height: 32px;
                    position: relative;
                    z-index: 1000;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                  "
                  alt="${finding.type}"
                  onerror="console.error('Failed to load icon:', this.src)"
                />
              </div>
            `;

            // Crea l'icona personalizzata
            const customIcon = L.divIcon({
              html: iconHtml,
              className: 'finding-icon',
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20]
            });

            // Crea e aggiungi il marker
            const marker = L.marker(finding.coordinates, {
              icon: customIcon,
              riseOnHover: true,
              zIndexOffset: 1000
            });

            // Aggiungi il popup con i dettagli del ritrovamento
            marker.bindPopup(`
              <div style="padding: 12px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};">${finding.name}</h3>
                ${finding.description ? `<p style="margin: 0 0 8px 0; color: #666;">${finding.description}</p>` : ''}
                ${finding.photoUrl ? `<img src="${finding.photoUrl}" style="max-width: 200px; margin-bottom: 8px; border-radius: 4px;" alt="${finding.name}">` : ''}
                <p style="margin: 0; font-size: 0.8em; color: #666;">
                  ${new Date(finding.timestamp).toLocaleString('it-IT')}
                </p>
              </div>
            `);

            // Aggiungi il marker al layer group
            marker.addTo(markersRef.current);
            
            // Log dettagliato per il debug
            console.log('Marker creation details:', {
              findingId: finding.id,
              coordinates: finding.coordinates,
              iconUrl: iconUrl,
              layerGroup: markersRef.current,
              map: mapRef.current,
              marker: marker,
              isAdded: marker.isAdded(),
              latLng: marker.getLatLng()
            });
            
            // Forza il ridisegno del marker
            marker.update();
            
            console.log('Added marker for finding:', finding.id);
          } else {
            console.warn('Finding has no coordinates:', finding);
          }
        });
      } else {
        console.log('No findings to add to map');
      }

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