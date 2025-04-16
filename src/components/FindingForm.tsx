import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { species } from '../data/species';

export interface FindingFormProps {
  onClose: () => void;
  position: [number, number];
}

function FindingForm({ onClose, position }: FindingFormProps) {
  const { addFinding } = useTrackStore();
  const [findingType, setFindingType] = useState<'Fungo' | 'Tartufo' | 'poi'>('Fungo');
  const [speciesName, setSpeciesName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) {
      setError('Inserisci il nome della specie');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const finding = {
        name: `${findingType} - ${speciesName}`,
        description: `Tipo: ${findingType}\nSpecie: ${speciesName}`,
        photoUrl: photoUrl || undefined,
        type: findingType,
        coordinates: position,
        timestamp: new Date(),
        id: crypto.randomUUID(),
        trackId: crypto.randomUUID()
      };

      await addFinding(finding);
      
      // Aggiungi feedback vibrazione
      if ('vibrate' in navigator) {
        navigator.vibrate(200); // Vibra per 200ms
      }
      
      // Aggiungi un feedback audio
      const audio = new Audio('/sound/alert.mp3');
      audio.volume = 0.3;
      audio.play().catch(console.error);
      
      onClose();
    } catch (e) {
      console.error("Errore durante la salvataggio:", e);
      setError("Errore durante la salvataggio. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = () => {
    // Crea un input file nascosto
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Forza l'uso della fotocamera posteriore
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Crea un canvas per la compressione
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        
        // Carica l'immagine
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Calcola le dimensioni mantenendo l'aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Impossibile ottenere il contesto del canvas');

        // Disegna e comprimi l'immagine
        ctx.drawImage(img, 0, 0, width, height);
        const compressedImage = await new Promise<string>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Impossibile creare il blob dell\'immagine'));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.6 // Riduci la qualità per una migliore compressione
          );
        });

        // Pulisci l'URL dell'immagine
        URL.revokeObjectURL(img.src);
        
        setPhotoUrl(compressedImage);
      } catch (error) {
        console.error('Errore nella compressione dell\'immagine:', error);
        setError('Errore nella compressione dell\'immagine. Riprova con un\'altra immagine.');
      }
    };

    // Attiva l'input file che aprirà l'app fotocamera
    input.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica che il file sia un'immagine
    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine valido');
      return;
    }

    // Verifica la dimensione del file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'immagine è troppo grande. Dimensione massima consentita: 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.src = e.target?.result as string;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Crea un canvas per la compressione
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        // Ridimensiona se necessario
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Impossibile ottenere il contesto del canvas');

        // Disegna e comprimi l'immagine
        ctx.drawImage(img, 0, 0, width, height);
        const compressedImage = await new Promise<string>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Impossibile creare il blob dell\'immagine'));
                return;
              }
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            },
            'image/jpeg',
            0.6 // Riduci la qualità per una migliore compressione
          );
        });

        setPhotoUrl(compressedImage);
      } catch (error) {
        console.error('Errore nella compressione dell\'immagine:', error);
        setError('Errore nella compressione dell\'immagine. Riprova con un\'altra immagine.');
      }
    };
    reader.onerror = () => {
      setError('Errore nella lettura del file. Riprova con un\'altra immagine.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Aggiungi Ritrovamento</h2>
          <div className="flex items-center gap-2">
            {error && (
              <div className="text-red-500 text-sm mr-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors text-lg font-medium"
            >
              {isLoading ? 'Salvataggio...' : 'Salva'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setFindingType('Fungo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className={`flex-1 py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 text-lg ${
                  findingType === 'Fungo'
                    ? 'bg-[#8eaa36] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img src="/icon/mushroom-tag-icon.svg" alt="Fungo" className="w-8 h-8" />
                Fungo
              </button>
              <button
                type="button"
                onClick={() => {
                  setFindingType('Tartufo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className={`flex-1 py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 text-lg ${
                  findingType === 'Tartufo'
                    ? 'bg-[#8B4513] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img src="/icon/Truffle-tag-icon.svg" alt="Tartufo" className="w-8 h-8" />
                Tartufo
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={speciesName}
                onChange={(e) => {
                  setSpeciesName(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Nome specie *"
                className="w-full px-4 py-3 border-2 border-[#8eaa36] rounded-lg focus:ring-2 focus:ring-[#8eaa36] focus:border-[#8eaa36] bg-gray-50 text-lg"
                required
              />
              {showSuggestions && (
                <div 
                  ref={suggestionsRef}
                  className="absolute bottom-full left-0 right-0 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto mb-2"
                >
                  {filteredSpecies.map((suggestion) => (
                    <button
                      key={suggestion.commonName}
                      type="button"
                      onClick={() => {
                        setSpeciesName(`${suggestion.commonName} (${suggestion.scientificName})`);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      <div className="font-medium">{suggestion.commonName}</div>
                      <div className="text-sm text-gray-600">{suggestion.scientificName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleTakePhoto}
                className="flex-1 py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-[#8eaa36] hover:text-[#8eaa36] transition-colors flex items-center justify-center gap-3 text-lg"
              >
                <Camera className="w-6 h-6" />
                Scatta Foto
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-[#8eaa36] hover:text-[#8eaa36] transition-colors flex items-center justify-center gap-3 text-lg"
              >
                <Upload className="w-6 h-6" />
                Carica Foto
              </button>
            </div>

            {photoUrl && (
              <div className="relative w-full">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-[300px] object-contain rounded-lg"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    if (aspectRatio > 1) {
                      // Immagine orizzontale
                      img.style.width = '100%';
                      img.style.height = 'auto';
                    } else {
                      // Immagine verticale
                      img.style.width = 'auto';
                      img.style.height = '300px';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default FindingForm;