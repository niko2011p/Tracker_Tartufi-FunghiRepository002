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
  maximumAge: 5000 // Ridotto da 30000 a 5000 per aggiornamenti più frequenti
};

// Reuse icon creation functions from Map.tsx
const createGpsArrowIcon = (direction = 0) => {
  // Riduzione del 30% delle dimensioni dell'icona (da 32x32 a 22x22)
  return new DivIcon({
    html: `
      <div class="gps-arrow-wrapper navigation-gps-cursor" style="transform: rotate(${direction}deg);">
        <img src="/map-navigation-orange-icon.svg" width="22" height="22" alt="Navigation Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));" />
      </div>
    `,
    className: 'gps-arrow-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
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
      
      // Non utilizziamo più flyTo qui per evitare che la mappa si sposti automaticamente
      // quando l'utente sta esplorando manualmente la mappa
      // map.flyTo(newPosition, MAX_ZOOM, { animate: true, duration: 1 });
      
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
      // Configurazione ottimizzata per l'acquisizione iniziale
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // Avvia il monitoraggio continuo della posizione con configurazione ottimizzata
    const watchOptions = {
      enableHighAccuracy: true,
      timeout: 2000,
      maximumAge: 0 // Impostato a 0 per ottenere sempre dati freschi
    };
    
    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      (error) => {
        console.warn('Geolocation watch error:', error.message);
        setIsAcquiringGps(false);
      },
      watchOptions
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [map, updateCurrentPosition]); // Rimosso currentTrack per evitare reset del watchPosition

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
    
    // Utilizziamo sempre la geolocalizzazione per ottenere la posizione GPS reale
    // invece di usare l'ultima coordinata del track, per garantire che la mappa
    // sia sempre centrata sulla posizione GPS reale dell'utente
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Utilizziamo flyTo per un'animazione più fluida
        map.flyTo([latitude, longitude], targetZoom, { animate: true, duration: 1 });
        console.log(`Mappa centrata sulla posizione GPS reale: [${latitude}, ${longitude}]`);
        
        // Forza l'aggiornamento della posizione nello store per garantire che il marker sia sincronizzato
        const newPosition: [number, number] = [latitude, longitude];
        const { updateCurrentPosition } = useTrackStore.getState();
        updateCurrentPosition(newPosition);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        // Se non riusciamo a ottenere la posizione GPS reale, utilizziamo l'ultima coordinata del track
        if (currentTrack?.coordinates.length) {
          const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
          map.flyTo(lastPosition, targetZoom, { animate: true, duration: 1 });
          console.log(`Mappa centrata sull'ultima posizione tracciata: [${lastPosition[0]}, ${lastPosition[1]}]`);
        } else {
          // Se non abbiamo neanche una coordinata del track, utilizziamo la posizione di default
          map.flyTo(DEFAULT_POSITION, targetZoom, { animate: true, duration: 1 });
          console.log(`Mappa centrata sulla posizione di default: [${DEFAULT_POSITION[0]}, ${DEFAULT_POSITION[1]}]`);
        }
      },
      // Configurazione ottimizzata per l'acquisizione della posizione
      { enableHighAccuracy: true, timeout: 1000, maximumAge: 0 }
    );
  };
  
  return (
    <div className="center-button-container" style={{ position: 'absolute', top: '480px', left: '10px', zIndex: 1001 }}>
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
    if (!currentTrack) return; // Uscita anticipata se non c'è una traccia attiva
    
    // Funzione per aggiornare i dati di tracking
    const updateTrackingData = () => {
      try {
        // Calcola la distanza totale - ottieni il valore più recente dallo store
        const distance = currentTrack.distance;
        
        // Calcola la durata del tracciamento con il timestamp corrente
        const startTime = currentTrack.startTime;
        const currentTime = new Date();
        const durationMs = currentTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);
        
        // Formatta la durata nel formato HH:mm
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // Calcola la velocità media (km/h) in tempo reale
        const durationHours = durationMs / 3600000;
        const avgSpeed = durationHours > 0 ? distance / durationHours : 0;
        
        // Log per debug dell'aggiornamento in tempo reale
        console.debug(`[TrackingData] Aggiornamento: ${new Date().toISOString()} - Distanza: ${distance.toFixed(2)}km, Velocità: ${avgSpeed.toFixed(1)}km/h`);
        
        // Aggiorna i dati di tracking con valori calcolati, senza attendere la geolocalizzazione
        // Questo garantisce che almeno questi dati siano sempre aggiornati
        setTrackingData(prevData => ({
          ...prevData,
          distance,
          avgSpeed,
          duration: formattedDuration
        }));
        
        // Ottieni l'altitudine reale dal GPS con timeout ottimizzato
        if (navigator.geolocation) {
          const geoOptions = { 
            enableHighAccuracy: true, 
            timeout: 500, // Ridotto ulteriormente per aggiornamenti più frequenti
            maximumAge: 0 // Impostato a 0 per ottenere sempre dati freschi
          };
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              let newAltitude = 0;
              if (position.coords.altitude) {
                newAltitude = position.coords.altitude;
                console.debug(`[TrackingData] Altitudine GPS: ${newAltitude.toFixed(1)}m`);
              } else {
                // Fallback se l'altitudine non è disponibile
                newAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
                console.debug(`[TrackingData] Usando altitudine fallback: ${newAltitude}m`);
              }
              
              // Applica lo smoothing all'altitudine
              const smoothedAltitude = smoothAltitude(newAltitude, altitudeReadings);
              
              // Aggiorna solo l'altitudine, gli altri dati sono già stati aggiornati
              setTrackingData(prevData => ({
                ...prevData,
                altitude: smoothedAltitude
              }));
              
              // Aggiorna anche la posizione corrente per garantire che il marker GPS sia sempre aggiornato
              const newPosition: [number, number] = [position.coords.latitude, position.coords.longitude];
              setCurrentPosition(newPosition);
              updateCurrentPosition(newPosition);
              
              // Log per debug della posizione aggiornata
              console.debug(`[TrackingData] Posizione aggiornata: [${newPosition[0]}, ${newPosition[1]}]`);
            },
            (error) => {
              // Log dell'errore per debug
              console.debug(`[TrackingData] Errore GPS: ${error.message}`);
              
              // Fallback in caso di errore
              const fallbackAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
              const smoothedAltitude = smoothAltitude(fallbackAltitude, altitudeReadings);
              
              // Aggiorna solo l'altitudine con il valore di fallback
              setTrackingData(prevData => ({
                ...prevData,
                altitude: smoothedAltitude
              }));
            },
            geoOptions
          );
        } else {
          // Fallback se la geolocalizzazione non è supportata
          const fallbackAltitude = currentTrack.coordinates.length > 0 ? 500 : 0;
          const smoothedAltitude = smoothAltitude(fallbackAltitude, altitudeReadings);
          
          // Aggiorna solo l'altitudine
          setTrackingData(prevData => ({
            ...prevData,
            altitude: smoothedAltitude
          }));
        }
      } catch (err) {
        // Gestione degli errori per evitare crash dell'applicazione
        console.error('[TrackingData] Errore nell\'aggiornamento dei dati:', err);
        
        // Aggiorna comunque i dati con valori di fallback
        setTrackingData(prev => ({
          ...prev,
          distance: currentTrack.distance,
          duration: prev.duration
        }));
      }
    };
    
    // Aggiorna i dati immediatamente all'avvio
    updateTrackingData();
    
    // Aggiorna i dati ogni 250ms per aggiornamenti più frequenti e fluidi
    const timer = setInterval(updateTrackingData, 250);
    
    console.log('[TrackingData] Avviato timer di aggiornamento dati');
    
    return () => {
      clearInterval(timer);
      console.log('[TrackingData] Timer di aggiornamento dati fermato');
    };
  }, [currentTrack, smoothAltitude, updateCurrentPosition, altitudeReadings]); // Aggiungiamo altitudeReadings alle dipendenze
  
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
              <p className="tracking-data-value" data-testid="distance-value">{trackingData.distance.toFixed(2)} km</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpDown size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="speed-value">{trackingData.avgSpeed.toFixed(1)} km/h</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mountain size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="altitude-value">{trackingData.altitude} m</p>
            </div>
          </div>
          <div className="tracking-data-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} className="tracking-data-icon" />
              <p className="tracking-data-value" data-testid="duration-value">{trackingData.duration}</p>
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
        {/* Posiziono la bussola in alto a destra, spostata più in basso */}
        <div style={{ position: 'absolute', right: '10px', top: '10px', zIndex: 1001 }}>
          <CompassIndicator position="topRight" />
        </div>
        {/* Posiziono l'indicatore GPS al centro in alto */}
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001 }}>
          <GpsStatusIndicator accuracy={accuracy} isAcquiring={isAcquiringGps} />
        </div>
        
        {/* Display current position marker */}
        <Marker position={currentPosition} icon={gpsArrowIcon} />
        
        {/* Display track polyline - Percorso in tempo reale in arancione */}
        {currentTrack && (
          <>
            <Polyline
              positions={currentTrack.coordinates}
              color="#FF9800"
              weight={4}
              opacity={0.9}
              // Linea continua come richiesto
            />
            {/* Display findings markers */}
            {currentTrack.findings
              .filter(finding => !isLoadedFinding(finding))
              .map((finding) => {
                // Determina il tipo di icona in base al tipo di ritrovamento
                const findingType = finding.type === 'poi' ? 'Interesse' : 
                                   finding.type === 'Fungo' ? 'Fungo' : 'Tartufo';
                console.log(`Visualizzazione tag ritrovamento: ${finding.name}, tipo: ${finding.type}, coordinate: [${finding.coordinates[0]}, ${finding.coordinates[1]}]`);
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
                             finding.type === 'Fungo' ? 'Fungo' : 'Tartufo';
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
            console.log('Visualizzazione tag:', finding.type, finding.coordinates);
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
                  console.log('Interruzione traccia: salvataggio in corso...');
                  stopTrack();
                  setShowStopConfirm(false);
                  
                  // Aggiungiamo un breve ritardo per assicurarci che lo store venga aggiornato
                  setTimeout(() => {
                    console.log('Traccia salvata con successo, reindirizzamento...');
                    // Reindirizza alla pagina principale o alla pagina dello storico
                    window.location.href = '/';
                  }, 500);
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