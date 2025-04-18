import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTrackStore } from '../store/trackStore';
import DataTrackingPanel from '../components/DataTrackingPanel';
import CompassWidget from '../components/CompassWidget';
import { Crosshair, Square, Navigation2, MapPin, Plus, Minus } from 'lucide-react';
import TagOptionsPopup from '../components/TagOptionsPopup';
import FindingForm from '../components/FindingForm';
import { useTrackHistoryStore, SavedTrack, TrackTag, calculateStats } from '../store/trackHistoryStore';
import useButtonConfigStore from '../store/buttonConfigStore';
import TagButton from '../components/TagButton';
import StopButton from '../components/StopButton';
import { Finding } from '../types';

// Fix per le icone di Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Stile CSS per l'animazione del marker
const pulseAnimation = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

// Aggiungi lo stile al documento
const style = document.createElement('style');
style.innerHTML = pulseAnimation;
document.head.appendChild(style);

const createFindingIcon = (type: string, isLoaded = false) => {
  const size: [number, number] = [32, 32];
  const color = type === 'Fungo' ? '#8eaa36' : type === 'Tartufo' ? '#a0522d' : '#f5a149';
  
  return L.divIcon({
    html: `
      <div class="marker-container">
        <div class="marker-pulse" style="background-color: ${color};"></div>
        <div class="marker-inner">
          <div class="marker-dot" style="background-color: ${color};"></div>
          <div class="marker-ring" style="border-color: ${color};"></div>
        </div>
      </div>
    `,
    className: `custom-icon ${type.toLowerCase()}-icon ${isLoaded ? 'loaded' : ''}`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2]
  });
};

// Componente per aggiornare il centro della mappa con effetto volo
const MapCenterUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, 18, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, map]);
  return null;
};

