import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTrackStore } from '../store/trackStore';
import { MapPin, Crosshair } from 'lucide-react';
// @ts-ignore - Known issue with @turf/turf types
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import './UnifiedButtons.css';
import { Finding } from '../types/index';
import { Track, Marker as TrackMarker } from '../types';
import FindingForm from './FindingForm';
import TagOptionsPopup from './TagOptionsPopup';
import GpsStatusIndicator from './GpsStatusIndicator';
import CompassIndicator from './CompassIndicator';
import TrackingDataPanel from './TrackingDataPanel';
import { useLocation } from 'react-router-dom';
import { createFindingMarker } from './FindingMarker';
import CompassWidget from './CompassWidget';

// Constants
const MIN_ZOOM = 4;
const MAX_ZOOM = 15;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 5000
};

// Componente per mantenere la mappa centrata sulla posizione attuale
const MapViewUpdater = ({ position, autoCenter = true }: { position: [number, number], autoCenter?: boolean }) => {
  const map = useMap();
  const initialUpdateRef = useRef(false);
  const lastPositionRef = useRef<[number, number]>([0, 0]);
  const { isRecording, currentTrack } = useTrackStore();
  
  useEffect(() => {
    // Se la posizione è valida e il flag di centraggio automatico è attivo
    if (position[0] !== 0 && position[1] !== 0) {
      // Calcola la distanza dalla posizione precedente (se disponibile)
      const hasMovedSignificantly = lastPositionRef.current[0] !== 0 &&
        (Math.abs(position[0] - lastPositionRef.current[0]) > 0.00001 ||
         Math.abs(position[1] - lastPositionRef.current[1]) > 0.00001);
      
      // Aggiorna il riferimento alla posizione precedente
      lastPositionRef.current = position;
      
      // Vari casi in cui dobbiamo centrare la mappa:
      // 1. Non abbiamo ancora fatto il primo aggiornamento
      // 2. L'utente ha attivato il centraggio automatico
      // 3. Stiamo registrando la traccia (e l'autoCenter è attivo)
      if (!initialUpdateRef.current || 
          (autoCenter && (isRecording || hasMovedSignificantly))) {
        
        console.log('🗺️ Auto-centering map to:', position);
        
        // Differenzia fra primo centraggio e aggiornamenti successivi
        if (!initialUpdateRef.current) {
          // Primo aggiornamento: più lento per dare tempo al caricamento
          map.setView(position, map.getZoom() || 18, {
            animate: true,
            duration: 1
          });
          initialUpdateRef.current = true;
        } else {
          // Centraggio durante la registrazione: più rapido e fluido
          map.panTo(position, {
            animate: true,
            duration: 0.5,
            easeLinearity: 0.5
          });
        }
        
        // Log per debug
        console.log(`🗺️ Mappa centrata su [${position[0].toFixed(6)}, ${position[1].toFixed(6)}]`);
      }
    }
  }, [position, map, autoCenter, isRecording, currentTrack]);
  
  // Effetto aggiuntivo che verifica se sono presenti marker di inizio/fine
  useEffect(() => {
    if (currentTrack && initialUpdateRef.current) {
      // Controlla se ci sono marker da visualizzare sulla mappa
      const hasStartMarker = currentTrack.startMarker && currentTrack.startMarker.coordinates;
      const hasEndMarker = currentTrack.endMarker && currentTrack.endMarker.coordinates;
      
      // Se abbiamo sia il marker di inizio che di fine, aggiungiamo un effetto per inquadrare tutta la traccia
      if (hasStartMarker && hasEndMarker && !isRecording) {
        try {
          // Creazione di bounds che includano entrambi i marker e la posizione attuale
          const bounds = L.latLngBounds([
            currentTrack.startMarker!.coordinates,
            currentTrack.endMarker!.coordinates,
            position
          ]);
          
          // Aggiungi anche tutte le coordinate della traccia ai bounds
          if (currentTrack.coordinates && currentTrack.coordinates.length > 0) {
            currentTrack.coordinates.forEach(coord => {
              bounds.extend(coord);
            });
          }
          
          // Applica i bounds con un po' di padding
          console.log('🗺️ Fitting map to bounds of entire track');
          map.fitBounds(bounds, {
            padding: [50, 50],
            animate: true
          });
        } catch (e) {
          console.error('❌ Errore nel fitBounds:', e);
        }
      }
    }
  }, [currentTrack, map, position, isRecording]);
  
  return null;
};

