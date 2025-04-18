export interface Track {
  id: string;
  startTime: Date;
  endTime?: Date;
  coordinates: [number, number][];
  distance: number;
  findings: Finding[];
  location?: Location;
  isPaused: boolean;
  duration?: number;
  avgSpeed?: number;
  avgAltitude?: number;
  totalDistance?: number;
  isWaitingForGPS?: boolean;
  actualStartTime?: Date;
  actualEndTime?: Date;
  startMarker?: Marker;
  endMarker?: Marker;
}

export interface Marker {
  type: 'start' | 'end' | 'poi';
  coordinates: [number, number];
  color: string;
  timestamp: Date;
  accuracy: number;
} 