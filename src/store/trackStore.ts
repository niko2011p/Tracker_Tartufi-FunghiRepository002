import { create } from 'zustand';
import { Track, Finding } from '../types';
import * as turf from '@turf/turf';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import LZString from 'lz-string';

export interface TrackState {
  currentTrack: Track | null;
  currentLocation: Location | null;
  tracks: Track[];
  isRecording: boolean;
  loadedFindings: Finding[] | null;
  currentDirection: number;
  showFindingForm: boolean;
  showPointOfInterestForm: boolean;
  showTagOptions: boolean;
  showStopConfirm: boolean;
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
  currentPosition: [number, number] | null;
  resetForms: () => void;
  loadTracks: () => void;
  saveTracks: () => void;
  checkTrackOnLogin: () => Promise<boolean>;
  autoSaveTrack: () => void;
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
      currentLocation: null,
      tracks: [],
      isRecording: false,
      loadedFindings: null,
      currentDirection: 0,
      showFindingForm: false,
      showPointOfInterestForm: false,
      showTagOptions: false,
      showStopConfirm: false,
      currentPosition: null,
      
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
              
              const tryGetAltitude = (retryCount = 0, maxRetries = 3) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    if (position.coords.altitude !== null) {
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
                      setTimeout(() => tryGetAltitude(retryCount + 1, maxRetries), 1000);
                    } else {
                      console.warn('Impossibile acquisire l\'altitudine dopo multipli tentativi');
                      resolve(0);
                    }
                  },
                  { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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
              // Assicuriamoci che la traccia venga aggiunta all'array tracks
              const updatedTracks = [...tracks, completedTrack];
              
              set({
                tracks: updatedTracks,
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              console.log('Track stopped and saved successfully. Total tracks:', updatedTracks.length);
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
              
              // Assicuriamoci che la traccia venga aggiunta all'array tracks anche in caso di errore
              const updatedTracks = [...tracks, basicCompletedTrack];
              
              set({
                tracks: updatedTracks,
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              console.log('Track saved with basic data due to error. Total tracks:', updatedTracks.length);
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
        try {
          // 1. Pulisci tutti i chunk di storage
          const chunkCount = parseInt(localStorage.getItem('savedTracks_count') || '0');
          
          // Rimuovi tutti i chunk principali
          for (let i = 0; i < chunkCount; i++) {
            localStorage.removeItem(`savedTracks_${i}`);
            
            // Rimuovi anche eventuali sub-chunk
            let subIndex = 0;
            while (localStorage.getItem(`savedTracks_${i}_${subIndex}`)) {
              localStorage.removeItem(`savedTracks_${i}_${subIndex}`);
              subIndex++;
            }
          }
          
          // 2. Rimuovi il contatore dei chunk
          localStorage.removeItem('savedTracks_count');
          
          // 3. Rimuovi tutti i dati dello store
          localStorage.removeItem('tracks-storage');
          
          // 4. Resetta lo stato
          set({ 
            tracks: [],
            currentTrack: null,
            loadedFindings: null
          });
          
          console.log('Tutte le tracce sono state eliminate con successo');
        } catch (error) {
          console.error('Errore durante l\'eliminazione delle tracce:', error);
          alert('Si è verificato un errore durante l\'eliminazione delle tracce. Riprova più tardi.');
        }
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
      
      addFinding: async (finding) => {
        const { currentTrack } = get();
        if (currentTrack && navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              });
            });

            const coordinates: [number, number] = [
              Number(position.coords.latitude.toFixed(6)),
              Number(position.coords.longitude.toFixed(6))
            ];

            const newFinding: Finding = {
              ...finding,
              id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              trackId: currentTrack.id,
              coordinates,
              timestamp: new Date()
            };

            // Aggiorna la traccia corrente con il nuovo ritrovamento
            set(state => ({
              currentTrack: state.currentTrack ? {
                ...state.currentTrack,
                findings: [...state.currentTrack.findings, newFinding]
              } : null
            }));

            // Prova a salvare le tracce
            try {
              get().saveTracks();
            } catch (error) {
              console.error('Errore nel salvataggio delle tracce:', error);
              if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.warn('Quota localStorage superata, il ritrovamento è stato aggiunto ma non salvato');
                alert('Attenzione: lo spazio di archiviazione è pieno. Il ritrovamento è stato aggiunto ma potrebbe non essere salvato permanentemente.');
              }
            }

            return newFinding;
          } catch (error) {
            console.error('Errore nell\'acquisizione della posizione:', error);
            throw error;
          }
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

      setShowPointOfInterestForm: (show: boolean) => {
        set({ showPointOfInterestForm: show });
      },

      resetForms: () => {
        set({ 
          showPointOfInterestForm: false,
          showFindingForm: false 
        });
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
      },

      loadTracks: () => {
        try {
          const chunkCount = parseInt(localStorage.getItem('savedTracks_count') || '0');
          const loadedTracks = [];

          for (let i = 0; i < chunkCount; i++) {
            const compressed = localStorage.getItem(`savedTracks_${i}`);
            if (compressed) {
              const decompressed = LZString.decompress(compressed);
              if (decompressed) {
                const chunk = JSON.parse(decompressed);
                loadedTracks.push(...chunk);
              }
            } else {
              // Prova a caricare i sub-chunk
              let subIndex = 0;
              let hasMoreSubChunks = true;
              while (hasMoreSubChunks) {
                const subCompressed = localStorage.getItem(`savedTracks_${i}_${subIndex}`);
                if (subCompressed) {
                  const decompressed = LZString.decompress(subCompressed);
                  if (decompressed) {
                    const subChunk = JSON.parse(decompressed);
                    loadedTracks.push(...subChunk);
                  }
                  subIndex++;
                } else {
                  hasMoreSubChunks = false;
                }
              }
            }
          }

          set({ tracks: loadedTracks });
        } catch (error) {
          console.error('Errore nel caricamento delle tracce:', error);
        }
      },

      saveTracks: () => {
        try {
          const { tracks } = get();
          
          // Ottimizza i dati prima del salvataggio
          const optimizedTracks = tracks.map(track => {
            // Ottimizza le coordinate mantenendo la precisione necessaria
            const optimizedCoordinates = track.coordinates.map(coord => [
              Number(coord[0].toFixed(6)),
              Number(coord[1].toFixed(6))
            ]);

            // Ottimizza i ritrovamenti
            const optimizedFindings = track.findings.map(finding => ({
              id: finding.id,
              name: finding.name,
              type: finding.type,
              coordinates: [
                Number(finding.coordinates[0].toFixed(6)),
                Number(finding.coordinates[1].toFixed(6))
              ],
              timestamp: finding.timestamp,
              photoUrl: finding.photoUrl,
              description: finding.description
            }));

            return {
              id: track.id,
              name: track.name,
              coordinates: optimizedCoordinates,
              findings: optimizedFindings,
              startTime: track.startTime,
              endTime: track.endTime,
              distance: Number(track.distance.toFixed(2))
            };
          });

          // Dividi i dati in chunk più piccoli se necessario
          const CHUNK_SIZE = 50; // Riduci la dimensione del chunk
          const chunks = [];
          for (let i = 0; i < optimizedTracks.length; i += CHUNK_SIZE) {
            chunks.push(optimizedTracks.slice(i, i + CHUNK_SIZE));
          }

          // Salva ogni chunk separatamente
          chunks.forEach((chunk, index) => {
            try {
              const compressed = LZString.compress(JSON.stringify(chunk));
              localStorage.setItem(`savedTracks_${index}`, compressed);
            } catch (error) {
              if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                // Se un chunk è troppo grande, prova a dividerlo ulteriormente
                const subChunks = [];
                for (let j = 0; j < chunk.length; j += 5) { // Riduci ulteriormente la dimensione
                  subChunks.push(chunk.slice(j, j + 5));
                }
                
                subChunks.forEach((subChunk, subIndex) => {
                  try {
                    const compressed = LZString.compress(JSON.stringify(subChunk));
                    localStorage.setItem(`savedTracks_${index}_${subIndex}`, compressed);
                  } catch (e) {
                    console.error(`Errore nel salvataggio del sub-chunk ${index}_${subIndex}:`, e);
                    // Se anche questo fallisce, prova a salvare solo i dati essenziali
                    const essentialData = subChunk.map(track => ({
                      id: track.id,
                      name: track.name,
                      coordinates: track.coordinates,
                      findings: track.findings.map(f => ({
                        id: f.id,
                        name: f.name,
                        coordinates: f.coordinates
                      })),
                      startTime: track.startTime,
                      endTime: track.endTime
                    }));
                    try {
                      const compressed = LZString.compress(JSON.stringify(essentialData));
                      localStorage.setItem(`savedTracks_${index}_${subIndex}_essential`, compressed);
                    } catch (finalError) {
                      console.error('Errore nel salvataggio dei dati essenziali:', finalError);
                      alert('Attenzione: lo spazio di archiviazione è pieno. Alcuni dati potrebbero non essere stati salvati.');
                    }
                  }
                });
              }
            }
          });

          // Salva il numero totale di chunk
          localStorage.setItem('savedTracks_count', chunks.length.toString());
          
        } catch (error) {
          console.error('Errore nel salvataggio delle tracce:', error);
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert('Attenzione: lo spazio di archiviazione è pieno. I dati verranno salvati in modo ottimizzato.');
          }
        }
      },

      checkTrackOnLogin: async () => {
        const { currentTrack, tracks } = get();
        
        // Se c'è una traccia in corso, verifichiamo se è valida
        if (currentTrack) {
          // Verifica se la traccia è più vecchia di 24 ore
          const now = new Date();
          const trackAge = now.getTime() - currentTrack.startTime.getTime();
          const isTrackTooOld = trackAge > 24 * 60 * 60 * 1000; // 24 ore in millisecondi
          
          if (isTrackTooOld) {
            // Se la traccia è troppo vecchia, la salviamo e la chiudiamo
            await get().stopTrack();
            return false;
          }
          
          // Se la traccia è valida, la ripristiniamo
          set({ isRecording: true });
          return true;
        }
        
        return false;
      },

      autoSaveTrack: async () => {
        const { currentTrack, isRecording } = get();
        
        if (currentTrack && isRecording) {
          console.log('Salvataggio automatico della traccia in corso...');
          try {
            await get().stopTrack();
            console.log('Traccia salvata automaticamente');
          } catch (error) {
            console.error('Errore nel salvataggio automatico della traccia:', error);
          }
        }
      }
    }),
    {
      name: 'tracks-storage',
      skipHydration: false,
      partialize: (state) => {
        // Ottimizza i dati prima del salvataggio
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