import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { useTrackStore } from '../store/trackStore';
import { Square, MapPin, AlertCircle, Crosshair, Navigation, Clock, ArrowUpDown, Mountain, Route } from 'lucide-react';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import './UnifiedButtons.css';
import './TrackingDataPanel.css';
import { Finding } from '../types';
import FindingForm from './FindingForm';
import TagOptionsPopup from './TagOptionsPopup';
import GpsStatusIndicator from './GpsStatusIndicator';
import CompassIndicator from './CompassIndicator';

// Constants from Map.tsx
const MIN_ZOOM = 4;
const MAX_ZOOM = 15;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000
};

// Reuse icon creation functions from Map.tsx
const createGpsArrowIcon = (direction = 0) => {
  return new DivIcon({
    html: `
      <div class="gps-arrow-wrapper navigation-gps-cursor" style="transform: rotate(${direction}deg);">
        <img src="/map-navigation-orange-icon.svg" width="32" height="32" alt="Navigation Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));" />
      </div>
    `,
    className: 'gps-arrow-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

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
    // Punto di interesse
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

// Componente per aggiornare la posizione in tempo reale
function LocationUpdater({ onGpsUpdate, onPositionUpdate }: { 
  onGpsUpdate: (accuracy: number | null, isAcquiring: boolean) => void,
  onPositionUpdate: (position: [number, number], direction: number) => void
}) {
  const map = useMap();
  const { currentTrack, updateCurrentPosition } = useTrackStore();
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [direction, setDirection] = useState<number>(0);
  const lastPositionRef = useRef<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  
  // Effetto per aggiornare il componente principale con i dati GPS
  useEffect(() => {
    onGpsUpdate(accuracy, isAcquiringGps);
  }, [accuracy, isAcquiringGps, onGpsUpdate]);
  
  // Effetto per aggiornare il componente principale con la posizione e direzione
  useEffect(() => {
    onPositionUpdate(currentPosition, direction);
  }, [currentPosition, direction, onPositionUpdate]);
  
  // Calcola la direzione in gradi tra due punti
  const calculateDirection = (from: [number, number], to: [number, number]): number => {
    const deltaLat = to[0] - from[0];
    const deltaLng = to[1] - from[1];
    const angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
    return (angle + 360) % 360; // Normalizza a 0-360 gradi
  };
  
  // Effetto per richiedere e monitorare la posizione GPS
  useEffect(() => {
    // Funzione per aggiornare la posizione
    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy: posAccuracy, altitude } = position.coords;
      const newPosition: [number, number] = [latitude, longitude];
      
      // Aggiorna la posizione corrente nello store e localmente
      updateCurrentPosition(newPosition);
      setCurrentPosition(newPosition);
      setAccuracy(posAccuracy);
      setIsAcquiringGps(false);
      
      // Calcola la direzione se abbiamo una posizione precedente
      if (lastPositionRef.current) {
        const newDirection = calculateDirection(lastPositionRef.current, newPosition);
        setDirection(newDirection);
      }
      
      lastPositionRef.current = newPosition;
      
      // Aggiorna la posizione del marker sulla mappa e mantiene lo zoom a 15
      // Utilizziamo flyTo per un'animazione più fluida e garantire lo zoom corretto
      map.flyTo(newPosition, MAX_ZOOM, { animate: true, duration: 1 });
      
      console.log(`Posizione GPS aggiornata: [${latitude}, ${longitude}], accuratezza: ${posAccuracy}m, altitudine: ${altitude || 'N/D'}m`);
    };

    // Ottieni la posizione iniziale e imposta lo zoom massimo
    // Questo viene eseguito sempre, indipendentemente dallo stato di currentTrack
    setIsAcquiringGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position);
        // Forza l'impostazione dello zoom al massimo all'avvio
        map.setZoom(MAX_ZOOM);
        // Centra la mappa sulla posizione attuale
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], MAX_ZOOM, { animate: true });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setIsAcquiringGps(false);
      },
      GEOLOCATION_OPTIONS
    );

    // Avvia il monitoraggio continuo della posizione SEMPRE, non solo durante il tracciamento
    // Questo garantisce che l'indicatore GPS e i dati di tracciamento siano sempre aggiornati
    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      (error) => {
        console.warn('Geolocation watch error:', error.message);
        setIsAcquiringGps(false);
      },
      GEOLOCATION_OPTIONS
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [map, updateCurrentPosition]); // Rimosso currentTrack dalle dipendenze per aggiornare sempre

  // Effetto per assicurarsi che lo zoom sia sempre al massimo all'avvio
  useEffect(() => {
    if (map && currentTrack) {
      map.setZoom(MAX_ZOOM);
    }
  }, [map, currentTrack]);

  return null;
}

