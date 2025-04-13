import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import FindingMarker from './FindingMarker';

interface MapProps {
  showTrack?: boolean;
  fitBounds?: boolean;
}

const Map: React.FC<MapProps> = ({ showTrack = true, fitBounds = false }) => {
  const mapRef = useRef<L.Map | null>(null);
  const trackLayerRef = useRef<L.Polyline | null>(null);
  const { currentTrack, currentPosition } = useTrackStore();

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([currentPosition.lat, currentPosition.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && currentPosition) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng]);
    }
  }, [currentPosition]);

  useEffect(() => {
    if (mapRef.current && currentTrack && showTrack) {
      // Rimuovi la traccia precedente se esiste
      if (trackLayerRef.current) {
        trackLayerRef.current.remove();
      }

      // Crea la nuova traccia
      const trackCoordinates = currentTrack.positions.map(pos => [pos.lat, pos.lng]);
      trackLayerRef.current = L.polyline(trackCoordinates, {
        color: '#fd9a3c',
        weight: 5,
        opacity: 0.7
      }).addTo(mapRef.current);

      // Se richiesto, adatta la vista per mostrare l'intera traccia
      if (fitBounds && trackCoordinates.length > 0) {
        const bounds = L.latLngBounds(trackCoordinates);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      if (trackLayerRef.current) {
        trackLayerRef.current.remove();
        trackLayerRef.current = null;
      }
    };
  }, [currentTrack, showTrack, fitBounds]);

  return (
    <div id="map" className="w-full h-full">
      {mapRef.current && currentTrack?.findings.map((finding, index) => (
        <FindingMarker
          key={index}
          finding={finding}
          map={mapRef.current}
          onClick={() => {
            // Qui puoi aggiungere la logica per mostrare i dettagli del ritrovamento
            console.log('Finding clicked:', finding);
          }}
        />
      ))}
    </div>
  );
};

export default Map;