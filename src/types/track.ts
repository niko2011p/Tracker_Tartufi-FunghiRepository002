export interface Finding {
  id: string;
  name: string;
  type: 'Fungo' | 'Tartufo';
  coordinates: [number, number];
  description?: string;
  photo?: string;
  timestamp: number;
}

export interface Track {
  id: string;
  name: string;
  path: [number, number][];
  findings: Finding[];
  startTime: number;
  endTime: number;
  distance: number;
  duration: number;
  averageSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
} 