// Componente per il pulsante di centraggio
function CenterButton() {
  const map = useMap();
  const { currentTrack } = useTrackStore();
  
  const handleCenterClick = () => {
    // Impostiamo lo zoom massimo come richiesto
    const targetZoom = MAX_ZOOM;
    
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      map.setView(lastPosition, targetZoom, { animate: true });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], targetZoom, { animate: true });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          map.setView(DEFAULT_POSITION, targetZoom, { animate: true });
        },
        GEOLOCATION_OPTIONS
      );
    }
  };
  
  return (
    <div className="center-button-container" style={{ position: 'absolute', top: '180px', left: '10px', zIndex: 1001 }}>
      <button 
        className="center-button"
        onClick={handleCenterClick}
        aria-label="Centra mappa sulla posizione"
        style={{
          backgroundColor: 'white',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: 'none',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        <Crosshair size={20} />
      </button>
    </div>
  );
}

// Componente per l'indicatore di zoom
function ZoomControl() {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', updateZoom);
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  return (
    <div className="zoom-control">
      <button
        className={`zoom-button ${zoomLevel >= MAX_ZOOM ? 'disabled' : ''}`}
        onClick={() => map.zoomIn()}
        disabled={zoomLevel >= MAX_ZOOM}
        title={zoomLevel >= MAX_ZOOM ? 'Maximum zoom level reached' : ''}
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: zoomLevel >= MAX_ZOOM ? 'not-allowed' : 'pointer',
          opacity: zoomLevel >= MAX_ZOOM ? 0.5 : 1
        }}
      >
        +
      </button>
      <button
        className={`zoom-button ${zoomLevel <= MIN_ZOOM ? 'disabled' : ''}`}
        onClick={() => map.zoomOut()}
        disabled={zoomLevel <= MIN_ZOOM}
        title={zoomLevel <= MIN_ZOOM ? 'Minimum zoom level reached' : ''}
        style={{
          width: '30px',
          height: '30px',
          backgroundColor: 'white',
          border: 'none',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: zoomLevel <= MIN_ZOOM ? 'not-allowed' : 'pointer',
          opacity: zoomLevel <= MIN_ZOOM ? 0.5 : 1
        }}
      >
        -
      </button>
    </div>
  );
}

