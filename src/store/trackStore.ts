import { create } from 'zustand';
import { Track, Finding } from '../types';
import * as turf from '@turf/turf';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

interface TrackState {
  currentTrack: Track | null;
  tracks: Track[];
  isRecording: boolean;
  loadedFindings: Finding[] | null;
  currentDirection: number;
  showFindingForm: boolean;
  nearbyFinding: Finding | null;
  isAlertPlaying: boolean;
  startTrack: () => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  stopTrack: () => void;
  deleteTrack: (id: string) => void;
  deleteAllTracks: () => void;
  addFinding: (finding: Omit<Finding, 'id' | 'trackId' | 'timestamp' | 'coordinates'>) => void;
  updateCurrentPosition: (position: [number, number]) => void;
  exportTracks: () => string;
  importTracks: (data: string) => void;
  loadFindings: (findings: Finding[]) => void;
  clearLoadedFindings: () => void;
  setShowFindingForm: (show: boolean) => void;
}

async function getLocationName(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=e57f461f9d4245158e5100345250803&q=${lat},${lon}`
    );
    
    if (!response.ok) throw new Error('Error retrieving location');
    const locations = await response.json();
    
    if (locations.length > 0) {
      return {
        name: locations[0].name,
        region: locations[0].region,
        coordinates: [lat, lon] as [number, number]
      };
    }
    return null;
  } catch (err) {
    console.error('Error getting location name:', err);
    return null;
  }
}

export const useTrackStore = create<TrackState>()(
  persist(
    (set, get) => ({
      nearbyFinding: null,
      isAlertPlaying: false,
      currentTrack: null,
      tracks: [],
      isRecording: false,
      loadedFindings: null,
      currentDirection: 0,
      showFindingForm: false,
      
      startTrack: () => {
        const newTrack: Track = {
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: new Date(),
          coordinates: [],
          distance: 0,
          findings: [],
          isPaused: false
        };
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const location = await getLocationName(position.coords.latitude, position.coords.longitude);
            if (location) {
              set(state => ({
                currentTrack: state.currentTrack ? {
                  ...state.currentTrack,
                  location
                } : null
              }));
            }
          });
        }
        
        set({ currentTrack: newTrack, isRecording: true });
      },
      
      pauseTrack: () => {
        const { currentTrack } = get();
        if (currentTrack) {
          set({ 
            currentTrack: { ...currentTrack, isPaused: true },
            isRecording: false 
          });
        }
      },
      
      resumeTrack: () => {
        const { currentTrack } = get();
        if (currentTrack) {
          set({ 
            currentTrack: { ...currentTrack, isPaused: false },
            isRecording: true 
          });
        }
      },
      
      stopTrack: () => {
        const { currentTrack, tracks } = get();
        if (currentTrack) {
          const completedTrack: Track = {
            ...currentTrack,
            endTime: new Date(),
            isPaused: false
          };
          set({
            tracks: [...tracks, completedTrack],
            currentTrack: null,
            isRecording: false,
            loadedFindings: null
          });
        }
      },

      deleteTrack: (id: string) => {
        set(state => ({
          tracks: state.tracks.filter(track => track.id !== id)
        }));
      },

      deleteAllTracks: () => {
        set({ tracks: [] });
      },
      
      updateCurrentPosition: (position: [number, number]) => {
        const { currentTrack, isRecording, loadedFindings } = get();
        
        if (loadedFindings) {
          loadedFindings.forEach(finding => {
            const currentPoint = turf.point(position);
            const findingPoint = turf.point(finding.coordinates);
            const distance = turf.distance(currentPoint, findingPoint, { units: 'meters' });
            
            if (distance <= 10 && !get().isAlertPlaying) {
              const audio = new Audio('/alert.mp3');
              audio.volume = 0.3;
              audio.play().catch(console.error);
              set({
                nearbyFinding: finding,
                isAlertPlaying: true
              });
            }
          });
        }

        if (currentTrack && isRecording) {
          const newCoordinates = [...currentTrack.coordinates, position];
          let distance = currentTrack.distance;
          let direction = get().currentDirection;
          
          if (newCoordinates.length > 1) {
            const lastPoint = turf.point(newCoordinates[newCoordinates.length - 2]);
            const newPoint = turf.point(position);
            distance += turf.distance(lastPoint, newPoint, { units: 'kilometers' });
            
            // Calcola la direzione solo se la distanza è significativa per evitare fluttuazioni casuali
            const movementDistance = turf.distance(lastPoint, newPoint, { units: 'meters' });
            if (movementDistance > 2) {
              // Calcola l'angolo di direzione in gradi (0-360)
              direction = turf.bearing(lastPoint, newPoint);
              // Normalizza l'angolo a valori positivi (0-360)
              if (direction < 0) direction += 360;
              
              set({ currentDirection: direction });
            }
          }
          
          set({
            currentTrack: {
              ...currentTrack,
              coordinates: newCoordinates,
              distance
            }
          });
        }
      },
      
      addFinding: (finding) => {
        const { currentTrack } = get();
        if (currentTrack && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const coordinates: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            
            const newFinding: Finding = {
              ...finding,
              id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              trackId: currentTrack.id,
              coordinates,
              timestamp: new Date()
            };
            
            set({
              currentTrack: {
                ...currentTrack,
                findings: [...currentTrack.findings, newFinding]
              }
            });
          });
        }
      },

      loadFindings: (findings: Finding[]) => {
        set({ loadedFindings: findings });
      },

      clearLoadedFindings: () => {
        set({ loadedFindings: null });
      },
      
      setShowFindingForm: (show: boolean) => {
        set({ showFindingForm: show });
      },

      exportTracks: () => {
        const { tracks } = get();
        const metadata = {
          name: "Tracker Funghi e Tartufi",
          desc: "Exported tracks and findings",
          author: "Tracker App",
          time: new Date().toISOString(),
          keywords: "mushrooms,truffles,tracking"
        };

        const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" 
     creator="${metadata.name}"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${metadata.name}</name>
    <desc>${metadata.desc}</desc>
    <author>${metadata.author}</author>
    <time>${metadata.time}</time>
    <keywords>${metadata.keywords}</keywords>
  </metadata>
  ${tracks.map(track => `
  <trk>
    <name>Track ${format(track.startTime, 'yyyy-MM-dd HH:mm')}</name>
    <desc>${track.location ? `Location: ${track.location.name}${track.location.region ? ` (${track.location.region})` : ''}` : 'Unknown Location'}
Distance: ${track.distance.toFixed(2)} km
Findings: ${track.findings.length}
Start Time: ${track.startTime.toISOString()}
${track.endTime ? `End Time: ${track.endTime.toISOString()}` : ''}</desc>
    <trkseg>
      ${track.coordinates.map(coord => `
      <trkpt lat="${coord[0]}" lon="${coord[1]}">
        <ele>0</ele>
        <time>${track.startTime.toISOString()}</time>
      </trkpt>`).join('')}
    </trkseg>
  </trk>
  ${track.findings.map(finding => `
  <wpt lat="${finding.coordinates[0]}" lon="${finding.coordinates[1]}">
    <name>${finding.name}</name>
    <desc>${finding.description || ''}</desc>
    <time>${finding.timestamp.toISOString()}</time>
    ${finding.photoUrl ? `<link href="${finding.photoUrl}">
      <text>Photo</text>
    </link>` : ''}
    <sym>${finding.name.startsWith('Fungo') ? 'Mushroom' : 'Flag, Blue'}</sym>
  </wpt>`).join('')}`).join('')}
</gpx>`;
        return gpx;
      },

      importTracks: (gpxData: string) => {
        try {
          const parser = new DOMParser();
          const gpx = parser.parseFromString(gpxData, 'text/xml');
          
          if (gpx.documentElement.nodeName === "parsererror") {
            throw new Error("Invalid GPX file format");
          }

          const tracks = Array.from(gpx.getElementsByTagName('trk')).map(trk => {
            const name = trk.getElementsByTagName('name')[0]?.textContent || '';
            const desc = trk.getElementsByTagName('desc')[0]?.textContent || '';
            
            // Parse location from description
            const locationMatch = desc.match(/Location: (.+?)(?:\s*\((.+?)\))?$/m);
            const location = locationMatch ? {
              name: locationMatch[1],
              region: locationMatch[2],
              coordinates: [0, 0] as [number, number]
            } : undefined;

            const coordinates: [number, number][] = Array.from(trk.getElementsByTagName('trkpt')).map(trkpt => [
              parseFloat(trkpt.getAttribute('lat') || '0'),
              parseFloat(trkpt.getAttribute('lon') || '0')
            ]);

            if (coordinates.length > 0 && location) {
              location.coordinates = coordinates[0];
            }

            const findings: Finding[] = Array.from(gpx.getElementsByTagName('wpt'))
              .filter(wpt => {
                const wptLat = parseFloat(wpt.getAttribute('lat') || '0');
                const wptLon = parseFloat(wpt.getAttribute('lon') || '0');
                return coordinates.some(coord => 
                  Math.abs(coord[0] - wptLat) < 0.0001 && 
                  Math.abs(coord[1] - wptLon) < 0.0001
                );
              })
              .map(wpt => ({
                id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                trackId: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: wpt.getElementsByTagName('name')[0]?.textContent || '',
                description: wpt.getElementsByTagName('desc')[0]?.textContent,
                photoUrl: wpt.getElementsByTagName('link')[0]?.getAttribute('href'),
                coordinates: [
                  parseFloat(wpt.getAttribute('lat') || '0'),
                  parseFloat(wpt.getAttribute('lon') || '0')
                ] as [number, number],
                timestamp: new Date(wpt.getElementsByTagName('time')[0]?.textContent || '')
              }));

            // Calculate track distance using turf.js
            let distance = 0;
            if (coordinates.length > 1) {
              const line = turf.lineString(coordinates);
              distance = turf.length(line, { units: 'kilometers' });
            }

            const startTime = new Date(trk.getElementsByTagName('time')[0]?.textContent || Date.now());
            const endTimeMatch = desc.match(/End Time: (.+)$/m);
            const endTime = endTimeMatch ? new Date(endTimeMatch[1]) : undefined;

            return {
              id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              startTime,
              endTime,
              coordinates,
              distance,
              findings,
              isPaused: false,
              location
            };
          });

          set(state => ({
            tracks: [...state.tracks, ...tracks]
          }));
        } catch (error) {
          console.error('Error during import:', error);
          throw new Error(error instanceof Error ? error.message : 'Unknown error during import');
        }
      }
    }),
    {
      name: 'tracks-storage',
      skipHydration: false,
      partialize: (state) => {
        const tracks = state.tracks.map(track => ({
          ...track,
          startTime: track.startTime instanceof Date ? track.startTime.toISOString() : track.startTime,
          endTime: track.endTime instanceof Date ? track.endTime.toISOString() : track.endTime,
          findings: track.findings.map(finding => ({
            ...finding,
            timestamp: finding.timestamp instanceof Date ? finding.timestamp.toISOString() : finding.timestamp
          }))
        }));

        return {
          ...state,
          tracks,
          currentTrack: state.currentTrack ? {
            ...state.currentTrack,
            startTime: state.currentTrack.startTime instanceof Date ? 
              state.currentTrack.startTime.toISOString() : 
              state.currentTrack.startTime,
            endTime: state.currentTrack.endTime instanceof Date ? 
              state.currentTrack.endTime.toISOString() : 
              state.currentTrack.endTime,
            findings: state.currentTrack.findings.map(finding => ({
              ...finding,
              timestamp: finding.timestamp instanceof Date ? 
                finding.timestamp.toISOString() : 
                finding.timestamp
            }))
          } : null,
          loadedFindings: null
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.tracks = state.tracks.map(track => ({
            ...track,
            startTime: new Date(track.startTime),
            endTime: track.endTime ? new Date(track.endTime) : undefined,
            findings: track.findings.map(finding => ({
              ...finding,
              timestamp: new Date(finding.timestamp)
            }))
          }));

          if (state.currentTrack) {
            state.currentTrack = {
              ...state.currentTrack,
              startTime: new Date(state.currentTrack.startTime),
              endTime: state.currentTrack.endTime ? new Date(state.currentTrack.endTime) : undefined,
              findings: state.currentTrack.findings.map(finding => ({
                ...finding,
                timestamp: new Date(finding.timestamp)
              }))
            };
          }
        }
      }
    }
  )
);