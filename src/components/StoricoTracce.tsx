import React, { useState, useMemo, useRef } from 'react';
import { useTrackStore } from '../store/trackStore';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { it } from 'date-fns/locale';
import { MapPin, Clock, Route, Download, Upload, Map as MapIcon, History, Cloud, Search, X, Trash2, AlertTriangle, Navigation, Save, Info } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TrackDetails from './TrackDetails';
import { Track, Finding } from '../types';

function formatDuration(startTime: Date, endTime: Date | null): string {
  if (!endTime) return 'In corso';
  
  const minutes = differenceInMinutes(endTime, startTime);
  const hours = differenceInHours(endTime, startTime);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

interface ExportModalProps {
  onClose: () => void;
  onExportLocal: () => void;
  onExportDrive: () => void;
}

const ExportModal = ({ onClose, onExportLocal, onExportDrive }: ExportModalProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Esporta Tracce</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#fd9a3c] mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="mb-2">Prima di esportare le tracce GPX su Google Drive:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>I file GPX verranno prima salvati nella cartella "Download" del tuo dispositivo</li>
              <li>Dovrai successivamente caricare manualmente questi file su Google Drive</li>
            </ol>
          </div>
        </div>
      </div>

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

interface ImportModalProps {
  onClose: () => void;
  onImportLocal: () => void;
  onImportDrive: () => void;
}

const ImportModal = ({ onClose, onImportLocal, onImportDrive }: ImportModalProps) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Importa Tracce</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <p className="text-gray-600 mb-6">Scegli da dove importare le tracce:</p>
      <div className="space-y-4">
        <button
          onClick={onImportLocal}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400"
        >
          <Save className="w-5 h-5" />
          <span>Importa dal dispositivo</span>
        </button>
        <button
          onClick={onImportDrive}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#fd9a3c] text-white rounded-lg hover:bg-[#e88a2c] transition-colors"
        >
          <Upload className="w-5 h-5" />
          <span>Importa da Google Drive</span>
        </button>
      </div>
    </div>
  </div>
);

const getFindingStyles = (finding: Finding) => {
  const isFungo = finding.name.startsWith('Fungo');
  return {
    bg: isFungo ? 'bg-[#8B4513]/10' : 'bg-[#1c1917]/10',
    text: isFungo ? 'text-[#8B4513]' : 'text-[#1c1917]',
    hover: isFungo ? 'hover:bg-[#8B4513]/20' : 'hover:bg-[#1c1917]/20'
  };
};

let renderCount = 0;

export default function StoricoTracce() {
  const { tracks, exportTracks, importTracks, deleteTrack, deleteAllTracks, loadFindings, startTrack } = useTrackStore();
  const logoStyle = {
    display: 'block',
    margin: '1rem auto',
    height: '8rem',
    width: 'auto'
  };
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showFinalDeleteConfirm, setShowFinalDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [uniqueId] = useState(() => `storico-${Math.random().toString(36).substr(2, 9)}`);

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    
    const query = searchQuery.toLowerCase().trim();
    return tracks.filter(track => {
      const hasMatchingFindings = track.findings.some(finding => 
        finding.name.toLowerCase().includes(query) ||
        finding.description?.toLowerCase().includes(query)
      );

      const locationMatch = track.location?.name.toLowerCase().includes(query) ||
                          track.location?.region?.toLowerCase().includes(query);

      const coordinates = track.coordinates.map(coord => 
        `${coord[0].toFixed(3)},${coord[1].toFixed(3)}`
      ).join(' ');

      return hasMatchingFindings || locationMatch || coordinates.includes(query);
    });
  }, [tracks, searchQuery]);

  const generateFileName = (track: Track) => {
    const locationName = track.location?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'track';
    const timestamp = format(track.startTime, 'yyyy-MM-dd_HH-mm');
    return `${locationName}_${timestamp}.gpx`;
  };

  const handleExportLocal = () => {
    // Export each track as a separate file
    tracks.forEach(track => {
      const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
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

      const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFileName(track);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    setShowExportModal(false);

    // Show confirmation message
    const confirmationMessage = document.createElement('div');
    confirmationMessage.className = 'fixed bottom-4 right-4 bg-[#8eaa36] text-white px-4 py-2 rounded-lg shadow-lg z-[10000]';
    confirmationMessage.textContent = `${tracks.length} tracce esportate con successo`;
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

  const handleImportLocal = () => {
    fileInputRef.current?.click();
    setShowImportModal(false);
  };

  const handleImportDrive = () => {
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    window.open(
      'https://drive.google.com',
      'googledrive',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    setShowImportModal(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importTracks(content);
      };
      reader.readAsText(file);
    }
  };

  const handleDeleteConfirm = (id: string) => {
    deleteTrack(id);
    setShowDeleteConfirm(null);
  };

  const handleDeleteAllConfirm = () => {
    setShowDeleteAllConfirm(false);
    setShowFinalDeleteConfirm(true);
  };

  const handleFinalDeleteConfirm = () => {
    deleteAllTracks();
    setShowFinalDeleteConfirm(false);
  };

  const handleLoadAndNavigate = (track: Track) => {
    loadFindings(track.findings);
    startTrack();
    navigate('/');
  };

  renderCount++;

  return (
    <div className="flex flex-col h-full">
      <img src="/LogoFTL.svg" alt="LogoFTL" style={logoStyle} />
      {selectedTrack && (
        <TrackDetails
          key={`details-${uniqueId}-${selectedTrack.id}`}
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
      )}

      {showDeleteConfirm && (
        <div 
          key={`delete-confirm-${uniqueId}-${showDeleteConfirm}`}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Conferma eliminazione</h3>
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eliminare questa traccia? Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Conferma eliminazione</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Sei sicuro di voler eliminare tutte le tracce? 
            </p>
            <p className="text-gray-600 mb-6">
              Questa azione rimuoverà permanentemente tutte le tracce e i ritrovamenti salvati.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteAllConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Continua
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold">Conferma finale</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Questa è l'ultima conferma prima di eliminare definitivamente tutte le tracce.
            </p>
            <p className="text-red-600 font-medium mb-6">
              Questa azione non può essere annullata!
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowFinalDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleFinalDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Elimina tutto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExportLocal={handleExportLocal}
          onExportDrive={handleExportDrive}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportLocal={handleImportLocal}
          onImportDrive={handleImportDrive}
        />
      )}

      <div className="flex-1 p-4 max-w-3xl mx-auto overflow-y-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[#4b5320]">Logger</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-[#8eaa36] text-white px-4 py-2 rounded-lg hover:bg-[#7d9830] transition-colors duration-400 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Esporta GPX</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-[#fd9a3c] text-white px-4 py-2 rounded-lg hover:bg-[#e88a2c] transition-colors duration-400 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Importa GPX</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".gpx"
                className="hidden"
              />
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per località o ritrovamento..."
              className="w-full px-4 py-2 pl-10 pr-10 border rounded-lg focus:ring-2 focus:ring-[#8eaa36] focus:border-[#8eaa36] transition-shadow"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Nessuna traccia trovata per questa ricerca' : 'Nessuna traccia salvata'}
            </div>
          ) : (
            filteredTracks.map((track, index) => (
              <div 
                key={`track-${uniqueId}-${track.id}-${index}-${renderCount}`}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {format(track.startTime, "d MMMM yyyy", { locale: it })}
                    </h3>
                    {track.location && (
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapIcon className="w-4 h-4" />
                        <span>{track.location.name}</span>
                        {track.location.region && (
                          <span className="text-gray-400">({track.location.region})</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {format(track.startTime, "HH:mm", { locale: it })}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm">
                      {formatDuration(track.startTime, track.endTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Route className="w-5 h-5 text-[#FF9800] mr-2" />
                    <span className="text-sm">{track.distance.toFixed(2)} km</span>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm">{track.findings.length} ritrovamenti</span>
                  </div>
                </div>

                {track.findings.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Ritrovamenti:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {track.findings.map((finding, findingIndex) => {
                        const styles = getFindingStyles(finding);
                        return (
                          <div 
                            key={`finding-${uniqueId}-${track.id}-${finding.id}-${findingIndex}-${renderCount}`}
                            className={`flex items-center p-2 rounded ${styles.bg} ${styles.hover} transition-colors`}
                          >
                            <MapPin className={`w-4 h-4 mr-2 ${styles.text}`} />
                            <span className={`text-sm truncate ${styles.text}`} title={finding.name}>
                              {finding.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setSelectedTrack(track)}
                    className="flex-1 bg-[#8eaa36]/10 text-[#8eaa36] py-2 rounded-lg hover:bg-[#8eaa36]/20 transition-colors duration-400"
                  >
                    Visualizza dettagli
                  </button>
                  <button
                    onClick={() => handleLoadAndNavigate(track)}
                    className="flex-1 bg-[#fd9a3c]/10 text-[#fd9a3c] py-2 rounded-lg hover:bg-[#fd9a3c]/20 transition-colors duration-400 flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>Carica Ritrovamento e Avvia</span>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(track.id)}
                    className="px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Elimina traccia"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {tracks.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="w-full bg-red-50 text-red-600 py-3 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              <span>Elimina tutte le tracce</span>
            </button>
          </div>
        )}
      </div>

      {/* Fixed footer is now handled by the FixedFooter component */}
    </div>
  );
}