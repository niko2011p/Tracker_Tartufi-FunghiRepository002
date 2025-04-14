import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import { useButtonConfigStore } from '../store/buttonConfigStore';
import { Track, Finding } from '../types';

interface MapProps {
  track?: Track;
  onTakePhoto?: (findingId: string) => void;
}

// Fix per le icone di Leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mushroomIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const truffleIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-brown.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-brown.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapContent: React.FC = () => {
  const map = useMap();
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const { currentTrack } = useTrackStore();
  const { tracks } = useTrackHistoryStore();
  const { buttonConfigs } = useButtonConfigStore();

  useEffect(() => {
    if (!map) {
      console.warn('Map instance not available');
      return;
    }

    console.log('Updating markers:', {
      currentTrack: currentTrack?.findings?.length || 0,
      historicalTracks: tracks.length,
      totalFindings: tracks.reduce((acc, track) => acc + (track.findings?.length || 0), 0)
    });

    // Rimuovi il layer dei marker esistente se presente
    if (markerLayerRef.current) {
      console.log('Removing existing marker layer');
      map.removeLayer(markerLayerRef.current);
    }

    // Crea un nuovo layer per i marker
    const markerLayer = L.layerGroup();
    markerLayerRef.current = markerLayer;

    // Funzione helper per aggiungere un marker
    const addMarker = (finding: Finding) => {
      if (!finding.coordinates || finding.coordinates.length !== 2) {
        console.warn('Invalid coordinates for finding:', finding);
        return;
      }

      try {
        const icon = finding.type === 'Fungo' ? mushroomIcon : truffleIcon;
        console.log('Creating marker for:', finding.name, 'at coordinates:', finding.coordinates);
        
        const marker = L.marker(finding.coordinates, { 
          icon,
          riseOnHover: true,
          zIndexOffset: 1000
        });
        
        marker.bindPopup(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};">${finding.name}</h3>
            ${finding.description ? `<p style="margin: 0 0 8px 0; color: #666;">${finding.description}</p>` : ''}
            ${finding.photoUrl ? `<img src="${finding.photoUrl}" style="max-width: 200px; margin-bottom: 8px; border-radius: 4px;" alt="${finding.name}">` : ''}
            <p style="margin: 0; font-size: 0.8em; color: #666;">
              ${new Date(finding.timestamp).toLocaleString()}
            </p>
          </div>
        `);
        
        markerLayer.addLayer(marker);
        console.log('Marker added successfully:', finding.name);
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    };

    // Aggiungi i marker per la traccia corrente
    if (currentTrack?.findings) {
      console.log('Adding markers for current track');
      currentTrack.findings.forEach(addMarker);
    }

    // Aggiungi i marker per le tracce storiche
    console.log('Adding markers for historical tracks');
    tracks.forEach(track => {
      if (track.findings) {
        track.findings.forEach(addMarker);
      }
    });

    // Aggiungi il layer dei marker alla mappa
    markerLayer.addTo(map);
    console.log('Marker layer added to map');

    // Forza un aggiornamento della mappa
    map.invalidateSize();
    console.log('Map size invalidated');

    return () => {
      if (markerLayerRef.current) {
        console.log('Cleaning up marker layer');
        map.removeLayer(markerLayerRef.current);
      }
    };
  }, [map, currentTrack, tracks]);

  return null;
};

const Map: React.FC<MapProps> = ({ track, onTakePhoto }) => {
  const [mapKey, setMapKey] = useState(0);
  const [center, setCenter] = useState<[number, number]>([42.5719116, 12.723933]);
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    console.log('Map component mounted');
    setMapKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (track?.coordinates && track.coordinates.length > 0) {
      console.log('Updating map center based on track');
      const lastCoord = track.coordinates[track.coordinates.length - 1];
      setCenter([lastCoord[0], lastCoord[1]]);
    }
  }, [track]);

  return (
    <div className="h-full w-full">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          console.log('Map instance created');
          map.on('zoomend', () => {
            setZoom(map.getZoom());
          });
          map.on('moveend', () => {
            const center = map.getCenter();
            setCenter([center.lat, center.lng]);
          });
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapContent />
      </MapContainer>
    </div>
  );
};

export default Map;