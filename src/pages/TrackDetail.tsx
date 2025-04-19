import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTrackStore } from '../store/trackStore';
import { Finding, Track } from '../types';
import { 
  ArrowLeft, 
  Share2, 
  Download, 
  Clock, 
  Route, 
  ArrowUp, 
  ArrowDown, 
  Thermometer, 
  Droplets, 
  Wind, 
  Mountain,
  Map,
  Calendar,
  MapPin
} from 'lucide-react';
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
function MapBoundsHandler({ bounds, padding, maxZoom = 18 }: { bounds: L.LatLngBounds | null; padding: number[]; maxZoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      console.log('Bounds calcolati:', bounds.toBBoxString());
      try {
        map.fitBounds(bounds, {
          padding: padding,
          maxZoom: maxZoom,
          animate: true
        });
        console.log('Zoom applicato:', map.getZoom());
      } catch (e) {
        console.error('Errore nell\'applicare i bounds:', e);
      }
    }
  }, [bounds, map, padding, maxZoom]);
  
  return null;
}

// Componente per forzare il ridisegno della mappa
function MapInvalidator() {
  const map = useMap();
  
  useEffect(() => {
    console.log('MapInvalidator montato');
    setTimeout(() => {
      map.invalidateSize();
      console.log('Mappa invalidata da MapInvalidator');
    }, 300);
  }, [map]);
  
  return null;
}

