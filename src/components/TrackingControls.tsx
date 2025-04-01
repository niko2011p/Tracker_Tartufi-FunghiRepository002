import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Play, Square, MapPin, Upload, X, History, Cloud, Map, AlertCircle } from 'lucide-react';
import AlertPopup from './AlertPopup';
import { useTrackStore } from '../store/trackStore';
import { Link, useLocation } from 'react-router-dom';
import { species } from '../data/species';

function TrackingControls() {
  const { currentTrack, isRecording, startTrack, stopTrack, addFinding, nearbyFinding, isAlertPlaying } = useTrackStore();
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [findingType, setFindingType] = useState<'Fungo' | 'Tartufo'>('Fungo');
  const [speciesName, setSpeciesName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredSpecies = useMemo(() => {
    if (!speciesName.trim()) return [];
    const searchTerm = speciesName.toLowerCase();
    return species
      .filter(s => s.type === findingType)
      .filter(s => 
        s.commonName.toLowerCase().includes(searchTerm) ||
        s.scientificName.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5);
  }, [speciesName, findingType]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Per favore seleziona un file immagine');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('L\'immagine deve essere inferiore a 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSpeciesSelect = (scientificName: string, commonName: string) => {
    setSpeciesName(`${commonName} (${scientificName})`);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFindingSubmit = (e: React.FormEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    if (!speciesName.trim()) {
      alert('Inserisci il nome della specie');
      if (button) button.disabled = false;
      return;
    }

    addFinding({
      name: `${findingType} - ${speciesName}`,
      description: `Tipo: ${findingType}\nSpecie: ${speciesName}`,
      photoUrl: photoUrl || undefined
    });

    setShowFindingForm(false);
    setFindingType('Fungo');
    setSpeciesName('');
    setPhotoUrl(null);
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
    }, 500);
  };

  const handleStopConfirm = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;

    stopTrack();
    setShowStopConfirm(false);
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
      // Navigate to Logger section and scroll to the latest track
      const tracksContainer = document.querySelector('.tracks-container');
      if (tracksContainer) {
        tracksContainer.scrollTo({
          top: tracksContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 500);
  };

  const handleCloseAlert = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    useTrackStore.setState({ nearbyFinding: null });
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
    }, 500);
  };

  const handleMuteAlert = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Previeni clic multipli
    const button = e?.target?.closest('button');
    if (button) button.disabled = true;
    
    useTrackStore.setState({ isAlertPlaying: false });
    
    // Riabilita il pulsante dopo un breve delay
    setTimeout(() => {
      if (button) button.disabled = false;
    }, 500);
  };

  return (
    <>
      {nearbyFinding && (
        <AlertPopup
          finding={nearbyFinding}
          onClose={handleCloseAlert}
          onMute={handleMuteAlert}
          isAudioPlaying={isAlertPlaying}
        />
      )}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Conferma interruzione</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              Sei sicuro di voler interrompere la registrazione della traccia?
            </p>
            <p className="text-gray-600 mb-6">
              La traccia verrà salvata automaticamente nello storico.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowStopConfirm(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                role="button"
                tabIndex={0}
              >
                Annulla
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleStopConfirm();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                role="button"
                tabIndex={0}
              >
                Interrompi e salva
              </button>
            </div>
          </div>
        </div>
      )}

      {showFindingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nuovo Ritrovamento</h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowFindingForm(false);
                  setPhotoUrl(null);
                }} 
                className="text-gray-500 hover:text-gray-700"
                role="button"
                tabIndex={0}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleFindingSubmit} className="space-y-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  id="type"
                  value={findingType}
                  onChange={(e) => {
                    setFindingType(e.target.value as 'Fungo' | 'Tartufo');
                    setSpeciesName('');
                    setShowSuggestions(false);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8eaa36] focus:ring-[#8eaa36]"
                  required
                >
                  <option value="Fungo">Fungo</option>
                  <option value="Tartufo">Tartufo</option>
                </select>
              </div>

              <div className="relative">
                <label htmlFor="species" className="block text-sm font-medium text-gray-700">Nome Specie</label>
                <input
                  ref={inputRef}
                  type="text"
                  id="species"
                  value={speciesName}
                  onChange={(e) => {
                    setSpeciesName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#8eaa36] focus:ring-[#8eaa36]"
                  placeholder={`Cerca ${findingType.toLowerCase()}...`}
                  required
                />
                
                {showSuggestions && filteredSpecies.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto"
                  >
                    {filteredSpecies.map((s, index) => (
                      <button
                        key={s.scientificName}
                        type="button"
                        onClick={() => handleSpeciesSelect(s.scientificName, s.commonName)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          index !== filteredSpecies.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="font-medium">{s.commonName}</div>
                        <div className="text-sm text-gray-500 italic">{s.scientificName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Foto (opzionale)
                </label>
                
                {!photoUrl ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 transition-colors duration-400"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-500">Carica foto</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={photoUrl} 
                      alt="Anteprima foto" 
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-[#8eaa36] text-white rounded-full hover:bg-[#7d9830] transition-colors duration-400"
                        title="Carica nuova foto"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(null)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Rimuovi foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowFindingForm(false);
                    setPhotoUrl(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                  role="button"
                  tabIndex={0}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    // Non usiamo preventDefault qui perché vogliamo che il form venga inviato
                    e.stopPropagation();
                  }}
                  className="px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400"
                  role="button"
                  tabIndex={0}
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4 z-[1000]">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {!currentTrack ? (
              <div className="flex flex-col w-full sm:w-auto gap-3">
                {/* Buttons removed to avoid duplication with FloatingMapButtons */}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {/* Nascondo i vecchi pulsanti rettangolari quando la traccia è in registrazione */}
                {!isRecording && (
                  <>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowStopConfirm(true);
                      }}
                      className="w-full sm:w-auto bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-3 font-medium"
                      role="button"
                      tabIndex={0}
                    >
                      <Square className="w-6 h-6" />
                      <span>Stop</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShowFindingForm(true);
                      }}
                      className="w-full sm:w-auto bg-[#fd9a3c] text-white px-6 py-3 rounded-lg hover:bg-[#e88a2c] transition-colors duration-400 flex items-center justify-center gap-3 font-medium"
                      role="button"
                      tabIndex={0}
                    >
                      <MapPin className="w-6 h-6" />
                      <span>Aggiungi Ritrovamento</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4 pt-2 border-t border-gray-200">
            <Link
              to="/"
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                location.pathname === '/' 
                  ? 'bg-[#8eaa36]/10 text-[#8eaa36]' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Map className="w-5 h-5" />
              <span>Mappa</span>
            </Link>
            <Link
              to="/storico"
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                location.pathname === '/storico'
                  ? 'bg-[#8eaa36]/10 text-[#8eaa36]'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <History className="w-5 h-5" />
              <span>Storico</span>
            </Link>
            <Link
              to="/meteo"
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                location.pathname === '/meteo'
                  ? 'bg-[#8eaa36]/10 text-[#8eaa36]'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Cloud className="w-5 h-5" />
              <span>Meteo</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default TrackingControls;