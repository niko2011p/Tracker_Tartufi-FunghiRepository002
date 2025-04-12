import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTrackStore } from '../store/trackStore';
import DataTrackingPanel from '../components/DataTrackingPanel';
import CompassWidget from '../components/CompassWidget';
import { Crosshair, Square, Navigation2, MapPin, Plus, Minus } from 'lucide-react';
import StopTrackingDialog from '../components/StopTrackingDialog';
import TagOptionsPopup from '../components/TagOptionsPopup';
import FindingForm from '../components/FindingForm';

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

// Crea un'icona personalizzata per il marker GPS
const customIcon = L.divIcon({
  className: 'custom-gps-marker',
  html: `
    <div class="relative w-2 h-2">
      <div class="absolute inset-0 bg-blue-500 rounded-full opacity-25 animate-ping"></div>
      <div class="absolute inset-0 bg-blue-500 rounded-full opacity-25 animate-pulse" style="animation-delay: 0.5s"></div>
      <div class="relative w-full h-full bg-blue-500 rounded-full border border-white shadow-lg"></div>
    </div>
  `,
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

// Stile CSS per l'animazione del marker
style.textContent = `
  .custom-gps-marker {
    margin-left: -4px;
    margin-top: -4px;
  }
  .custom-gps-marker .animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  .custom-gps-marker .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  @keyframes pulse {
    50% {
      opacity: .1;
    }
  }
`;
document.head.appendChild(style);

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
  const { currentPosition, currentDirection, isRecording, startTrack, stopTrack, setShowFindingForm, showFindingForm } = useTrackStore();
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
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const [locationName, setLocationName] = useState<string>('Caricamento...');

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
          setPath(prev => [...prev, [latitude, longitude]]);
        }
        
        // Aggiorna lo stato del segnale GPS
        if (accuracy < 10) {
          setGpsSignal('good');
        } else if (accuracy < 50) {
          setGpsSignal('medium');
        } else {
          setGpsSignal('weak');
        }
        
        setMapError(null);
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

  // Aggiorna il marker GPS
  useEffect(() => {
    if (mapRef.current && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.setLatLng([gpsData.latitude, gpsData.longitude]);
      } else {
        gpsMarkerRef.current = L.marker(
          [gpsData.latitude, gpsData.longitude],
          { icon: customIcon }
        ).addTo(mapRef.current);
      }
    }
  }, [gpsData.latitude, gpsData.longitude]);

  const handleCenterMap = () => {
    if (mapRef.current && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      mapRef.current.setView([gpsData.latitude, gpsData.longitude], mapRef.current.getZoom());
      console.log('Centraggio mappa su:', gpsData.latitude, gpsData.longitude);
    }
  };

  const toggleGPSFollow = () => {
    setIsFollowingGPS(!isFollowingGPS);
    if (!isFollowingGPS && gpsData.latitude !== 0 && gpsData.longitude !== 0) {
      handleCenterMap();
    }
  };

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleTagClick = () => {
    setShowTagOptions(true);
  };

  const handleConfirmStop = () => {
    stopTrack();
    setShowStopDialog(false);
  };

  const handleCancelStop = () => {
    setShowStopDialog(false);
  };

  const handleTagSelection = (type: 'finding' | 'poi') => {
    setShowTagOptions(false);
    if (type === 'finding') {
      setShowFindingForm(true);
    } else {
      // Gestione POI
      console.log('Aggiunta POI');
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
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000
    }}>
      <MapContainer
        center={mapCenter}
        zoom={18}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1
        }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {gpsData.latitude !== 0 && gpsData.longitude !== 0 && (
          <Marker
            position={[gpsData.latitude, gpsData.longitude]}
            icon={customIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm mb-1">{locationName}</h3>
                <div className="text-xs space-y-1">
                  <p>Lat: {gpsData.latitude.toFixed(6)}°</p>
                  <p>Lon: {gpsData.longitude.toFixed(6)}°</p>
                  <p>Alt: {gpsData.altitude.toFixed(1)}m</p>
                  <p>Precisione: {gpsData.accuracy.toFixed(1)}m</p>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
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
      <div className="absolute bottom-80 right-6 flex flex-col gap-10 z-[2000]">
        <button
          onClick={toggleGPSFollow}
          className={`p-3 rounded-full text-white hover:bg-opacity-80 transition-all shadow-lg ${
            isFollowingGPS ? 'bg-[#f5a149]' : 'bg-gray-700'
          }`}
          title={isFollowingGPS ? 'GPS tracking attivo' : 'GPS tracking disattivo'}
        >
          <Navigation2 
            className={`w-6 h-6 ${isFollowingGPS ? '' : 'opacity-75'}`}
            style={{ transform: 'rotate(45deg)' }}
          />
        </button>
        <button
          onClick={handleCenterMap}
          className="p-3 bg-[#94ae43] rounded-full text-white hover:bg-opacity-80 transition-all shadow-lg"
          title="Centra sulla posizione GPS"
        >
          <Crosshair className="w-6 h-6" />
        </button>
      </div>

      {/* Controlli di navigazione */}
      <div className="absolute bottom-24 left-4 flex gap-2 z-[2000]">
        <button
          onClick={handleTagClick}
          className="p-3 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
          title="Aggiungi tag"
        >
          <MapPin className="w-6 h-6" />
        </button>
        <button
          onClick={handleStopClick}
          className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-lg"
          title="Ferma tracciamento"
        >
          <Square className="w-6 h-6" />
        </button>
      </div>

      {/* Dialoghi */}
      {showStopDialog && (
        <StopTrackingDialog
          onConfirm={handleConfirmStop}
          onCancel={handleCancelStop}
        />
      )}

      {showTagOptions && (
        <TagOptionsPopup
          onClose={() => setShowTagOptions(false)}
          onSelect={handleTagSelection}
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
      />

      <div className="absolute bottom-4 right-4 z-[2000]">
        <div className="bg-black bg-opacity-40 backdrop-blur-md px-2 py-2 rounded-lg shadow-lg">
          <div className="flex flex-col space-y-1.5">
            <button 
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 0) + 1)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="text-[10px] font-medium text-white text-center">
              {mapRef.current?.getZoom() || 0}x
            </div>
            <button 
              onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 0) - 1)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationPage; 