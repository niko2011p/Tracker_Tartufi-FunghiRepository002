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
      `https://api.weatherapi.com/v1/search.json?key=${import.meta.env.VITE_WEATHERAPI_KEY}&q=${lat},${lon}`
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
        // Crea una nuova traccia con timestamp corrente
        const newTrack: Track = {
          id: `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: new Date(),
          coordinates: [],
          distance: 0,
          findings: [],
          isPaused: false
        };
        
        // Avvia immediatamente la registrazione per garantire una buona esperienza utente
        set({ currentTrack: newTrack, isRecording: true });
        
        // Richiedi la posizione per ottenere il nome della località
        // Questa operazione avviene in background e non blocca l'avvio della traccia
        if (navigator.geolocation) {
          // Configurazione robusta per la geolocalizzazione
          const geoOptions: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 10000
          };
          
          // Funzione per gestire i tentativi di acquisizione della posizione
          const tryGetPosition = (retryCount = 0, maxRetries = 3) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                // Successo: ottieni il nome della località e aggiorna la traccia
                const location = await getLocationName(position.coords.latitude, position.coords.longitude);
                if (location) {
                  set(state => ({
                    currentTrack: state.currentTrack ? {
                      ...state.currentTrack,
                      location
                    } : null
                  }));
                }
              },
              (error) => {
                // Errore: riprova se non abbiamo raggiunto il numero massimo di tentativi
                console.warn(`Errore di geolocalizzazione (tentativo ${retryCount + 1}/${maxRetries}):`, error.message);
                
                if (retryCount < maxRetries) {
                  // Modifica le opzioni per ogni retry
                  const retryOptions: PositionOptions = {
                    ...geoOptions,
                    enableHighAccuracy: retryCount < 1, // Disabilita high accuracy dopo il primo retry
                    timeout: geoOptions.timeout + (retryCount * 5000),
                    maximumAge: (geoOptions.maximumAge || 10000) * (retryCount + 1)
                  };
                  
                  // Riprova dopo un breve intervallo
                  setTimeout(() => tryGetPosition(retryCount + 1, maxRetries), 2000);
                }
              },
              geoOptions
            );
          };
          
          // Avvia il primo tentativo di acquisizione della posizione
          tryGetPosition();
        }
      },
      
      
      
      stopTrack: () => {
        const { currentTrack, tracks } = get();
        if (currentTrack) {
          console.log('Stopping track:', currentTrack.id);
          
          // Calcola i dati finali del tracciamento
          const endTime = new Date();
          const durationMs = endTime.getTime() - currentTrack.startTime.getTime();
          const durationHours = durationMs / 3600000;
          
          // Calcola la velocità media (km/h)
          const avgSpeed = durationHours > 0 ? currentTrack.distance / durationHours : 0;
          
          // Calcola l'altitudine media dai dati GPS raccolti
          // Se non abbiamo dati di altitudine, utilizziamo un valore di fallback
          let totalAltitude = 0;
          let altitudePoints = 0;
          
          // Ottieni l'altitudine attuale dal GPS con retry per garantire l'acquisizione
          const getAltitude = () => {
            return new Promise<number>((resolve) => {
              if (!navigator.geolocation) {
                console.warn('Geolocation non supportata, utilizzo altitudine di fallback');
                resolve(0);
                return;
              }
              
              const tryGetAltitude = (retryCount = 0, maxRetries = 2) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    if (position.coords.altitude) {
                      console.log(`Altitudine finale acquisita: ${position.coords.altitude}m`);
                      resolve(position.coords.altitude);
                    } else {
                      console.warn('Altitudine non disponibile nel GPS');
                      resolve(0);
                    }
                  },
                  (error) => {
                    console.warn(`Errore nell'acquisizione dell'altitudine (tentativo ${retryCount + 1}/${maxRetries}):`, error.message);
                    if (retryCount < maxRetries) {
                      setTimeout(() => tryGetAltitude(retryCount + 1, maxRetries), 500);
                    } else {
                      console.warn('Impossibile acquisire l\'altitudine dopo multipli tentativi');
                      resolve(0);
                    }
                  },
                  { enableHighAccuracy: true, timeout: 2000, maximumAge: 0 }
                );
              };
              
              tryGetAltitude();
            });
          };
          
          // Utilizziamo una funzione asincrona per gestire l'acquisizione dell'altitudine
          const finalizeTrack = async () => {
            try {
              // Ottieni l'altitudine finale
              const currentAltitude = await getAltitude();
              
              // Calcola l'altitudine media
              if (currentAltitude > 0) {
                totalAltitude += currentAltitude;
                altitudePoints++;
              }
              
              const avgAltitude = altitudePoints > 0 ? 
                Math.round(totalAltitude / altitudePoints) : 
                (currentTrack.coordinates.length > 0 ? 500 : 0); // Fallback
              
              // Prepara i dati storici degli ultimi 7 giorni
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              
              const recentTracks = tracks
                .filter(track => {
                  // Assicuriamoci che startTime sia una data
                  const startTime = track.startTime instanceof Date ? 
                    track.startTime : new Date(track.startTime);
                  return startTime >= sevenDaysAgo;
                })
                .slice(0, 20); // Limita a 20 tracce per evitare problemi di performance
              
              // Verifica che tutti i ritrovamenti abbiano coordinate valide
              const validatedFindings = currentTrack.findings.map(finding => {
                // Se le coordinate non sono valide, utilizza l'ultima posizione conosciuta
                if (!finding.coordinates || finding.coordinates.some(isNaN)) {
                  console.warn(`Coordinate non valide per il ritrovamento ${finding.id}, utilizzo ultima posizione conosciuta`);
                  return {
                    ...finding,
                    coordinates: currentTrack.coordinates.length > 0 ? 
                      currentTrack.coordinates[currentTrack.coordinates.length - 1] : 
                      [0, 0] as [number, number]
                  };
                }
                return finding;
              });
              
              const completedTrack: Track = {
                ...currentTrack,
                findings: validatedFindings,
                endTime,
                duration: durationMs,
                avgSpeed,
                avgAltitude,
                totalDistance: currentTrack.distance,
                // Aggiungi metadati per lo storico
                historyData: {
                  recentTracks: recentTracks.map(t => t.id),
                  lastUpdated: new Date().toISOString()
                }
              };
              
              // Aggiungiamo un log per verificare che la traccia venga salvata correttamente
              console.log('Saving completed track:', completedTrack.id, 'with', 
                completedTrack.coordinates.length, 'coordinates and', 
                completedTrack.findings.length, 'findings');
              console.log('Track data:', {
                distance: completedTrack.distance.toFixed(2) + ' km',
                duration: (completedTrack.duration / 60000).toFixed(0) + ' min',
                avgSpeed: completedTrack.avgSpeed.toFixed(1) + ' km/h',
                avgAltitude: completedTrack.avgAltitude + ' m',
                findings: completedTrack.findings.length
              });
              
              // Aggiorniamo lo stato con la nuova traccia completata
              set({
                tracks: [...tracks, completedTrack],
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              console.log('Track stopped and saved successfully');
              return completedTrack;
            } catch (error) {
              console.error('Errore durante il salvataggio della traccia:', error);
              
              // Fallback in caso di errore: salva comunque la traccia con i dati disponibili
              const basicCompletedTrack: Track = {
                ...currentTrack,
                endTime,
                duration: durationMs,
                avgSpeed,
                avgAltitude: 0,
                totalDistance: currentTrack.distance
              };
              
              set({
                tracks: [...tracks, basicCompletedTrack],
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              console.log('Track saved with basic data due to error');
              return basicCompletedTrack;
            }
          };
          
          // Avvia il processo di finalizzazione e restituisci una promessa
          return finalizeTrack();
        }
        return null;
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
        
        // Verifica se ci sono ritrovamenti caricati nelle vicinanze
        if (loadedFindings) {
          loadedFindings.forEach(finding => {
            const currentPoint = turf.point(position);
            const findingPoint = turf.point(finding.coordinates);
            const distance = turf.distance(currentPoint, findingPoint, { units: 'meters' });
            
            // Notifica all'utente quando si avvicina a un ritrovamento caricato
            if (distance <= 10 && !get().isAlertPlaying) {
              const audio = new Audio('/sound/alert.mp3');
              audio.volume = 0.3;
              audio.play().catch(console.error);
              set({
                nearbyFinding: finding,
                isAlertPlaying: true
              });
              
              console.log(`Ritrovamento nelle vicinanze: ${finding.name} a ${distance.toFixed(1)}m`);
            } else if (distance > 15 && get().nearbyFinding?.id === finding.id) {
              // Resetta lo stato quando ci si allontana dal ritrovamento
              set({
                nearbyFinding: null,
                isAlertPlaying: false
              });
            }
          });
        }

        // Aggiorna il tracciamento solo se stiamo registrando
        if (currentTrack && isRecording) {
          // Aggiungi la nuova posizione alle coordinate del tracciamento
          const newCoordinates = [...currentTrack.coordinates, position];
          let distance = currentTrack.distance;
          let direction = get().currentDirection;
          
          // Calcola la distanza e la direzione solo se abbiamo almeno due punti
          if (newCoordinates.length > 1) {
            const lastPoint = turf.point(newCoordinates[newCoordinates.length - 2]);
            const newPoint = turf.point(position);
            
            // Calcola la distanza in chilometri e aggiungila alla distanza totale
            const segmentDistance = turf.distance(lastPoint, newPoint, { units: 'kilometers' });
            distance += segmentDistance;
            
            // Calcola la direzione solo se la distanza è significativa per evitare fluttuazioni casuali
            const movementDistance = turf.distance(lastPoint, newPoint, { units: 'meters' });
            if (movementDistance > 2) {
              // Calcola l'angolo di direzione in gradi (0-360)
              direction = turf.bearing(lastPoint, newPoint);
              // Normalizza l'angolo a valori positivi (0-360)
              if (direction < 0) direction += 360;
              
              // Aggiorna la direzione nello store
              set({ currentDirection: direction });
              
              // Log per debug della direzione
              console.debug(`Direzione aggiornata: ${direction.toFixed(1)}°, distanza segmento: ${segmentDistance.toFixed(5)}km`);
            }
          }
          
          // Aggiorna lo stato del tracciamento con le nuove coordinate e la distanza
          set({
            currentTrack: {
              ...currentTrack,
              coordinates: newCoordinates,
              distance
            }
          });
          
          // Log per debug dell'aggiornamento della posizione
          if (newCoordinates.length % 10 === 0) { // Log ogni 10 aggiornamenti per non intasare la console
            console.debug(`Tracciamento: ${newCoordinates.length} punti, distanza totale: ${distance.toFixed(3)}km`);
          }
        }
      },
      
      addFinding: (finding) => {
        const { currentTrack } = get();
        if (currentTrack && navigator.geolocation) {
          // Utilizziamo opzioni ottimizzate per ottenere la posizione più precisa possibile
          const geoOptions = {
            enableHighAccuracy: true,
            timeout: 1000, // Ridotto per ottenere una risposta più rapida
            maximumAge: 0 // Forza l'acquisizione di una nuova posizione
          };
          
          // Mostra un messaggio di log per indicare che stiamo acquisendo la posizione
          console.log(`Acquisizione posizione GPS per tag di tipo: ${finding.type}...`);
          
          // Utilizziamo getCurrentPosition con retry per garantire l'acquisizione della posizione
          const tryGetPosition = (retryCount = 0, maxRetries = 3) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coordinates: [number, number] = [
                  position.coords.latitude,
                  position.coords.longitude
                ];
                
                console.log(`Aggiunta tag alle coordinate GPS precise: [${coordinates[0]}, ${coordinates[1]}], tipo: ${finding.type}, accuratezza: ${position.coords.accuracy}m`);
                
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
                
                // Riproduci un suono di conferma per indicare che il tag è stato aggiunto
                try {
                  const audio = new Audio('/sound/alert.mp3');
                  audio.volume = 0.3; // Aumentato leggermente il volume
                  audio.play().catch(e => console.error('Errore nella riproduzione audio:', e));
                } catch (error) {
                  console.error('Errore nella riproduzione audio:', error);
                }
              },
              (error) => {
                console.warn(`Errore nell'acquisizione della posizione per il tag (tentativo ${retryCount + 1}/${maxRetries}):`, error.message);
                
                if (retryCount < maxRetries) {
                  // Riprova con opzioni meno restrittive
                  const retryOptions = {
                    ...geoOptions,
                    enableHighAccuracy: retryCount < 1, // Disabilita high accuracy dopo il primo retry
                    timeout: geoOptions.timeout + (retryCount * 1000)
                  };
                  
                  console.log(`Ritentativo acquisizione posizione GPS (${retryCount + 1}/${maxRetries})...`);
                  setTimeout(() => tryGetPosition(retryCount + 1, maxRetries), 500);
                } else {
                  // Fallback: usa l'ultima posizione conosciuta dal track
                  if (currentTrack.coordinates.length > 0) {
                    const lastPosition = currentTrack.coordinates[currentTrack.coordinates.length - 1];
                    
                    console.log(`Fallback: aggiunta tag all'ultima posizione conosciuta: [${lastPosition[0]}, ${lastPosition[1]}], tipo: ${finding.type}`);
                    
                    const newFinding: Finding = {
                      ...finding,
                      id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      trackId: currentTrack.id,
                      coordinates: lastPosition,
                      timestamp: new Date()
                    };
                    
                    set({
                      currentTrack: {
                        ...currentTrack,
                        findings: [...currentTrack.findings, newFinding]
                      }
                    });
                  }
                }
              },
              geoOptions
            );
          };
          
          // Avvia il primo tentativo di acquisizione della posizione
          tryGetPosition();
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