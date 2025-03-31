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
            <MapPin className="w-4 h-4 text-[#8eaa36]" />
            <span>La traccia GPS completa del percorso</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-xl">🍄</span>
            <span>Marker per i funghi trovati</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-xl">🪨</span>
            <span>Marker per i tartufi trovati</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#fd9a3c]" />
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
            : 'bg-[#fd9a3c] hover:bg-[#e88a2c] text-white'
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
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400"
        >
          <Save className="w-5 h-5" />
          <span>Salva sul dispositivo</span>
        </button>
        <button
          onClick={onExportDrive}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fd9a3c] text-white rounded-lg hover:bg-[#e88a2c] transition-colors"
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
        <span style="font-size: 24px;">${type === 'Fungo' ? '🍄' : '🪨'}</span>
      </div>`,
      className: `finding-icon ${type.toLowerCase()}-finding`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  return new DivIcon({
    html: `
      <div class="finding-icon-wrapper ${type.toLowerCase()}-finding">
        <img src="/icon/${type === 'Fungo' ? 'mushroom' : 'Truffle'}-tag-icon.svg" width="24" height="24" alt="${type} Icon" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));" />
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
        minZoom: 15,
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
  const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
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
    confirmationMessage.className = 'fixed bottom-4 right-4 bg-[#8eaa36] text-white px-4 py-2 rounded-lg shadow-lg z-[10000]';
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
                <span style="font-size: 20px;">🪨</span>
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
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header con titolo e pulsante di chiusura */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Dettagli Traccia
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Informazioni principali */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Data</p>
              <p className="font-medium">{format(track.startTime, "d MMMM yyyy", { locale: it })}</p>
              <p className="text-sm">{format(track.startTime, "HH:mm", { locale: it })}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Durata</p>
              <p className="font-medium">{track.endTime ? 
                `${Math.floor((track.endTime.getTime() - track.startTime.getTime()) / (1000 * 60))} min` : 
                'In corso'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Distanza</p>
              <p className="font-medium">{track.distance.toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ritrovamenti</p>
              <p className="font-medium">{track.findings.length}</p>
            </div>
          </div>
        </div>
        
        {/* Mappa con tracciato e tag */}
        <div 
          ref={mapRef}
          className="relative h-[400px] rounded-lg overflow-hidden mb-6 border border-gray-200"
        >
          <MapContainer
            center={initialCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
          >
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data: &copy; OpenStreetMap contributors'
            />
            
            <MapController track={track} />
            
            {/* Tracciato come linea arancione */}
            {track.coordinates.length > 0 && (
              <Polyline 
                positions={track.coordinates} 
                color="#FF9800" 
                weight={3} 
                opacity={0.8}
              />
            )}
            
            {/* Ritrovamenti con icone specifiche */}
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
          
          {/* Pulsanti di azione per condividere ed esportare */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
              title="Condividi"
            >
              <Share2 className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
              title="Esporta GPX"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
        
        {/* Dati meteo storici */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Dati Meteo Storici</h3>
          
          {isLoadingWeather ? (
            <div className="flex justify-center items-center h-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f5a149]"></div>
            </div>
          ) : weatherHistory.length > 0 ? (
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <div className="flex space-x-4 min-w-max">
                {weatherHistory.map((day, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-sm min-w-[120px]">
                    <div className="text-center">
                      <p className="text-sm font-medium">{day.date}</p>
                      <div className="text-2xl my-2">{day.icon}</div>
                      <p className="font-bold text-lg">{day.temp}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        <p>Umidità: {day.humidity}</p>
                        <p>Precipitazioni: {day.precipitation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">Dati meteo non disponibili per questa traccia.</p>
          )}
        </div>
        
        {/* Ritrovamenti */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Ritrovamenti</h3>
          
          {track.findings.length === 0 ? (
            <p className="text-gray-500 italic">Nessun ritrovamento registrato per questa traccia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {track.findings.map((finding: Finding) => (
                <div 
                  key={finding.id}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedPhoto(finding.photoUrl || null);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full w-10 h-10 flex items-center justify-center ${
                      finding.name.startsWith('Fungo') ? 'bg-red-100' : 'bg-gray-900 text-white'
                    }`}>
                      <span className="text-xl">
                        {finding.name.startsWith('Fungo') ? '🍄' : '🪨'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{finding.name}</h4>
                      <p className="text-sm text-gray-500">
                        {format(finding.timestamp, 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {finding.photoUrl && (
                    <div className="mt-3">
                      <img 
                        src={finding.photoUrl} 
                        alt={finding.name}
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                  
                  {finding.description && (
                    <p className="mt-2 text-sm text-gray-600">{finding.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Visualizzatore foto */}
      {selectedPhoto && (
        <PhotoViewer 
          url={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
        />
      )}
      
      {/* Modal per la condivisione */}
      {showShareModal && (
        <ShareModal 
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
          isGenerating={isGeneratingShare}
        />
      )}
      
      {/* Modal per l'esportazione */}
      {showExportModal && (
        <ExportModal 
          onClose={() => setShowExportModal(false)}
          onExportLocal={handleExportLocal}
          onExportDrive={handleExportDrive}
        />
      )}
    </div>
  );
}