// Componente per forzare aggiornamenti periodici della mappa
function MapPeriodicUpdater() {
  const map = useMap();
  const updateCountRef = useRef(0);
  
  useEffect(() => {
    console.log('MapPeriodicUpdater montato - modalità ridotta');
    
    // Funzione per forzare l'aggiornamento
    const forceUpdate = () => {
      updateCountRef.current += 1;
      // Disabilito i log frequenti
      if (updateCountRef.current % 10 === 0) {
        console.log(`🔄 Aggiornamento periodico mappa #${updateCountRef.current}`);
      }
      
      // Forza ridisegno
      map.invalidateSize({animate: false, pan: false});
    };
    
    // Avvia aggiornamento iniziale
    setTimeout(forceUpdate, 500);
    
    // Aggiornamenti periodici molto meno frequenti (da 2 secondi a 10 secondi)
    const intervalId = setInterval(forceUpdate, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [map]);
  
  return null;
}

// Componente per gestire gli errori di caricamento delle tile
function TileErrorHandler() {
  const map = useMap();

  useEffect(() => {
    const handleTileError = (ev: any) => {
      console.error('Errore caricamento tile:', ev.tile, ev.error);
    };

    map.on('tileerror', handleTileError);

    return () => {
      map.off('tileerror', handleTileError);
    };
  }, [map]);

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
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<{temp?: number, humidity?: number}>({});
  const [locationName, setLocationName] = useState<string>('');
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const mapInitializedRef = useRef<boolean>(false);
  
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

  // Funzione per controllare la validità delle coordinate e mostrarle nella console per debug
  const checkCoordinatesValidity = useCallback((track: Track | null) => {
    if (!track) {
      console.log('❌ Track non disponibile');
      return false;
    }
    
    console.log('🧐 Controllo coordinate della traccia:', track.id);
    console.log('📊 Oggetto track completo:', JSON.stringify(track, null, 2).substring(0, 500) + '...');
    
    // Controlla i possibili campi che potrebbero contenere coordinate
    let coordinateFieldsToCheck = ['coordinates', 'path', 'gpsData', 'positions', 'points'];
    let validCoordinates = null;
    
    for (const field of coordinateFieldsToCheck) {
      if (track[field] && Array.isArray(track[field]) && track[field].length > 0) {
        console.log(`✅ Trovate coordinate nel campo "${field}": ${track[field].length} punti`);
        
        // Verifica che sia un array di punti geografici
        const samplePoint = track[field][0];
        if (Array.isArray(samplePoint) && samplePoint.length >= 2 && 
            typeof samplePoint[0] === 'number' && typeof samplePoint[1] === 'number') {
          validCoordinates = track[field];
          // Aggiorna il campo coordinates per compatibilità con il resto del codice
          track.coordinates = validCoordinates;
          break;
        } else {
          console.log(`⚠️ Il campo "${field}" non contiene coordinate in formato valido`);
        }
      }
    }
    
    // Se non troviamo le coordinate nei campi standard, proviamo a recuperarle da campi annidati
    if (!validCoordinates) {
      // Controlliamo se c'è un campo location.coordinates
      if (track.location && Array.isArray(track.location.coordinates) && 
          track.location.coordinates.length === 2) {
        console.log('✅ Trovate coordinate in track.location.coordinates');
        // Crea un array di coordinate con un solo punto dalla location
        validCoordinates = [track.location.coordinates];
        track.coordinates = validCoordinates;
      } else if (track.rawData) {
        console.log('🔍 Cercando coordinate in track.rawData...');
        try {
          for (const field of coordinateFieldsToCheck) {
            if (track.rawData[field] && Array.isArray(track.rawData[field]) && track.rawData[field].length > 0) {
              console.log(`✅ Trovate coordinate in track.rawData.${field}`);
              track.coordinates = track.rawData[field];
              validCoordinates = track.coordinates;
              break;
            }
          }
          
          // Cerca anche in track.data se esiste
          if (!validCoordinates && track.data) {
            for (const field of coordinateFieldsToCheck) {
              if (track.data[field] && Array.isArray(track.data[field]) && track.data[field].length > 0) {
                console.log(`✅ Trovate coordinate in track.data.${field}`);
                track.coordinates = track.data[field];
                validCoordinates = track.coordinates;
                break;
              }
            }
          }
        } catch (error) {
          console.error('❌ Errore nell\'accesso ai campi annidati:', error);
        }
      }
    }
    
    // Se ancora non abbiamo coordinate valide, proviamo a recuperarle dai findings
    if (!validCoordinates && track.findings && Array.isArray(track.findings) && track.findings.length > 0) {
      console.log('🔍 Tentativo di recupero coordinate dai ritrovamenti...');
      try {
        const foundCoordinates = track.findings
          .filter(f => f.coordinates && Array.isArray(f.coordinates) && f.coordinates.length === 2)
          .map(f => f.coordinates);
        
        if (foundCoordinates.length > 0) {
          console.log(`✅ Recuperate ${foundCoordinates.length} coordinate dai ritrovamenti`);
          track.coordinates = foundCoordinates;
          validCoordinates = track.coordinates;
        }
      } catch (error) {
        console.error('❌ Errore nel recupero coordinate dai findings:', error);
      }
    }
    
    // Se abbiamo trovato coordinate valide in qualsiasi campo
    if (validCoordinates) {
      console.log('✅ Coordinate valide trovate:', 
        validCoordinates.length, 
        'punti. Primo punto:', 
        validCoordinates[0]);
      return true;
    }
    
    console.log('❌ Nessuna coordinata GPS valida trovata in alcun campo della traccia');
    return false;
  }, []);

  // Effetto per verificare le coordinate dopo il caricamento della traccia
  useEffect(() => {
    if (track) {
      const hasValidCoordinates = checkCoordinatesValidity(track);
      
      // Se necessario, si può tentare una normalizzazione
      if (!hasValidCoordinates && track.path) {
        console.log('🔄 Tentativo di recupero delle coordinate dal campo path');
        try {
          if (Array.isArray(track.path) && track.path.length > 0) {
            track.coordinates = track.path;
            checkCoordinatesValidity(track);
          }
        } catch (error) {
          console.error('❌ Errore durante la normalizzazione delle coordinate:', error);
        }
      }
    }
  }, [track, checkCoordinatesValidity]);

  // Calcola i bounds della traccia + findings
  useEffect(() => {
    if (track?.coordinates?.length) {
      try {
        console.log('🗺️ Calcolo bounds per', track.coordinates.length, 'coordinate');
        
        // Verifica se le coordinate sono nel formato corretto
        const validCoordinates = track.coordinates.filter(coord => 
          Array.isArray(coord) && coord.length === 2 && 
          !isNaN(coord[0]) && !isNaN(coord[1]) &&
          Math.abs(coord[0]) <= 90 && Math.abs(coord[1]) <= 180
        );
        
        if (validCoordinates.length === 0) {
          console.warn('⚠️ Nessuna coordinata valida trovata per calcolare i bounds');
          return;
        }
        
        console.log(`✅ Trovate ${validCoordinates.length} coordinate valide su ${track.coordinates.length}`);
        
        // Crea un array con tutte le coordinate: traccia + ritrovamenti
        const allPoints = [...validCoordinates];
        
        // Aggiungi le coordinate dei ritrovamenti
        if (track.findings && track.findings.length > 0) {
          track.findings.forEach((finding: Finding) => {
            if (finding.coordinates && finding.coordinates.length === 2 &&
                !isNaN(finding.coordinates[0]) && !isNaN(finding.coordinates[1])) {
              allPoints.push(finding.coordinates);
            }
          });
        }
        
        if (allPoints.length > 0) {
          const newBounds = L.latLngBounds(allPoints);
          console.log('📐 Bound box calcolato con', allPoints.length, 'punti:', newBounds.toBBoxString());
          setBounds(newBounds);
        }
        
        // Carica i dati meteo se abbiamo le coordinate
        if (validCoordinates.length > 0) {
          loadWeatherData(validCoordinates);
        }
      } catch (error) {
        console.error('❌ Errore nel calcolo dei bounds:', error);
      }
    }
  }, [track]);

  // Ottieni il nome della località dalla posizione media della traccia
  useEffect(() => {
    const fetchLocationName = async () => {
      // Se track ha già un nome di località in location.name, usalo direttamente
      if (track?.location?.name) {
        console.log('📍 Usando località dal campo track.location.name:', track.location.name);
        setLocationName(track.location.name);
        return;
      }
      
      if (track?.coordinates?.length) {
        try {
          // Verifica se ci sono coordinate valide
          const validCoordinates = track.coordinates.filter(coord => 
            Array.isArray(coord) && coord.length === 2 && 
            !isNaN(coord[0]) && !isNaN(coord[1]) &&
            Math.abs(coord[0]) <= 90 && Math.abs(coord[1]) <= 180
          );
          
          if (validCoordinates.length === 0) {
            console.warn('⚠️ Nessuna coordinata valida per ottenere il nome località');
            setLocationName('Posizione non disponibile');
            return;
          }
          
          // Calcola la posizione media della traccia
          const avgLat = validCoordinates.reduce((sum, coord) => sum + coord[0], 0) / validCoordinates.length;
          const avgLng = validCoordinates.reduce((sum, coord) => sum + coord[1], 0) / validCoordinates.length;
          
          console.log('🔍 Ottengo località per coordinate:', avgLat.toFixed(5), avgLng.toFixed(5));
          
          // Usa un timeout più lungo per Nominatim
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          try {
            const response = await fetch(
              `/.netlify/functions/geocode?lat=${avgLat}&lon=${avgLng}&zoom=14&addressdetails=1`,
              { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            
            const data = await response.json();
            console.log('📍 Risposta nominatim:', data);
            
            if (data.address) {
              const { hamlet, village, town, city, municipality, county, state } = data.address;
              const location = hamlet || village || town || city || municipality || county || state || 'Posizione sconosciuta';
              console.log('📍 Nome località trovato:', location);
              setLocationName(location);
            } else {
              setLocationName(`Lat: ${avgLat.toFixed(5)}, Lon: ${avgLng.toFixed(5)}`);
            }
          } catch (e) {
            clearTimeout(timeoutId);
            console.error('❌ Errore API Nominatim:', e);
            // Fallback: usa le coordinate formattate
            setLocationName(`Lat: ${avgLat.toFixed(5)}, Lon: ${avgLng.toFixed(5)}`);
          }
        } catch (error) {
          console.error('❌ Errore nel calcolo posizione media:', error);
          setLocationName('Posizione non disponibile');
        }
      } else if (track && track.findings && track.findings.length > 0) {
        // Fallback: usa le coordinate del primo ritrovamento per la località
        try {
          const firstFindingWithCoords = track.findings.find(f => 
            f.coordinates && Array.isArray(f.coordinates) && f.coordinates.length === 2);
            
          if (firstFindingWithCoords) {
            const [lat, lng] = firstFindingWithCoords.coordinates;
            console.log('🔍 Utilizzo coordinate del ritrovamento per località:', lat, lng);
            
            // Usa un timeout più lungo per Nominatim
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
              const response = await fetch(
                `/.netlify/functions/geocode?lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
                { signal: controller.signal }
              );
              clearTimeout(timeoutId);
              
              if (!response.ok) throw new Error(`Status: ${response.status}`);
              
              const data = await response.json();
              console.log('📍 Risposta nominatim:', data);
              
              if (data.address) {
                const { hamlet, village, town, city, municipality, county, state } = data.address;
                const location = hamlet || village || town || city || municipality || county || state || 'Posizione sconosciuta';
                console.log('📍 Nome località trovato:', location);
                setLocationName(location);
              } else {
                setLocationName(`Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`);
              }
            } catch (e) {
              clearTimeout(timeoutId);
              console.error('❌ Errore API Nominatim:', e);
              setLocationName(`Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`);
            }
          } else {
            setLocationName('Posizione non disponibile');
          }
        } catch (error) {
          console.error('❌ Errore nell\'usare ritrovamento per posizione:', error);
          setLocationName('Posizione non disponibile');
        }
      } else {
        setLocationName('Posizione non disponibile');
      }
    };
    
    fetchLocationName();
  }, [track]);

  // Debug delle dimensioni del contenitore e inizializzazione della mappa
  useEffect(() => {
    const container = mapContainerRef.current;
    
    if (container) {
      // Funzione per logare le dimensioni e verificare se il contenitore è pronto
      const checkContainerSize = () => {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        console.log(`Dimensioni contenitore mappa: ${width}x${height}px (circa ${Math.round((height / window.innerHeight) * 100)}vh)`);
        
        if (height > 0 && width > 0) {
          setIsMapReady(true);
          return true;
        }
        return false;
      };
      
      // Verifica iniziale e ritenta se necessario
      if (!checkContainerSize()) {
        // Se il contenitore non è ancora pronto, riprova dopo un breve ritardo
        const retryTimer = setTimeout(() => {
          if (checkContainerSize() && leafletMapRef.current) {
            // Forza il ridisegno della mappa
            leafletMapRef.current.invalidateSize();
            console.log('Mappa ridisegnata dopo retry');
          }
        }, 500);
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, []);

  // Gestore per il ridimensionamento della finestra
  useEffect(() => {
    const handleResize = () => {
      const container = mapContainerRef.current;
      if (container) {
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        console.log(`Dimensioni mappa dopo resize: ${width}x${height}px`);
        
        // Aggiorna la mappa dopo il ridimensionamento
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
          console.log('Mappa ridisegnata dopo resize');
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Riferimento alla mappa Leaflet
  const setMapRef = useCallback((mapInstance: L.Map) => {
    if (mapInstance && !mapInitializedRef.current) {
      leafletMapRef.current = mapInstance;
      mapInitializedRef.current = true;
      console.log('Riferimento mappa Leaflet acquisito');
      
      // Forza il ridisegno della mappa dopo che è stata inizializzata
      setTimeout(() => {
        mapInstance.invalidateSize();
        console.log('Inizializzazione mappa completata e ridisegnata');
        
        // Se abbiamo i bounds, assicuriamoci che siano visualizzati
        if (bounds && track?.coordinates?.length > 0) {
          try {
            mapInstance.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 18,
              animate: true
            });
            console.log('Bounds applicati manualmente:', bounds.toBBoxString());
          } catch (error) {
            console.error('Errore nell\'applicare i bounds:', error);
          }
        }
      }, 500);
    }
  }, [bounds, track]);

  // Funzione per caricare i dati meteo
  const loadWeatherData = async (coordinates: [number, number][]) => {
    try {
      setIsLoadingWeather(true);
      
      // Calcola la posizione media della traccia
      const avgLat = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
      const avgLng = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;
      
      // Carica i dati meteo attuali
      try {
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=97959559d86f4d3a975175711252303&q=${avgLat},${avgLng}&aqi=no`);
        const data = await response.json();
        if (data && data.current) {
          setCurrentWeather({
            temp: data.current.temp_c,
            humidity: data.current.humidity
          });
          console.log('Dati meteo correnti caricati:', data.current);
        }
      } catch (error) {
        console.error('Errore nel caricamento dei dati meteo correnti:', error);
      }
      
      // Carica anche i dati meteo storici (mock per ora)
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

    console.log('📊 Calcolo statistiche per traccia:', track.id);
    console.log('📊 Dati track disponibili:', JSON.stringify({
      coordinates: track.coordinates?.length || 0,
      findings: track.findings?.length || 0,
      distance: track.distance,
      avgSpeed: track.avgSpeed,
      avgAltitude: track.avgAltitude,
      startTime: track.startTime,
      endTime: track.endTime,
      duration: track.duration
    }));

    // Statistiche di base - usa track.duration se disponibile
    const duration = track.duration 
      ? Math.round(track.duration / 1000 / 60)  // converti da millisecondi a minuti
      : track.endTime 
        ? Math.round((new Date(track.endTime).getTime() - new Date(track.startTime).getTime()) / (1000 * 60))
        : 0;
    
    console.log('⏱️ Durata calcolata:', duration, 'minuti');
    
    // Calcola la distanza basata sulle coordinate se non è già definita
    let distance = 0;
    if (track.distance && track.distance > 0) {
      distance = track.distance;
      console.log('📏 Usando distanza predefinita:', distance);
    } else if (track.totalDistance && track.totalDistance > 0) {
      distance = track.totalDistance / 1000; // converti da metri a km
      console.log('📏 Usando distanza totale dal track:', distance);
    } else if (track.coordinates && track.coordinates.length > 1) {
      // Filtra le coordinate valide
      const validCoords = track.coordinates.filter(coord => 
        Array.isArray(coord) && coord.length === 2 && 
        !isNaN(coord[0]) && !isNaN(coord[1]));
        
      if (validCoords.length > 1) {
        // Calcola la distanza basata sulle coordinate
        for (let i = 1; i < validCoords.length; i++) {
          const [lat1, lon1] = validCoords[i-1];
          const [lat2, lon2] = validCoords[i];
          
          // Formula di Haversine per il calcolo della distanza
          const R = 6371; // Raggio della Terra in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance += R * c; // Distanza in km
        }
        console.log('📏 Distanza calcolata dalle coordinate:', distance);
        
        // Aggiorna il track con la distanza calcolata (solo in memoria locale)
        if (distance > 0) {
          track.distance = distance;
        }
      }
    } else if (track.findings && track.findings.length > 0) {
      // Calcolo approssimativo della distanza basato sui ritrovamenti
      try {
        const validFindings = track.findings.filter(f => 
          f.coordinates && Array.isArray(f.coordinates) && f.coordinates.length === 2);
          
        if (validFindings.length > 1) {
          console.log('📏 Stimando distanza dai ritrovamenti');
          // Calcola approssimativamente 100 metri tra un ritrovamento e l'altro
          distance = (validFindings.length - 1) * 0.1;
        } else if (validFindings.length === 1) {
          // Se c'è un solo ritrovamento, supponiamo una breve distanza intorno ad esso
          distance = 0.05; // 50 metri circa
        }
        
        // Aggiorna il track con la distanza stimata
        if (distance > 0) {
          track.distance = distance;
          console.log('📏 Distanza stimata dai ritrovamenti:', distance);
        }
      } catch (error) {
        console.error('❌ Errore nel calcolo della distanza dai ritrovamenti:', error);
      }
    }
    
    // Statistiche aggiuntive - usa track.avgSpeed se disponibile
    const avgSpeed = track.avgSpeed && track.avgSpeed > 0
      ? track.avgSpeed.toFixed(1)
      : distance > 0 && duration > 0 
        ? (distance / (duration / 60)).toFixed(1) 
        : '0';
    
    console.log('🚀 Velocità media calcolata:', avgSpeed, 'km/h');
    
    // Usa track.avgAltitude se disponibile
    let avgAltitude = track.avgAltitude || 0;
    if (!avgAltitude && track.coordinates && track.coordinates.length > 0) {
      // Se le coordinate hanno anche l'altitudine (punto 3D)
      const altitudes = track.coordinates
        .filter(point => Array.isArray(point) && point.length >= 3 && !isNaN(point[2]))
        .map(point => point[2]);
      
      if (altitudes.length > 0) {
        avgAltitude = altitudes.reduce((sum, alt) => sum + alt, 0) / altitudes.length;
        console.log('🏔️ Altitudine media calcolata da', altitudes.length, 'punti:', avgAltitude);
      } else {
        // Usa un valore predefinito se non c'è altitudine
        avgAltitude = 200; // Default
        console.log('⚠️ Nessun dato di altitudine disponibile, usando valore predefinito');
      }
    } else if (!avgAltitude && track.findings && track.findings.length > 0) {
      // Cerca dati di altitudine nei ritrovamenti
      const findingsWithAltitude = track.findings
        .filter(f => f.altitude && !isNaN(f.altitude));
        
      if (findingsWithAltitude.length > 0) {
        const totalAlt = findingsWithAltitude.reduce((sum, f) => sum + f.altitude, 0);
        avgAltitude = totalAlt / findingsWithAltitude.length;
        console.log('🏔️ Altitudine media stimata dai ritrovamenti:', avgAltitude);
      } else if (track.findings[0] && track.findings[0].coordinates) {
        // Usa un valore predefinito basato sulla località se non abbiamo dati reali
        avgAltitude = 400; // Valore tipico per molte zone in Italia
        console.log('⚠️ Usando valore predefinito per altitudine');
      }
    }
    
    // Usa i dati meteo reali se disponibili
    const weather = {
      temp: currentWeather.temp !== undefined ? currentWeather.temp : 15,
      humidity: currentWeather.humidity !== undefined ? currentWeather.humidity : 50
    };
    
    console.log('📊 Statistiche finali:', { 
      duration, 
      distance, 
      avgSpeed, 
      avgAltitude,
      weather 
    });
    
    return {
      duration,
      distance,
      avgSpeed,
      elevation: { avg: Math.round(avgAltitude) },
      weather,
      findings: track.findings?.length || 0
    };
  };

  // Formatta la data e l'ora della traccia
  const formatTrackDateTime = () => {
    if (!track?.startTime) return '';
    
    const date = new Date(track.startTime);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: it });
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
      <div className="flex flex-col border-b border-[#7d9830] bg-[#8eaa36] text-white">
        {/* Prima riga: pulsante indietro, titolo e icone azioni */}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate('/logger')}
            className="flex items-center gap-2 text-white hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
            <span>Indietro</span>
          </button>
          
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Map size={22} className="opacity-80" />
            {track.name}
          </h1>
          
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
        
        {/* Seconda riga: nome località, data, ora */}
        <div className="flex items-center justify-between px-4 pb-3 text-sm text-white/90">
          <div className="flex items-center gap-1.5">
            <MapPin size={16} className="opacity-80" />
            <span>{locationName || 'Caricamento posizione...'}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="opacity-80" />
            <span>{formatTrackDateTime()}</span>
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="relative h-[78vh] min-h-[400px] bg-gray-100 overflow-hidden">
        {isMapReady && track && (checkCoordinatesValidity(track) || (track.location && track.location.coordinates)) && (
          <MapContainer
            center={track.coordinates && track.coordinates.length > 0 
              ? [track.coordinates[0][0], track.coordinates[0][1]] 
              : track.location ? track.location.coordinates : [0, 0]}
            zoom={15}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            whenCreated={setMapRef}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              subdomains="abc"
              maxZoom={19}
              attribution="&copy; OpenStreetMap contributors"
            />
            
            <TileErrorHandler />
            <MapInvalidator />
            <MapPeriodicUpdater />
            
            {/* Traccia con stile tratteggiato */}
            {track.coordinates && track.coordinates.length > 1 && (
              <Polyline 
                positions={track.coordinates} 
                color="#f5a149"
                weight={4}
                opacity={0.8}
                dashArray="10, 10"  /* Questo rende la linea tratteggiata */
              />
            )}
            
            {/* Fallback: Se non ci sono coordinate multiple ma c'è una location, mostra un cerchio */}
            {(!track.coordinates || track.coordinates.length <= 1) && track.location && track.location.coordinates && (
              <Polyline 
                positions={[track.location.coordinates, track.location.coordinates]} 
                color="#f5a149"
                weight={4}
                opacity={0.8}
              />
            )}
            
            {/* Marcador de inicio (bandera verde) */}
            {track.startMarker && track.startMarker.coordinates && (
              <Marker
                position={track.startMarker.coordinates}
                icon={L.divIcon({
                  html: `
                    <div class="marker-flag" style="
                      width: 60px;
                      height: 60px;
                      position: relative;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      z-index: 3000 !important;
                    ">
                      <div class="pulse-ring" style="
                        position: absolute;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background-color: rgba(76, 175, 80, 0.4);
                        animation: pulse 2s infinite;
                        z-index: 2999;
                      "></div>
                      <img src="/assets/icons/Start_Track_icon.svg" style="
                        width: 48px;
                        height: 48px;
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                        z-index: 3000;
                      " />
                    </div>
                  `,
                  className: 'start-flag-icon',
                  iconSize: [60, 60],
                  iconAnchor: [30, 60],
                  popupAnchor: [0, -60]
                })}
                zIndexOffset={3000}
              >
                <Popup>
                  <div>
                    <strong>Punto de inicio</strong>
                    <p>Hora: {track.startMarker.timestamp ? new Date(track.startMarker.timestamp).toLocaleTimeString() : new Date(track.actualStartTime || track.startTime).toLocaleTimeString()}</p>
                    <p>Precisión: {track.startMarker.accuracy.toFixed(1)}m</p>
                    <p>Lat: {track.startMarker.coordinates[0].toFixed(6)}</p>
                    <p>Lon: {track.startMarker.coordinates[1].toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Marcador de fin (bandera naranja) */}
            {track.endMarker && track.endMarker.coordinates && (
              <Marker
                position={track.endMarker.coordinates}
                icon={L.divIcon({
                  html: `
                    <div class="marker-flag" style="
                      width: 60px;
                      height: 60px;
                      position: relative;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      z-index: 3000 !important;
                    ">
                      <div class="pulse-ring" style="
                        position: absolute;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background-color: rgba(255, 152, 0, 0.4);
                        animation: pulse 2s infinite;
                        z-index: 2999;
                      "></div>
                      <img src="/assets/icons/End_Track_icon.svg" style="
                        width: 48px;
                        height: 48px;
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                        z-index: 3000;
                      " />
                    </div>
                  `,
                  className: 'end-flag-icon',
                  iconSize: [60, 60],
                  iconAnchor: [30, 60], 
                  popupAnchor: [0, -60]
                })}
                zIndexOffset={3000}
              >
                <Popup>
                  <div>
                    <strong>Punto final</strong>
                    <p>Hora: {track.endMarker.timestamp ? new Date(track.endMarker.timestamp).toLocaleTimeString() : new Date(track.actualEndTime || track.endTime).toLocaleTimeString()}</p>
                    <p>Precisión: {track.endMarker.accuracy.toFixed(1)}m</p>
                    <p>Lat: {track.endMarker.coordinates[0].toFixed(6)}</p>
                    <p>Lon: {track.endMarker.coordinates[1].toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
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
            {bounds && <MapBoundsHandler bounds={bounds} padding={[50, 50]} maxZoom={18} />}
          </MapContainer>
        )}
        
        {/* Mostra messaggio informativo se non ci sono coordinate */}
        {isMapReady && track && !checkCoordinatesValidity(track) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center p-4">
              <div className="text-gray-600 mb-2">⚠️ Questa traccia non contiene coordinate GPS valide</div>
              <p className="text-gray-500 text-sm">Formato coordinate non supportato</p>
            </div>
          </div>
        )}
        
        {/* Messaggio di caricamento */}
        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-[#8eaa36] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-600">Caricamento mappa...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Statistiche del percorso */}
      {trackStats && (
        <div className="px-4 py-6 bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Statistiche del percorso</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-amber-400 mb-2">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-medium">Durata</span>
              </div>
              <div className="text-xl font-bold">
                {Math.floor(trackStats.duration / 60)}h {trackStats.duration % 60}m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-emerald-400 mb-2">
                <Route className="w-5 h-5 mr-2" />
                <span className="font-medium">Distanza</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.distance.toFixed(2)} km
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-indigo-400 mb-2">
                <Wind className="w-5 h-5 mr-2" />
                <span className="font-medium">Velocità media</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.avgSpeed} km/h
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-purple-400 mb-2">
                <Mountain className="w-5 h-5 mr-2" />
                <span className="font-medium">Altitudine media</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.elevation.avg} m
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-orange-400 mb-2">
                <Thermometer className="w-5 h-5 mr-2" />
                <span className="font-medium">Temperatura</span>
              </div>
              <div className="text-xl font-bold">
                {trackStats.weather.temp}°C
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center text-blue-400 mb-2">
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