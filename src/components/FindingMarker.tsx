import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import FindingIcon from './FindingIcons';

interface FindingMarkerProps {
  finding: {
    id: string;
    name: string;
    type: 'Fungo' | 'Tartufo';
    coordinates: [number, number];
    description?: string;
    photo?: string;
  };
  map: L.Map;
}

const FindingMarker: React.FC<FindingMarkerProps> = ({ finding, map }) => {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(
        L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="marker-icon-wrapper">
            ${FindingIcon({ type: finding.type, size: 32 })}
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
      );
    }
  }, [finding.type]);

  return (
    <Marker
      ref={markerRef}
      position={finding.coordinates}
      eventHandlers={{
        click: () => {
          map.setView(finding.coordinates, map.getZoom());
        },
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-lg">{finding.name}</h3>
          <p className="text-sm text-gray-600">Tipo: {finding.type}</p>
          {finding.description && (
            <p className="mt-2 text-sm">{finding.description}</p>
          )}
          {finding.photo && (
            <img
              src={finding.photo}
              alt={finding.name}
              className="mt-2 rounded-lg max-w-full h-auto"
            />
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default FindingMarker; 