// Component to handle map markers
const FindingsLayer = ({ findings }: { findings: Finding[] }) => {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!findings || findings.length === 0) {
      console.log('🗺️ No findings to display on map');
      return;
    }

    console.log(`🗺️ Displaying ${findings.length} findings on map`);
    
    findings.forEach(finding => {
      if (!finding.coordinates || 
          !Array.isArray(finding.coordinates) || 
          finding.coordinates.length !== 2 ||
          isNaN(finding.coordinates[0]) || 
          isNaN(finding.coordinates[1])) {
        console.warn('⚠️ Finding with invalid coordinates:', finding);
        return;
      }

      try {
        const iconForFinding = createFindingMarker(finding);
        console.log(`🗺️ Creating marker for ${finding.type} at [${finding.coordinates[0]}, ${finding.coordinates[1]}]`);
        
        const marker = L.marker(finding.coordinates, {
          icon: iconForFinding,
          riseOnHover: true,
          zIndexOffset: 1000
        });

        // Add popup
        marker.bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold">${finding.name || finding.type}</h3>
            ${finding.description ? `<p class="text-sm mt-1">${finding.description}</p>` : ''}
            <p class="text-xs text-gray-500 mt-1">
              ${new Date(finding.timestamp).toLocaleString('it-IT')}
            </p>
          </div>
        `);

        // Add to map and store reference
        marker.addTo(map);
        markersRef.current.push(marker);
        console.log(`✅ Marker added to map for finding ${finding.id}`);
      } catch (error) {
        console.error('❌ Error creating marker for finding:', error, finding);
      }
    });

    return () => {
      // Cleanup markers when component unmounts
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [findings, map]);

  return null;
};

// Component to display start and end markers
const TrackMarkersLayer = ({ track }: { track: Track }) => {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add start marker if available
    if (track.startMarker && track.startMarker.coordinates) {
      console.log('🚩 Adding start marker at', track.startMarker.coordinates);
      
      const startMarker = L.marker(track.startMarker.coordinates, {
        icon: L.divIcon({
          html: `
            <div class="marker-flag" style="
              width: 40px;
              height: 40px;
              position: relative;
              display: flex;
              justify-content: center;
              align-items: center;
            ">
              <div style="
                width: 40px;
                height: 40px;
                background-image: url('/assets/icons/Start_Track_icon.svg');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
              "></div>
            </div>
          `,
          className: 'start-flag-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        }),
        zIndexOffset: 1000
      });

      // Create a formatted time string safely
      const startTime = track.actualStartTime || track.startTime;
      const timeString = startTime ? startTime.toLocaleTimeString() : 'N/A';

      startMarker.bindPopup(`
        <div>
          <strong>Punto de inicio</strong>
          <p>Hora: ${timeString}</p>
          <p>Precisión: ${track.startMarker.accuracy.toFixed(1)}m</p>
        </div>
      `);

      startMarker.addTo(map);
      markersRef.current.push(startMarker);
    }

    // Add end marker if available
    if (track.endMarker && track.endMarker.coordinates) {
      console.log('🚩 Adding end marker at', track.endMarker.coordinates);
      
      const endMarker = L.marker(track.endMarker.coordinates, {
        icon: L.divIcon({
          html: `
            <div class="marker-flag" style="
              width: 40px;
              height: 40px;
              position: relative;
              display: flex;
              justify-content: center;
              align-items: center;
            ">
              <div style="
                width: 40px;
                height: 40px;
                background-image: url('/assets/icons/End_Track_icon.svg');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
              "></div>
            </div>
          `,
          className: 'end-flag-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        }),
        zIndexOffset: 1000
      });

      // Create a formatted time string safely
      const endTime = track.actualEndTime || track.endTime;
      const timeString = endTime ? endTime.toLocaleTimeString() : 'N/A';

      endMarker.bindPopup(`
        <div>
          <strong>Punto final</strong>
          <p>Hora: ${timeString}</p>
          <p>Precisión: ${track.endMarker.accuracy.toFixed(1)}m</p>
        </div>
      `);

      endMarker.addTo(map);
      markersRef.current.push(endMarker);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [track, map]);

  return null;
};

// Component to handle live GPS position updates
const GpsPositionUpdater = () => {
  const map = useMap();
  const { updateCurrentPosition, isRecording, currentTrack } = useTrackStore();
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Set up GPS tracking
    if (navigator.geolocation) {
      console.log('🔄 Starting GPS position tracking...');
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newPosition: [number, number] = [latitude, longitude];
          
          // Update store with current position
          updateCurrentPosition(newPosition);
          
          // If recording, make sure the polyline is updated on the map
          if (isRecording && currentTrack) {
            // The polyline will update via the Polyline component when currentTrack updates
            console.log(`📍 Position updated: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}], accuracy: ${accuracy.toFixed(1)}m`);
          }
        },
        (error) => {
          console.error('❌ GPS Error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, 
          maximumAge: 0
        }
      );
    }
    
    return () => {
      if (watchIdRef.current !== null) {
        console.log('🛑 Stopping GPS position tracking');
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateCurrentPosition, isRecording, currentTrack]);
  
  return null;
};

const NavigationPage: React.FC = () => {
  const { 
    currentTrack, 
    stopTrack, 
    setShowFindingForm, 
    showFindingForm, 
    currentDirection: storeDirection, 
    loadedFindings, 
    updateCurrentPosition,
    autoSaveTrack,
    showGPSWaitingMessage,
    isRecording
  } = useTrackStore();
  
  const location = useLocation();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [direction, setDirection] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [autoCenterMap, setAutoCenterMap] = useState(true);
  const [trackingData, setTrackingData] = useState({
    lat: 0,
    lng: 0,
    alt: 0,
    speed: 0
  });
  const mapRef = useRef<L.Map | null>(null);

  // Create GPS position marker icon
  const gpsMarkerIcon = L.icon({
    iconUrl: '/assets/icons/map-navigation-orange-icon.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
  
  console.log('📌 GPS marker icon URL:', '/assets/icons/map-navigation-orange-icon.svg');

  // Watch for GPS position updates
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return;
    }

    setIsAcquiringGps(true);
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: gpsAccuracy, altitude, speed } = position.coords;
        
        // Update local state
        setCurrentPosition([latitude, longitude]);
        setAccuracy(gpsAccuracy);
        setIsAcquiringGps(false);
        
        // Update tracking data
        setTrackingData({
          lat: latitude,
          lng: longitude,
          alt: altitude || 0,
          speed: speed || 0
        });
        
        // Update the global store
        updateCurrentPosition([latitude, longitude]);
        
        console.log(`📍 Position updated: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}], accuracy: ${gpsAccuracy.toFixed(1)}m`);
      },
      (error) => {
        console.error('❌ GPS Error:', error.message);
        setIsAcquiringGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [updateCurrentPosition]);

  // Verifica della presenza dei marker all'avvio
  useEffect(() => {
    if (currentTrack) {
      if (currentTrack.startMarker && currentTrack.startMarker.coordinates) {
        console.log('✅ Verificato marker di inizio:', currentTrack.startMarker.coordinates);
      } else {
        console.warn('⚠️ Marker di inizio non impostato:', currentTrack);
      }
      
      if (currentTrack.endMarker && currentTrack.endMarker.coordinates) {
        console.log('✅ Verificato marker di fine:', currentTrack.endMarker.coordinates);
      }
    }
  }, [currentTrack]);

  // Add this useEffect to log findings whenever currentTrack changes
  useEffect(() => {
    if (currentTrack && currentTrack.findings && currentTrack.findings.length > 0) {
      console.log('🔍 RENDERING FINDINGS:', currentTrack.findings.length, 'findings found');
      currentTrack.findings.forEach(finding => {
        console.log('📍 Finding:', {
          id: finding.id,
          type: finding.type,
          coordinates: finding.coordinates,
          name: finding.name
        });
      });
      } else {
      console.log('📍 No findings to render in current track');
    }
  }, [currentTrack]);

  // Map Event Handlers
  const handleMapReady = (map: L.Map) => {
    console.log('🗺️ Map is ready');
    mapRef.current = map;
  };
  
  // Funzione per centrare manualmente la mappa
  const handleCenterMap = () => {
    if (mapRef.current && currentPosition) {
      mapRef.current.setView(currentPosition, mapRef.current.getZoom() || 18);
      setAutoCenterMap(true);
    }
  };
  
  // Disattiva il centraggio automatico quando l'utente sposta la mappa manualmente
  const handleMapMoveStarted = () => {
    setAutoCenterMap(false);
  };
  
  return (
    <div className="fixed inset-0" style={{ zIndex: showGPSWaitingMessage ? 1000 : 1 }}>
      <MapContainer
        center={currentPosition}
        zoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            map.on('movestart', handleMapMoveStarted);
            console.log('🗺️ Map is ready');
          }
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Auto-center component */}
        <MapViewUpdater position={currentPosition} autoCenter={autoCenterMap} />
        
        {/* GPS Position Updater component - keeps store in sync with GPS */}
        <GpsPositionUpdater />
        
        {/* Current position marker */}
        <Marker position={currentPosition} icon={gpsMarkerIcon}>
          <Popup>
            <div className="p-2">
              <h3 className="font-bold text-sm mb-1">Posizione attuale</h3>
              <div className="text-xs space-y-1">
                <p>Lat: {currentPosition[0].toFixed(6)}°</p>
                <p>Lon: {currentPosition[1].toFixed(6)}°</p>
                <p>Precisione: {accuracy !== null ? `${accuracy.toFixed(1)}m` : 'N/A'}</p>
            </div>
            </div>
          </Popup>
        </Marker>

        {/* Track polyline */}
        {currentTrack?.coordinates && currentTrack.coordinates.length > 0 && (
            <Polyline
              positions={currentTrack.coordinates}
              color="#FF9800"
              weight={4}
              opacity={0.9}
            />
        )}

        {/* Start and end markers */}
        {currentTrack && <TrackMarkersLayer track={currentTrack} />}

        {/* Findings layer - use the dedicated component */}
        {currentTrack?.findings && currentTrack.findings.length > 0 && (
          <FindingsLayer findings={currentTrack.findings} />
        )}
        
        {/* GPS Status Indicator */}
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1001 }}>
          <GpsStatusIndicator 
            accuracy={accuracy} 
            isAcquiring={isAcquiringGps}
            currentPosition={currentPosition}
          />
        </div>

        {/* Compass */}
        <div className="fixed top-20 right-4 z-[1001]">
          <CompassIndicator position="topRight" />
        </div>

        {/* Center Map Button */}
        <div className="fixed bottom-36 right-10 z-[1001]">
          <button
            onClick={handleCenterMap}
            className="unified-button center-map"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Crosshair className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Tag Button */}
        <div className="fixed bottom-10 right-10 z-[10000]">
          <button
            onClick={() => setShowTagOptions(true)}
            className="unified-button tag"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              borderRadius: '50%'
            }}
          >
            <MapPin className="w-6 h-6" />
            Tag
          </button>
        </div>
      
        {/* Forms and Popups */}
        {showTagOptions && (
          <TagOptionsPopup 
            onClose={() => setShowTagOptions(false)}
            onFindingClick={() => {
              setShowTagOptions(false);
              setShowFindingForm(true);
            }}
            onPointOfInterestClick={() => {
              setShowTagOptions(false);
              // Handle POI
            }}
          />
        )}

        {showFindingForm && (
          <FindingForm
            onClose={() => setShowFindingForm(false)}
            position={currentPosition}
          />
        )}

        {/* Tracking Data Panel */}
        <div className="fixed bottom-4 left-4 z-[1001]">
          <TrackingDataPanel
            realTimeData={{
              lat: currentPosition?.[0] ?? 0,
              lng: currentPosition?.[1] ?? 0,
              speed: trackingData?.speed ?? 0,
              alt: trackingData?.alt ?? 0
            }}
          />
        </div>
      </MapContainer>

      {/* Indicador de espera de GPS */}
      {showGPSWaitingMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-[3000] bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-xs shadow-xl">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-yellow-500/30 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-yellow-500/50 animate-pulse"></div>
                <div className="absolute inset-4 rounded-full bg-yellow-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h2 className="font-bold text-lg mb-2">Esperando GPS</h2>
              <p className="text-sm text-center text-gray-600 mb-4">
                Esperando señal GPS de buena calidad para comenzar la grabación.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className="bg-yellow-500 h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-gray-500">Por favor, asegúrate de estar en un área abierta</p>
            </div>
          </div>
        </div>
      )}

      {/* Bussola */}
      <CompassWidget direction={storeDirection} />
    </div>
  );
};

export default NavigationPage;