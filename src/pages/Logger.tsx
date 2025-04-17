import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import { formatDistance, formatDuration } from '../utils/formatUtils';
import { useNavigate } from 'react-router-dom';
import { useTrackStore } from '../store/trackStore';
import { Track } from '../types';
import { openDB } from 'idb';

// Fix per le icone di Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Logger: React.FC = () => {
  const navigate = useNavigate();
  const trackStore = useTrackStore();
  const { tracks, loadTracks } = trackStore;
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.4642, 9.1900]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica direttamente da IndexedDB al mount del componente
  useEffect(() => {
    async function loadTracksFromIndexedDB() {
      setIsLoading(true);
      console.log('📋 Logger: caricamento tracce...');
      
      try {
        // 1. Prima verifica se abbiamo già tracce nello store
        if (tracks && tracks.length > 0) {
          console.log(`✅ Logger: ${tracks.length} tracce già presenti nello store`);
          setLocalTracks(tracks);
          setIsLoading(false);
          return;
        }
        
        // 2. Prova a caricare dallo store usando loadTracks
        console.log('🔄 Logger: nessuna traccia nello store, chiamata a loadTracks()...');
        await loadTracks();
        
        // 3. Verifica se abbiamo caricato con successo
        if (trackStore.tracks && trackStore.tracks.length > 0) {
          console.log(`✅ Logger: ${trackStore.tracks.length} tracce caricate tramite loadTracks`);
          setLocalTracks(trackStore.tracks);
          setIsLoading(false);
          return;
        }
        
        // 4. Fallback: caricamento diretto da IndexedDB
        console.log('🔍 Logger: caricamento diretto da IndexedDB...');
        const db = await openDB('tracksDB', 1);
        const tx = db.transaction('tracks', 'readonly');
        const store = tx.objectStore('tracks');
        const tracksFromDB = await store.get('tracks');
        await tx.done;
        
        if (tracksFromDB && Array.isArray(tracksFromDB) && tracksFromDB.length > 0) {
          console.log(`✅ Logger: ${tracksFromDB.length} tracce caricate direttamente da IndexedDB`);
          setLocalTracks(tracksFromDB);
          // Aggiorna anche lo store globale
          trackStore.setState({ tracks: tracksFromDB });
        } else {
          console.log('❌ Logger: nessuna traccia trovata in IndexedDB');
          setLocalTracks([]);
        }
      } catch (error) {
        console.error('❌ Logger: errore nel caricamento delle tracce', error);
        setLocalTracks([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTracksFromIndexedDB();
  }, []);

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track.id);
    const trackObj = tracks.find((t) => t.id === track.id);
    if (trackObj && trackObj.coordinates.length > 0) {
      setMapCenter(trackObj.coordinates[0]);
    }
    navigate(`/track/${track.id}`);
  };

  const renderTrackStats = (track: any) => (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-2">{track.name}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-semibold">Distanza:</span>
          <span className="ml-2">{formatDistance(track.stats.distanceKm)}</span>
        </div>
        <div>
          <span className="font-semibold">Durata:</span>
          <span className="ml-2">{formatDuration(track.stats.durationMin)}</span>
        </div>
        <div>
          <span className="font-semibold">Velocità media:</span>
          <span className="ml-2">{track.stats.speedAvgKmh.toFixed(1)} km/h</span>
        </div>
        <div>
          <span className="font-semibold">Altitudine:</span>
          <span className="ml-2">
            {track.stats.altitudeMin.toFixed(0)} - {track.stats.altitudeMax.toFixed(0)} m
          </span>
        </div>
        <div>
          <span className="font-semibold">Temperatura media:</span>
          <span className="ml-2">{track.stats.temperatureAvg.toFixed(1)}°C</span>
        </div>
        <div>
          <span className="font-semibold">Umidità media:</span>
          <span className="ml-2">{track.stats.humidityAvg.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento tracce...</p>
        </div>
      </div>
    );
  }

  const displayTracks = localTracks.length > 0 ? localTracks : [];

  return (
    <div className="h-screen flex">
      {/* Lista tracce */}
      <div className="w-1/3 bg-gray-100 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Tracce Salvate</h2>
        {displayTracks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nessuna traccia salvata</p>
            <button 
              onClick={async () => {
                setIsLoading(true);
                await loadTracks();
                setIsLoading(false);
              }} 
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Riprova a caricare
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayTracks.map((track) => (
              <div
                key={track.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTrackSelect(track)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">{track.name || `Traccia del ${new Date(track.startTime).toLocaleDateString('it-IT')}`}</h2>
                    <p className="text-sm text-gray-600">
                      {track.distance ? formatDistance(track.distance) : '0 km'} • {track.duration ? formatDuration(track.duration) : '0 min'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {track.findings && track.findings.length ? track.findings.length : 0} ritrovamenti
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(track.startTime).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mappa e statistiche */}
      <div className="w-2/3 relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {selectedTrack && (
            <>
              <Polyline
                positions={tracks.find((t) => t.id === selectedTrack)?.path || []}
                color="#f5a149"
                weight={3}
                opacity={0.7}
              />
              {tracks
                .find((t) => t.id === selectedTrack)
                ?.tags.map((tag, index) => (
                  <Marker key={index} position={tag.position}>
                    <Popup>
                      <div>
                        <p className="font-semibold">
                          {tag.type === 'finding' ? 'Ritrovamento' : 'POI'}
                        </p>
                        <p className="text-sm">
                          {new Date(tag.timestamp).toLocaleString()}
                        </p>
                        {tag.notes && <p className="text-sm mt-1">{tag.notes}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </>
          )}
        </MapContainer>
        {selectedTrack && (
          <div className="absolute bottom-4 left-4 right-4">
            {renderTrackStats(tracks.find((t) => t.id === selectedTrack)!)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Logger; 