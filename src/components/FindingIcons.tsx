import React from 'react';

interface FindingIconProps {
  type: 'Fungo' | 'Tartufo';
  size?: number;
  className?: string;
}

const FindingIcon: React.FC<FindingIconProps> = ({ type, size = 32, className = '' }) => {
  const iconSize = size;
  const strokeWidth = Math.max(2, size / 16);

  if (type === 'Fungo') {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cappello del fungo */}
        <path
          d="M16 8C20 8 24 12 24 16C24 20 20 24 16 24C12 24 8 20 8 16C8 12 12 8 16 8Z"
          fill="#FF6B6B"
          stroke="#8B4513"
          strokeWidth={strokeWidth}
        />
        {/* Stelo del fungo */}
        <rect
          x="14"
          y="24"
          width="4"
          height="8"
          fill="#8B4513"
          stroke="#5D4037"
          strokeWidth={strokeWidth}
        />
        {/* Punti sul cappello */}
        <circle cx="12" cy="14" r="1" fill="#8B4513" />
        <circle cx="16" cy="12" r="1" fill="#8B4513" />
        <circle cx="20" cy="14" r="1" fill="#8B4513" />
      </svg>
    );
  }

  if (type === 'Tartufo') {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Forma del tartufo */}
        <path
          d="M16 6C20 6 24 10 24 14C24 18 20 22 16 22C12 22 8 18 8 14C8 10 12 6 16 6Z"
          fill="#8B4513"
          stroke="#5D4037"
          strokeWidth={strokeWidth}
        />
        {/* Superficie irregolare */}
        <path
          d="M12 10C14 8 18 8 20 10M10 14C12 12 20 12 22 14M12 18C14 16 18 16 20 18"
          stroke="#5D4037"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return null;
};

export default FindingIcon; 