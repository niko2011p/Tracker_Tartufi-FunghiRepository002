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
      onClose();
    } catch (e) {
      console.error("Errore durante la salvataggio:", e);
      setError("Errore durante la salvataggio. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Preferisce la fotocamera posteriore
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Crea un elemento video temporaneo
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      
      // Aspetta che il video sia pronto
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(true);
        };
      });

      // Crea un canvas per catturare il frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Disegna il frame corrente sul canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converti in base64
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoUrl(photoDataUrl);
      }

      // Ferma lo stream della fotocamera
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Errore nell\'accesso alla fotocamera:', error);
      setError('Impossibile accedere alla fotocamera. Assicurati di aver concesso i permessi necessari.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
                onChange={handleFileChange}
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
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
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