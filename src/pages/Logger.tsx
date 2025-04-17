import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTrackStore } from '../store/trackStore';
import { Track, Finding } from '../types';
import { formatDistance, formatDuration } from '../utils/formatUtils';
import { useNavigate } from 'react-router-dom';
import mushroomIconUrl from '../assets/icons/mushroom-tag-icon.svg';
import truffleIconUrl from '../assets/icons/Truffle-tag-icon.svg';

// Funzione per creare un marker personalizzato
const createCustomMarker = (finding: Finding) => {
  const iconUrl = finding.type === 'Fungo' ? mushroomIconUrl : truffleIconUrl;
  console.log(`🎯 Creazione marker per ${finding.type} con icona: ${iconUrl}`);

  const iconHtml = `
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
        src="${iconUrl}" 
        style="
          width: 32px;
          height: 32px;
          position: relative;
          z-index: 1000;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        "
        alt="${finding.type}"
        onerror="console.error('❌ Errore caricamento icona:', this.src)"
        onload="console.log('✅ Icona caricata:', this.src)"
      />
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'finding-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

const Logger: React.FC = () => {
  const navigate = useNavigate();
  const { tracks, loadTracks } = useTrackStore();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.4642, 9.1900]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('📋 Logger montato, caricamento tracce...');
    
    const loadAllTracks = async () => {
      setIsLoading(true);
      try {
        // Verifica se ci sono tracce già in memoria
        if (tracks.length > 0) {
          console.log(`✅ ${tracks.length} tracce già presenti in memoria`);
          setIsLoading(false);
          return;
        }
        
        // Carica tracce dallo storage
        console.log('🔍 Nessuna traccia in memoria, carico da storage...');
        await loadTracks();
        console.log(`✅ Caricamento completato: ${tracks.length} tracce caricate`);
      } catch (error) {
        console.error('❌ Errore nel caricamento delle tracce:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllTracks();
  }, [loadTracks, tracks.length]);

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track.id);
    if (track.coordinates && track.coordinates.length > 0) {
      setMapCenter(track.coordinates[0]);
    }
    navigate(`/track/${track.id}`);
  };

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

  return (
    <div className="h-screen flex">
      {/* Lista tracce */}
      <div className="w-1/3 bg-gray-100 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Tracce Salvate</h2>
        {tracks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Nessuna traccia salvata</p>
            <button 
              onClick={() => loadTracks()} 
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Riprova a caricare
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTrackSelect(track)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {track.name || `Traccia del ${new Date(track.startTime).toLocaleDateString('it-IT')}`}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {track.distance ? formatDistance(track.distance) : '0 km'} • 
                      {track.duration ? formatDuration(track.duration) : '0 min'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {track.findings ? track.findings.length : 0} ritrovamenti
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

      {/* Mappa e markers */}
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
          {selectedTrack && tracks.map(track => {
            if (track.id === selectedTrack) {
              return (
                <React.Fragment key={track.id}>
                  {/* Traccia del percorso */}
                  {track.coordinates && track.coordinates.length > 0 && (
                    <Polyline
                      positions={track.coordinates}
                      color="#f5a149"
                      weight={3}
                      opacity={0.7}
                    />
                  )}
                  
                  {/* Markers dei ritrovamenti */}
                  {track.findings && track.findings.map((finding) => (
                    <Marker
                      key={finding.id}
                      position={finding.coordinates}
                      icon={createCustomMarker(finding)}
                    >
                      <Popup>
                        <div className="p-2">
                          <h3 className="font-bold text-lg" style={{ color: finding.type === 'Fungo' ? '#8eaa36' : '#8B4513' }}>
                            {finding.name}
                          </h3>
                          {finding.description && (
                            <p className="text-gray-600 mt-1">{finding.description}</p>
                          )}
                          {finding.photoUrl && (
                            <img 
                              src={finding.photoUrl} 
                              alt={finding.name}
                              className="mt-2 rounded-lg max-w-[200px]"
                            />
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(finding.timestamp).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </React.Fragment>
              );
            }
            return null;
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default Logger; 