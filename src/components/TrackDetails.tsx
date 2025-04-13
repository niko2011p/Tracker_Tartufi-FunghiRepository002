import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import Map from './Map';
import { Button } from './ui/button';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';

const TrackDetails: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const { tracks, deleteTrack, exportTrack } = useTrackHistoryStore();
  const track = tracks.find(t => t.id === trackId);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (track && mapRef.current) {
      // Crea un array di coordinate per il polilinea
      const coordinates = track.path.map(point => [point.latitude, point.longitude]);
      
      // Crea il polilinea
      const polyline = L.polyline(coordinates as L.LatLngExpression[], {
        color: '#FF6B00',
        weight: 4,
        opacity: 0.8
      }).addTo(mapRef.current);

      // Aggiungi i marker per i punti di interesse
      track.findings.forEach(finding => {
        L.marker([finding.coordinates.latitude, finding.coordinates.longitude], {
          icon: L.divIcon({
            className: 'custom-icon',
            html: `
              <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                finding.type === 'Fungo' ? 'bg-[#4CAF50]' : 'bg-[#8D6E63]'
              }">
                <span class="text-white text-xs">${finding.type === 'Fungo' ? 'F' : 'T'}</span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(mapRef.current);
      });

      // Adatta la vista per mostrare l'intera traccia
      mapRef.current.fitBounds(polyline.getBounds(), {
        padding: [50, 50]
      });

      return () => {
        polyline.remove();
      };
    }
  }, [track]);

  if (!track) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Traccia non trovata</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Sei sicuro di voler eliminare questa traccia?')) {
      deleteTrack(track.id);
      window.history.back();
    }
  };

  const handleExport = () => {
    exportTrack(track.id);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-semibold">{track.name}</h1>
            <p className="text-sm text-gray-500">
              {new Date(track.startTime).toLocaleString()} - {new Date(track.endTime).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="rounded-full"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="rounded-full text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mappa */}
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          center={[track.path[0].latitude, track.path[0].longitude]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        />
      </div>

      {/* Dettagli traccia */}
      <div className="bg-white p-4 shadow-inner">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-700">Distanza</h3>
            <p className="text-2xl font-bold text-orange-500">
              {(track.distance / 1000).toFixed(2)} km
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Durata</h3>
            <p className="text-2xl font-bold text-orange-500">
              {Math.floor(track.duration / 60)} min
            </p>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold text-gray-700">Punti di interesse</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#4CAF50] mr-2"></div>
              <span>Funghi: {track.findings.filter(f => f.type === 'Fungo').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-[#8D6E63] mr-2"></div>
              <span>Tartufi: {track.findings.filter(f => f.type === 'Tartufo').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;