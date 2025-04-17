import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useTrackStore } from '../store/trackStore';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import './UnifiedButtons.css';
import type { Finding } from '../types';
import FindingForm from './FindingForm';
import TagOptionsPopup from './TagOptionsPopup';
import GpsStatusIndicator from './GpsStatusIndicator';
import CompassIndicator from './CompassIndicator';
import TrackingDataPanel from './TrackingDataPanel';
import { useLocation } from 'react-router-dom';
import { createFindingMarker } from './FindingMarker';

// Constants
const MIN_ZOOM = 4;
const MAX_ZOOM = 15;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 5000
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
    autoSaveTrack 
  } = useTrackStore();
  
  const location = useLocation();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(DEFAULT_POSITION);
  const [direction, setDirection] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [trackingData, setTrackingData] = useState({
    lat: 0,
    lng: 0,
    alt: 0,
    speed: 0
  });

  // Create GPS position marker icon
  const gpsMarkerIcon = L.icon({
    iconUrl: '/assets/icons/map-navigation-orange-icon.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  return (
    <div className="fixed inset-0" style={{ zIndex: 1000 }}>
      <MapContainer
        center={currentPosition}
        zoom={18}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
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

        {/* Current track findings */}
        {currentTrack?.findings.map((finding: Finding) => {
          console.log('📍 Rendering finding:', finding);
          if (!finding.coordinates) {
            console.warn('⚠️ Finding without coordinates:', finding);
            return null;
          }

          return (
            <Marker
              key={finding.id}
              position={finding.coordinates}
              icon={createFindingMarker(finding)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{finding.name || finding.type}</h3>
                  {finding.description && (
                    <p className="text-sm mt-1">{finding.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(finding.timestamp).toLocaleString('it-IT')}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

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
    </div>
  );
};

export default NavigationPage;