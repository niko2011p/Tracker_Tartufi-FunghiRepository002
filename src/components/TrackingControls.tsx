import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';
import { species } from '../data/species';
import PointOfInterestForm from './PointOfInterestForm';
import FindingForm from './FindingForm';
import TagOptionsPopup from './TagOptionsPopup';
import { Finding } from '../types';

interface TagOptionsPopupProps {
  onClose: () => void;
  onFindingClick: () => void;
  onPointOfInterestClick: () => void;
}

const TrackingControls: React.FC = () => {
  const { 
    currentTrack, 
    isRecording, 
    stopTrack, 
    addFinding, 
    nearbyFinding, 
    isAlertPlaying,
    showPointOfInterestForm,
    resetForms,
    currentPosition
  } = useTrackStore();

  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [showFindingDetails, setShowFindingDetails] = useState(false);
  const [selectedFindingDetails, setSelectedFindingDetails] = useState<Finding | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSpecies = useMemo(() => {
    if (!selectedFinding?.description?.trim()) return [];
    const searchTerm = selectedFinding.description.toLowerCase();
    return species
      .filter(s => s.type === selectedFinding.type)
      .filter(s => 
        s.commonName.toLowerCase().includes(searchTerm) ||
        s.scientificName.toLowerCase().includes(searchTerm)
      )
      .slice(0, 5);
  }, [selectedFinding]);

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
        setSelectedFindingDetails({
          ...selectedFindingDetails!,
          photoUrl: event.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSpeciesSelect = (scientificName: string, commonName: string) => {
    setSelectedFindingDetails({
      ...selectedFindingDetails!,
      description: `${commonName} (${scientificName})`
    });
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleStopConfirm = useCallback(() => {
    if (isRecording) {
      stopTrack();
    }
    setShowStopConfirm(false);
  }, [isRecording, stopTrack]);

  const handleCloseAlert = (e: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    useTrackStore.setState({ nearbyFinding: null });
  };

  const handleMuteAlert = (e: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    useTrackStore.setState({ isAlertPlaying: false });
  };

  const handleFindingSubmit = useCallback((finding: Finding) => {
    if (!currentTrack || !currentPosition) return;
    
    addFinding({
      name: finding.name,
      description: finding.description || '',
      photoUrl: finding.photoUrl,
      type: finding.type as 'Fungo' | 'Tartufo' | 'poi'
    });
    
    setShowFindingForm(false);
    resetForms();
  }, [currentTrack, currentPosition, addFinding, resetForms]);

  const handlePoiSubmit = useCallback((data: { description: string; photo: File | null }) => {
    if (!currentTrack || !currentPosition) return;
    
    addFinding({
      name: 'Punto di Interesse',
      description: data.description,
      photoUrl: data.photo ? URL.createObjectURL(data.photo) : undefined,
      type: 'poi'
    });
    
    useTrackStore.setState({ showPointOfInterestForm: false });
    resetForms();
  }, [currentTrack, currentPosition, addFinding, resetForms]);

  useEffect(() => {
    return () => {
      resetForms();
    };
  }, [resetForms]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetForms();
        setShowTagOptions(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [resetForms]);

  if (!isRecording) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[2000]">
      {/* Finding Form */}
      {showFindingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nuovo Ritrovamento</h3>
              <button 
                onClick={() => setShowFindingForm(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <FindingForm
              onClose={() => setShowFindingForm(false)}
              position={currentPosition || [0, 0]}
            />
          </div>
        </div>
      )}

      {/* Point of Interest Form */}
      {showPointOfInterestForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
          onClick={() => useTrackStore.setState({ showPointOfInterestForm: false })}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Punto di Interesse</h3>
              <button 
                onClick={() => useTrackStore.setState({ showPointOfInterestForm: false })}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <PointOfInterestForm
              onClose={() => useTrackStore.setState({ showPointOfInterestForm: false })}
              onSubmit={handlePoiSubmit}
              position={currentPosition || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingControls;