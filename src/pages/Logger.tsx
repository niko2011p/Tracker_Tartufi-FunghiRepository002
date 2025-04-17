import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatDistance, formatDuration } from '../utils/formatUtils';
import { useNavigate } from 'react-router-dom';
import { useTrackStore } from '../store/trackStore';
import { Track, Finding } from '../types';
import { openDB } from 'idb';
import SearchBar from '../components/SearchBar';
import { Calendar, MapPin, Clock, ArrowRight, Map, Trash2, Tag, ChevronDown, ChevronRight, Leaf } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCalendarAlt, FaRuler, FaClock, FaLeaf } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Fix per le icone di Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ensureDate = (dateString: string | Date): Date => {
  return dateString instanceof Date ? dateString : new Date(dateString);
};

const formatDate = (dateString: string | Date): string => {
  const date = ensureDate(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Map view controller component
const MapViewController = ({ track, fitBounds = false }) => {
  const map = useMap();
  
  useEffect(() => {
    if (track && track.coordinates && track.coordinates.length > 0 && fitBounds) {
      const bounds = L.latLngBounds(track.coordinates.map(coord => [coord[0], coord[1]]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, track, fitBounds]);
  
  return null;
};

// Track item component for better organization
const TrackItem = ({ track, onSelect, isSelected, onDelete }: { track: Track, onSelect: () => void, isSelected: boolean, onDelete: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const distance = track.distance || 0;
  const duration = track.duration || 0;
  const findingsCount = track.findings?.length || 0;
  
  // Generate a track name if none exists
  const trackName = track.location || 
    `Track ${formatDate(track.startTime).split(' ')[0]}`;
    
  return (
    <div 
      className={`mb-3 rounded-lg overflow-hidden border ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'} transition-colors shadow-sm hover:shadow`}
    >
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer ${isSelected ? 'bg-green-50' : 'bg-white'} hover:bg-gray-50`}
        onClick={() => onSelect()}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-green-100 rounded-full">
            <Navigation className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 truncate">{trackName}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(track.startTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-medium text-green-600">{formatDistance(distance)}</span>
            {findingsCount > 0 && (
              <span className="text-xs text-gray-500">{findingsCount} {findingsCount === 1 ? 'finding' : 'findings'}</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          {track.findings && track.findings.length > 0 ? (
            <div className="mt-2">
              <h4 className="font-medium text-gray-700 mb-2">Ritrovamenti</h4>
              <div className="space-y-2">
                {track.findings.map((finding, index) => (
                  <div key={finding.id || index} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                    <div className={`p-1.5 rounded-full ${finding.type === 'Fungo' ? 'bg-green-100' : 'bg-amber-100'}`}>
                      {finding.type === 'Fungo' ? (
                        <Leaf className="w-4 h-4 text-green-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-800 truncate">{finding.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(finding.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-2">Nessun ritrovamento registrato.</p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-1.5 rounded flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Elimina traccia</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Logger: React.FC = () => {
  const navigate = useNavigate();
  const trackStore = useTrackStore();
  const { tracks, loadTracks, deleteTrack } = trackStore;
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'mushroom' | 'truffle'>('all');

  // Carica direttamente da IndexedDB al mount del componente
  useEffect(() => {
    async function loadTracksFromIndexedDB() {
      console.log('📋 Logger: caricamento tracce...');
      
      try {
        // 1. Prima verifica se abbiamo già tracce nello store
        if (tracks && tracks.length > 0) {
          console.log(`✅ Logger: ${tracks.length} tracce già presenti nello store`);
          
          // Converti le date da stringhe a oggetti Date
          const processedTracks = tracks.map(track => ({
            ...track,
            startTime: ensureDate(track.startTime),
            endTime: ensureDate(track.endTime),
            findings: Array.isArray(track.findings) 
              ? track.findings.map(finding => ({
                  ...finding,
                  timestamp: ensureDate(finding.timestamp)
                }))
              : []
          }));
          
          // Ordina le tracce per data di inizio (più recenti prime)
          const sorted = [...processedTracks].sort((a, b) => {
            const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
            return dateB - dateA;
          });
          
          setLocalTracks(sorted);
          setFilteredTracks(sorted);
          return;
        }
        
        // 2. Prova a caricare dallo store usando loadTracks
        console.log('🔄 Logger: nessuna traccia nello store, chiamata a loadTracks()...');
        await loadTracks();
        
        // 3. Verifica se abbiamo caricato con successo
        if (trackStore.tracks && trackStore.tracks.length > 0) {
          console.log(`✅ Logger: ${trackStore.tracks.length} tracce caricate tramite loadTracks`);
          
          // Converti le date da stringhe a oggetti Date
          const processedTracks = trackStore.tracks.map(track => ({
            ...track,
            startTime: ensureDate(track.startTime),
            endTime: ensureDate(track.endTime),
            findings: Array.isArray(track.findings) 
              ? track.findings.map(finding => ({
                  ...finding,
                  timestamp: ensureDate(finding.timestamp)
                }))
              : []
          }));
          
          // Ordina le tracce per data di inizio (più recenti prime)
          const sorted = [...processedTracks].sort((a, b) => {
            const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
            const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
            return dateB - dateA;
          });
          
          setLocalTracks(sorted);
          setFilteredTracks(sorted);
        } else {
          console.log('❌ Logger: nessuna traccia trovata in IndexedDB');
          setLocalTracks([]);
          setFilteredTracks([]);
        }
      } catch (error) {
        console.error('❌ Logger: errore nel caricamento delle tracce', error);
        setLocalTracks([]);
        setFilteredTracks([]);
      }
    }
    
    loadTracksFromIndexedDB();
  }, []);

  // Filtra le tracce quando cambia la query di ricerca
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(localTracks);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = localTracks.filter(track => {
      // Cerca nel nome della traccia
      if ((track.name || '').toLowerCase().includes(query)) return true;
      
      // Cerca nella data
      const dateStr = ensureDate(track.startTime)?.toLocaleDateString('it-IT') || '';
      if (dateStr.toLowerCase().includes(query)) return true;
      
      // Cerca nei findings
      if (track.findings && track.findings.length) {
        return track.findings.some(finding => 
          (finding.name || '').toLowerCase().includes(query) || 
          (finding.description || '').toLowerCase().includes(query) ||
          (finding.type || '').toLowerCase().includes(query)
        );
      }
      
      return false;
    });
    
    setFilteredTracks(filtered);
  }, [searchQuery, localTracks]);

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    navigate(`/track/${track.id}`);
  };

  const handleTrackDelete = async (trackId: string) => {
    try {
      await deleteTrack(trackId);
      setSelectedTrack(prev => prev?.id === trackId ? null : prev);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const selectedTrackData = useMemo(() => {
    return tracks.find(t => t.id === selectedTrack?.id);
  }, [tracks, selectedTrack]);

  const renderTrackStats = (track: any) => (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-2">{track.name || `Traccia del ${ensureDate(track.startTime)?.toLocaleDateString('it-IT')}`}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="font-semibold">Distanza:</span>
          <span className="ml-2">{formatDistance(track.distance || 0)}</span>
        </div>
        <div>
          <span className="font-semibold">Durata:</span>
          <span className="ml-2">{formatDuration(track.duration || 0)}</span>
        </div>
        <div>
          <span className="font-semibold">Velocità media:</span>
          <span className="ml-2">{track.avgSpeed ? track.avgSpeed.toFixed(1) : '0'} km/h</span>
        </div>
        <div>
          <span className="font-semibold">Altitudine:</span>
          <span className="ml-2">
            {track.minAltitude || 0} - {track.maxAltitude || 0} m
          </span>
        </div>
        {track.weather && (
          <>
            <div>
              <span className="font-semibold">Temperatura:</span>
              <span className="ml-2">{track.weather.temperature?.toFixed(1) || '-'}°C</span>
            </div>
            <div>
              <span className="font-semibold">Umidità:</span>
              <span className="ml-2">{track.weather.humidity?.toFixed(0) || '-'}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const filteredTracksByType = useMemo(() => {
    if (!tracks) return [];
    
    return tracks.filter(track => {
      // Type filter
      let matchesType = true;
      if (filterType === 'mushroom') {
        matchesType = track.findings?.some(f => f.type === 'Fungo') || false;
      } else if (filterType === 'truffle') {
        matchesType = track.findings?.some(f => f.type === 'Tartufo') || false;
      }
      
      return matchesType;
    });
  }, [tracks, filterType]);

  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento tracce...</p>
        </div>
      </div>
    );
  }

  const displayTracks = filteredTracks.length > 0 ? filteredTracks : filteredTracksByType;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Sidebar with tracks listing */}
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 overflow-y-auto border-r border-gray-200 bg-white">
        <h1 className="text-xl font-bold mb-4 text-gray-800">Le mie tracce</h1>
        
        <div className="mb-4">
          <SearchBar 
            placeholder="Cerca traccia..." 
            value={searchQuery} 
            onChange={setSearchQuery}
            onSearch={handleSearch}
            accentColor="green"
            showSearchButton
            className="mb-3"
          />
          
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterType === 'all' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tutti
            </button>
            <button 
              onClick={() => setFilterType('mushroom')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterType === 'mushroom' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Funghi
            </button>
            <button 
              onClick={() => setFilterType('truffle')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterType === 'truffle' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tartufi
            </button>
          </div>
        </div>
        
        {displayTracks.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-2">Nessuna traccia trovata</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-green-600 hover:text-green-700 text-sm flex items-center justify-center gap-1 mx-auto"
              >
                <X className="w-4 h-4" />
                <span>Cancella ricerca</span>
              </button>
            )}
          </div>
        ) : (
          <div className="pb-4">
            {displayTracks.map(track => (
              <TrackItem 
                key={track.id}
                track={track}
                isSelected={selectedTrack?.id === track.id}
                onSelect={() => handleTrackSelect(track)}
                onDelete={() => setShowDeleteConfirm(track.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Map view */}
      <div className="flex-1 relative">
        {!selectedTrack ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <div className="p-4 rounded-full bg-green-100 mb-4">
              <Navigation className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">Seleziona una traccia</h2>
            <p className="text-gray-500 text-center max-w-md">
              Seleziona una traccia dalla lista per visualizzarla sulla mappa
            </p>
          </div>
        ) : null}
        
        <MapContainer 
          center={[43.7696, 11.2558]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {selectedTrack && (
            <>
              <MapViewController track={selectedTrack} fitBounds={true} />
              
              {/* Render track path */}
              {selectedTrack.coordinates && selectedTrack.coordinates.length > 1 && (
                <polyline
                  positions={selectedTrack.coordinates.map(coord => [coord[0], coord[1]])}
                  color="#22c55e"
                  weight={4}
                  opacity={0.7}
                />
              )}
              
              {/* Render findings markers */}
              {selectedTrack.findings && selectedTrack.findings.map(finding => (
                <Marker
                  key={finding.id}
                  position={finding.coordinates}
                  icon={L.divIcon({
                    html: `<div class="flex items-center justify-center">
                      <div class="absolute w-12 h-12 bg-${finding.type === 'Fungo' ? 'green' : 'amber'}-100 rounded-full opacity-50 animate-ping"></div>
                      <div class="relative bg-white p-1 rounded-full shadow-md">
                        <div class="w-8 h-8 flex items-center justify-center bg-${finding.type === 'Fungo' ? 'green' : 'amber'}-100 rounded-full">
                          ${finding.type === 'Fungo' 
                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
                          }
                        </div>
                      </div>
                    </div>`,
                    className: 'custom-finding-marker',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                  })}
                >
                  <Popup>
                    <div className="min-w-[200px] p-2">
                      <h3 className={`font-bold text-${finding.type === 'Fungo' ? 'green' : 'amber'}-600 mb-1`}>{finding.name}</h3>
                      {finding.description && <p className="text-sm text-gray-600 mb-2">{finding.description}</p>}
                      {finding.photoUrl && (
                        <img 
                          src={finding.photoUrl} 
                          alt={finding.name} 
                          className="w-full h-auto rounded-md mb-2 max-h-[150px] object-cover"
                        />
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDate(finding.timestamp)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </>
          )}
        </MapContainer>
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Conferma eliminazione</h2>
            <p className="mb-6">Sei sicuro di voler eliminare questa traccia? Questa azione non può essere annullata.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button 
                onClick={() => showDeleteConfirm && handleTrackDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logger; 