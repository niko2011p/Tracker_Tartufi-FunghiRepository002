import React from 'react';

interface StopTrackingDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const StopTrackingDialog: React.FC<StopTrackingDialogProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000]">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Interrompere il tracciamento?</h2>
        <p className="text-gray-600 mb-6">
          Sei sicuro di voler interrompere e salvare questa traccia?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Salva e interrompi
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopTrackingDialog; 