import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MapMode = 'online' | 'offline' | 'green';

interface MapState {
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      mapMode: 'online',
      setMapMode: (mode) => set({ mapMode: mode }),
    }),
    {
      name: 'map-settings',
    }
  )
);