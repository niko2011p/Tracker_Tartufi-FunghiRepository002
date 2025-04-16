import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { Finding } from '../types';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import LZString from 'lz-string';

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

export default function TrackDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tracks } = useTrackStore();
  const [track, setTrack] = useState(tracks.find(t => t.id === id));
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    // Se non troviamo la traccia nello store, proviamo a caricarla dal localStorage
    if (!track) {
      try {
        const compressed = localStorage.getItem('savedTracks');
        if (compressed) {
          const decompressed = LZString.decompress(compressed);
          if (decompressed) {
            const storedTracks = JSON.parse(decompressed);
            const foundTrack = storedTracks.find((t: any) => t.id === id);
            if (foundTrack) {
              setTrack(foundTrack);
            }
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento della traccia:', error);
      }
    }
  }, [id, track]);

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
                      src="/icon/${finding.type === 'Fungo' ? 'mushroom-tag-icon.svg' : 'Truffle-tag-icon.svg'}" 
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
} 