import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Track, Finding } from '../types';

interface MapProps {
  track: Track;
  onTakePhoto?: (findingId: string) => void;
}

const Map: React.FC<MapProps> = ({ track, onTakePhoto }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const trackLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inizializza la mappa se non esiste
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      });

      // Aggiungi il layer base se non esiste
      if (!map.getPane('tilePane')) {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
      }

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Rimuovi i layer esistenti
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }
    if (trackLayerRef.current) {
      map.removeLayer(trackLayerRef.current);
    }

    // Crea un nuovo layer per i marker
    markersRef.current = L.layerGroup().addTo(map);

    // Aggiungi i marker per i ritrovamenti
    if (track?.findings) {
      track.findings.forEach(finding => {
        if (!finding.coordinates || finding.coordinates.length !== 2) {
          console.warn('Coordinate non valide per il ritrovamento:', finding);
          return;
        }

        try {
          // Crea l'icona HTML
          const iconUrl = `/icon/${finding.type === 'Fungo' ? 'mushroom-tag-icon.svg' : 'Truffle-tag-icon.svg'}`;
          console.log('Creazione marker per:', finding.name, 'con icona:', iconUrl);

          const iconHtml = `
            <div class="finding-marker" style="
              width: 40px;
              height: 40px;
              position: relative;
              display: flex;
              justify-content: center;
              align-items: center;
            ">
              <div class="finding-pulse" style="
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
                animation: pulse 2s infinite;
              "></div>
              <img 
                src="${iconUrl}" 
                style="
                  width: 32px;
                  height: 32px;
                  position: relative;
                  z-index: 1000;
                  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                "
                alt="${finding.type}"
                onerror="console.error('Failed to load icon:', this.src)"
              />
            </div>
          `;

          // Crea l'icona personalizzata
          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'finding-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          });

          // Crea e aggiungi il marker
          const marker = L.marker(finding.coordinates, {
            icon: customIcon,
            riseOnHover: true,
            zIndexOffset: 1000
          });

          // Aggiungi il popup con i dettagli del ritrovamento
          marker.bindPopup(`
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};">${finding.name}</h3>
              ${finding.description ? `<p style="margin: 0 0 8px 0; color: #666;">${finding.description}</p>` : ''}
              ${finding.photoUrl ? `<img src="${finding.photoUrl}" style="max-width: 200px; margin-bottom: 8px; border-radius: 4px;" alt="${finding.name}">` : ''}
              <p style="margin: 0; font-size: 0.8em; color: #666;">
                ${new Date(finding.timestamp).toLocaleString('it-IT')}
              </p>
            </div>
          `);

          marker.addTo(markersRef.current);
          console.log('Marker aggiunto per il ritrovamento:', finding.id);

          // Forza l'aggiornamento del marker
          marker.update();
        } catch (error) {
          console.error('Errore nella creazione del marker:', error);
        }
      });
    }

    // Aggiungi il tracciato se esiste
    if (track?.coordinates && track.coordinates.length > 0) {
      trackLayerRef.current = L.polyline(track.coordinates, {
        color: '#ff9500',
        weight: 5,
        opacity: 0.7,
        lineJoin: 'round'
      }).addTo(map);

      // Centra la mappa sul tracciato
      map.fitBounds(trackLayerRef.current.getBounds(), {
        padding: [50, 50]
      });
    }

    // Pulisci quando il componente viene smontato
    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
      if (trackLayerRef.current) {
        map.removeLayer(trackLayerRef.current);
      }
    };
  }, [track]);

  // Aggiorna i marker quando cambiano i ritrovamenti
  useEffect(() => {
    if (!mapRef.current || !track) return;

    console.log('Updating markers for track:', track.id);
    console.log('Number of findings:', track.findings.length);

    // Rimuovi i marker esistenti
    if (markersRef.current && Array.isArray(markersRef.current)) {
      markersRef.current.forEach(marker => {
        if (marker && typeof marker.remove === 'function') {
          console.log('Removing existing marker:', marker.options.title);
          marker.remove();
        }
      });
    }
    markersRef.current = [];

    // Aggiungi i marker per i ritrovamenti
    if (Array.isArray(track.findings)) {
      track.findings.forEach(finding => {
        console.log('Processing finding:', finding.id);
        console.log('Finding coordinates:', finding.coordinates);
        
        if (!finding.coordinates || !Array.isArray(finding.coordinates) || finding.coordinates.length !== 2) {
          console.warn('Invalid coordinates for finding:', finding.id);
          return;
        }

        try {
          const marker = L.marker(finding.coordinates, {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="marker-pin ${finding.type.toLowerCase()}"></div>`,
              iconSize: [30, 42],
              iconAnchor: [15, 42]
            }),
            title: finding.name
          });

          console.log('Created marker for finding:', finding.id);

          // Aggiungi il popup
          const popupContent = `
            <div class="popup-content">
              <h3>${finding.name}</h3>
              <p>${finding.description || ''}</p>
              ${finding.photoUrl ? `<img src="${finding.photoUrl}" alt="${finding.name}" style="max-width: 200px; max-height: 200px;">` : ''}
            </div>
          `;

          marker.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 200,
            closeButton: true,
            autoClose: false,
            closeOnClick: false
          });

          console.log('Added popup to marker:', finding.id);

          // Aggiungi il marker alla mappa
          marker.addTo(mapRef.current);
          if (Array.isArray(markersRef.current)) {
            markersRef.current.push(marker);
          } else {
            markersRef.current = [marker];
          }

          console.log('Marker added to map:', finding.id);
        } catch (error) {
          console.error('Error creating marker for finding:', finding.id, error);
        }
      });
    }

    console.log('Total markers added:', Array.isArray(markersRef.current) ? markersRef.current.length : 0);
  }, [track]);

  return (
    <div 
      ref={mapContainerRef} 
          style={{
        width: '100%', 
        height: '100%',
        position: 'relative'
      }} 
    />
  );
};

export default Map;