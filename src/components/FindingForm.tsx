import React, { useRef, useState, useMemo, useEffect } from 'react';
import { X, Upload, Camera, AlertCircle } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { species } from '../data/species';
import Button from './Button';

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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Impossibile accedere alla fotocamera. Assicurati di aver concesso i permessi necessari.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
            setPhoto(file);
            setPhotoPreview(canvas.toDataURL('image/jpeg'));
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Aggiungi ritrovamento</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X size={20} />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={findingType === 'Fungo' ? 'primary' : 'outline'}
                onClick={() => {
                  setFindingType('Fungo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <img src="/icon/mushroom-tag-icon.svg" alt="Fungo" className="w-6 h-6" />
                Fungo
              </Button>
              <Button
                type="button"
                variant={findingType === 'Tartufo' ? 'primary' : 'outline'}
                onClick={() => {
                  setFindingType('Tartufo');
                  setSpeciesName('');
                  setShowSuggestions(false);
                }}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <img src="/icon/Truffle-tag-icon.svg" alt="Tartufo" className="w-6 h-6" />
                Tartufo
              </Button>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={speciesName}
                onChange={(e) => {
                  setSpeciesName(e.target.value);
                  setShowSuggestions(true);
                }}
                placeholder="Inserisci il nome della specie"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#8eaa36] focus:border-[#8eaa36]"
              />
              {showSuggestions && filteredSpecies.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredSpecies.map((s) => (
                    <button
                      key={s.scientificName}
                      type="button"
                      onClick={() => {
                        setSpeciesName(s.commonName);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    >
                      <div className="font-medium">{s.commonName}</div>
                      <div className="text-sm text-gray-500">{s.scientificName}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Foto (opzionale)
              </label>
              
              {showCamera ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={capturePhoto}
                      className="p-4 rounded-full"
                    >
                      <Camera className="w-6 h-6" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={stopCamera}
                      className="p-4 rounded-full"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              ) : photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="p-2 rounded-full"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={startCamera}
                      className="p-2 rounded-full"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoPreview(null);
                      }}
                      className="p-2 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="photo-upload"
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="flex-1 h-20 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Carica foto</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startCamera}
                    className="flex-1 h-20 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Scatta foto</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </form>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

export default FindingForm;