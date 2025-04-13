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
      // Crea un elemento div per contenere l'icona
      const div = document.createElement('div');
      div.className = 'marker-icon-wrapper';
      
      // Crea un elemento SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '32');
      svg.setAttribute('height', '32');
      svg.setAttribute('viewBox', '0 0 32 32');
      
      if (finding.type === 'Fungo') {
        // Cappello del fungo
        const hat = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hat.setAttribute('d', 'M16 8C20 8 24 12 24 16C24 20 20 24 16 24C12 24 8 20 8 16C8 12 12 8 16 8Z');
        hat.setAttribute('fill', '#FF6B6B');
        hat.setAttribute('stroke', '#8B4513');
        hat.setAttribute('stroke-width', '2');
        svg.appendChild(hat);
        
        // Stelo del fungo
        const stem = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        stem.setAttribute('x', '14');
        stem.setAttribute('y', '24');
        stem.setAttribute('width', '4');
        stem.setAttribute('height', '8');
        stem.setAttribute('fill', '#8B4513');
        stem.setAttribute('stroke', '#5D4037');
        stem.setAttribute('stroke-width', '2');
        svg.appendChild(stem);
        
        // Punti sul cappello
        const dots = [
          { cx: '12', cy: '14' },
          { cx: '16', cy: '12' },
          { cx: '20', cy: '14' }
        ];
        dots.forEach(dot => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', dot.cx);
          circle.setAttribute('cy', dot.cy);
          circle.setAttribute('r', '1');
          circle.setAttribute('fill', '#8B4513');
          svg.appendChild(circle);
        });
      } else if (finding.type === 'Tartufo') {
        // Forma del tartufo
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        shape.setAttribute('d', 'M16 6C20 6 24 10 24 14C24 18 20 22 16 22C12 22 8 18 8 14C8 10 12 6 16 6Z');
        shape.setAttribute('fill', '#8B4513');
        shape.setAttribute('stroke', '#5D4037');
        shape.setAttribute('stroke-width', '2');
        svg.appendChild(shape);
        
        // Superficie irregolare
        const texture = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        texture.setAttribute('d', 'M12 10C14 8 18 8 20 10M10 14C12 12 20 12 22 14M12 18C14 16 18 16 20 18');
        texture.setAttribute('stroke', '#5D4037');
        texture.setAttribute('stroke-width', '2');
        texture.setAttribute('stroke-linecap', 'round');
        svg.appendChild(texture);
      }
      
      div.appendChild(svg);
      
      markerRef.current.setIcon(
        L.divIcon({
          className: 'custom-div-icon',
          html: div.outerHTML,
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