const NavigationPage: React.FC = () => {
  const { currentPosition, currentDirection, isRecording, startTrack, stopTrack, setShowFindingForm, showFindingForm, currentTrack } = useTrackStore();
  const addTrack = useTrackHistoryStore((state) => state.addTrack);
  const [startTime] = useState(new Date().toISOString());
  const [currentTags, setCurrentTags] = useState<TrackTag[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([45.4642, 9.1900]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [gpsSignal, setGpsSignal] = useState<'good' | 'medium' | 'weak'>('weak');
  const [path, setPath] = useState<[number, number][]>([]);
  const [gpsData, setGpsData] = useState({
    latitude: 0,
    longitude: 0,
    altitude: 0,
    speed: 0,
    accuracy: 0
  });
  const [isFollowingGPS, setIsFollowingGPS] = useState(true);
  const mapRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const [showTagOptions, setShowTagOptions] = useState(false);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const [locationName, setLocationName] = useState<string>('Caricamento...');
  const { navigationButton, centerButton } = useButtonConfigStore();
  const [isCentering, setIsCentering] = useState(false);

  // Aggiungi gli stili per il marker
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .marker-container {
        position: relative;
        width: 32px;
        height: 32px;
      }
      .marker-pulse {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: ${gpsSignal === 'good' ? '#8eaa36' : gpsSignal === 'medium' ? '#f5a149' : '#ff4444'};
        border-radius: 50%;
        opacity: 0.2;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .marker-inner {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .marker-dot {
        width: 12px;
        height: 12px;
        background-color: ${gpsSignal === 'good' ? '#8eaa36' : gpsSignal === 'medium' ? '#f5a149' : '#ff4444'};
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.8);
        animation: bounce 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .marker-ring {
        position: absolute;
        width: 24px;
        height: 24px;
        border: 2px solid ${gpsSignal === 'good' ? '#8eaa36' : gpsSignal === 'medium' ? '#f5a149' : '#ff4444'};
        border-radius: 50%;
        animation: ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.2; }
        50% { transform: scale(1.5); opacity: 0.1; }
        100% { transform: scale(1); opacity: 0.2; }
      }
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
      @keyframes ring {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [gpsSignal]);

  // Inizializza il tracking all'avvio
  useEffect(() => {
    console.log('Inizializzazione tracking...');
    startTrack();
    return () => {
      console.log('Pulizia tracking...');
      stopTrack();
    };
  }, [startTrack, stopTrack]);

  // Gestione del GPS
  useEffect(() => {
    let watchId: number | null = null;

    const updatePosition = (position: GeolocationPosition) => {
      const now = Date.now();
      const timeDiff = now - lastUpdateRef.current;
      
      // Aggiorna solo se sono passati almeno 1000ms (1 secondo)
      if (timeDiff >= 1000) {
        const { latitude, longitude, altitude, speed, accuracy } = position.coords;
        console.log('Nuova posizione:', { latitude, longitude, altitude, speed, accuracy });
        
        // Imposta il livello del segnale GPS in base all'accuracy
        if (accuracy < 10) {
          setGpsSignal('good'); // Precisione alta (meno di 10 metri)
        } else if (accuracy < 30) {
          setGpsSignal('medium'); // Precisione media (tra 10 e 30 metri)
        } else {
          setGpsSignal('weak'); // Precisione bassa (più di 30 metri)
        }
        
        // Aggiorna i dati GPS
        setGpsData({
          latitude,
          longitude,
          altitude: altitude || 0,
          speed: speed || 0,
          accuracy: accuracy || 0
        });

        // Aggiorna il centro della mappa e il percorso solo se la posizione è valida
        if (latitude !== 0 && longitude !== 0) {
          if (isFollowingGPS) {
            setMapCenter([latitude, longitude]);
          }
          
          // Aggiungi il punto al percorso con timestamp per calcolare la distanza
          setPath(prev => {
            const newPoint: [number, number] = [latitude, longitude];
            
            // Solo se è un punto diverso dall'ultimo
            if (prev.length === 0 || (
                prev[prev.length-1][0] !== latitude || 
                prev[prev.length-1][1] !== longitude
              )) {
              return [...prev, newPoint];
            }
            return prev;
          });
        }

        lastUpdateRef.current = now;
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('Errore GPS:', error);
      setMapError(`Errore GPS: ${error.message}`);
      setGpsSignal('weak');
    };

    if (isRecording) {
      console.log('Avvio tracking GPS...');
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchId !== null) {
        console.log('Pulizia watchPosition...');
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isRecording, isFollowingGPS]);

  // Crea l'icona del marker GPS in base alla qualità del segnale
  const createGpsMarkerIcon = () => {
    const size: [number, number] = [32, 32];
    let color;
    
    // Imposta il colore in base alla qualità del segnale
    if (gpsSignal === 'good') {
      color = '#8eaa36'; // Verde per un buon segnale
    } else if (gpsSignal === 'medium') {
      color = '#fd9a3c'; // Arancione per un segnale medio
    } else {
      color = '#ff4444'; // Rosso per un segnale debole
    }
    
    return L.divIcon({
      html: `
        <div class="marker-container">
          <div class="marker-pulse" style="background-color: ${color};"></div>
          <div class="marker-inner">
            <div class="marker-dot" style="background-color: ${color};"></div>
            <div class="marker-ring" style="border: 2px solid ${color};"></div>
          </div>
        </div>
      `,
      className: `gps-marker gps-signal-${gpsSignal}`,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1] / 2]
    });
  };

  // Componente aggiornato per il marker GPS
  const GpsMarker: React.FC = () => {
    const map = useMap();
    const markerRef = useRef<L.Marker | null>(null);
    
    useEffect(() => {
      // Crea il marker GPS se non esiste
      if (!markerRef.current && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
        markerRef.current = L.marker([gpsData.latitude, gpsData.longitude], {
          icon: createGpsMarkerIcon(),
          zIndexOffset: 1000
        }).addTo(map);
      }
      
      // Aggiorna la posizione e l'icona del marker
      if (markerRef.current && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
        markerRef.current.setLatLng([gpsData.latitude, gpsData.longitude]);
        markerRef.current.setIcon(createGpsMarkerIcon());
      }
      
      return () => {
        if (markerRef.current) {
          markerRef.current.removeFrom(map);
          markerRef.current = null;
        }
      };
    }, [map, gpsData, gpsSignal]);
    
    return null;
  };

  // Add a function to process findings and show them on the map
  const findingMarkersRef = useRef<{[id: string]: L.Marker}>({});

  const processFindings = (findings: Finding[]) => {
    if (!mapRef.current) return;

    try {
      console.log(`🗺️ Processing ${findings.length} findings`);

      // Remove any findings not in the current set
      const currentIds = findings.map(f => f.id);
      Object.keys(findingMarkersRef.current).forEach(id => {
        if (!currentIds.includes(id) && findingMarkersRef.current[id]) {
          findingMarkersRef.current[id].remove();
          delete findingMarkersRef.current[id];
        }
      });

      // Add or update markers for each finding
      findings.forEach(finding => {
        try {
          if (!finding.coordinates || 
              !Array.isArray(finding.coordinates) || 
              finding.coordinates.length !== 2 ||
              isNaN(finding.coordinates[0]) || 
              isNaN(finding.coordinates[1])) {
            console.warn('⚠️ Invalid coordinates for finding:', finding);
            return;
          }

          // If marker already exists, just update it
          if (findingMarkersRef.current[finding.id]) {
            findingMarkersRef.current[finding.id].setLatLng(finding.coordinates);
            return;
          }

          console.log(`🗺️ Creating marker for ${finding.type} at [${finding.coordinates[0]}, ${finding.coordinates[1]}]`);
          
          // Create icon using FindingMarker's utility
          const type = finding.type.toLowerCase();
          const iconColor = type === 'fungo' ? '#8eaa36' : type === 'tartufo' ? '#8B4513' : '#f5a149';
          const iconUrl = type === 'fungo' ? '/assets/icons/mushroom-tag-icon.svg' : 
                          type === 'tartufo' ? '/assets/icons/truffle-tag-icon.svg' : 
                          '/assets/icons/point-of-interest-tag-icon.svg';
          
          const customIcon = L.divIcon({
            html: `
              <div class="finding-marker ${type}-marker" style="
                width: 40px;
                height: 40px;
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: ${iconColor}40;
                border-radius: 50%;
                border: 2px solid ${iconColor};
              ">
                <div class="finding-pulse" style="
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  background-color: ${iconColor}30;
                  animation: pulse 2s infinite;
                "></div>
                <div style="
                  width: 24px;
                  height: 24px;
                  background-image: url(${iconUrl});
                  background-size: contain;
                  background-position: center;
                  background-repeat: no-repeat;
                  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
                "></div>
              </div>
            `,
            className: `finding-icon ${type}-icon`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          });
          
          // Create and add marker
          const marker = L.marker(finding.coordinates, { 
            icon: customIcon,
            riseOnHover: true,
            zIndexOffset: 1000
          });
          
          // Add popup with finding details
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
          marker.addTo(mapRef.current);
          findingMarkersRef.current[finding.id] = marker;
          console.log(`✅ Added marker for finding ${finding.id}`);
        } catch (err) {
          console.error(`❌ Error creating marker for finding ${finding.id}:`, err);
        }
      });
    } catch (error) {
      console.error("❌ Error processing findings:", error);
    }
  }

  // Add effect to handle findings changes
  useEffect(() => {
    if (currentTrack && currentTrack.findings && currentTrack.findings.length > 0 && mapRef.current) {
      console.log(`🔍 Track has ${currentTrack.findings.length} findings`);
      processFindings(currentTrack.findings);
    } else {
      console.log('📍 No findings to render');
    }
  }, [currentTrack?.findings]);

  const handleCenterMap = () => {
    if (mapRef.current && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      setIsCentering(true);
      mapRef.current.setView([gpsData.latitude, gpsData.longitude], mapRef.current.getZoom());
      setTimeout(() => setIsCentering(false), 500);
    }
  };

  const toggleGPSFollow = () => {
    setIsFollowingGPS(!isFollowingGPS);
    if (!isFollowingGPS && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      handleCenterMap();
    }
  };

  const handleTagClick = () => {
    setShowTagOptions(true);
  };

  const handleTagSelection = (type: 'finding' | 'poi') => {
    setShowTagOptions(false);
    if (type === 'finding') {
      setShowFindingForm(true);
    } else {
      // Aggiungi un nuovo tag POI
      const newTag: TrackTag = {
        type: 'poi',
        position: [gpsData.latitude, gpsData.longitude],
        timestamp: new Date().toISOString(),
      };
      setCurrentTags([...currentTags, newTag]);
    }
  };

  // Funzione per ottenere il nome della località
  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      if (data.address) {
        const { road, hamlet, village, town, city, state, country } = data.address;
        const location = road || hamlet || village || town || city || state || country;
        setLocationName(location || 'Posizione sconosciuta');
      }
    } catch (error) {
      console.error('Errore nel recupero della località:', error);
      setLocationName('Posizione sconosciuta');
    }
  };

  // Aggiorna il nome della località quando cambia la posizione
  useEffect(() => {
    if (gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      fetchLocationName(gpsData.latitude, gpsData.longitude);
    }
  }, [gpsData.latitude, gpsData.longitude]);

  const getButtonShapeClass = (borderRadius: number | undefined) => {
    const radius = borderRadius ?? 50;
    if (radius === 50) return 'rounded-full';
    if (radius === 0) return 'rounded-none';
    return `rounded-[${radius}px]`;
  };

  const getPositionStyle = (position: { x: number; y: number }, positionType: 'percentage' | 'pixels') => {
    if (positionType === 'percentage') {
      return {
        top: `${position.y}%`,
        right: `${position.x}%`,
        transform: 'translateY(-50%)'
      };
    }
    return {
      top: `${position.y}px`,
      right: `${position.x}px`,
      transform: 'translateY(-50%)'
    };
  };

  const getShadowStyle = (shadow: { color: string; blur: number; spread: number }) => {
    return {
      boxShadow: `0 0 ${shadow.blur}px ${shadow.spread}px ${shadow.color}`
    };
  };

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <p className="text-red-500">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: isRecording ? 1000 : 1 }}>
      <MapContainer
        center={mapCenter}
        zoom={18}
        style={{
          height: '100%',
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {path.length > 0 && (
          <Polyline
            positions={path}
            color="#f5a149"
            weight={3}
            opacity={0.7}
          />
        )}
        <MapCenterUpdater center={mapCenter} />
      </MapContainer>

      {/* Bussola */}
      <CompassWidget direction={currentDirection} />

      {/* Controlli della mappa */}
      <div className="absolute z-[2000]" style={getPositionStyle(navigationButton.position, navigationButton.positionType)}>
        <button
          onClick={toggleGPSFollow}
          className={`${isFollowingGPS ? navigationButton.color : 'bg-gray-400'} ${getButtonShapeClass(navigationButton.borderRadius)} flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative`}
          style={{
            width: navigationButton.size,
            height: navigationButton.size,
            ...getShadowStyle(navigationButton.shadow)
          }}
        >
          <div className={`absolute inset-0 rounded-full ${isFollowingGPS ? 'bg-[#f5a149]/20' : 'bg-gray-400/20'} animate-ping`}></div>
          <Navigation2
            size={navigationButton.iconSize}
            className={`${navigationButton.iconColor} transition-transform duration-300 ${isFollowingGPS ? 'animate-bounce' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      </div>

      <div className="absolute z-[2000]" style={getPositionStyle(centerButton.position, centerButton.positionType)}>
        <button
          onClick={handleCenterMap}
          className={`${centerButton.color} ${getButtonShapeClass(centerButton.borderRadius)} flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95`}
          style={{
            width: centerButton.size,
            height: centerButton.size,
            ...getShadowStyle(centerButton.shadow)
          }}
        >
          <Crosshair
            size={centerButton.iconSize}
            className={`${centerButton.iconColor} transition-transform duration-300 ${isCentering ? 'animate-spin' : ''}`}
            strokeWidth={2.5}
          />
        </button>
      </div>

      {/* Tag Button */}
      <div className="absolute z-[2000]" style={{ left: '2%', bottom: '15%' }}>
        <TagButton />
      </div>

      {/* Stop Button */}
      <div className="absolute z-[2000]" style={{ left: '2%', bottom: '25%' }}>
        <StopButton />
      </div>

      {showTagOptions && (
        <TagOptionsPopup
          onClose={() => setShowTagOptions(false)}
          onFindingClick={() => {
            setShowTagOptions(false);
            setTimeout(() => {
              setShowFindingForm(true);
            }, 100);
          }}
          onPointOfInterestClick={() => {
            setShowTagOptions(false);
            setTimeout(() => {
              useTrackStore.setState({ showPointOfInterestForm: true });
            }, 100);
          }}
        />
      )}

      {showFindingForm && (
        <FindingForm
          onClose={() => setShowFindingForm(false)}
          position={[gpsData.latitude, gpsData.longitude]}
        />
      )}

      {/* Pannello dati */}
      <DataTrackingPanel
        latitude={gpsData.latitude}
        longitude={gpsData.longitude}
        speed={gpsData.speed}
        altitude={gpsData.altitude}
        gpsSignal={gpsSignal}
        direction={currentDirection}
        accuracy={gpsData.accuracy}
      />

      {/* GPS Marker con colore basato sulla precisione */}
      <GpsMarker />
    </div>
  );
};

export default NavigationPage; 