import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import { useButtonConfigStore } from '../store/buttonConfigStore';
import { Track, Finding } from '../types';

interface MapProps {
  track: Track;
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
    if (!map) return;

    // Rimuovi il layer dei marker esistente se presente
    if (markerLayerRef.current) {
      map.removeLayer(markerLayerRef.current);
    }

    // Crea un nuovo layer per i marker
    const markerLayer = L.layerGroup();
    markerLayerRef.current = markerLayer;

    // Aggiungi i marker per la traccia corrente
    if (currentTrack) {
      currentTrack.findings.forEach(finding => {
        if (finding.coordinates) {
          const icon = finding.type === 'Fungo' ? mushroomIcon : truffleIcon;
          const marker = L.marker(finding.coordinates, { icon });
          
          // Aggiungi il popup con le informazioni del finding
          marker.bindPopup(`
            <div>
              <strong>${finding.name}</strong><br/>
              ${finding.description || 'Nessuna descrizione'}<br/>
              ${new Date(finding.timestamp).toLocaleString()}
            </div>
          `);
          
          markerLayer.addLayer(marker);
          console.log('Marker aggiunto:', finding);
        }
      });
    }

    // Aggiungi i marker per le tracce storiche
    tracks.forEach(track => {
      track.findings.forEach(finding => {
        if (finding.coordinates) {
          const icon = finding.type === 'Fungo' ? mushroomIcon : truffleIcon;
          const marker = L.marker(finding.coordinates, { icon });
          
          marker.bindPopup(`
            <div>
              <strong>${finding.name}</strong><br/>
              ${finding.description || 'Nessuna descrizione'}<br/>
              ${new Date(finding.timestamp).toLocaleString()}
            </div>
          `);
          
          markerLayer.addLayer(marker);
        }
      });
    });

    // Aggiungi il layer dei marker alla mappa
    markerLayer.addTo(map);

    // Forza un aggiornamento della mappa
    map.invalidateSize();

    return () => {
      if (markerLayerRef.current) {
        map.removeLayer(markerLayerRef.current);
      }
    };
  }, [map, currentTrack, tracks]);

  return null;
};

const Map: React.FC<MapProps> = ({ track, onTakePhoto }) => {
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    // Forza un aggiornamento della mappa quando il componente viene montato
    setMapKey(prev => prev + 1);
  }, []);

  return (
    <div className="h-full w-full">
      <MapContainer
        key={mapKey}
        center={[42.5719116, 12.723933]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
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