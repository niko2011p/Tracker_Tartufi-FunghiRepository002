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

// Significantly improve the MapViewUpdater component for better auto-centering
const MapViewUpdater = ({ position, autoCenter = true }: { position: [number, number], autoCenter?: boolean }) => {
  const map = useMap();
  const { isRecording, currentTrack } = useTrackStore();
  const initialUpdateRef = useRef(false);
  const lastPositionRef = useRef<[number, number]>([0, 0]);
  const lastUpdateTimeRef = useRef(Date.now());
  const userMovedMapRef = useRef(false);
  
  // Force complete map refresh - tiles and all layers
  const forceCompleteMapRefresh = useCallback(() => {
    if (!map) return;
    
    try {
      // First invalidate size
      map.invalidateSize({ animate: false, pan: false });
      
      // Force redraw all tiles
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          try {
            layer.redraw();
          } catch (e) {
            console.warn('Error redrawing tile layer:', e);
          }
        }
      });
      
      // Trigger browser reflow
      window.dispatchEvent(new Event('resize'));
      
      // Trigger additional map events to force refresh
      map.fire('move');
      map.fire('moveend');
      
      // Force browser to redraw by making a minimal visual change
      const currentZoom = map.getZoom();
      if (currentZoom) {
        // Tiny zoom change to force redraw
        map.setZoom(currentZoom - 0.001);
        setTimeout(() => map.setZoom(currentZoom), 10);
      }
      
      // Pan slightly to force redraw
      map.panBy([1, 1]);
      setTimeout(() => map.panBy([-1, -1]), 20);
    } catch (e) {
      console.error('Error in complete map refresh:', e);
    }
  }, [map]);

  // Reset userMovedMap when tracking starts
  useEffect(() => {
    if (isRecording) {
      userMovedMapRef.current = false;
    }
  }, [isRecording]);
  
  // Listen for map move events caused by user
  useEffect(() => {
    if (!map) return;
    
    const handleMoveStart = () => {
      // Only set this if the user manually moved the map (not our code)
      if (isRecording) {
        userMovedMapRef.current = true;
        setTimeout(() => {
          // Auto-reset after 3 seconds to resume auto-centering (reduced from 5s)
          userMovedMapRef.current = false;
        }, 3000);
      }
    };
    
    map.on('dragstart', handleMoveStart);
    
    return () => {
      map.off('dragstart', handleMoveStart);
    };
  }, [map, isRecording]);
  
  // Effect for tracking mode - more aggressive updates
  useEffect(() => {
    if (!isRecording || !map) return;
    
    console.log('⏱️ Starting aggressive map tracking mode');
    
    // During tracking, update very frequently (every 300ms)
    const trackingInterval = setInterval(() => {
      if (position[0] === 0 && position[1] === 0) return;
      
      // Always center when tracking unless user manually moved map recently
      if (autoCenter && !userMovedMapRef.current) {
        map.panTo(position, { 
          animate: true, 
          duration: 0.2, // Very quick animation
          easeLinearity: 0.5
        });
        
        // Ensure we're at a good zoom level
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom < 17) {
          map.setZoom(18, { animate: false });
        }
      }
      
      // Aggressive refresh during tracking
      forceCompleteMapRefresh();
      
    }, 300); // More frequent updates (was 500ms)
    
    return () => {
      clearInterval(trackingInterval);
      console.log('⏱️ Stopped aggressive map tracking mode');
    };
  }, [map, isRecording, position, autoCenter, forceCompleteMapRefresh]);
  
  // Normal position updates (both tracking and non-tracking)
  useEffect(() => {
    // Skip invalid positions
    if (position[0] === 0 && position[1] === 0) return;
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Calculate if we've moved significantly
    const hasMovedSignificantly = 
      lastPositionRef.current[0] !== 0 &&
      (Math.abs(position[0] - lastPositionRef.current[0]) > 0.00001 ||
       Math.abs(position[1] - lastPositionRef.current[1]) > 0.00001);
    
    // Update position reference
    lastPositionRef.current = position;
    
    // First initialization of the map
    if (!initialUpdateRef.current) {
      console.log('🗺️ First map initialization to:', position);
      
      // First time setup - zoom and center
      map.setView(position, 18, {
        animate: true,
        duration: 0.5
      });
      
      initialUpdateRef.current = true;
      lastUpdateTimeRef.current = now;
      
      // Force complete refresh after initial setup
      setTimeout(forceCompleteMapRefresh, 200);
      return;
    }
    
    // Limit frequency of regular updates
    if (timeSinceLastUpdate < (isRecording ? 300 : 800)) {
      return;
    }
    
    // Update time reference
    lastUpdateTimeRef.current = now;
    
    // Center map if:
    // 1. We're in tracking mode and auto-center is on and user hasn't moved map
    // 2. We've moved significantly and auto-center is on
    if (autoCenter && ((isRecording && !userMovedMapRef.current) || hasMovedSignificantly)) {
      console.log(`🗺️ Centering map on [${position[0].toFixed(6)}, ${position[1].toFixed(6)}]`);
      
      map.panTo(position, {
        animate: true,
        duration: isRecording ? 0.2 : 0.5, // Faster during recording
        easeLinearity: 0.5
      });
      
      // Refresh map visuals after centering
      setTimeout(forceCompleteMapRefresh, 100);
    }
    
  }, [position, map, autoCenter, isRecording, forceCompleteMapRefresh]);
  
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
    if (track?.startMarker?.coordinates) {
      console.log('🚩 Track ha startMarker:', JSON.stringify(track.startMarker));
    } else {
      console.warn('⚠️ Track non ha startMarker!');
    }
    
    if (track?.endMarker?.coordinates) {
      console.log('🏁 Track ha endMarker:', JSON.stringify(track.endMarker));
    } else if (track.isPaused === false) { // Solo se la traccia non è in pausa
      console.warn('⚠️ Track non ha endMarker!');
    }

    // Add start marker if available
    if (track?.startMarker?.coordinates) {
      console.log('🚩 Adding start marker at', track.startMarker.coordinates);
      try {
        const startIcon = L.divIcon({
          html: `<div class="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full shadow-md animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>`,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        
        const marker = L.marker([track.startMarker.coordinates[1], track.startMarker.coordinates[0]], { icon: startIcon });
        marker.addTo(map);
        
        // Add popup with time info
        if (track.startMarker.timestamp) {
          const startTime = new Date(track.startMarker.timestamp);
          marker.bindPopup(`Start: ${startTime.toLocaleString()}<br>Accuracy: ${track.startMarker.accuracy?.toFixed(1) || 'N/A'} m`);
        }
        
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error adding start marker:', error);
      }
    }

    // Add end marker if available
    if (track?.endMarker?.coordinates) {
      console.log('🏁 Adding end marker at', track.endMarker.coordinates);
      try {
        const endIcon = L.divIcon({
          html: `<div class="flex items-center justify-center w-6 h-6 bg-orange-500 rounded-full shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>`,
          className: 'custom-div-icon',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        
        const marker = L.marker([track.endMarker.coordinates[1], track.endMarker.coordinates[0]], { icon: endIcon });
        marker.addTo(map);
        
        // Add popup with time info
        if (track.endMarker.timestamp) {
          const endTime = new Date(track.endMarker.timestamp);
          marker.bindPopup(`End: ${endTime.toLocaleString()}<br>Accuracy: ${track.endMarker.accuracy?.toFixed(1) || 'N/A'} m`);
        }
        
        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error adding end marker:', error);
      }
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, track]);

  return null;
};

// Complete rewrite of GpsPositionUpdater for more reliable updates
const GpsPositionUpdater = () => {
  const map = useMap();
  const trackStore = useTrackStore();
  
  const watchIdRef = useRef<number | null>(null);
  const updateCountRef = useRef(0);
  const lastPositionRef = useRef<[number, number] | null>(null);
  const lastUpdateTimeRef = useRef(Date.now());
  
  useEffect(() => {
    if (!map) return;
    
    const updatePosition = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
      const newPosition: [number, number] = [latitude, longitude];
      
      // ALWAYS update position in store immediately to ensure real-time updates
      trackStore.updateCurrentPosition(newPosition);
      
      // Check if enough time has passed for auxiliary operations
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      
      // More frequent updates during recording (300ms vs 800ms)
      const updateFrequency = trackStore.isRecording ? 300 : 800;
      
      // Position changed significantly
      const positionChangedSignificantly = 
        lastPositionRef.current &&
        (Math.abs(newPosition[0] - lastPositionRef.current[0]) > 0.00001 ||
         Math.abs(newPosition[1] - lastPositionRef.current[1]) > 0.00001);
        
      // Skip auxiliary operations if too frequent and position hasn't changed much
      if (timeSinceLastUpdate < updateFrequency && !positionChangedSignificantly) {
        return;
      }
      
      // Update time and counter
      lastUpdateTimeRef.current = now;
      updateCountRef.current += 1;
      lastPositionRef.current = newPosition;
      
      // Only log every 5th update to reduce console noise
      if (updateCountRef.current % 5 === 0) {
        console.log(`🧭 GPS: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}], acc: ${accuracy.toFixed(1)}m, spd: ${speed || 0}m/s`);
      }
      
      // If recording, force map to refresh on significant position change or every few updates
      if (trackStore.isRecording && 
          (positionChangedSignificantly || updateCountRef.current % 3 === 0)) {
        // Force map update to ensure position is visible
        map.invalidateSize({ animate: false });
        
        // Explicitly trigger redraw with a micro-pan
        setTimeout(() => {
          map.panBy([1, 0]);
          setTimeout(() => map.panBy([-1, 0]), 30);
        }, 50);
      }
    };
    
    const setupWatcher = () => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation API not available');
        return;
      }
      
      console.log('🧭 Setting up high-precision GPS watcher...');
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        (error) => {
          console.error('❌ GPS error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000, // Reduced timeout for faster responses
          maximumAge: 0   // Always get fresh positions
        }
      );
    };
    
    setupWatcher();
    
    // Periodic backup refresh to ensure map is updated
    const backupRefreshInterval = setInterval(() => {
      if (map && trackStore.isRecording) {
        console.log('🔄 Backup map refresh triggered');
        map.invalidateSize({ animate: false });
        
        // Force a more aggressive redraw during recording
        if (lastPositionRef.current) {
          const currentZoom = map.getZoom();
          if (currentZoom) {
            // Micro-zoom to force redraw
            map.setZoom(currentZoom - 0.001);
            setTimeout(() => map.setZoom(currentZoom), 50);
          }
          
          // Micro-pan to force redraw
          map.panBy([1, 1]);
          setTimeout(() => map.panBy([-1, -1]), 50);
        }
      }
    }, 3000); // Every 3 seconds
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(backupRefreshInterval);
    };
  }, [map, trackStore]);
  
  return null;
};

