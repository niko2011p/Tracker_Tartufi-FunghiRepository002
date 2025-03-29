import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { useTrackStore } from '../store/trackStore';
import { Play } from 'lucide-react';
import { DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapControls.css';
import { Finding } from '../types';

// Constants from Map.tsx
const MIN_ZOOM = 4;
const MAX_ZOOM = 15;
const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333];

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

const createFindingIcon = (type: 'Fungo' | 'Tartufo', isLoaded: boolean = false) => {
  if (type === 'Fungo') {
    const color = '#DC2626';
    const opacity = isLoaded ? '0.5' : '1';
    return new DivIcon({
      html: `
        <div class="finding-icon-wrapper fungo-finding ${pulseAnimation}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2" opacity="${opacity}"/>
            <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.3)" opacity="${opacity}"/>
          </svg>
        </div>
      `,
      className: 'finding-icon fungo-finding',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  } else {
    const opacity = isLoaded ? '0.5' : '1';
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
  }
};

const PausePage: React.FC = () => {
  const { currentTrack, resumeTrack, currentDirection, loadedFindings } = useTrackStore();
  
  // Helper function to determine if a finding is from loaded findings
  const isLoadedFinding = (finding: Finding) => {
    return loadedFindings?.some(f => f.id === finding.id) ?? false;
  };

  // Get the last position from the track or use default
  const lastPosition = currentTrack?.coordinates.length 
    ? currentTrack.coordinates[currentTrack.coordinates.length - 1] 
    : DEFAULT_POSITION;

  // Create the GPS arrow icon with the current direction
  const gpsArrowIcon = createGpsArrowIcon(currentDirection);

  return (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* Full screen map */}
      <MapContainer
        center={lastPosition}
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
        
        {/* Display current position marker */}
        <Marker position={lastPosition} icon={gpsArrowIcon} />
        
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
                  icon={createFindingIcon(finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo')}
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
              finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo',
              true
            )}
          />
        ))}
      </MapContainer>
      
      {/* Riavvia button */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[10000]">
        <button
          onClick={resumeTrack}
          className="unified-button resume"
        >
          <Play className="w-6 h-6" />
          Riavvia
        </button>
      </div>
    </div>
  );
};

export default PausePage;