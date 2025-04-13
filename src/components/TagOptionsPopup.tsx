import React from 'react';
import { MapPin, Crosshair, X } from 'lucide-react';
import { useTrackStore } from '../store/trackStore';

interface TagOptionsPopupProps {
  onClose: () => void;
  onFindingClick: () => void;
  onPointOfInterestClick: () => void;
}

const TagOptionsPopup: React.FC<TagOptionsPopupProps> = ({
  onClose,
  onFindingClick,
  onPointOfInterestClick,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-64">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tag Options</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={onFindingClick}
            className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            <MapPin size={20} />
            <span>Add Finding</span>
          </button>
          <button
            onClick={onPointOfInterestClick}
            className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            <Crosshair size={20} />
            <span>Point of Interest</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagOptionsPopup;