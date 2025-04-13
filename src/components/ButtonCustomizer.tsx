import React from 'react';
import { useButtonConfigStore } from '../store/buttonConfigStore';

interface ButtonCustomizerProps {
  buttonType: 'tag' | 'stop' | 'navigation' | 'center';
}

export const ButtonCustomizer: React.FC<ButtonCustomizerProps> = ({ buttonType }) => {
  const { 
    tagButton, 
    stopButton, 
    navigationButton, 
    centerButton,
    setTagButton,
    setStopButton,
    setNavigationButton,
    setCenterButton
  } = useButtonConfigStore();

  const currentConfig = buttonType === 'tag' ? tagButton :
                       buttonType === 'stop' ? stopButton :
                       buttonType === 'navigation' ? navigationButton :
                       centerButton;

  const setConfig = buttonType === 'tag' ? setTagButton :
                   buttonType === 'stop' ? setStopButton :
                   buttonType === 'navigation' ? setNavigationButton :
                   setCenterButton;

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value);
    setConfig({
      size: newSize,
      iconSize: Math.round(newSize * 0.47) // Maintain icon size proportion
    });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    setConfig({
      position: {
        ...currentConfig.position,
        [axis]: value
      }
    });
  };

  const handleBorderRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBorderRadius = parseInt(e.target.value);
    setConfig({
      borderRadius: newBorderRadius
    });
  };

  const handleShadowChange = (property: 'blur' | 'spread', value: number) => {
    setConfig({
      shadow: {
        ...currentConfig.shadow,
        [property]: value
      }
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg mb-4">
      <h3 className="text-lg font-semibold mb-4">
        {buttonType === 'tag' ? 'Tag Button' :
         buttonType === 'stop' ? 'Stop Button' :
         buttonType === 'navigation' ? 'Navigation Button' :
         'Center Button'} Customization
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Size</label>
          <input
            type="range"
            min="40"
            max="120"
            value={currentConfig.size}
            onChange={handleSizeChange}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.size}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Position X</label>
          <input
            type="range"
            min="0"
            max="100"
            value={currentConfig.position.x}
            onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.position.x}%</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Position Y</label>
          <input
            type="range"
            min="0"
            max="100"
            value={currentConfig.position.y}
            onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.position.y}%</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Border Radius</label>
          <input
            type="range"
            min="0"
            max="50"
            value={currentConfig.borderRadius}
            onChange={handleBorderRadiusChange}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.borderRadius}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Shadow Blur</label>
          <input
            type="range"
            min="0"
            max="20"
            value={currentConfig.shadow.blur}
            onChange={(e) => handleShadowChange('blur', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.shadow.blur}px</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Shadow Spread</label>
          <input
            type="range"
            min="0"
            max="10"
            value={currentConfig.shadow.spread}
            onChange={(e) => handleShadowChange('spread', parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-500">{currentConfig.shadow.spread}px</span>
        </div>
      </div>
    </div>
  );
}; 