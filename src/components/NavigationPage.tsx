import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  
  // Forza il ricaricamento delle tiles quando la posizione cambia significativamente
  const forceTileRefresh = useCallback(() => {
    // Invalidate size forza Leaflet a ricalcolare le dimensioni e le tiles visibili
    map.invalidateSize();
    
    // Forza l'aggiornamento di tutte le tiles
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        layer.redraw();
      }
    });
    
    console.log('🔄 Tiles della mappa aggiornate forzatamente');
  }, [map]);
  
  // Esegui un controllo periodico per forzare l'aggiornamento della mappa durante la registrazione
  useEffect(() => {
    if (!isRecording) return;
    
    console.log('⏱️ Attivato timer di aggiornamento mappa durante la registrazione');
    
    // Ogni 1 secondo, forza l'aggiornamento delle tiles e la centratura (più frequente)
    const intervalId = setInterval(() => {
      if (position[0] !== 0 && position[1] !== 0) {
        // Aggiorna il centro della mappa se necessario
        if (autoCenter && isRecording) {
          map.panTo(position, { 
            animate: true, 
            duration: 0.25, // Più veloce
            easeLinearity: 0.25
          });
          
          // Aggiorna lo zoom se necessario (solo durante la registrazione)
          if (map.getZoom() < 17) {
            map.setZoom(18);
          }
        }
        
        // Forza refresh delle tiles
        forceTileRefresh();
      }
    }, 1000); // Più frequente
    
    return () => {
      clearInterval(intervalId);
      console.log('⏱️ Timer di aggiornamento mappa fermato');
    };
  }, [map, isRecording, position, autoCenter, forceTileRefresh]);
  
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
      // 2. L'utente ha attivato il centraggio automatico e stiamo registrando
      // 3. La posizione è cambiata significativamente e l'autoCenter è attivo
      if (!initialUpdateRef.current || 
          (autoCenter && (isRecording || hasMovedSignificantly))) {
        
        console.log('🗺️ Auto-centering map to:', position);
        
        // Differenzia fra primo centraggio e aggiornamenti successivi
        if (!initialUpdateRef.current) {
          // Primo aggiornamento: più lento per dare tempo al caricamento
          map.setView(position, 18, { // Forzato a zoom 18
            animate: true,
            duration: 1
          });
          initialUpdateRef.current = true;
          
          // Dopo l'impostazione iniziale, forza un refresh delle tiles
          setTimeout(forceTileRefresh, 200);
        } else {
          // Centraggio durante la registrazione: più rapido e fluido
          map.panTo(position, {
            animate: true,
            duration: 0.25, // Più veloce
            easeLinearity: 0.25
          });
          
          // Forza refresh delle tiles sempre durante il tracking
          if (isRecording) {
            forceTileRefresh();
          } 
          // Altrimenti solo se ci siamo spostati significativamente
          else if (hasMovedSignificantly) {
            forceTileRefresh();
          }
        }
        
        // Log per debug
        console.log(`🗺️ Mappa centrata su [${position[0].toFixed(6)}, ${position[1].toFixed(6)}]`);
      }
    }
  }, [position, map, autoCenter, isRecording, forceTileRefresh]);
  
  // Effetto aggiuntivo che verifica se sono presenti marker di inizio/fine
  useEffect(() => {
    if (currentTrack && initialUpdateRef.current) {
      // Controlla se ci sono marker da visualizzare sulla mappa
      const hasStartMarker = currentTrack.startMarker && currentTrack.startMarker.coordinates;
      const hasEndMarker = currentTrack.endMarker && currentTrack.endMarker.coordinates;
      
      // Log dettagliato per debug dei marker
      if (hasStartMarker) {
        console.log('🚩 Marker di inizio presente alle coordinate:', currentTrack.startMarker!.coordinates);
      }
      
      if (hasEndMarker) {
        console.log('🏁 Marker di fine presente alle coordinate:', currentTrack.endMarker!.coordinates);
      }
      
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
          
          // Forza refresh delle tiles dopo il fit bounds
          setTimeout(forceTileRefresh, 200);
        } catch (e) {
          console.error('❌ Errore nel fitBounds:', e);
        }
      }
    }
  }, [currentTrack, map, position, isRecording, forceTileRefresh]);
  
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
const TrackMarkersLayer: React.FC<{ track: Track }> = ({ track }) => {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    // Clear previous markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Detailed debug logs for marker presence
    if (track?.startMarker && track.startMarker.coordinates) {
      console.log('🚩 Track ha startMarker:', JSON.stringify(track.startMarker));
    } else {
      console.warn('⚠️ Track non ha startMarker!');
    }
    
    if (track?.endMarker && track.endMarker.coordinates) {
      console.log('🏁 Track ha endMarker:', JSON.stringify(track.endMarker));
    } else if (track.isPaused === false) { // Solo se la traccia non è in pausa
      console.warn('⚠️ Track non ha endMarker!');
    }

    // Add start marker if available
    if (track?.startMarker && track.startMarker.coordinates) {
      console.log('🚩 Adding start marker at', track.startMarker.coordinates);
      
      try {
        // Use direct SVG instead of background image for better visibility
        const startMarker = L.marker(track.startMarker.coordinates, {
          icon: L.divIcon({
            html: `
              <div class="marker-flag" style="
                width: 60px;
                height: 60px;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000 !important;
              ">
                <div class="pulse-ring" style="
                  position: absolute;
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  background-color: rgba(76, 175, 80, 0.4);
                  animation: pulse 2s infinite;
                  z-index: 9999;
                "></div>
                <img src="/assets/icons/Start_Track_icon.svg" style="
                  width: 48px;
                  height: 48px;
                  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                  z-index: 10000;
                " />
              </div>
            `,
            className: 'start-flag-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -60]
          }),
          zIndexOffset: 10000 // Ensure highest z-index
        });

        // Create a formatted time string safely
        const startTime = track.actualStartTime || track.startTime;
        const timeString = startTime ? new Date(startTime).toLocaleTimeString() : 'N/A';

        startMarker.bindPopup(`
          <div>
            <strong>Punto de inicio</strong>
            <p>Hora: ${timeString}</p>
            <p>Precisión: ${track.startMarker?.accuracy?.toFixed(1) || 'N/A'}m</p>
            <p>Lat: ${track.startMarker?.coordinates[0].toFixed(6) || 'N/A'}</p>
            <p>Lon: ${track.startMarker?.coordinates[1].toFixed(6) || 'N/A'}</p>
          </div>
        `);

        startMarker.addTo(map);
        markersRef.current.push(startMarker);
        console.log('✅ Start marker aggiunto con successo!');
        
        // Force marker into view
        setTimeout(() => {
          map.panTo(track.startMarker.coordinates);
          const markerElement = document.querySelector('.start-flag-icon');
          console.log('🔍 Start marker element found in DOM:', !!markerElement);
          if (markerElement) {
            console.log('📏 Start marker dimensions:', markerElement.getBoundingClientRect());
            // Force visibility with higher specificity CSS
            const style = document.createElement('style');
            style.innerHTML = `
              .leaflet-marker-icon.start-flag-icon {
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 10000 !important;
                pointer-events: auto !important;
                display: block !important;
                transform: translate3d(0, 0, 0) !important;
              }
            `;
            document.head.appendChild(style);
          }
        }, 500);
      } catch (e) {
        console.error('❌ Errore aggiungendo start marker:', e);
      }
    }

    // Add end marker if available
    if (track?.endMarker && track.endMarker.coordinates) {
      console.log('🏁 Adding end marker at', track.endMarker.coordinates);
      
      try {
        const endMarker = L.marker(track.endMarker.coordinates, {
          icon: L.divIcon({
            html: `
              <div class="marker-flag" style="
                width: 60px;
                height: 60px;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000 !important;
              ">
                <div class="pulse-ring" style="
                  position: absolute;
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  background-color: rgba(255, 152, 0, 0.4);
                  animation: pulse 2s infinite;
                  z-index: 9999;
                "></div>
                <img src="/assets/icons/End_Track_icon.svg" style="
                  width: 48px;
                  height: 48px;
                  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                  z-index: 10000;
                " />
              </div>
            `,
            className: 'end-flag-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 60], 
            popupAnchor: [0, -60]
          }),
          zIndexOffset: 10000 // Ensure highest z-index
        });

        // Create a formatted time string safely
        const endTime = track.actualEndTime || track.endTime;
        const timeString = endTime ? new Date(endTime).toLocaleTimeString() : 'N/A';

        endMarker.bindPopup(`
          <div>
            <strong>Punto final</strong>
            <p>Hora: ${timeString}</p>
            <p>Precisión: ${track.endMarker?.accuracy?.toFixed(1) || 'N/A'}m</p>
            <p>Lat: ${track.endMarker?.coordinates[0].toFixed(6) || 'N/A'}</p>
            <p>Lon: ${track.endMarker?.coordinates[1].toFixed(6) || 'N/A'}</p>
          </div>
        `);

        endMarker.addTo(map);
        markersRef.current.push(endMarker);
        console.log('✅ End marker aggiunto con successo!');
        
        // Force marker into view
        setTimeout(() => {
          map.panTo(track.endMarker.coordinates);
          const markerElement = document.querySelector('.end-flag-icon');
          console.log('🔍 End marker element found in DOM:', !!markerElement);
          if (markerElement) {
            console.log('📏 End marker dimensions:', markerElement.getBoundingClientRect());
            // Force visibility with higher specificity CSS
            const style = document.createElement('style');
            style.innerHTML = `
              .leaflet-marker-icon.end-flag-icon {
                visibility: visible !important;
                opacity: 1 !important;
                z-index: 10000 !important;
                pointer-events: auto !important;
                display: block !important;
                transform: translate3d(0, 0, 0) !important;
              }
            `;
            document.head.appendChild(style);
          }
        }, 500);
      } catch (e) {
        console.error('❌ Errore aggiungendo end marker:', e);
      }
    }

    // Add custom CSS for the pulse animation if not already added
    if (!document.getElementById('marker-pulse-animation')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'marker-pulse-animation';
      styleElement.innerHTML = `
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.95);
            opacity: 0.7;
          }
        }
        
        /* Force visibility of markers */
        .marker-flag, .start-flag-icon, .end-flag-icon, 
        .leaflet-marker-icon.start-flag-icon, .leaflet-marker-icon.end-flag-icon {
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 10000 !important;
          pointer-events: auto !important;
          display: block !important;
        }
        
        /* Fix for markers being hidden */
        .leaflet-marker-pane {
          z-index: 10000 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(styleElement);
      console.log('✅ Added pulse animation styles for markers');
    }

    // Force map redraw to ensure markers are visible
    setTimeout(() => {
      map.invalidateSize();
      // If markers exist, make sure they're in view
      if (markersRef.current.length > 0) {
        const bounds = L.latLngBounds(markersRef.current.map(marker => marker.getLatLng()));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, 1000);

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, track]);

  return null;
};

// Component to handle live GPS position updates
const GpsPositionUpdater = () => {
  const map = useMap();
  const trackStore = useTrackStore();
  
  const watchIdRef = useRef<number | null>(null);
  const updateCountRef = useRef(0);
  const lastPositionRef = useRef<[number, number] | null>(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const isTrackingRef = useRef(trackStore.isRecording);
  
  // Keep tracking ref in sync
  useEffect(() => {
    isTrackingRef.current = trackStore.isRecording;
  }, [trackStore.isRecording]);
  
  useEffect(() => {
    if (!map) return;
    
    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
      const newPosition: [number, number] = [latitude, longitude];
      
      // Always update position in store immediately for tracking
      trackStore.updateCurrentPosition(newPosition);
      
      // Check if we should perform additional actions based on time
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      // Determine update frequency - always update more frequently when recording
      const updateFrequency = trackStore.isRecording ? 500 : (speed && speed > 1 ? 1000 : 2000);
      
      // Skip additional processing if it's too soon
      if (timeSinceLastUpdate < updateFrequency) {
        return;
      }
      
      // Update time and counter
      lastUpdateTimeRef.current = now;
      updateCountRef.current += 1;
      
      lastPositionRef.current = newPosition;
      
      // Log at reduced frequency
      if (updateCountRef.current % 10 === 0) {
        console.log(`🧭 GPS update: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}], acc: ${accuracy.toFixed(1)}m, speed: ${speed || 0}m/s`);
      }
      
      // Force a map update when tracking
      if (trackStore.isRecording && map) {
        map.invalidateSize({ animate: false });
      }
    };
    
    // Setup watcher
    const setupWatcher = () => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation API not available');
        return;
      }
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        (error) => {
          console.error('❌ GPS error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };
    
    setupWatcher();
    
    // Force map update periodically - less frequently than before
    const forceUpdateInterval = setInterval(() => {
      if (map) {
        map.invalidateSize();
        // Explicitly trigger polyline redraw by panning slightly
        if (trackStore.isRecording && lastPositionRef.current) {
          map.panBy([1, 0]);
          setTimeout(() => map.panBy([-1, 0]), 50);
        }
      }
    }, 10000); // Reduced from 5000ms to 10000ms
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(forceUpdateInterval);
    };
  }, [map, trackStore]);
  
  return null;
};

// Add a custom track polyline layer before the NavigationPage component
const TrackPolylineLayer = () => {
  const map = useMap();
  const trackStore = useTrackStore();
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastCoordLengthRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Effect to handle track coordinate updates
  useEffect(() => {
    if (!map || !trackStore.currentTrack) return;
    
    const { coordinates } = trackStore.currentTrack;
    const now = Date.now();
    
    // Skip if no coordinates or if coordinates haven't changed and not enough time has passed
    if (!coordinates || coordinates.length === 0) {
      return;
    }
    
    // Only update if coordinates changed or if more than 2 seconds since last update
    const coordinatesChanged = coordinates.length !== lastCoordLengthRef.current;
    const timeToForceUpdate = now - lastUpdateTimeRef.current > 1000; // Reduced from 2000ms to 1000ms
    
    if (!coordinatesChanged && !timeToForceUpdate) {
      return;
    }
    
    // Log update (only when coordinates change or periodically)
    if (coordinatesChanged && coordinates.length % 5 === 0) { // Only log every 5 coordinate additions
      console.log(`🛣️ Updating track polyline with ${coordinates.length} points`);
      lastCoordLengthRef.current = coordinates.length;
      lastUpdateTimeRef.current = now;
    }
    
    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
    }
    
    // Create new polyline if there are at least 2 points
    if (coordinates.length >= 2) {
      try {
        polylineRef.current = L.polyline(coordinates, {
          color: "#FF9800",
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        
        // Force map redraw to ensure path is visible
        map.invalidateSize({ animate: false });
        
        // For better visibility, pan slightly to trigger a redraw - only do this every few updates
        if (trackStore.isRecording && coordinates.length % 3 === 0) {
          map.panBy([1, 1]);
          setTimeout(() => map.panBy([-1, -1]), 50);
        }
      } catch (err) {
        console.error('Error updating track polyline:', err);
      }
    }
    
    return () => {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    };
  }, [map, trackStore.currentTrack?.coordinates, trackStore.isRecording]);
  
  return null;
};

// Modify the MapUpdater component to better force redraws
const MapUpdater = () => {
  const map = useMap();
  const trackStore = useTrackStore();
  const updateCountRef = useRef(0);
  const lastRefreshRef = useRef(Date.now());
  
  // Force map redraw more aggressively
  const forceMapUpdate = useCallback(() => {
    if (!map) return;
    
    try {
      // Force map to redraw with all options for max compatibility
      map.invalidateSize({ animate: false, pan: false });
      
      // Force redraw all tile layers
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.redraw();
        }
      });
      
      // Only log every few updates
      updateCountRef.current += 1;
      if (updateCountRef.current % 5 === 0) {
        console.log('🗺️ Forced map update');
      }
      
      lastRefreshRef.current = Date.now();
    } catch (e) {
      console.error('Error forcing map update:', e);
    }
  }, [map]);
  
  // Set up periodic refresh
  useEffect(() => {
    if (!map) return;
    
    // Different refresh rates based on tracking state
    const refreshInterval = trackStore.isRecording ? 1500 : 3000;
    
    const interval = setInterval(() => {
      forceMapUpdate();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [map, trackStore.isRecording, forceMapUpdate]);
  
  return null;
};

// Aggiunge stili CSS per l'animazione pulse
useEffect(() => {
  // Aggiungi uno stile globale per l'animazione pulse se non esiste già
  if (!document.getElementById('pulse-animation-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-animation-style';
    style.innerHTML = `
      @keyframes pulse {
        0% {
          transform: scale(0.95);
          opacity: 0.9;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.5;
        }
        100% {
          transform: scale(0.95);
          opacity: 0.9;
        }
      }
    `;
    document.head.appendChild(style);
    console.log('💥 Stile di animazione pulse aggiunto');
  }
}, []);

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
        preferCanvas={true}
        attributionControl={false}
        zoomControl={false}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
            map.on('movestart', handleMapMoveStarted);
            console.log('🗺️ Map is ready');
          }
        }}
        whenReady={(mapEvent: L.LeafletEvent) => {
          // Additional setup for better performance
          if (mapEvent.target) {
            // Set fade animation to false for better performance
            const leafletMap = mapEvent.target as L.Map;
            if (leafletMap.options) {
              leafletMap.options.fadeAnimation = false;
              leafletMap.options.zoomAnimation = false;
            }
            
            console.log('Map options configured for performance');
          }
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Auto-center component */}
        <MapViewUpdater position={currentPosition} autoCenter={autoCenterMap} />
        
        {/* Aggiornamento forzato mappa */}
        <MapUpdater />
        
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

        {/* Custom track polyline that updates in real-time */}
        <TrackPolylineLayer track={currentTrack} />

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