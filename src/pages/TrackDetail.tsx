import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { Finding, Track } from '../types';
import { ArrowLeft, Share2, Download, Clock, Route, ArrowUp, ArrowDown, Thermometer, Droplets, Wind, Mountain } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { formatDistance, formatDuration } from '../utils/formatUtils';

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

// Componente per centrare la mappa sui bounds della traccia
function MapBoundsHandler({ bounds, padding }: { bounds: L.LatLngBounds | null; padding: number[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        padding: padding,
        maxZoom: 18,  // Limita lo zoom massimo
        animate: true
      });
    }
  }, [bounds, map, padding]);
  
  return null;
}

interface TrackDetailProps {
  trackId?: string;
  trackData?: Track;
}

const TrackDetail: React.FC<TrackDetailProps> = ({ trackId: propTrackId, trackData: propTrackData }) => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tracks, loadTracks } = useTrackStore();
  const [track, setTrack] = useState<Track | null>(propTrackData || null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  
  // Use the trackId prop if provided, otherwise use the id from the URL params
  const id = propTrackId || params.id;

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (propTrackData) {
      setTrack(propTrackData);
      return;
    }

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
  }, [id, tracks, navigate, propTrackData]);

  // Calcola i bounds della traccia
  useEffect(() => {
    if (track?.coordinates?.length) {
      const newBounds = L.latLngBounds(track.coordinates);
      setBounds(newBounds);
      
      // Carica i dati meteo se abbiamo le coordinate
      if (track.coordinates.length > 0) {
        loadWeatherData(track.coordinates);
      }
    }
  }, [track]);

  // Funzione per caricare i dati meteo
  const loadWeatherData = async (coordinates: [number, number][]) => {
    try {
      setIsLoadingWeather(true);
      
      // Calcola la posizione media della traccia
      const avgLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const avgLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      
      // Per ora imposta dei dati mock - Sostituire con una chiamata API reale
      const mockData = generateMockWeatherData();
      setWeatherData(mockData);
    } catch (error) {
      console.error('Errore nel caricamento dei dati meteo:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Funzione per generare dati meteo di esempio
  const generateMockWeatherData = () => {
    const today = new Date();
    const result = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      result.push({
        date: format(date, 'dd/MM', { locale: it }),
        temperatura: Math.round(15 + Math.random() * 10),
        umidità: Math.round(50 + Math.random() * 30),
        precipitazioni: Math.round(Math.random() * 15)
      });
    }
    
    return result;
  };

  // Calcola statistiche dal percorso
  const getTrackStats = () => {
    if (!track) return null;

    // Statistiche di base
    const duration = track.endTime 
      ? Math.round((track.endTime.getTime() - track.startTime.getTime()) / (1000 * 60))
      : 0;
    
    const distance = track.distance || 0;
    
    // Statistiche aggiuntive (mock)
    // Nella versione finale, questi dati dovrebbero provenire dal track
    const avgSpeed = distance > 0 && duration > 0 
      ? (distance / (duration / 60)).toFixed(1) 
      : '0';
    
    const elevation = {
      avg: Math.round(400 + Math.random() * 200),
      max: Math.round(600 + Math.random() * 300),
      min: Math.round(200 + Math.random() * 100)
    };
    
    const weather = {
      temp: Math.round(10 + Math.random() * 15),
      humidity: Math.round(40 + Math.random() * 40)
    };
    
    return {
      duration,
      distance,
      avgSpeed,
      elevation,
      weather,
      findings: track.findings.length
    };
  };

  if (!track) {
    return (
      <div className="w-screen h-screen bg-white text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Traccia non trovata</h1>
          <button
            onClick={() => navigate('/logger')}
            className="px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors"
          >
            Torna al Registro
          </button>
        </div>
      </div>
    );
  }

  const trackStats = getTrackStats();

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
    <div className="w-screen h-screen bg-white text-gray-800 flex flex-col overflow-auto">
      <div className="flex items-center justify-between p-4 border-b border-[#7d9830] bg-[#8eaa36] text-white">
        <button
          onClick={() => navigate('/logger')}
          className="flex items-center gap-2 text-white hover:text-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Indietro</span>
        </button>
        
        <h1 className="text-xl font-bold">{track.name}</h1>
        
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-white hover:text-gray-100 transition-colors"
            title="Condividi"
          >
            <Share2 size={24} />
          </button>
          <button
            onClick={handleExportGPX}
            className="p-2 text-white hover:text-gray-100 transition-colors"
            title="Esporta GPX"
          >
            <Download size={24} />
          </button>
        </div>
      </div>

      <div className="relative h-[60vh]">
        <MapContainer
          center={track.coordinates[0]}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
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
                  <div class="finding-marker ${finding.type.toLowerCase()}-marker" style="
                    width: 40px;
                    height: 40px;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
                    border-radius: 50%;
                    border: 2px solid ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
                  ">
                    <div class="finding-pulse" style="
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      border-radius: 50%;
                      background-color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}30;
                      animation: pulse 2s infinite;
                    "></div>
                    <div style="
                      width: 24px;
                      height: 24px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 16px;
                      font-weight: bold;
                      color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
                    ">${finding.type === 'Fungo' ? '🍄' : '🥔'}</div>
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
          
          {/* Componente per centrare la mappa sui bounds */}
          {bounds && <MapBoundsHandler bounds={bounds} padding={[50, 50]} />}
        </MapContainer>
      </div>
      
      {/* Statistiche del percorso */}
      {trackStats && (
        <div className="px-4 py-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Statistiche del percorso</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#8eaa36] mb-2">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-medium">Durata</span>
              </div>
              <div className="text-xl font-bold">
                {Math.floor(trackStats.duration / 60)}h {trackStats.duration % 60}m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#fd9a3c] mb-2">
                <Route className="w-5 h-5 mr-2" />
                <span className="font-medium">Distanza</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.distance.toFixed(2)} km
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#8eaa36] mb-2">
                <Wind className="w-5 h-5 mr-2" />
                <span className="font-medium">Velocità media</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.avgSpeed} km/h
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#fd9a3c] mb-2">
                <Mountain className="w-5 h-5 mr-2" />
                <span className="font-medium">Altitudine media</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.elevation.avg} m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#8eaa36] mb-2">
                <ArrowUp className="w-5 h-5 mr-2" />
                <span className="font-medium">Altitudine max</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.elevation.max} m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#fd9a3c] mb-2">
                <ArrowDown className="w-5 h-5 mr-2" />
                <span className="font-medium">Altitudine min</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.elevation.min} m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#8eaa36] mb-2">
                <Thermometer className="w-5 h-5 mr-2" />
                <span className="font-medium">Temperatura</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.weather.temp}°C
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-[#fd9a3c] mb-2">
                <Droplets className="w-5 h-5 mr-2" />
                <span className="font-medium">Umidità</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.weather.humidity}%
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Grafico meteo */}
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Meteo ultimi 7 giorni</h2>
        
        {isLoadingWeather ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8eaa36]"></div>
          </div>
        ) : weatherData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weatherData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperatura"
                  stroke="#fd9a3c"
                  activeDot={{ r: 8 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="umidità"
                  stroke="#8eaa36"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="precipitazioni"
                  stroke="#4299e1"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Dati meteo non disponibili</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackDetail; 