// TrackPolylineLayer component
const TrackPolylineLayer = ({ track }: { track: Track | null }) => {
  const map = useMap();
  const trackStore = useTrackStore();
  const polylineRef = useRef<L.Polyline | null>(null);
  const lastSegmentRef = useRef<L.Polyline | null>(null);
  const lastCoordLengthRef = useRef(0);
  const lastForceRedrawTime = useRef(Date.now());
  
  // Function to ensure polyline visibility on the map
  const ensurePolylineVisibility = useCallback(() => {
    if (!map || !track || !polylineRef.current || track.coordinates.length < 2) {
      return;
    }
    
    // Get polyline bounds from the coordinates
    const bounds = L.latLngBounds(track.coordinates);
    
    // Get the bounds of what's currently visible on the map
    const mapBounds = map.getBounds();
    
    // Check if the last coordinate is in current view
    const lastCoord = track.coordinates[track.coordinates.length - 1];
    const isLastCoordVisible = mapBounds.contains(lastCoord);
    
    // If the last point isn't visible and we're recording, fit to include it
    if (!isLastCoordVisible && trackStore.isRecording) {
      try {
        // Extend bounds to include current position
        if (trackStore.currentPosition) {
          bounds.extend(trackStore.currentPosition);
        }
        
        // Fit the map to these bounds, but with padding to make it look nicer
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 18,
          animate: true,
          duration: 0.3 // Faster animation
        });
        
        // Force redraw all layers to ensure visibility
        map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            layer.redraw();
          }
        });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
      }
    }
    
    // Force the polyline to be visible by manipulating its style directly
    try {
      if (polylineRef.current) {
        const pathElements = document.querySelectorAll('.track-polyline');
        pathElements.forEach(el => {
          (el as HTMLElement).style.visibility = 'visible';
          (el as HTMLElement).style.display = 'block';
          (el as HTMLElement).style.zIndex = '650';
          (el as HTMLElement).style.animation = 'none';
          (el as HTMLElement).style.animation = 'fadeIn 0.3s';
        });
      }
    } catch (e) {
      console.warn('Error ensuring polyline visibility:', e);
    }
  }, [map, track, trackStore.isRecording, trackStore.currentPosition]);
  
  useEffect(() => {
    if (!map || !track) return;
    
    const coordinates = track.coordinates || [];
    
    // Determine if we need to redraw
    const now = Date.now();
    const coordinatesChanged = lastCoordLengthRef.current !== coordinates.length;
    const forceRedrawNeeded = (now - lastForceRedrawTime.current) > 1000; // Force redraw more frequently (was 3000ms)
    
    if (!coordinatesChanged && !forceRedrawNeeded) {
      return;
    }
    
    // Update refs
    if (coordinatesChanged) {
      lastCoordLengthRef.current = coordinates.length;
    }
    
    if (forceRedrawNeeded) {
      lastForceRedrawTime.current = now;
    }
    
    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    
    // Remove last segment highlight
    if (lastSegmentRef.current) {
      lastSegmentRef.current.remove();
      lastSegmentRef.current = null;
    }
    
    // Only create polyline if we have at least 2 points
    if (coordinates.length >= 2) {
      try {
        // Create the polyline with better styling
        polylineRef.current = L.polyline(coordinates, {
          color: "#FF9800",
          weight: 5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round',
          className: 'track-polyline',
          interactive: false
        }).addTo(map);
        
        // Add a pulsing effect to the last segment to make it more visible
        const lastPoint = coordinates[coordinates.length - 1];
        const secondLastPoint = coordinates[coordinates.length - 2];
        
        if (lastPoint && secondLastPoint && trackStore.isRecording) {
          // Add a highlighted segment for the latest part
          lastSegmentRef.current = L.polyline([secondLastPoint, lastPoint], {
            color: "#FFCC00",
            weight: 7,
            opacity: 0.8,
            dashArray: '10, 10',
            lineCap: 'round',
            className: 'track-latest-segment'
          }).addTo(map);
        }
        
        // Make sure the polyline is visible
        ensurePolylineVisibility();
        
        // Add custom style to ensure visibility 
        if (!document.getElementById('track-polyline-style')) {
          const style = document.createElement('style');
          style.id = 'track-polyline-style';
          style.innerHTML = `
            .track-polyline {
              stroke: #FF9800 !important;
              stroke-width: 5px !important;
              stroke-opacity: 1 !important;
              stroke-linecap: round !important;
              stroke-linejoin: round !important;
              visibility: visible !important;
              display: block !important;
              z-index: 650 !important;
              pointer-events: auto !important;
            }
            .track-latest-segment {
              stroke: #FFCC00 !important;
              stroke-width: 7px !important;
              animation: dash 1.5s linear infinite;
              stroke-dasharray: 10, 10 !important;
              stroke-linecap: round !important;
            }
            @keyframes dash {
              to {
                stroke-dashoffset: -20;
              }
            }
            @keyframes fadeIn {
              from { opacity: 0.5; }
              to { opacity: 1; }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Trigger a forced map update to ensure visibility
        map.invalidateSize({ animate: false });
        
        // Force visible after a slight delay to ensure rendering
        setTimeout(ensurePolylineVisibility, 50);
        
      } catch (err) {
        console.error('Error creating track polyline:', err);
      }
    }
    
    return () => {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (lastSegmentRef.current) {
        lastSegmentRef.current.remove();
        lastSegmentRef.current = null;
      }
    };
  }, [map, track?.coordinates, trackStore.isRecording, ensurePolylineVisibility]);
  
  // Additional effect specifically for handling recording state changes
  useEffect(() => {
    if (!map || !trackStore.isRecording) return;
    
    // During recording, force updates every 300ms to ensure visibility
    const visibilityInterval = setInterval(() => {
      ensurePolylineVisibility();
      
      // Also periodically force map invalidation during tracking
      if (map) {
        map.invalidateSize({ animate: false });
        
        // Force redraw all layers
        map.eachLayer(layer => {
          if (layer instanceof L.TileLayer) {
            try {
              layer.redraw();
            } catch (e) {
              // Ignore redraw errors
            }
          }
        });
      }
    }, 300); // More frequent (was 500ms)
    
    return () => {
      clearInterval(visibilityInterval);
    };
  }, [map, trackStore.isRecording, ensurePolylineVisibility]);
  
  return null;
};

// Modified MapUpdater component
const MapUpdater = () => {
  const map = useMap();
  const trackStore = useTrackStore();
  const forceUpdateCountRef = useRef(0);
  
  // This function will force a complete redraw of the map
  const forceFullMapUpdate = useCallback(() => {
    if (!map) return;
    
    forceUpdateCountRef.current++;
    
    try {
      // Multiple approaches to force refresh
      
      // 1. Basic invalidate size
      map.invalidateSize({ animate: false, pan: false });
      
      // 2. Force redraw all tile layers
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.redraw();
        }
      });
      
      // 3. Zoom trick - tiny zoom adjustment to force redraw
      const currentZoom = map.getZoom();
      if (currentZoom) {
        map.setZoom(currentZoom - 0.001);
        setTimeout(() => map.setZoom(currentZoom), 20);
      }
      
      // 4. Pan trick - tiny pan to force redraw
      map.panBy([1, 1]);
      setTimeout(() => map.panBy([-1, -1]), 30);
      
      // 5. Fire map events to trigger internal updates
      map.fire('move');
      map.fire('moveend');
      
      // 6. Force browser reflow
      window.dispatchEvent(new Event('resize'));
    } catch (e) {
      console.error('Error during full map update:', e);
    }
  }, [map]);
  
  // Create a specific update effect for tracking
  useEffect(() => {
    if (!map || !trackStore.isRecording) return;
    
    console.log('⏱️ Starting active tracking map updates');
    
    // During active tracking, update the map very frequently
    const trackingInterval = setInterval(() => {
      forceFullMapUpdate();
    }, 400); // More frequent than previous (was 700ms)
    
    return () => {
      clearInterval(trackingInterval);
      console.log('⏱️ Stopped active tracking map updates');
    };
  }, [map, trackStore.isRecording, forceFullMapUpdate]);
  
  // General background updates (less frequent)
  useEffect(() => {
    if (!map) return;
    
    // Different intervals based on tracking state
    const interval = trackStore.isRecording ? 800 : 2000; // More frequent than before
    
    const generalUpdateInterval = setInterval(() => {
      forceFullMapUpdate();
    }, interval);
    
    return () => {
      clearInterval(generalUpdateInterval);
    };
  }, [map, trackStore.isRecording, forceFullMapUpdate]);
  
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
        whenReady={() => {
          // Additional setup for better performance
          if (mapRef.current) {
            // Set fade animation to false for better performance
            const leafletMap = mapRef.current;
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
        {currentTrack && <TrackPolylineLayer track={currentTrack} />}

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