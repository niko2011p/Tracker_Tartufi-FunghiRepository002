import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { species } from '../data/species';

interface FindingFormProps {
  onClose: () => void;
}

function FindingForm({ onClose }: FindingFormProps) {
  const { addFinding } = useTrackStore();
  const [findingType, setFindingType] = useState<'Fungo' | 'Tartufo'>('Fungo');
  const [speciesName, setSpeciesName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleSpeciesSelect = (scientificName: string, commonName: string) => {
    setSpeciesName(`${commonName} (${scientificName})`);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleFindingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!speciesName.trim()) {
      alert('Inserisci il nome della specie');
      return;
    }

    addFinding({
      name: speciesName,
      description: `Specie: ${speciesName}`,
      photoUrl: photoUrl || undefined,
      type: findingType
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-semibold">Nuovo Ritrovamento</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setPhotoUrl(null);
              }}
              className="px-3 py-1 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              form="finding-form"
              className="px-3 py-1 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400"
            >
              Salva
            </button>
          </div>
        </div>

        <form id="finding-form" onSubmit={handleFindingSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-[#8eaa36]"
                  name="findingType"
                  value="Fungo"
                  checked={findingType === 'Fungo'}
                  onChange={() => {
                    setFindingType('Fungo');
                    setSpeciesName('');
                    setShowSuggestions(false);
                  }}
                />
                <span className="ml-2">Fungo</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-[#8eaa36]"
                  name="findingType"
                  value="Tartufo"
                  checked={findingType === 'Tartufo'}
                  onChange={() => {
                    setFindingType('Tartufo');
                    setSpeciesName('');
                    setShowSuggestions(false);
                  }}
                />
                <span className="ml-2">Tartufo</span>
              </label>
            </div>
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
                className="absolute z-10 w-full top-0 transform -translate-y-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto"
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
            
            <div className="flex space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {!photoUrl ? (
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Carica foto</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCameraCapture}
                    className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 transition-colors"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Scatta foto</span>
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
                      onClick={handleCameraCapture}
                      className="p-2 bg-[#fd9a3c] text-white rounded-full hover:bg-[#e88a2c] transition-colors duration-400"
                      title="Scatta nuova foto"
                    >
                      <Camera className="w-4 h-4" />
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
          </div>


        </form>
      </div>
    </div>
  );
}

export default FindingForm;