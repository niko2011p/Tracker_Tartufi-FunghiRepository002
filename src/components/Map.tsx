import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track, Finding } from '../types';
import FindingMarker from './FindingMarker';

interface MapProps {
  track: Track;
  onTakePhoto?: (findingId: string) => void;
}

const Map: React.FC<MapProps> = ({ track, onTakePhoto }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const findingMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inizializza la mappa se non esiste
    if (!mapRef.current) {
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
          FindingMarker({
            position: finding.coordinates,
            type: finding.type,
            map: map,
            onTakePhoto: () => onTakePhoto?.(finding.id)
          });
        }
      });

      // Centra la mappa sulla traccia
      const bounds = trackLayerRef.current.getBounds();
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 16
      });
    }

    // Clear existing finding markers
    findingMarkersRef.current.forEach(marker => marker.remove());
    findingMarkersRef.current = [];

    // Add markers for findings
    track.findings.forEach(finding => {
      if (finding.coordinates) {
        const icon = L.divIcon({
          html: `
            <div class="finding-icon-wrapper ${finding.type.toLowerCase()}-finding" style="
              display: flex;
              justify-content: center;
              align-items: center;
              width: 32px;
              height: 32px;
              position: relative;
              cursor: pointer;
            ">
              <div class="finding-icon-pulse" style="
                position: absolute;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: ${finding.type === 'Fungo' ? '#8eaa36' : finding.type === 'Tartufo' ? '#8B4513' : '#f5a149'}40;
                animation: pulse 2s infinite;
              "></div>
              <img 
                src="/icon/${finding.type === 'Fungo' ? 'mushroom-tag-icon.svg' : 'Truffle-tag-icon.svg'}" 
                width="24" 
                height="24" 
                alt="${finding.type} Icon" 
                style="
                  position: relative;
                  z-index: 1;
                  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                  transition: transform 0.2s ease;
                "
              />
            </div>
          `,
          className: 'finding-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker(finding.coordinates, { icon })
          .bindPopup(`
            <div>
              <h3>${finding.name}</h3>
              <p>${finding.description}</p>
              ${finding.photoUrl ? `<img src="${finding.photoUrl}" alt="${finding.name}" style="max-width: 200px;">` : ''}
              <p>Data: ${new Date(finding.timestamp).toLocaleString('it-IT')}</p>
            </div>
          `)
          .addTo(map);

        findingMarkersRef.current.push(marker);
      }
    });

    // Cleanup
    return () => {
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