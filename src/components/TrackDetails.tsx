import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Track, Finding } from '../types';
import { X, Download, Share2, Maximize2, Save, Upload, Camera, MapPin } from 'lucide-react';
import { DivIcon, LatLngBounds, LatLng } from 'leaflet';
import html2canvas from 'html2canvas';

interface TrackDetailsProps {
  track: Track;
  onClose: () => void;
}

const MIN_ZOOM = 4;
const MAX_ZOOM = 15;

interface PhotoViewerProps {
  url: string;
  onClose: () => void;
}

const PhotoViewer = ({ url, onClose }: PhotoViewerProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10000]">
    <button 
      onClick={onClose}
      className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
    >
      <X className="w-8 h-8" />
    </button>
    <img 
      src={url} 
      alt="Full size"
      className="max-h-[90vh] max-w-[90vw] object-contain"
    />
  </div>
);

interface ShareModalProps {
  onClose: () => void;
  onShare: () => void;
  isGenerating: boolean;
}

const ShareModal = ({ onClose, onShare, isGenerating }: ShareModalProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Condividi Traccia</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="mb-6">
        <p className="text-gray-600">
          L'immagine condivisa includerà:
        </p>
        <ul className="mt-2 space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500" />
            <span>La traccia GPS completa del percorso</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-xl">🍄</span>
            <span>Marker per i funghi trovati</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span>Marker per i tartufi trovati</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>Legenda con il significato delle icone</span>
          </li>
        </ul>
      </div>
      <button
        onClick={onShare}
        disabled={isGenerating}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isGenerating 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generazione in corso...</span>
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            <span>Genera e Condividi</span>
          </>
        )}
      </button>
    </div>
  </div>
);

interface ExportModalProps {
  onClose: () => void;
  onExportLocal: () => void;
  onExportDrive: () => void;
}

const ExportModal = ({ onClose, onExportLocal, onExportDrive }: ExportModalProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Esporta GPX</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <p className="text-gray-600 mb-6">Scegli dove esportare il file GPX:</p>
      <div className="space-y-4">
        <button
          onClick={onExportLocal}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Save className="w-5 h-5" />
          <span>Salva sul dispositivo</span>
        </button>
        <button
          onClick={onExportDrive}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span>Esporta su Google Drive</span>
        </button>
      </div>
    </div>
  </div>
);

