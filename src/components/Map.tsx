import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useTrackStore } from '../store/trackStore';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import { Finding } from '../types';
import { MapPin, Crosshair } from 'lucide-react';

// Stile per il contenitore della mappa con sfondo verde e copertura completa dell'area disponibile
const mapContainerStyle = {
  backgroundColor: '#8eaa36',
  height: '100vh',
  width: '100vw',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  margin: 0,
  padding: 0
};

const useMapStyle = () => {
  const { isPaused } = useTrackStore();
  useEffect(() => {
    const mapContainer = document.querySelector('.leaflet-container');
    const zoomControl = document.querySelector('.zoom-control');
    const tagButton = document.querySelector('.tag-button-container');
    const centerButton = document.querySelector('.center-button-container');
    
    if (mapContainer) {
      if (isPaused) {
        mapContainer.classList.add('map-paused');
        // Hide controls when paused
        if (zoomControl) zoomControl.classList.add('hidden');
        if (tagButton) tagButton.classList.add('hidden');
        if (centerButton) centerButton.classList.add('hidden');
      } else {
        mapContainer.classList.remove('map-paused');
        // Show controls when not paused
        if (zoomControl) zoomControl.classList.remove('hidden');
        if (tagButton) tagButton.classList.remove('hidden');
        if (centerButton) centerButton.classList.remove('hidden');
      }
    }
  }, [isPaused]);
};

