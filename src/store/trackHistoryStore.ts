import { create } from 'zustand';
import { calculateDistance } from '../utils/geoUtils';

export interface TrackStats {
  distanceKm: number;
  durationMin: number;
  speedAvgKmh: number;
  altitudeMax: number;
  altitudeMin: number;
  temperatureAvg: number;
  humidityAvg: number;
}

export interface TrackTag {
  type: 'finding' | 'poi';
  position: [number, number];
  timestamp: string;
  notes?: string;
}

export interface SavedTrack {
  id: string;
  name: string;
  path: [number, number][];
  tags: TrackTag[];
  startTime: string;
  endTime: string;
  stats: TrackStats;
}

interface TrackHistoryState {
  tracks: SavedTrack[];
  addTrack: (track: SavedTrack) => void;
  getTrack: (id: string) => SavedTrack | undefined;
}

export const calculateStats = (
  path: [number, number][],
  startTime: string,
  endTime: string,
  tags: TrackTag[]
): TrackStats => {
  let totalDistance = 0;
  let maxAltitude = -Infinity;
  let minAltitude = Infinity;
  let totalTemperature = 0;
  let totalHumidity = 0;
  let count = 0;

  // Calcola distanza totale e altitudini
  for (let i = 1; i < path.length; i++) {
    const [lat1, lon1] = path[i - 1];
    const [lat2, lon2] = path[i];
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }

  // Calcola durata in minuti
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMin = (end.getTime() - start.getTime()) / (1000 * 60);

  // Calcola velocità media in km/h
  const speedAvgKmh = (totalDistance / durationMin) * 60;

  return {
    distanceKm: totalDistance,
    durationMin,
    speedAvgKmh,
    altitudeMax: maxAltitude === -Infinity ? 0 : maxAltitude,
    altitudeMin: minAltitude === Infinity ? 0 : minAltitude,
    temperatureAvg: count > 0 ? totalTemperature / count : 0,
    humidityAvg: count > 0 ? totalHumidity / count : 0,
  };
};

export const useTrackHistoryStore = create<TrackHistoryState>((set, get) => ({
  tracks: [],
  addTrack: (track) => {
    set((state) => ({
      tracks: [...state.tracks, track],
    }));
    // Salva nel localStorage
    localStorage.setItem('savedTracks', JSON.stringify([...get().tracks, track]));
  },
  getTrack: (id) => {
    return get().tracks.find((track) => track.id === id);
  },
})); 