const createFindingIcon = (type: 'Fungo' | 'Tartufo', isSharing: boolean = false) => {
  if (isSharing) {
    return new DivIcon({
      html: `<div class="finding-icon-wrapper ${type.toLowerCase()}-finding">
        <span style="font-size: 24px;">${type === 'Fungo' ? '🍄' : '🎯'}</span>
      </div>`,
      className: `finding-icon ${type.toLowerCase()}-finding`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  const color = type === 'Fungo' ? '#DC2626' : '#1c1917';
  return new DivIcon({
    html: `
      <div class="finding-icon-wrapper ${type.toLowerCase()}-finding">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="rgba(255,255,255,0.3)"/>
        </svg>
      </div>
    `,
    className: `finding-icon ${type.toLowerCase()}-finding`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

function MapController({ track }: { track: Track }) {
  const map = useMap();

  useEffect(() => {
    if (!map || track.coordinates.length === 0) return;

    const bounds = track.coordinates.reduce((acc, coord) => {
      acc.extend(new LatLng(coord[0], coord[1]));
      return acc;
    }, new LatLngBounds(track.coordinates[0], track.coordinates[0]));

    track.findings.forEach(finding => {
      bounds.extend(new LatLng(finding.coordinates[0], finding.coordinates[1]));
    });

    const paddedBounds = bounds.pad(0.1);
    
    setTimeout(() => {
      map.fitBounds(paddedBounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 1
      });
    }, 100);

  }, [map, track]);

  return null;
}

export default function TrackDetails({ track, onClose }: TrackDetailsProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const initialCenter = track.coordinates.length > 0 
    ? track.coordinates[0] 
    : [42.8333, 12.8333] as [number, number];

  const generateGpxContent = (track: Track) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>${track.location?.name || `Track ${format(track.startTime, 'yyyy-MM-dd HH:mm')}`}</name>
    <trkseg>
      ${track.coordinates.map(coord => `
      <trkpt lat="${coord[0]}" lon="${coord[1]}">
        <time>${track.startTime.toISOString()}</time>
      </trkpt>`).join('')}
    </trkseg>
    ${track.findings.map(finding => `
    <wpt lat="${finding.coordinates[0]}" lon="${finding.coordinates[1]}">
      <name>${finding.name}</name>
      <desc>${finding.description || ''}</desc>
      <time>${finding.timestamp.toISOString()}</time>
    </wpt>`).join('')}
  </trk>
</gpx>`;
  };

  const generateFileName = (track: Track) => {
    const locationName = track.location?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'track';
    const timestamp = format(track.startTime, 'yyyy-MM-dd_HH-mm');
    return `${locationName}_${timestamp}.gpx`;
  };

  const handleExportLocal = () => {
    const gpxContent = generateGpxContent(track);

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFileName(track);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    
    // Show confirmation message
    const confirmationMessage = document.createElement('div');
    confirmationMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-[10000]';
    confirmationMessage.textContent = `File salvato come: ${generateFileName(track)}`;
    document.body.appendChild(confirmationMessage);
    setTimeout(() => document.body.removeChild(confirmationMessage), 3000);
  };

  const handleExportDrive = () => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      'https://drive.google.com',
      'googledrive',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    setShowExportModal(false);
  };

  const handleShare = async () => {
    if (!mapRef.current) return;

    setIsGeneratingShare(true);
    setIsSharing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      mapRef.current.classList.add('screenshot-mode');

      const canvas = await html2canvas(mapRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
        logging: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const mapElement = clonedDoc.querySelector('.leaflet-container');
          if (mapElement) {
            (mapElement as HTMLElement).style.height = '600px';
          }

          // Add legend
          const legend = document.createElement('div');
          legend.className = 'absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[1000]';
          legend.innerHTML = `
            <h3 class="text-sm font-semibold mb-2">Legenda</h3>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span style="font-size: 20px;">🍄</span>
                <span class="text-sm">Funghi</span>
              </div>
              <div class="flex items-center gap-2">
                <span style="font-size: 20px;">🎯</span>
                <span class="text-sm">Tartufi</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-4 h-1 bg-[#FF9800]"></div>
                <span class="text-sm">Percorso</span>
              </div>
            </div>
          `;
          mapElement?.appendChild(legend);
        }
      });

      mapRef.current.classList.remove('screenshot-mode');
      setIsSharing(false);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png', 0.9);
      });

      const file = new File([blob], `track-${format(track.startTime, 'yyyy-MM-dd-HH-mm')}.png`, {
        type: 'image/png'
      });

      const textContent = `
Traccia del ${format(track.startTime, "d MMMM yyyy", { locale: it })}
${track.location ? `Località: ${track.location.name}${track.location.region ? ` (${track.location.region})` : ''}` : ''}
Durata: ${format(track.startTime, "HH:mm")} - ${track.endTime ? format(track.endTime, "HH:mm") : 'In corso'}
Distanza: ${track.distance.toFixed(2)} km

Ritrovamenti:
${track.findings.map(f => `${f.name.startsWith('Fungo') ? '🍄' : '🎯'} ${f.name}`).join('\n')}
      `.trim();

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Track ${format(track.startTime, 'yyyy-MM-dd HH:mm')}`,
          text: textContent,
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `track-${format(track.startTime, 'yyyy-MM-dd-HH-mm')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Si è verificato un errore durante la condivisione. Riprova più tardi.');
    } finally {
      setIsGeneratingShare(false);
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Dettagli Traccia - {format(track.startTime, "d MMMM yyyy HH:mm", { locale: it })}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          <div ref={mapRef} className="relative">
            <MapContainer
              key={`map-${track.id}`}
              center={initialCenter}
              zoom={13}
              className="w-full h-[500px] rounded-lg"
              zoomControl={true}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
            >
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution='Map data: &copy; OpenStreetMap contributors'
              />
              <MapController track={track} />
              <Polyline
                positions={track.coordinates}
                color="#FF9800"
                weight={3}
                opacity={0.8}
              />
              {track.findings.map((finding: Finding) => (
                <Marker
                  key={finding.id}
                  position={finding.coordinates}
                  icon={createFindingIcon(
                    finding.name.startsWith('Fungo') ? 'Fungo' : 'Tartufo',
                    isSharing
                  )}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{finding.name}</h3>
                      {finding.description && (
                        <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                      )}
                      {finding.photoUrl && (
                        <div className="mt-2 relative group">
                          <img 
                            src={finding.photoUrl} 
                            alt={finding.name}
                            className="w-32 h-32 object-cover rounded-lg cursor-pointer"
                            onClick={() => setSelectedPhoto(finding.photoUrl)}
                          />
                          <button
                            onClick={() => setSelectedPhoto(finding.photoUrl)}
                            className="absolute top-1 right-1 p-1 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {format(finding.timestamp, "HH:mm", { locale: it })}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Distanza: {track.distance.toFixed(2)} km</p>
            <p>Ritrovamenti: {track.findings.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span>Condividi</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Esporta GPX</span>
            </button>
          </div>
        </div>
      </div>

      {selectedPhoto && (
        <PhotoViewer 
          url={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
        />
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExportLocal={handleExportLocal}
          onExportDrive={handleExportDrive}
        />
      )}

      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
          isGenerating={isGeneratingShare}
        />
      )}
    </div>
  );
}