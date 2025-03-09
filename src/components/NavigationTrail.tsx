import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface Point {
  lat: number;
  lng: number;
  timestamp: number;
}

export default function NavigationTrail() {
  const map = useMap();
  const [points, setPoints] = useState<Point[]>([]);
  const trailRef = useRef<L.Polyline | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(true);

  useEffect(() => {
    // Create the trail polyline
    trailRef.current = L.polyline([], {
      color: '#4CAF50',
      weight: 2,
      opacity: 0.7,
      smoothFactor: 1,
      className: 'mouse-trail'
    }).addTo(map);

    return () => {
      if (trailRef.current) {
        trailRef.current.remove();
      }
    };
  }, [map]);

  useMapEvents({
    mousemove: (e) => {
      if (!isDrawingRef.current) return;

      const newPoint: Point = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        timestamp: Date.now()
      };

      // Only add points if moved more than 1 pixel
      if (lastPointRef.current) {
        const lastPoint = map.latLngToContainerPoint([
          lastPointRef.current.lat,
          lastPointRef.current.lng
        ]);
        const currentPoint = map.latLngToContainerPoint([newPoint.lat, newPoint.lng]);
        const distance = lastPoint.distanceTo(currentPoint);

        if (distance < 1) return;
      }

      lastPointRef.current = newPoint;
      setPoints(prev => {
        // Keep only last 100 points for performance
        const newPoints = [...prev, newPoint].slice(-100);
        
        if (trailRef.current) {
          trailRef.current.setLatLngs(
            newPoints.map(p => [p.lat, p.lng])
          );
        }
        
        return newPoints;
      });
    },
    mouseout: () => {
      isDrawingRef.current = false;
    },
    mouseover: () => {
      isDrawingRef.current = true;
    },
    zoomstart: () => {
      if (trailRef.current) {
        trailRef.current.setStyle({ opacity: 0 });
      }
    },
    zoomend: () => {
      if (trailRef.current) {
        trailRef.current.setStyle({ opacity: 0.7 });
      }
    }
  });

  return null;
}