import React, { useState } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';

interface PointOfInterestFormProps {
  onClose: () => void;
  onSubmit: (data: { description: string; photo: File | null }) => void;
  position?: [number, number];
}

const PointOfInterestForm: React.FC<PointOfInterestFormProps> = ({ onClose, onSubmit, position }) => {
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { addFinding } = useTrackStore();

  console.log('PointOfInterestForm rendered with position:', position);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form with description:', description);
    if (!description.trim()) {
      alert('Inserisci una descrizione');
      return;
    }
    onSubmit({ description, photo });
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label htmlFor="description" className="font-medium text-gray-700">
          Descrizione
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Inserisci una descrizione del punto di interesse..."
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label className="font-medium text-gray-700">Foto</label>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Carica foto</span>
          </label>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>Scatta foto</span>
          </button>
        </div>
        {photoPreview && (
          <div className="relative">
            <img
              src={photoPreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                setPhotoPreview(null);
              }}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Salva
        </button>
      </div>
    </form>
  );
};

export default PointOfInterestForm;