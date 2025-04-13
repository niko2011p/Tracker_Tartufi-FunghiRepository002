import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import useButtonConfigStore from '../store/buttonConfigStore';
import { useTrackStore } from '../store/trackStore';

const TagButton: React.FC = () => {
  const tagButton = useButtonConfigStore((state) => state.tagButton);
  const { setShowFindingForm } = useTrackStore();
  const [isPulsing, setIsPulsing] = useState(false);

  const getButtonShapeClass = (borderRadius: number | undefined) => {
    const radius = borderRadius ?? 15;
    if (radius === 50) return 'rounded-full';
    if (radius === 0) return 'rounded-none';
    return `rounded-[${radius}px]`;
  };

  const getPositionStyle = (position: { x: number; y: number }, positionType: 'percentage' | 'pixels') => {
    if (positionType === 'percentage') {
      return {
        top: `${position.y}%`,
        left: `${position.x}%`,
        transform: 'translate(-50%, -50%)'
      };
    }
    return {
      top: `${position.y}px`,
      left: `${position.x}px`,
      transform: 'translate(-50%, -50%)'
    };
  };

  const getShadowStyle = (shadow: { color: string; blur: number; spread: number }) => {
    return {
      boxShadow: `0 0 ${shadow.blur}px ${shadow.spread}px ${shadow.color}`
    };
  };

  const handleClick = () => {
    setIsPulsing(true);
    setShowFindingForm(true);
    setTimeout(() => {
      setIsPulsing(false);
    }, 300);
  };

  return (
    <div 
      className="fixed z-[2000]" 
      style={getPositionStyle(tagButton.position, tagButton.positionType)}
    >
      <button
        onClick={handleClick}
        className={`${tagButton.color} ${getButtonShapeClass(tagButton.borderRadius)} flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 relative`}
        style={{
          width: tagButton.size,
          height: tagButton.size,
          ...getShadowStyle(tagButton.shadow)
        }}
      >
        <div className={`absolute inset-0 ${getButtonShapeClass(tagButton.borderRadius)} ${tagButton.color.replace('bg-', 'bg-')}/20 ${isPulsing ? 'animate-ping' : ''}`}></div>
        <Tag
          size={tagButton.iconSize}
          className={`${tagButton.iconColor} transition-transform duration-300 ${isPulsing ? 'animate-bounce' : ''}`}
          strokeWidth={2.5}
        />
      </button>
    </div>
  );
};

export default TagButton; 