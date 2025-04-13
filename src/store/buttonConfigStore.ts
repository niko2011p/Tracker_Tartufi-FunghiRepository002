import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ButtonConfig {
  position: { x: number; y: number };
  positionType: 'percentage' | 'pixels';
  size: number;
  color: string;
  iconColor: string;
  iconSize: number;
  borderRadius?: number;
  shadow: {
    color: string;
    blur: number;
    spread: number;
  };
}

interface ButtonConfigState {
  navigationButton: ButtonConfig;
  centerButton: ButtonConfig;
  tagButton: ButtonConfig;
  stopButton: ButtonConfig;
  setNavigationButton: (config: Partial<ButtonConfig>) => void;
  setCenterButton: (config: Partial<ButtonConfig>) => void;
  setTagButton: (config: Partial<ButtonConfig>) => void;
  setStopButton: (config: Partial<ButtonConfig>) => void;
}

const useButtonConfigStore = create<ButtonConfigState>((set) => ({
  navigationButton: {
    position: { x: 1, y: 60 },
    positionType: 'percentage',
    size: 100,
    color: 'bg-[#f5a149]',
    iconColor: 'text-white',
    iconSize: 50,
    borderRadius: 50,
    shadow: {
      color: 'rgba(0, 0, 0, 0.2)',
      blur: 10,
      spread: 2
    }
  },
  centerButton: {
    position: { x: 1, y: 90 },
    positionType: 'percentage',
    size: 100,
    color: 'bg-white',
    iconColor: 'text-red-700',
    iconSize: 50,
    borderRadius: 50,
    shadow: {
      color: 'rgba(0, 0, 0, 0.2)',
      blur: 10,
      spread: 2
    }
  },
  tagButton: {
    position: { x: 50, y: 90 },
    positionType: 'percentage',
    size: 100,
    color: 'bg-[#8eaa36]',
    iconColor: 'text-white',
    iconSize: 42,
    borderRadius: 50,
    shadow: {
      color: 'rgba(0, 0, 0, 0.3)',
      blur: 15,
      spread: 3
    }
  },
  stopButton: {
    position: { x: 3, y: 90 },
    positionType: 'percentage',
    size: 80,
    color: 'bg-red-500',
    iconColor: 'text-white',
    iconSize: 42,
    borderRadius: 15,
    shadow: {
      color: 'rgba(0, 0, 0, 0.3)',
      blur: 15,
      spread: 3
    }
  },
  setNavigationButton: (config) => set((state) => ({
    navigationButton: { ...state.navigationButton, ...config }
  })),
  setCenterButton: (config) => set((state) => ({
    centerButton: { ...state.centerButton, ...config }
  })),
  setTagButton: (config) => set((state) => ({
    tagButton: { ...state.tagButton, ...config }
  })),
  setStopButton: (config) => set((state) => ({
    stopButton: { ...state.stopButton, ...config }
  }))
}));

export default useButtonConfigStore; 