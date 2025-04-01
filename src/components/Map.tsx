import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useTrackStore } from '../store/trackStore';
import { useMapStore } from '../store/mapStore';
import { DivIcon, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import './MapContainer.css';
import { Finding } from '../types';
import { MapPin, Crosshair, Globe } from 'lucide-react';
import { useGps } from '../services/GpsService';

// Fix Leaflet default icon path issues
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Stile per il contenitore della mappa con sfondo verde e copertura completa dell'area disponibile
const mapContainerStyle = {
  backgroundColor: '#8eaa36',
  height: 'calc(100vh - 60px)',
  width: '100%',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  margin: 0,
  padding: 0,
  zIndex: 0,
  overflow: 'hidden' // Impedisce lo scrolling indesiderato
};



const MIN_ZOOM = 4;
const MAX_ZOOM = 17; /* Updated max zoom level to 17 */
const INITIAL_ZOOM = 13;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 5000,
};

const TILE_LAYERS = {
  online: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '© OpenTopoMap contributors'
  },
  offline: {
    url: "/tiles/{z}/{x}/{y}.jpg",
    attribution: '© OpenTopoMap contributors (offline)'
  }
};

const createGpsArrowIcon = (direction = 0) => {
  return new DivIcon({
    html: `
      <div class="gps-arrow-wrapper" style="transform: rotate(${direction}deg);">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.3)" />
          </filter>
          <g filter="url(#shadow)">
            <!-- Triangolo 3D arancione con effetto di profondità -->
            <path d="M16 4 L28 24 L4 24 Z" fill="#FF8C00" />
            <path d="M16 4 L28 24 L16 24 Z" fill="#E67E00" />
            <path d="M16 4 L16 24 L4 24 Z" fill="#FF9D1F" />
            <!-- Bordo bianco per migliorare la visibilità -->
            <path d="M16 4 L28 24 L4 24 Z" stroke="white" stroke-width="1" fill="none" />
          </g>
        </svg>
      </div>
    `,
    className: 'gps-arrow-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Manteniamo l'icona walker originale per compatibilità
const walkerIcon = createGpsArrowIcon(0);

const createFindingIcon = (type: 'Fungo' | 'Tartufo' | 'Interesse', isLoaded: boolean = false) => {
  const opacity = isLoaded ? '0.5' : '1';
  if (type === 'Fungo') {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper fungo-finding">
          <img src="/mushroom-tag-icon.svg" width="24" height="24" alt="Fungo Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); opacity: ${opacity};" />
        </div>
      `,
      className: 'finding-icon fungo-finding',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  } else if (type === 'Tartufo') {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper tartufo-finding">
          <img src="/Truffle-tag-icon.svg" width="24" height="24" alt="Tartufo Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); opacity: ${opacity};" />
        </div>
      `,
      className: 'finding-icon tartufo-finding',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  } else {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper interesse-finding">
          <img src="/point-of-interest-tag-icon.svg" width="24" height="24" alt="Punto di Interesse Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); opacity: ${opacity};" />
        </div>
      `,
      className: 'finding-icon interesse-finding',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }
};

export default function MapDisplay() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const { currentTrack, isRecording } = useTrackStore();
  const { mapMode } = useMapStore();
  const [showModeSwitch, setShowModeSwitch] = useState(!isRecording);

  return (
    <div style={{...mapContainerStyle, height: 'calc(100vh - 60px)', overflow: 'hidden'}}>
      {showModeSwitch && !isRecording && (
        <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-md p-2 flex items-center gap-2">
          <Globe size={20} />
          <select 
            value={mapMode}
            onChange={(e) => useMapStore.getState().setMapMode(e.target.value as 'online' | 'offline' | 'green')}
            className="border-none bg-transparent outline-none"
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="green">Green</option>
          </select>
        </div>
      )}
      <MapContainer
        center={DEFAULT_POSITION}
        zoom={INITIAL_ZOOM}
        style={{ height: '100%', width: '100%', backgroundColor: mapMode === 'green' ? '#8eaa36' : 'white', overflow: 'hidden' }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        attributionControl={true}
        whenReady={() => setMapLoaded(true)}
        className="leaflet-container-no-scroll"
      >
        {mapMode !== 'green' && (
          <TileLayer
            url={mapMode === 'online' ? TILE_LAYERS.online.url : TILE_LAYERS.offline.url}
            attribution={mapMode === 'online' ? TILE_LAYERS.online.attribution : TILE_LAYERS.offline.attribution}
            maxZoom={MAX_ZOOM}
            minZoom={MIN_ZOOM}
          />
        )}
        <LocationTracker onGpsStatusChange={(accuracy, isAcquiring) => {
          // Handle GPS status changes
        }} />
        {mapLoaded && currentTrack?.coordinates && (
          <Polyline
            positions={currentTrack.coordinates}
            color="#8eaa36"
            weight={3}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
}

function LocationTracker({ onGpsStatusChange }: { onGpsStatusChange?: (accuracy: number | null, isAcquiring: boolean) => void }) {
  const map = useMap();
  const { currentTrack, isRecording, updateCurrentPosition } = useTrackStore();
  const lastGpsPosition = useRef<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentMarker, setCurrentMarker] = useState<Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const initializeMap = async () => {
      try {
        await map.whenReady();
        setIsInitialized(true);
        
        if (currentTrack?.coordinates?.length > 0) {
          const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
          map.setView(lastPosition, map.getZoom());
        }
      } catch (error) {
        console.error('Errore durante l\'inizializzazione della mappa:', error);
        setHasError(true);
      }
    };

    initializeMap();
  }, [map, currentTrack]);
  
  // Utilizzo dell'hook GPS per una gestione più robusta della geolocalizzazione
  const {
    position,
    error,
    isLoading: isAcquiringGps,
    isAvailable: isGpsAvailable,
    accuracy,
    requestPosition,
    startWatching,
    stopWatching
  } = useGps({
    onPositionChange: (pos) => {
      if (!pos) return;
      const newPosition: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      lastGpsPosition.current = newPosition;
      updateCurrentPosition(newPosition);
      
      if (isRecording) {
        map.setView(newPosition, map.getZoom());
      }
    },
    onUnavailable: () => {
      setHasError(true);
      console.error('GPS non disponibile');
      if (onGpsStatusChange) onGpsStatusChange(null, false);
    },
    maxRetries: 5,
    retryInterval: 1500,
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 5000
    },
    onSuccess: (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const newPosition: [number, number] = [latitude, longitude];
      
      // Reset del contatore dei tentativi di inizializzazione
      initializationAttempts.current = 0;
      setHasError(false);
      setIsInitialized(true);
      
      // Notifica il cambiamento dello stato GPS
      if (onGpsStatusChange) {
        onGpsStatusChange(accuracy, false);
      }
      
      if (!lastGpsPosition.current || 
          Math.abs(latitude - lastGpsPosition.current[0]) > 0.00001 || 
          Math.abs(longitude - lastGpsPosition.current[1]) > 0.00001) {
        try {
          // Verifichiamo che la mappa è inizializzata correttamente
          if (map && typeof map.getZoom === 'function') {
            // Aggiorniamo la posizione senza cambiare lo zoom e senza animazioni
            const currentZoom = map.getZoom();
            map.setView(newPosition, currentZoom, { animate: false });
            lastGpsPosition.current = newPosition;
            
            // Log per debug
            console.log(`Posizione GPS aggiornata: [${latitude}, ${longitude}], precisione: ${accuracy}m`);
          } else {
            console.warn('Mappa non inizializzata correttamente');
          }
        } catch (e) {
          console.error('Errore durante l\'aggiornamento della vista della mappa:', e);
        }
      }
      
      // Aggiorniamo sempre la posizione corrente per assicurarci che il marker sia aggiornato
      updateCurrentPosition(newPosition);
    },
    onError: (error) => {
      console.warn('Errore di geolocalizzazione:', error);
      setHasError(true);
      
      // Notifica l'errore GPS
      if (onGpsStatusChange) {
        onGpsStatusChange(null, false);
      }
      
      // Incrementa il contatore dei tentativi
      initializationAttempts.current += 1;
      
      // Se non abbiamo ancora una posizione dopo diversi tentativi, usa quella predefinita
      if (!lastGpsPosition.current && initializationAttempts.current >= maxInitAttempts) {
        console.warn('Utilizzo della posizione predefinita dopo il fallimento di tutti i tentativi');
        try {
          if (map && typeof map.panTo === 'function') {
            map.panTo(DEFAULT_POSITION);
            lastGpsPosition.current = DEFAULT_POSITION;
            updateCurrentPosition(DEFAULT_POSITION);
          }
        } catch (e) {
          console.error('Errore durante l\'impostazione della posizione predefinita:', e);
        }
      }
    }
  });

  useEffect(() => {
    if (!isRecording) {
      stopWatching();
      // Notifica che non stiamo più acquisendo il GPS
      if (onGpsStatusChange) {
        onGpsStatusChange(null, false);
      }
      return;
    }
    
    // Notifica che stiamo iniziando ad acquisire il GPS
    if (onGpsStatusChange) {
      onGpsStatusChange(null, true);
    }

    // Verifica se la mappa è inizializzata prima di procedere
    if (!map || typeof map.getZoom !== 'function') {
      console.error('Mappa non inizializzata correttamente');
      // Riprova dopo un breve ritardo
      setTimeout(() => {
        if (map && typeof map.getZoom === 'function') {
          console.log('Mappa inizializzata con successo dopo il ritardo');
        }
      }, 500);
    }

    // Quando inizia la registrazione, richiedi la posizione corrente senza modificare lo zoom
    requestPosition()
      .then(newPosition => {
        // Quando inizia la registrazione, centra la mappa sulla posizione dell'utente senza cambiare lo zoom
        // e senza animazioni che potrebbero causare l'effetto zoom out/in indesiderato
        const currentZoom = map.getZoom();
        map.setView(newPosition, currentZoom, { animate: false });
        
        // Aggiorna la posizione corrente
        lastGpsPosition.current = newPosition;
        updateCurrentPosition(newPosition);
        
        // Avvia il monitoraggio continuo della posizione
        startWatching();
      })
      .catch(error => {
        console.error('Errore durante l\'acquisizione della posizione iniziale:', error);
        
        // Anche in caso di errore, avvia il monitoraggio
        startWatching();
        
        // Se non abbiamo una posizione, usa quella predefinita
        if (!lastGpsPosition.current) {
          const currentZoom = map.getZoom();
          map.setView(DEFAULT_POSITION, currentZoom, { animate: true, duration: 0.3 });
          lastGpsPosition.current = DEFAULT_POSITION;
          updateCurrentPosition(DEFAULT_POSITION);
        }
      });
    
    return () => {
      stopWatching();
    };
  }, [isRecording, map, requestPosition, startWatching, stopWatching, updateCurrentPosition]);
  
  return null;
}

function MouseTracker() {
  const map = useMapEvents({
    mousemove: (e) => {
      const bounds = map.getBounds();
      if (bounds && !bounds.contains(e.latlng)) {
        map.panTo(e.latlng, { 
          animate: true,
          duration: 0.5,
          easeLinearity: 0.5
        });
      }
    }
  });
  return null;
}

function ZoomControl() {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());
  const { isRecording } = useTrackStore();

  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Non applichiamo alcun effetto di zoom automatico quando inizia la registrazione
  // per evitare l'effetto zoom out/in indesiderato

  return (
    <div className="zoom-control">
      <button
        className={`zoom-button ${zoomLevel >= MAX_ZOOM ? 'disabled' : ''}`}
        onClick={() => map.zoomIn()}
        disabled={zoomLevel >= MAX_ZOOM}
        title={zoomLevel >= MAX_ZOOM ? 'Maximum zoom level reached' : ''}
      >
        +
      </button>
      <button
        className={`zoom-button ${zoomLevel <= MIN_ZOOM ? 'disabled' : ''}`}
        onClick={() => map.zoomOut()}
        disabled={zoomLevel <= MIN_ZOOM}
        title={zoomLevel <= MIN_ZOOM ? 'Minimum zoom level reached' : ''}
      >
        -
      </button>
    </div>
  );
}

function TagButton() {
  const { setShowFindingForm } = useTrackStore();
  const { isRecording } = useTrackStore();
  
  if (!isRecording) return null;
  
  return (
    <div className="tag-button-container">
      <button 
        className="tag-button"
        onClick={() => setShowFindingForm(true)}
        aria-label="Aggiungi ritrovamento"
      >
        <MapPin />
        <span>Tag</span>
      </button>
    </div>
  );
}

function CenterButton() {
  const map = useMap();
  const { currentTrack } = useTrackStore();
  
  const handleCenterClick = () => {
    // Manteniamo lo zoom corrente per evitare l'effetto zoom out/in indesiderato
    const currentZoom = map.getZoom();
    
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      map.setView(lastPosition, currentZoom, { animate: false });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], currentZoom, { animate: false });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          map.setView(DEFAULT_POSITION, currentZoom, { animate: false });
        },
        GEOLOCATION_OPTIONS
      );
    }
  };
  
  return (
    <div className="center-gps-button">
      <button 
        onClick={handleCenterClick}
        aria-label="Centra mappa sulla posizione"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <Crosshair color="#f5a149" size={24} />
      </button>
    </div>
  );
}

interface MapViewContainerProps {
  gpsAccuracy: number | null;
  isAcquiringGps: boolean;
  gpsError: string | null;
  setGpsAccuracy: (accuracy: number | null) => void;
  setIsAcquiringGps: (isAcquiring: boolean) => void;
  setGpsError: (error: string | null) => void;
}

function MapViewContainer({
  gpsAccuracy,
  isAcquiringGps,
  gpsError,
  setGpsAccuracy,
  setIsAcquiringGps,
  setGpsError
}: MapViewProps) {
  const { isRecording, currentTrack, loadedFindings, currentDirection } = useTrackStore();
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_POSITION);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  const gpsArrowIcon = useMemo(() => createGpsArrowIcon(currentDirection), [currentDirection]);
  const mapRef = useRef<L.Map | null>(null);
  
  // Helper function to determine if a finding is from loaded findings
  const isLoadedFinding = (finding: Finding) => {
    return loadedFindings?.some(f => f.id === finding.id) ?? false;
  };
  
  // Applica stile a schermo intero quando il tracciamento è attivo o in pausa
  const mapContainerStyle = {
    height: '100%',
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  };
  
  // Inizializzazione della mappa e gestione degli errori
  useEffect(() => {
    // Funzione per verificare se la mappa è stata inizializzata correttamente
    const checkMapInitialization = () => {
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        console.log('Mappa inizializzata correttamente');
        setMapInitialized(true);
        return true;
      }
      return false;
    };

    // Verifica iniziale
    if (!checkMapInitialization()) {
      // Se la mappa non è inizializzata, riprova dopo un breve ritardo
      console.log('Tentativo di inizializzazione della mappa...');
      const initTimer = setTimeout(() => {
        if (!checkMapInitialization()) {
          console.warn('Problemi nell\'inizializzazione della mappa, ricarica forzata...');
          // Forza un aggiornamento delle dimensioni della finestra
          window.dispatchEvent(new Event('resize'));
        }
      }, 1000);
      
      return () => clearTimeout(initTimer);
    }
  }, []);
  
  // Applica la classe fullscreen quando il tracciamento è attivo o in pausa
  useEffect(() => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      if (isRecording) {
        mapContainer.classList.add('map-fullscreen');
        // Forza il ridisegno del container con un timeout più lungo
        mapContainer.style.display = 'none';
        setTimeout(() => {
          if (mapContainer) {
            mapContainer.style.display = 'block';
            // Forza un reflow del DOM
            void mapContainer.offsetHeight;
            // Forza un aggiornamento delle dimensioni della mappa
            window.dispatchEvent(new Event('resize'));
          }
        }, 100);
      } else {
        mapContainer.classList.remove('map-fullscreen');
      }
    }
  }, [isRecording]);

  return (
    <div style={mapContainerStyle}>
      {/* Rimuovo gli indicatori GPS come richiesto */}
      
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={mapContainerStyle}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map;
          console.log('Mappa creata con successo');
          
          // Richiedi immediatamente la posizione GPS all'avvio della mappa
          if ('geolocation' in navigator) {
            console.log('Richiesta posizione GPS iniziale...');
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`Posizione GPS iniziale acquisita: [${latitude}, ${longitude}]`);
                map.setView([latitude, longitude], mapZoom, { animate: false });
                setCurrentPosition([latitude, longitude]);
                setGpsAccuracy(position.coords.accuracy);
              },
              (error) => {
                console.warn('Errore nell\'acquisizione della posizione iniziale:', error.message);
                // Usa la posizione predefinita in caso di errore
                map.setView(DEFAULT_POSITION, mapZoom, { animate: false });
              },
              {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0 // Vogliamo una posizione fresca all'avvio
              }
            );
          } else {
            console.warn('Geolocalizzazione non supportata dal browser');
          }
        }}
      >
        <ZoomControl />
        <TagButton />
        <CenterButton />
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationTracker 
          onGpsStatusChange={(accuracy, isAcquiring) => {
            setGpsAccuracy(accuracy);
            setIsAcquiringGps(isAcquiring);
            if (!accuracy && !isAcquiring) {
              setGpsError('Impossibile ottenere la posizione GPS. Verifica che il GPS sia attivo e concedi i permessi di localizzazione.');
            } else {
              setGpsError(null);
            }
          }} 
        />
        <MouseTracker />
        {isRecording && <Marker position={currentPosition} icon={gpsArrowIcon} />}
        {currentTrack && (
          <>
            <Polyline
              positions={currentTrack.coordinates}
              color="#FF9800"
              weight={3}
              opacity={0.8}
            />
            {currentTrack.findings
              .filter(finding => !isLoadedFinding(finding))
              .map((finding) => (
                <Marker
                  key={finding.id}
                  position={finding.coordinates}
                  icon={createFindingIcon(
                    finding.type === 'poi' ? 'Interesse' : 
                    finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo'
                  )}
                />
              ))}
          </>
        )}
        {loadedFindings?.map((finding) => (
          <Marker
            key={`loaded-${finding.id}`}
            position={finding.coordinates}
            icon={createFindingIcon(
              finding.type === 'poi' ? 'Interesse' : 
              finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo',
              true
            )}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function MapRoot() {
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const { currentTrack, isRecording } = useTrackStore();

  const handleGpsStatusChange = useCallback((accuracy: number | null, isAcquiring: boolean) => {
    setGpsAccuracy(accuracy);
    setIsAcquiringGps(isAcquiring);
  }, []);

  return <MapViewContainer
    gpsAccuracy={gpsAccuracy}
    isAcquiringGps={isAcquiringGps}
    gpsError={gpsError}
    setGpsAccuracy={setGpsAccuracy}
    setIsAcquiringGps={setIsAcquiringGps}
    setGpsError={setGpsError}
  />;
}