const NavigationPage: React.FC = () => {
  const { currentTrack, stopTrack, setShowFindingForm, showFindingForm, currentDirection: storeDirection, loadedFindings, updateCurrentPosition, gpsStatus } = useTrackStore();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [trackingData, setTrackingData] = useState({
    distance: 0,
    avgSpeed: 0,
    altitude: 0,
    duration: '00:00'
  });
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [currentDirection, setCurrentDirection] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  
  // Helper function to determine if a finding is from loaded findings
  const isLoadedFinding = (finding: Finding) => {
    return loadedFindings?.some(f => f.id === finding.id) ?? false;
  };

  // Aggiorna la posizione corrente quando cambiano le coordinate del tracciamento
  // o quando viene avviata una nuova traccia
  useEffect(() => {
    // Se abbiamo coordinate nella traccia corrente, utilizziamo l'ultima posizione
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      setCurrentPosition(lastPosition);
    } else if (currentTrack) {
      // Se abbiamo una traccia ma nessuna coordinata, otteniamo la posizione attuale
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition: [number, number] = [latitude, longitude];
          setCurrentPosition(newPosition);
          // Aggiorniamo anche la posizione nello store
          updateCurrentPosition(newPosition);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        GEOLOCATION_OPTIONS
      );
    }
  }, [currentTrack, updateCurrentPosition]);

  // Create the GPS arrow icon with the current direction
  // Utilizziamo la direzione locale invece di quella dallo store per garantire la sincronizzazione
  const gpsArrowIcon = createGpsArrowIcon(currentDirection);

  const mapRef = React.useRef(null);

  // Array per lo smoothing dell'altitudine
  const [altitudeReadings, setAltitudeReadings] = useState<number[]>([]);
  
  // Funzione per stabilizzare l'altitudine con media mobile
  const smoothAltitude = (newReading: number, readings: number[]): number => {
    const MAX_READINGS = 5; // Numero di letture da considerare per lo smoothing
    
    // Aggiungi la nuova lettura all'array
    const updatedReadings = [...readings, newReading].slice(-MAX_READINGS);
    setAltitudeReadings(updatedReadings);
    
    // Calcola la media delle letture disponibili
    const sum = updatedReadings.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / updatedReadings.length);
  };
  
  // Aggiorna i dati di tracking in tempo reale
  useEffect(() => {
    if (currentTrack) {
      // Calcola la distanza totale
      const distance = currentTrack.distance;
      
      // Calcola la durata del tracciamento
      const startTime = currentTrack.startTime;
      const currentTime = new Date();
      const durationMs = currentTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      
      // Formatta la durata nel formato HH:mm
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Calcola la velocità media (km/h)
      const durationHours = durationMs / 3600000;
      const avgSpeed = durationHours > 0 ? distance / durationHours : 0;
      
      // Ottieni l'altitudine reale dal GPS se disponibile
      // Altrimenti utilizza un valore predefinito
      let rawAltitude = 0;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.altitude) {
              rawAltitude = position.coords.altitude;
            } else {
              // Fallback se l'altitudine non è disponibile
              rawAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
            }
          },
          () => {
            // Fallback in caso di errore
            rawAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
      } else {
        // Fallback se la geolocalizzazione non è supportata
        rawAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
      }
      
      // Applica lo smoothing all'altitudine
      const smoothedAltitude = smoothAltitude(rawAltitude, altitudeReadings);
      
      setTrackingData({
        distance,
        avgSpeed,
        altitude: smoothedAltitude,
        duration: formattedDuration
      });
      
      // Aggiorna i dati ogni secondo
      const timer = setInterval(() => {
        const newCurrentTime = new Date();
        const newDurationMs = newCurrentTime.getTime() - startTime.getTime();
        const newDurationMinutes = Math.floor(newDurationMs / 60000);
        const newDurationHours = newDurationMs / 3600000;
        const newAvgSpeed = newDurationHours > 0 ? currentTrack.distance / newDurationHours : 0;
        
        // Formatta la durata nel formato HH:mm
        const hours = Math.floor(newDurationMinutes / 60);
        const minutes = newDurationMinutes % 60;
        const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // Ottieni l'altitudine reale dal GPS
        let newRawAltitude = 0;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.altitude) {
              newRawAltitude = position.coords.altitude;
            } else {
              // Fallback se l'altitudine non è disponibile
              newRawAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
            }
            const newSmoothedAltitude = smoothAltitude(newRawAltitude, altitudeReadings);
            
            // Aggiorna i dati di tracking con l'altitudine reale
            setTrackingData(prev => ({
              ...prev,
              distance: currentTrack.distance,
              avgSpeed: newAvgSpeed,
              altitude: newSmoothedAltitude,
              duration: formattedDuration
            }));
          },
          () => {
            // Fallback in caso di errore
            const fallbackAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
            const newSmoothedAltitude = smoothAltitude(fallbackAltitude, altitudeReadings);
            
            // Aggiorna i dati di tracking con l'altitudine di fallback
            setTrackingData(prev => ({
              ...prev,
              distance: currentTrack.distance,
              avgSpeed: newAvgSpeed,
              altitude: newSmoothedAltitude,
              duration: formattedDuration
            }));
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        );
        
        // L'aggiornamento dei dati di tracking viene gestito all'interno della callback di getCurrentPosition
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentTrack, altitudeReadings]);
  
  // Effetto per l'animazione iniziale della mappa e impostazione dello zoom
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      
      // Se abbiamo una traccia attiva con coordinate
      if (currentTrack && currentTrack.coordinates.length > 0) {
        const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
        // Utilizziamo flyTo per un'animazione più fluida e garantire lo zoom corretto
        map.flyTo(lastPosition, MAX_ZOOM, { animate: true, duration: 1 });
      } else {
        // Se non abbiamo coordinate nella traccia, otteniamo la posizione attuale
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // Utilizziamo flyTo per un'animazione più fluida e garantire lo zoom corretto
            map.flyTo([latitude, longitude], MAX_ZOOM, { animate: true, duration: 1 });
          },
          (error) => {
            console.warn('Geolocation error:', error.message);
            // In caso di errore, impostiamo comunque lo zoom massimo sulla posizione di default
            map.setZoom(MAX_ZOOM);
          },
          GEOLOCATION_OPTIONS
        );
      }
      
      // Forziamo l'impostazione dello zoom massimo in ogni caso
      setTimeout(() => {
        map.setZoom(MAX_ZOOM);
      }, 500);
    }
  }, [currentTrack]);
  
  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* Pannello informazioni di tracking con sfondo quasi trasparente */}
      <div className="tracking-data-panel">
        {/* Dati di tracciamento in formato verticale */}
        <div className="tracking-data-grid">
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Route size={18} className="tracking-data-icon" />
              <p className="tracking-data-value">{trackingData.distance.toFixed(2)} km</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={18} className="tracking-data-icon" />
              <p className="tracking-data-value">{trackingData.avgSpeed.toFixed(1)} km/h</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mountain size={18} className="tracking-data-icon" />
              <p className="tracking-data-value">{trackingData.altitude} m</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} className="tracking-data-icon" />
              <p className="tracking-data-value">{trackingData.duration}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Full screen map */}
      <MapContainer
        ref={mapRef}
        center={currentPosition}
        zoom={MAX_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        className="h-full w-full"
        attributionControl={false}
        zoomControl={false}
        dragging={true}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <LocationUpdater 
          onGpsUpdate={(acc, acquiring) => {
            setAccuracy(acc);
            setIsAcquiringGps(acquiring);
          }} 
          onPositionUpdate={(position, direction) => {
            setCurrentPosition(position);
            setCurrentDirection(direction);
            console.log(`Position updated in NavigationPage: [${position[0]}, ${position[1]}], direction: ${direction}°`);
          }}
        />
        <CenterButton />
        <ZoomControl />
        {/* Posiziono la bussola in alto a destra */}
        <div style={{ position: 'absolute', right: '10px', top: '160px', zIndex: 1001 }}>
          <CompassIndicator position="topRight" />
        </div>
        {/* Posiziono l'indicatore GPS al centro in alto */}
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001 }}>
          <GpsStatusIndicator accuracy={accuracy} isAcquiring={isAcquiringGps} />
        </div>
        
        {/* Display current position marker */}
        <Marker position={currentPosition} icon={gpsArrowIcon} />
        
        {/* Display track polyline */}
        {currentTrack && (
          <>
            <Polyline
              positions={currentTrack.coordinates}
              color="#FF9800"
              weight={3}
              opacity={0.8}
            />
            {/* Display findings markers */}
            {currentTrack.findings
              .filter(finding => !isLoadedFinding(finding))
              .map((finding) => {
                const findingType = finding.type === 'poi' ? 'Interesse' : 
                                   finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo';
                return (
                  <Marker
                    key={finding.id}
                    position={finding.coordinates}
                    icon={createFindingIcon(findingType)}
                  />
                );
              })}
          </>
        )}
        
        {/* Display loaded findings if any */}
        {loadedFindings?.map((finding) => {
          const findingType = finding.type === 'poi' ? 'Interesse' : 
                             finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo';
          return (
            <Marker
              key={`loaded-${finding.id}`}
              position={finding.coordinates}
              icon={createFindingIcon(findingType, true)}
            />
          );
        })}
        
        {/* Display tags added during navigation */}
        {currentTrack?.findings
          .filter(finding => finding.type === 'Fungo' || finding.type === 'Tartufo' || finding.type === 'poi')
          .map((finding) => {
            const findingType = finding.type === 'poi' ? 'Interesse' : 
                               finding.type === 'Fungo' ? 'Fungo' : 'Tartufo';
            return (
              <Marker
                key={`tag-${finding.id}`}
                position={finding.coordinates}
                icon={createFindingIcon(findingType)}
              />
            );
          })}
      </MapContainer>
      
      {/* Control buttons */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-between px-10 z-[10000]">
        {/* Tasto Stop - posizionato in basso a sinistra */}
        <button
          onClick={() => setShowStopConfirm(true)}
          className="unified-button stop"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.9)', /* Rosso */
            borderRadius: '12px', /* Quadrato con angoli arrotondati */
          }}
        >
          <Square className="w-6 h-6" />
          Stop
        </button>
        
        {/* Tasto Tag - posizionato in basso al centro */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setShowTagOptions(true)}
            className="unified-button tag"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.9)', /* Blu */
              borderRadius: '50%', /* Pulsante circolare */
            }}
          >
            <MapPin className="w-6 h-6" />
            Tag
          </button>
        </div>
      </div>
      
      {/* Mostra il form per aggiungere un ritrovamento quando richiesto */}
      {showFindingForm && <FindingForm onClose={() => setShowFindingForm(false)} />}
      
      {/* Popup opzioni Tag */}
      {showTagOptions && (
        <TagOptionsPopup 
          onClose={() => setShowTagOptions(false)}
          onCenterMap={() => {}}
        />
      )}
      
      {/* Popup di conferma per lo Stop */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Conferma interruzione</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Sei sicuro di voler interrompere la registrazione della traccia?
            </p>
            <p className="text-gray-600 mb-6">
              La traccia verrà salvata automaticamente nello storico.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  stopTrack();
                  setShowStopConfirm(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Salva Log e Interrompi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationPage;