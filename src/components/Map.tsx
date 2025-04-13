import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import FindingMarker from './FindingMarker';

const Map: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
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

  return (
    <div id="map" className="w-full h-full">
      {currentTrack?.findings.map((finding, index) => (
        <FindingMarker
          key={index}
          finding={finding}
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