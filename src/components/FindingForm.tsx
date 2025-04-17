import React, { useState, useEffect } from 'react';
import { Camera, X, Search } from 'lucide-react';
import { species, Species } from '../data/species';
import { useTrackStore } from '../store/trackStore';
import { useToast } from './Toast';

export interface FindingFormProps {
  onClose: () => void;
  position: [number, number];
}

function FindingForm({ onClose, position }: FindingFormProps) {
  const trackStore = useTrackStore();
  const { addFinding, currentTrack } = trackStore;
  const { toast } = useToast();
  
  const [findingType, setFindingType] = useState<'Fungo' | 'Tartufo' | 'poi'>('Fungo');
  const [speciesName, setSpeciesName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Species[]>([]);

  useEffect(() => {
    // Filtra le sugerimenti in base all'input
    if (speciesName.trim().length > 0) {
      const searchTerm = speciesName.toLowerCase();
      const filteredSuggestions = species
        .filter(s => 
          s.type === findingType && 
          (s.commonName.toLowerCase().includes(searchTerm) || 
           s.scientificName.toLowerCase().includes(searchTerm))
        )
        .slice(0, 5);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [speciesName, findingType]);

  const handleSelectSpecies = (species: Species) => {
    setSpeciesName(`${species.commonName} (${species.scientificName})`);
    setSuggestions([]);
  };

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
        trackId: currentTrack?.id || ''
      };

      await addFinding(finding);
      
      // Feedback visivo e sonoro
      try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('Audio feedback not available:', err));
      } catch (err) {
        console.log('Audio notification error:', err);
      }
      
      // Mostra notifica toast
      toast.success(
        'Ritrovamento aggiunto', 
        `${finding.name} è stato aggiunto alla tua traccia`
      );
      
      onClose();
    } catch (e) {
      console.error("Errore durante il salvataggio:", e);
      setError("Errore durante il salvataggio. Riprova più tardi.");
      
      toast.error(
        'Errore', 
        'Non è stato possibile aggiungere il ritrovamento'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapturePhoto = (photoDataUrl: string) => {
    setPhotoUrl(photoDataUrl);
    setShowCamera(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Aggiungi ritrovamento</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Tipo di ritrovamento</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFindingType('Fungo')}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border ${
                    findingType === 'Fungo' 
                      ? 'border-green-600 bg-green-50 text-green-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <img src="/icon/mushroom-tag-icon.svg" alt="Fungo" className="w-8 h-8" />
                  <span className="text-lg font-medium">Fungo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFindingType('Tartufo')}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-lg border ${
                    findingType === 'Tartufo' 
                      ? 'border-amber-600 bg-amber-50 text-amber-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <img src="/icon/Truffle-tag-icon.svg" alt="Tartufo" className="w-8 h-8" />
                  <span className="text-lg font-medium">Tartufo</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="speciesName" className="block text-gray-700 mb-2 font-medium">
                Nome della specie
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="speciesName"
                  value={speciesName}
                  onChange={e => setSpeciesName(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Cerca o inserisci nome..."
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-300 shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((item, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSelectSpecies(item)}
                      >
                        <div className="font-medium">{item.commonName}</div>
                        <div className="text-sm text-gray-500">{item.scientificName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2 font-medium">Foto (opzionale)</label>
              {photoUrl ? (
                <div className="relative">
                  <img 
                    src={photoUrl} 
                    alt="Foto del ritrovamento" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                >
                  <Camera className="w-8 h-8 mb-2" />
                  <span>Scatta una foto</span>
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </div>

        {showCamera && (
          <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
            <div className="p-4 flex justify-between items-center">
              <h3 className="text-white text-lg font-medium">Scatta una foto</h3>
              <button 
                onClick={() => setShowCamera(false)}
                className="p-1 text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 relative">
              {/* Here you would integrate a camera component */}
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-lg">Camera component would go here</p>
              </div>
            </div>
            <div className="p-4">
              <button 
                onClick={() => handleCapturePhoto(`https://example.com/placeholder-${Date.now()}.jpg`)}
                className="w-full py-3 bg-white rounded-full font-medium"
              >
                Scatta foto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FindingForm;