import React, { useState } from 'react';
import { MapPin, Crosshair, X } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { useMap } from 'react-leaflet';
import PointOfInterestForm from './PointOfInterestForm';

interface TagOptionsPopupProps {
  onClose: () => void;
  onCenterMap: () => void;
}

interface PointOfInterest {
  description: string;
  photo: File | null;
}

function TagOptionsPopup({ onClose, onCenterMap }: TagOptionsPopupProps) {
  const { setShowFindingForm } = useTrackStore();
  const [showPoiForm, setShowPoiForm] = useState(false);

  const handleAddFinding = () => {
    setShowFindingForm(true);
    // Don't close the popup until the form is shown
    setTimeout(() => onClose(), 100);
  };

  const handlePoiSubmit = (data: PointOfInterest) => {
    // Handle the point of interest data here
    console.log('Point of Interest:', data);
    setShowPoiForm(false);
    onClose();
  };

  const handlePointOfInterest = () => {
    setShowPoiForm(true);
  };

  if (showPoiForm) {
    return <PointOfInterestForm onClose={() => setShowPoiForm(false)} onSubmit={handlePoiSubmit} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Opzioni Tag</h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }} 
            className="text-gray-500 hover:text-gray-700"
            aria-label="Chiudi"
            role="button"
            tabIndex={0}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleAddFinding();
            }}
            className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-3 text-[#fd9a3c]" />
              <span className="font-medium">Aggiungi Ritrovamento</span>
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handlePointOfInterest();
            }}
            className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center">
              <Crosshair className="w-5 h-5 mr-3 text-green-600" />
              <span className="font-medium">Punto di interesse</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TagOptionsPopup;