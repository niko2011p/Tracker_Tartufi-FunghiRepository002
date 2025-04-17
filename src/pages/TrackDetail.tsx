import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { Finding, Track } from '../types';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import LZString from 'lz-string';
import Map from '../components/Map';
import { formatDistance, formatDuration } from '../utils/formatUtils';
import { icons } from '../utils/icons';

// Fix per gli icon marker di Leaflet
const defaultIcon = L.icon({
  iconUrl: '/icon/marker-icon.png',
  iconRetinaUrl: '/icon/marker-icon-2x.png',
  shadowUrl: '/icon/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

const TrackDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tracks, loadTracks } = useTrackStore();
  const [track, setTrack] = useState<Track | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (id) {
      const foundTrack = tracks.find(t => t.id === id);
      if (foundTrack) {
        setTrack(foundTrack);
      } else {
        // Se non troviamo la traccia nello store, proviamo a caricarla da IndexedDB
        const request = indexedDB.open('tracksDB', 1);
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['tracks'], 'readonly');
          const store = transaction.objectStore('tracks');
          const getRequest = store.get(id);
          
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              setTrack(getRequest.result);
            } else {
              navigate('/logger');
            }
          };
        };
      }
    }
  }, [id, tracks, navigate]);

  useEffect(() => {
    if (track?.coordinates?.length) {
      const newBounds = L.latLngBounds(track.coordinates);
      setBounds(newBounds);
    }
  }, [track]);

  if (!track) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Traccia non trovata</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    try {
      const shareData = {
        title: track.name,
        text: `Condivido con te la mia traccia: ${track.name}`,
        url: window.location.href
      };
      await navigator.share(shareData);
    } catch (err) {
      console.error('Errore nella condivisione:', err);
    }
  };

  const handleExportGPX = () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Funghi Tracker">
  <trk>
    <name>${track.name}</name>
    <trkseg>
      ${track.coordinates.map(coord => `
        <trkpt lat="${coord[0]}" lon="${coord[1]}">
          <time>${new Date().toISOString()}</time>
        </trkpt>
      `).join('')}
    </trkseg>
  </trk>
</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.name.replace(/\s+/g, '_')}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Indietro</span>
        </button>
        
        <h1 className="text-xl font-bold">{track.name}</h1>
        
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-gray-300 hover:text-white transition-colors"
            title="Condividi"
          >
            <Share2 size={24} />
          </button>
          <button
            onClick={handleExportGPX}
            className="p-2 text-gray-300 hover:text-white transition-colors"
            title="Esporta GPX"
          >
            <Download size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={track.coordinates[0]}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
          bounds={bounds || undefined}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Polyline 
            positions={track.coordinates} 
            color="#8eaa36"
            weight={4}
            opacity={0.8}
          />
          
          {track.findings?.map((finding: Finding) => (
            <Marker
              key={finding.id}
              position={finding.coordinates}
              icon={L.divIcon({
                html: `
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
                      src={finding.type === 'Fungo' ? icons.mushroomTagIcon : icons.truffleTagIcon}
                      style="
                        width: 32px;
                        height: 32px;
                        position: relative;
                        z-index: 1000;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                      "
                      alt="${finding.type}"
                    />
                  </div>
                `,
                className: 'finding-icon',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
              })}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-lg mb-1">{finding.name}</h3>
                  {finding.description && (
                    <p className="text-gray-600 mb-2">{finding.description}</p>
                  )}
                  {finding.photoUrl && (
                    <img 
                      src={finding.photoUrl} 
                      alt={finding.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-sm text-gray-500">
                    {new Date(finding.timestamp).toLocaleString('it-IT')}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default TrackDetail; 