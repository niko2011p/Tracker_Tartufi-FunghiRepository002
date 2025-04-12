import React from 'react';
import { Compass } from 'lucide-react';

interface CompassWidgetProps {
  direction: number;
}

const CompassWidget: React.FC<CompassWidgetProps> = ({ direction }) => {
  // Converti la direzione in un formato leggibile (0-360°)
  const normalizedDirection = ((direction % 360) + 360) % 360;

  return (
    <div className="absolute bottom-48 right-6 bg-white bg-opacity-80 backdrop-blur-sm p-3 rounded-full shadow-lg z-[2000]">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Cerchio esterno della bussola */}
        <div className="absolute inset-0 border-2 border-gray-300 rounded-full">
          {/* Punti cardinali statici */}
          {['N', 'E', 'S', 'W'].map((point, index) => (
            <div
              key={point}
              className="absolute w-full h-full flex items-center justify-center"
              style={{ transform: `rotate(${index * 90}deg)` }}
            >
              <span
                className="absolute text-xs font-bold"
                style={{
                  transform: `translateY(-26px) rotate(-${index * 90}deg)`,
                  color: point === 'N' ? '#ef4444' : '#666'
                }}
              >
                {point}
              </span>
            </div>
          ))}
        </div>

        {/* Indicatore di direzione rotante */}
        <div
          className="relative w-14 h-14 flex items-center justify-center"
          style={{
            transform: `rotate(${normalizedDirection}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <div className="absolute top-0 left-1/2 w-0.5 h-6 bg-red-500 -translate-x-1/2 rounded-full" />
          <div className="absolute bottom-0 left-1/2 w-0.5 h-6 bg-gray-400 -translate-x-1/2 rounded-full" />
        </div>

        {/* Valore numerico della direzione */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700">
          {normalizedDirection.toFixed(0)}°
        </div>
      </div>
    </div>
  );
};

export default CompassWidget; 