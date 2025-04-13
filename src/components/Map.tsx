import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FindingMarker from './FindingMarker';
import { Track } from '../types/track';

interface MapProps {
  initialCenter: [number, number];
  initialZoom: number;
  showControls?: boolean;
  showCurrentLocation?: boolean;
  track?: Track;
}

const MapContent: React.FC<{
  showCurrentLocation?: boolean;
  track?: Track;
}> = ({ showCurrentLocation, track }) => {
  const map = useMap();

  useEffect(() => {
    if (track) {
      // Rimuovi la traccia precedente se esiste
      map.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // Aggiungi la nuova traccia
      const polyline = L.polyline(track.path, {
        color: '#FF6B35',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Centra la mappa sulla traccia
      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50],
      });
    }
  }, [map, track]);

  useEffect(() => {
    if (showCurrentLocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], map.getZoom());
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [map, showCurrentLocation]);

  return null;
};

const Map: React.FC<MapProps> = ({
  initialCenter,
  initialZoom,
  showControls = true,
  showCurrentLocation = false,
  track,
}) => {
  const mapRef = useRef<L.Map>(null);

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={showControls}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapContent showCurrentLocation={showCurrentLocation} track={track} />
      {track?.findings.map((finding) => (
        <FindingMarker
          key={finding.id}
          finding={finding}
          map={mapRef.current!}
        />
      ))}
    </MapContainer>
  );
};

export default Map;