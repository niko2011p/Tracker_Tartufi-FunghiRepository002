import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Upload, Camera, AlertCircle } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { species } from '../data/species';
import { Button } from './Button';

export interface FindingFormProps {
  onClose: () => void;
  position: [number, number];
}

function FindingForm({ onClose, position }: FindingFormProps) {
  const { addFinding } = useTrackStore();
  const [findingType, setFindingType] = useState<'Fungo' | 'Tartufo'>('Fungo');
  const [speciesName, setSpeciesName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) {
      setError('Inserisci il nome della specie');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finding = {
        name: `${findingType} - ${speciesName}`,
        description: `Tipo: ${findingType}\nSpecie: ${speciesName}`,
        photoUrl: photoPreview || undefined,
        type: findingType
      };

      await addFinding(finding);
      onClose();
    } catch (e) {
      console.error("Errore durante la salvataggio:", e);
      setError("Errore durante la salvataggio. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nuovo Ritrovamento</h3>
          <div className="flex items-center gap-2">
            {error && (
              <div className="flex items-center space-x-2 text-red-500">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#8eaa36] text-white rounded-lg hover:bg-[#7d9830] transition-colors duration-400"
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </button>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFindingType('Fungo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                  findingType === 'Fungo'
                    ? 'bg-[#8eaa36] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img src="/icon/mushroom-tag-icon.svg" alt="Fungo" className="w-6 h-6" />
                Fungo
              </button>
              <button
                type="button"
                onClick={() => {
                  setFindingType('Tartufo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                  findingType === 'Tartufo'
                    ? 'bg-[#8B4513] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img src="/icon/Truffle-tag-icon.svg" alt="Tartufo" className="w-6 h-6" />
                Tartufo
              </button>
            </div>

            <div className="relative">
              <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Specie
              </label>
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#fd9a3c] focus:border-transparent"
                placeholder={`Cerca ${findingType.toLowerCase()}...`}
              />
              
              {showSuggestions && filteredSpecies.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
                >
                  {filteredSpecies.map((species, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSpeciesName(`${species.commonName} (${species.scientificName})`);
                        setShowSuggestions(false);
                        inputRef.current?.blur();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="font-medium">{species.commonName}</div>
                      <div className="text-sm text-gray-600">{species.scientificName}</div>
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
                  id="photo-upload"
                  name="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhoto(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPhotoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
                
                {!photoPreview ? (
                  <div className="flex w-full gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-500">Carica foto</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                          navigator.mediaDevices.getUserMedia({ video: true })
                            .then((stream) => {
                              // Handle camera stream
                            })
                            .catch((err) => {
                              console.error("Error accessing camera:", err);
                            });
                        }
                      }}
                      className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-[#fd9a3c] hover:bg-[#fd9a3c]/10 transition-colors"
                    >
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-sm text-gray-500">Scatta foto</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <img
                      src={photoPreview}
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="p-2 bg-[#8eaa36] text-white rounded-full hover:bg-[#7d9830] transition-colors duration-400"
                        title="Carica nuova foto"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            navigator.mediaDevices.getUserMedia({ video: true })
                              .then((stream) => {
                                // Handle camera stream
                              })
                              .catch((err) => {
                                console.error("Error accessing camera:", err);
                              });
                          }
                        }}
                        className="p-2 bg-[#fd9a3c] text-white rounded-full hover:bg-[#e88a2c] transition-colors duration-400"
                        title="Scatta nuova foto"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoto(null);
                          setPhotoPreview(null);
                        }}
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default FindingForm;