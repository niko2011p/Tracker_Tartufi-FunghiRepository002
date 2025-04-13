import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track } from '../types';
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