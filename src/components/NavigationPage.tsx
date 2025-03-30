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

const createFindingIcon = (type: 'Fungo' | 'Tartufo' | 'Interesse', isLoaded: boolean = false) => {
  const opacity = isLoaded ? '0.5' : '1';
  const pulseAnimation = isLoaded ? '' : 'animate-pulse';
  
  if (type === 'Fungo') {
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper fungo-finding ${pulseAnimation}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#DC2626" stroke="white" stroke-width="2" opacity="${opacity}"/>
            <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.3)" opacity="${opacity}"/>
          </svg>
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
        <div class="finding-icon-wrapper tartufo-finding ${pulseAnimation}">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
            <path d="
              M16 4
              L28 16
              Q28 24 16 28
              Q4 24 4 16
              L16 4
              Z
            " 
            fill="#1c1917" 
            opacity="${opacity}"
            stroke="white" 
            stroke-width="2"
            stroke-linejoin="round"
            />
            <circle cx="16" cy="16" r="6" fill="rgba(255,255,255,0.2)" opacity="${opacity}"/>
          </svg>
        </div>
      `,
      className: 'finding-icon tartufo-finding',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  } else {
    // Punto di interesse
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper interesse-finding ${pulseAnimation}">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 16L16 28L4 16L16 4Z" fill="#8eaa36" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="${opacity}"/>
            <circle cx="16" cy="16" r="6" fill="rgba(255,255,255,0.2)" opacity="${opacity}"/>
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

// Componente per aggiornare la posizione in tempo reale
function LocationUpdater() {
  const map = useMap();
  const { currentTrack, updateCurrentPosition } = useTrackStore();
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  
  // Effetto per aggiornare la posizione corrente quando cambiano le coordinate del tracciamento
  useEffect(() => {
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      setCurrentPosition(lastPosition);
    }
  }, [currentTrack]);
  
  // Effetto per richiedere la posizione GPS all'avvio
  useEffect(() => {
    if (currentTrack) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition: [number, number] = [latitude, longitude];
          
          // Aggiorna la posizione corrente nello store
          updateCurrentPosition(newPosition);
          
          // Aggiorna la posizione locale
          setCurrentPosition(newPosition);
          
          // Centra la mappa sulla posizione corrente
          const currentZoom = map.getZoom();
          map.setView(newPosition, currentZoom, { animate: false });
          
          console.log(`Posizione GPS aggiornata: [${latitude}, ${longitude}]`);
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        GEOLOCATION_OPTIONS
      );
      
      // Avvia il monitoraggio continuo della posizione
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition: [number, number] = [latitude, longitude];
          
          // Aggiorna la posizione corrente nello store
          updateCurrentPosition(newPosition);
          
          // Aggiorna la posizione locale
          setCurrentPosition(newPosition);
          
          console.log(`Posizione GPS monitorata: [${latitude}, ${longitude}]`);
        },
        (error) => {
          console.warn('Geolocation watch error:', error.message);
        },
        GEOLOCATION_OPTIONS
      );
      
      return () => {
        // Pulisci il monitoraggio quando il componente viene smontato
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [currentTrack, map, updateCurrentPosition]);
  
  return null;
}

// Componente per il pulsante di centraggio
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
    <div className="center-button-container" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1001 }}>
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
          cursor: 'pointer'
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
    <div className="zoom-control" style={{
      position: 'absolute',
      bottom: '140px', // Aumentato per evitare sovrapposizioni con il pulsante di centraggio
      left: '10px', // Spostato a sinistra invece che a destra
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '5px'
    }}>
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
  const { currentTrack, stopTrack, setShowFindingForm, showFindingForm, currentDirection, loadedFindings, updateCurrentPosition } = useTrackStore();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [trackingData, setTrackingData] = useState({
    distance: 0,
    avgSpeed: 0,
    altitude: 0,
    duration: '00:00'
  });
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  
  // Helper function to determine if a finding is from loaded findings
  const isLoadedFinding = (finding: Finding) => {
    return loadedFindings?.some(f => f.id === finding.id) ?? false;
  };

  // Aggiorna la posizione corrente quando cambiano le coordinate del tracciamento
  useEffect(() => {
    if (currentTrack?.coordinates.length) {
      const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
      setCurrentPosition(lastPosition);
    }
  }, [currentTrack]);

  // Create the GPS arrow icon with the current direction
  const gpsArrowIcon = createGpsArrowIcon(currentDirection);

  const mapRef = React.useRef(null);

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
      
      // Ottieni l'altitudine (simulata per ora)
      // In un'implementazione reale, questo valore verrebbe ottenuto dal GPS
      const altitude = currentTrack.coordinates.length > 0 ? 
        Math.floor(Math.random() * 200) + 400 : 0; // Simulazione tra 400-600m
      
      setTrackingData({
        distance,
        avgSpeed,
        altitude,
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
        
        setTrackingData(prev => ({
          ...prev,
          distance: currentTrack.distance,
          avgSpeed: newAvgSpeed,
          duration: formattedDuration
        }));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [currentTrack]);
  
  // Effetto per l'animazione iniziale della mappa
  useEffect(() => {
    if (currentTrack && mapRef.current) {
      const map = mapRef.current;
      // Centra la mappa sulla posizione corrente senza animazioni
      if (currentTrack.coordinates.length > 0) {
        const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
        map.setView(lastPosition, MAX_ZOOM, { animate: false });
      }
    }
  }, [currentTrack]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* Pannello informazioni di tracking con sfondo quasi trasparente */}
      <div className="tracking-data-panel">
        {/* Indicatore GPS con potenza del segnale */}
        <div className="gps-signal-header">
          <Navigation size={18} color="#f5a149" style={{ marginRight: '6px' }} />
          {/* Barre del segnale GPS */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {[...Array(4)].map((_, i) => {
              // Simulazione della potenza del segnale (in un'app reale useremmo l'accuracy del GPS)
              const isActive = i < Math.floor(Math.random() * 5); // Simulazione casuale
              const barHeight = 6 + (i * 3); // Altezza crescente per ogni barra
              
              return (
                <div 
                  key={i}
                  className="signal-bar"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: isActive ? '#f5a149' : '#E0E0E0',
                  }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Griglia dei dati di tracciamento */}
        <div className="tracking-data-grid">
          <div className="tracking-data-item">
            <Route size={18} className="tracking-data-icon" />
            <p className="tracking-data-value">{trackingData.distance.toFixed(2)} km</p>
          </div>
          <div className="tracking-data-item">
            <ArrowUpDown size={18} className="tracking-data-icon" />
            <p className="tracking-data-value">{trackingData.avgSpeed.toFixed(1)} km/h</p>
          </div>
          <div className="tracking-data-item">
            <Mountain size={18} className="tracking-data-icon" />
            <p className="tracking-data-value">{trackingData.altitude} m</p>
          </div>
          <div className="tracking-data-item">
            <Clock size={18} className="tracking-data-icon" />
            <p className="tracking-data-value">{trackingData.duration}</p>
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
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <LocationUpdater />
        <CenterButton />
        <ZoomControl />
        
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
        
        {/* Display loaded findings if any */}
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
      
      {/* Control buttons */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center gap-4 z-[10000]">
        <button
          onClick={() => setShowStopConfirm(true)}
          className="unified-button stop"
        >
          <Square className="w-6 h-6" />
          Stop
        </button>
        
        <button
          onClick={() => setShowTagOptions(true)}
          className="unified-button tag"
        >
          <MapPin className="w-6 h-6" />
          Tag
        </button>
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