const MIN_ZOOM = 4;
const MAX_ZOOM = 15; /* Updated max zoom level to 15 */
const INITIAL_ZOOM = 13;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000
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
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 20C8 16 12 14 16 14C20 14 24 16 24 20C24 24 20 26 16 26C12 26 8 24 8 20Z" fill="#FF0000" stroke="#FF0000" strokeWidth="2" opacity="${opacity}"/>
            <path d="M10 14C10 10 12 6 16 6C20 6 22 10 22 14C22 16 20 18 16 18C12 18 10 16 10 14Z" fill="#FF0000" stroke="#FF0000" strokeWidth="2" opacity="${opacity}"/>
            <circle cx="16" cy="16" r="8" fill="rgba(255,0,0,0.2)" opacity="${opacity}"/>
          </svg>
        </div>
      `,
      className: 'finding-icon fungo-finding',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  } else if (type === 'Tartufo') {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper tartufo-finding">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 16Q28 24 16 28Q4 24 4 16L16 4Z" fill="#000000" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="${opacity}"/>
            <circle cx="16" cy="16" r="6" fill="rgba(0,0,0,0.2)" opacity="${opacity}"/>
          </svg>
        </div>
      `,
      className: 'finding-icon tartufo-finding',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  } else {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper interesse-finding">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 16L16 28L4 16L16 4Z" fill="#8eaa36" stroke="white" strokeWidth="2" strokeLinejoin="round" opacity="${opacity}"/>
            <circle cx="16" cy="16" r="6" fill="rgba(142,170,54,0.2)" opacity="${opacity}"/>
          </svg>
        </div>
      `,
      className: 'finding-icon interesse-finding',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }
};

function LocationTracker() {
  const map = useMap();
  const { currentTrack, isRecording, updateCurrentPosition } = useTrackStore();
  const lastGpsPosition = useRef<[number, number] | null>(null);
  const retryCount = useRef(0);
  const watchId = useRef<number | null>(null);
  const MAX_RETRIES = 3;
  
  const updateLocation = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    const newPosition: [number, number] = [latitude, longitude];
    
    retryCount.current = 0;
    
    if (!lastGpsPosition.current || 
        Math.abs(latitude - lastGpsPosition.current[0]) > 0.00001 || 
        Math.abs(longitude - lastGpsPosition.current[1]) > 0.00001) {
      // Center the map on the user's position with animation
      map.setView(newPosition, MAX_ZOOM, { animate: true, duration: 0.5 });
      lastGpsPosition.current = newPosition;
    }
    
    updateCurrentPosition(newPosition);
  }, [map, updateCurrentPosition]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.warn('Geolocation error:', error.message);
    
    if (retryCount.current < MAX_RETRIES) {
      const options = {
        enableHighAccuracy: retryCount.current < 1,
        timeout: (retryCount.current + 1) * 10000,
        maximumAge: (retryCount.current + 1) * 10000
      };
      
      retryCount.current += 1;
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        options
      );
    } else if (!lastGpsPosition.current) {
      console.warn('Using default position after all retries failed');
      map.panTo(DEFAULT_POSITION);
      lastGpsPosition.current = DEFAULT_POSITION;
    }
  }, [map, updateLocation]);

  useEffect(() => {
    if (!isRecording) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    const startWatching = () => {
      watchId.current = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        GEOLOCATION_OPTIONS
      );
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // When starting recording, ensure we center the map on user's position with proper zoom
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], MAX_ZOOM, { animate: true });
        updateLocation(position);
        startWatching();
      },
      (error) => {
        handleError(error);
        startWatching();
      },
      {
        ...GEOLOCATION_OPTIONS,
        timeout: 30000
      }
    );
    
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [isRecording, updateLocation, handleError, map]);
  
  return null;
}

function MouseTracker() {
  const map = useMapEvents({
    mousemove: (e) => {
      if (!map.getBounds().contains(e.latlng)) {
        map.panTo(e.latlng, { 
          animate: true,
          duration: 0.5,
          easeLinearity: 0.5
        });
      }
    },
    zoom: () => {
      const currentZoom = map.getZoom();
      if (currentZoom > MAX_ZOOM) {
        map.setZoom(MAX_ZOOM);
      } else if (currentZoom < MIN_ZOOM) {
        map.setZoom(MIN_ZOOM);
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

  // Set zoom to 15 when recording starts
  useEffect(() => {
    if (isRecording && map.getZoom() < MAX_ZOOM) {
      map.setZoom(MAX_ZOOM);
    }
  }, [isRecording, map]);

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
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      map.setView(lastPosition, MAX_ZOOM, { animate: true });
    } else if (type === 'Tartufo') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], MAX_ZOOM, { animate: true });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          map.setView(DEFAULT_POSITION, MAX_ZOOM, { animate: true });
        },
        GEOLOCATION_OPTIONS
      );
    }
  };
  
  return (
    <div className="center-button-container">
      <button 
        className="center-button"
        onClick={handleCenterClick}
        aria-label="Centra mappa sulla posizione"
      >
        <Crosshair />
      </button>
    </div>
  );
}

function MapView() {
  const { isRecording, currentTrack, loadedFindings, currentDirection } = useTrackStore();
  const [mapZoom, setMapZoom] = useState(INITIAL_ZOOM);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_POSITION);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
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
  
  // Applica la classe fullscreen quando il tracciamento è attivo o in pausa
  useEffect(() => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      if (isRecording || currentTrack?.isPaused) {
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
  }, [isRecording, currentTrack?.isPaused]);

  return (
    <div style={mapContainerStyle}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={mapContainerStyle}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <ZoomControl />
        <TagButton />
        <CenterButton />
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationTracker />
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

export default function Map() {
  const { currentTrack, isRecording, loadedFindings, currentDirection } = useTrackStore();
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const positionUpdateRequested = useRef(false);
  const gpsArrowIcon = useMemo(() => createGpsArrowIcon(currentDirection), [currentDirection]);

  useEffect(() => {
    if (isRecording && !positionUpdateRequested.current) {
      positionUpdateRequested.current = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition([position.coords.latitude, position.coords.longitude]);
          positionUpdateRequested.current = false;
        },
        () => {
          setCurrentPosition(DEFAULT_POSITION);
          positionUpdateRequested.current = false;
        },
        GEOLOCATION_OPTIONS
      );
    }
  }, [isRecording]);

  useEffect(() => {
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      setCurrentPosition(lastPosition);
    }
  }, [currentTrack?.coordinates]);

  // Helper function to determine if a finding is from loaded findings
  const isLoadedFinding = (finding: Finding) => {
    return loadedFindings?.some(f => f.id === finding.id) ?? false;
  };

  // Applica la classe fullscreen quando il tracciamento è attivo o in pausa
  useEffect(() => {
    const mapContainer = document.querySelector('.leaflet-container');
    if (mapContainer) {
      if (isRecording || currentTrack?.isPaused) {
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
  }, [isRecording, currentTrack?.isPaused]);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-10">
      <MapContainer
        center={currentPosition}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        className="h-full w-full fixed top-0 left-0"
        attributionControl={false}
        zoomControl={false}
      >
        <ZoomControl />
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationTracker />
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
                  icon={createFindingIcon(finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo')}
                />
              ))}
          </>
        )}
        {loadedFindings?.map((finding) => (
          <Marker
            key={`loaded-${finding.id}`}
            position={finding.coordinates}
            icon={createFindingIcon(
              finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo',
              true
            )}
          />
        ))}
      </MapContainer>
    </div>
  );
}