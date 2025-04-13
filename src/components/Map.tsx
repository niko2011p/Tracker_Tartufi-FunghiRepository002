import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { Track } from '../types';
import FindingMarker from './FindingMarker';

interface MapProps {
  showTrack?: boolean;
  fitBounds?: boolean;
  track?: Track;
}

const Map: React.FC<MapProps> = ({ showTrack = false, fitBounds = false, track: propTrack }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { currentTrack, currentPosition } = useTrackStore();
  const track = propTrack || currentTrack;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inizializza la mappa se non esiste
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([45.4642, 9.1900], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Aggiorna la vista se c'è una posizione corrente
    if (currentPosition && !track) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 13);
    }

    // Visualizza la traccia se richiesto
    if (showTrack && track && track.coordinates.length > 0) {
      // Rimuovi la traccia precedente se esiste
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          mapRef.current?.removeLayer(layer);
        }
      });

      // Aggiungi la nuova traccia
      const polyline = L.polyline(track.coordinates, {
        color: '#FF9800',
        weight: 5,
        opacity: 0.7
      }).addTo(mapRef.current);

      // Aggiungi i marker per i ritrovamenti
      track.findings.forEach((finding) => {
        if (finding.coordinates) {
          FindingMarker({ 
            position: finding.coordinates,
            type: finding.type,
            map: mapRef.current!
          });
        }
      });

      // Adatta la vista alla traccia se richiesto
      if (fitBounds) {
        mapRef.current.fitBounds(polyline.getBounds(), {
          padding: [50, 50]
        });
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showTrack, fitBounds, track, currentPosition]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
    />
  );
};

export default Map;