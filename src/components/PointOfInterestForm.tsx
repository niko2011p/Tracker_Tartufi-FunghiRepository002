import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';

interface PointOfInterestFormProps {
  onClose: () => void;
  onSubmit: (data: { description: string; photo: File | null }) => void;
}

function PointOfInterestForm({ onClose, onSubmit }: PointOfInterestFormProps) {
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowCamera(false);
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { addFinding } = useTrackStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addFinding({
      name: 'Punto di interesse',
      description: description,
      photoUrl: photoPreview || undefined,
      type: 'poi'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Punto di interesse</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Chiudi"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              required
            />
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
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              {!photoPreview ? (
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Carica foto</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex-1 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">Scatta foto</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Anteprima foto" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      title="Carica nuova foto"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                      title="Scatta nuova foto"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
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

          {showCamera && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10000]">
              <div className="bg-white p-4 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Scatta una foto</h4>
                  <button
                    type="button"
                    onClick={() => setShowCamera(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <video
                  id="camera-preview"
                  autoPlay
                  playsInline
                  className="w-full aspect-video bg-gray-100 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    const video = document.getElementById('camera-preview') as HTMLVideoElement;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d')?.drawImage(video, 0, 0);
                    canvas.toBlob((blob) => {
                      if (blob) {
                        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
                        setPhoto(file);
                        setPhotoPreview(URL.createObjectURL(blob));
                        setShowCamera(false);
                        // Stop all video streams
                        video.srcObject?.getTracks().forEach(track => track.stop());
                      }
                    }, 'image/jpeg');
                  }}
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Scatta
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Salva
          </button>
        </form>
      </div>
    </div>
  );
}

export default PointOfInterestForm;