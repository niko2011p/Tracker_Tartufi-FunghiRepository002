export interface Track {
  id: string;
  startTime: Date;
  endTime?: Date;
  coordinates: [number, number][];
  distance: number;
  findings: Finding[];
  isPaused: boolean;
  location?: {
    name: string;
    region?: string;
    coordinates: [number, number];
  };
  duration?: number;       // Durata in millisecondi
  avgSpeed?: number;       // Velocità media in km/h
  avgAltitude?: number;    // Altitudine media in metri
  totalDistance?: number;  // Distanza totale in km
}

export interface Finding {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  coordinates: [number, number];
  timestamp: Date;
  trackId: string;
  type: 'Fungo' | 'Tartufo' | 'poi';
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  cloudCover: number;
  condition: string;
  conditionIcon?: string;
  conditionCode?: number;
  timestamp: Date;
  // Dati astronomici
  moonPhase?: string;
  moonIllumination?: number;
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;
}

export interface HourlyWeather {
  time: string;
  temp_c: number;
  precip_mm: number;
  humidity: number;
  wind_kph: number;
  wind_dir: string;
  condition: string;
  conditionIcon?: string;
  conditionCode?: number;
  chance_of_rain?: number;
}