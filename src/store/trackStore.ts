import { create } from 'zustand';
import { Track, Finding } from '../types';
import * as turf from '@turf/turf';
import { persist, createJSONStorage } from 'zustand/middleware';
import { format } from 'date-fns';
import LZString from 'lz-string';
import { openDB } from 'idb';

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

// Constants for storage
const DB_NAME = 'trackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';
const STORAGE_KEY = 'tracks-storage';

// Funzione per inizializzare IndexedDB
const initDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Create object store without keyPath since we'll provide keys explicitly
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Funzione per salvare una traccia in IndexedDB
const saveTrackToDB = async (track: Track) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(track);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Funzione per caricare tutte le tracce da IndexedDB
const loadTracksFromDB = async () => {
  const db = await initDB();
  return new Promise<Track[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Funzione per eliminare una traccia da IndexedDB
const deleteTrackFromDB = async (id: string) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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

const saveToLocalStorage = (key: string, data: any) => {
  try {
    // Verifichiamo che i dati siano serializzabili
    if (data === undefined || data === null) {
      console.warn('Tentativo di salvare dati nulli o undefined in localStorage:', key);
      return;
    }
    
    // Converti le date in ISO string per evitare problemi di serializzazione
    const processedData = JSON.parse(JSON.stringify(data, (key, value) => {
      // Converti le date in ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));
    
    // Serializza e salva
    const serializedData = JSON.stringify(processedData);
    if (!serializedData) {
      throw new Error('Serializzazione fallita');
    }
    
    localStorage.setItem(key, serializedData);
    console.log(`Dati salvati in localStorage: ${key}`);
  } catch (error) {
    console.error('Errore nel salvataggio dei dati in localStorage:', error);
    
    // Se c'è un errore di quota, prova a salvare in IndexedDB
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log('Quota localStorage esaurita, salvo in IndexedDB');
      saveToIndexedDB(key, data);
    }
  }
};

const loadFromLocalStorage = (key: string): any => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Errore nel caricamento dei dati:', error);
    return null;
  }
};

const saveToIndexedDB = async (key: string, data: any) => {
  try {
    console.log('Tentativo di salvataggio in IndexedDB', { key, data });
    
    // Serialize the data before saving
    const serializedData = JSON.stringify(data);
    
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(serializedData, key);
      
      request.onsuccess = () => {
        console.log(`Dati salvati con successo in IndexedDB: ${key}`);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Errore nel salvataggio in IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Errore nel salvataggio in IndexedDB:', error);
    throw error;
  }
};

// Funzione per convertire le stringhe di data in oggetti Date
const convertDates = (obj: any): any => {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    // Verifica se la stringa ha il formato di una data ISO
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    if (dateRegex.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertDates);
  }
  
  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = convertDates(obj[key]);
    }
  }
  return result;
};

const loadFromIndexedDB = async (key: string): Promise<any> => {
  try {
    console.log('Tentativo di caricamento da IndexedDB', { key });
    
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const serializedData = request.result;
        
        if (!serializedData) {
          console.log(`Nessun dato trovato in IndexedDB per la chiave: ${key}`);
          resolve(null);
          return;
        }
        
        try {
          // Parse the serialized data
          const parsedData = JSON.parse(serializedData);
          console.log(`Dati caricati con successo da IndexedDB: ${key}`);
          resolve(parsedData);
        } catch (parseError) {
          console.error('Errore nel parsing dei dati:', parseError);
          reject(parseError);
        }
      };
      
      request.onerror = () => {
        console.error('Errore nel caricamento da IndexedDB:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Errore nel caricamento da IndexedDB:', error);
    return null;
  }
};

// Initial state definition
const initialState: TrackState = {
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
  startTrack: () => {},
  stopTrack: () => {},
  deleteTrack: () => {},
  deleteAllTracks: () => {},
  addFinding: () => {},
  updateCurrentPosition: () => {},
  exportTracks: () => '',
  importTracks: () => {},
  loadFindings: () => {},
  clearLoadedFindings: () => {},
  setShowFindingForm: () => {},
  resetForms: () => {},
  loadTracks: () => {},
  saveTracks: () => {},
  checkTrackOnLogin: async () => false,
  autoSaveTrack: () => {}
};

// Create the store with persist middleware
export const useTrackStore = create<TrackState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
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
      
      stopTrack: async () => {
        const { currentTrack, tracks } = get();
        if (currentTrack) {
          console.log('🛑 Stopping track:', currentTrack.id);
          
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
              console.log('✅ Track stopped and saved successfully. Total tracks:', tracks.length + 1);
              
              // Aggiorniamo lo stato con la nuova traccia completata
              // Assicuriamoci che la traccia venga aggiunta all'array tracks
              const updatedTracks = [...tracks, completedTrack];
              
              set({
                tracks: updatedTracks,
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              // Salviamo direttamente in IndexedDB prima di tutto
              console.log('💾 Salvando dati direttamente in IndexedDB...');
              try {
                await saveToIndexedDB('tracks', updatedTracks);
                console.log('✅ Salvataggio diretto in IndexedDB completato');
              } catch (idbError) {
                console.error('❌ Errore nel salvataggio diretto in IndexedDB:', idbError);
              }
              
              // Aggiorniamo lo stato di persist di Zustand per garantire la sincronizzazione
              try {
                get().saveTracks();
              } catch (error) {
                console.error('❌ Errore nel salvare le tracce con persist:', error);
              }
              
              // Esegui un'operazione esplicita di pulizia
              console.log('🧹 Pulizia dei dati temporanei...');
              try {
                localStorage.removeItem('currentTrack');
                const db = await openDB('tracksDB', 1);
                const tx = db.transaction('tracks', 'readwrite');
                const store = tx.objectStore('tracks');
                await store.delete('currentTrack');
                await tx.done;
                console.log('✅ Pulizia del currentTrack completata');
              } catch (e) {
                console.error('❌ Errore nella pulizia del currentTrack:', e);
              }
              
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
              
              // Salva sia in localStorage che in IndexedDB
              saveToLocalStorage('tracks', updatedTracks);
              await saveToIndexedDB('tracks', updatedTracks);
              
              return basicCompletedTrack;
            }
          };
          
          // Avvia il processo di finalizzazione e restituisci una promessa
          return finalizeTrack();
        }
        return null;
      },

      deleteTrack: async (trackId: string) => {
        try {
          const db = await openDB('tracksDB', 1);
          const transaction = db.transaction('tracks', 'readwrite');
          const store = transaction.objectStore('tracks');
          
          // Get all tracks first
          const allTracks = await store.getAll();
          
          // Filter out the track to delete
          const updatedTracks = allTracks.filter(track => track.id !== trackId);
          
          // Clear the store and put back the remaining tracks
          await store.clear();
          for (const track of updatedTracks) {
            await store.add(track);
          }
          
          await transaction.done;
          console.log(`Track ${trackId} deleted successfully`);
          
          // Update state
          set({ tracks: updatedTracks });
          return true;
        } catch (error) {
          console.error('Error deleting track:', error);
          return false;
        }
      },

      deleteAllTracks: async () => {
        try {
          const db = await initDB();
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
          
        set({ tracks: [] });
          console.log('Tutte le tracce sono state eliminate con successo da IndexedDB');
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
            const updatedTrack = {
                    ...currentTrack,
                    findings: [...currentTrack.findings, newFinding]
            };
                
            // Aggiorna lo stato
            set({ currentTrack: updatedTrack });
                
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

            // Salva sia in localStorage che in IndexedDB
            try {
              // Usa updatedTrack invece di state.currentTrack
              saveToLocalStorage('currentTrack', updatedTrack);
              await saveToIndexedDB('currentTrack', updatedTrack);
            } catch (error) {
              console.error('Errore nel salvataggio del currentTrack:', error);
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

      loadTracks: async () => {
        try {
          const db = await openDB('tracksDB', 1);
          const transaction = db.transaction('tracks', 'readonly');
          const store = transaction.objectStore('tracks');
          const tracksInDB = await store.getAll();
          
          console.log(`Loaded ${tracksInDB.length} tracks from IndexedDB`);
          
          // Sort tracks by start time (most recent first)
          const sortedTracks = tracksInDB.sort((a, b) => {
            const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
            const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
            return bTime - aTime;
          });
          
          set({ tracks: sortedTracks });
          return sortedTracks;
        } catch (error) {
          console.error('Error loading tracks:', error);
          return [];
        }
      },

      saveTracks: async () => {
        try {
          const { tracks } = get();
          console.log(`📝 Salvando ${tracks.length} tracce...`);
          
          // Salva in IndexedDB usando la nostra funzione helper
          await saveToIndexedDB('tracks', tracks);
          
          // Forza Zustand a salvare lo stato corrente
          // Questo è un hack per assicurarsi che lo stato venga salvato con persist
          const state = {
            tracks,
            currentTrack: get().currentTrack,
            isRecording: get().isRecording,
            loadedFindings: get().loadedFindings
          };
          
          // Scriviamo esplicitamente in localStorage come backup
          try {
            const serializedState = JSON.stringify({state});
            localStorage.setItem('tracks-storage', serializedState);
            console.log('✅ Stato salvato con successo in localStorage e IndexedDB');
          } catch (e) {
            console.error('❌ Errore nel serializzare lo stato per localStorage:', e);
          }
        } catch (error) {
          console.error('❌ Errore nel salvataggio delle tracce:', error);
          // Mostra un alert solo se non è un errore di quota
          if (!(error instanceof DOMException && error.name === 'QuotaExceededError')) {
            alert('Errore nel salvataggio delle tracce. Riprova più tardi.');
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
        // Get current track
        const currentTrack = get().currentTrack;
        
        if (!currentTrack) return;
        
        console.log("[AutoSave] Saving current track...");
        
        try {
          // Compress coordinates if there are too many
          let compressedTrack = {...currentTrack};
          
          // If track has a large number of coordinates, reduce them
          if (currentTrack.coordinates.length > 1000) {
            console.log(`[AutoSave] Compressing coordinates: ${currentTrack.coordinates.length} points`);
            // Simple compression: take every nth point to reduce size
            const compressionFactor = Math.ceil(currentTrack.coordinates.length / 1000);
            compressedTrack.coordinates = currentTrack.coordinates.filter((_, index) => index % compressionFactor === 0);
            console.log(`[AutoSave] Compressed to ${compressedTrack.coordinates.length} points`);
          }
          
          // Save to IndexedDB
          await saveTrackToIndexedDB(compressedTrack);
          
          // Try to save to localStorage as backup, but don't fail if quota is exceeded
          try {
            const tracks = JSON.parse(localStorage.getItem('tracks') || '[]');
            const trackIndex = tracks.findIndex((t: Track) => t.id === compressedTrack.id);
            
            if (trackIndex >= 0) {
              tracks[trackIndex] = compressedTrack;
            } else {
              tracks.push(compressedTrack);
            }
            
            localStorage.setItem('tracks', JSON.stringify(tracks));
          } catch (e) {
            // Handle quota exceeded errors gracefully
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              console.warn("[AutoSave] localStorage quota exceeded, skipping localStorage backup");
            } else {
              console.error("[AutoSave] Error saving to localStorage:", e);
            }
          }
          
          console.log("[AutoSave] Track saved successfully");
        } catch (error) {
          console.error("[AutoSave] Error saving track:", error);
        }
      }
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          console.log(`🔄 Tentativo di recupero dati da storage per ${name}...`);
          try {
            const data = await loadFromIndexedDB(name);
            if (data) {
              console.log('Dati recuperati con successo:', data);
              return JSON.stringify({
                state: {
                  ...initialState,
                  ...data
                }
              });
            }
            console.log('Nessun dato trovato, usando stato iniziale');
            return JSON.stringify({
              state: initialState
            });
          } catch (error) {
            console.error('Errore critico nel recupero dei dati:', error);
            return JSON.stringify({
              state: initialState
            });
          }
        },
        setItem: async (name, value) => {
          try {
            const parsed = JSON.parse(value);
            const dataToStore = parsed.state;
            
            // Only store the data we want to persist
            const persistedData = {
              tracks: dataToStore.tracks || [],
              currentTrack: dataToStore.currentTrack,
              loadedFindings: dataToStore.loadedFindings
            };
            
            console.log('Salvataggio dati in IndexedDB:', persistedData);
            await saveToIndexedDB(name, persistedData);
          } catch (error) {
            console.error('Errore nel salvataggio dei dati:', error);
          }
        },
        removeItem: async (name) => {
          try {
            const db = await initDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            
            await new Promise<void>((resolve, reject) => {
              const request = store.delete(name);
              request.onsuccess = () => {
                console.log('Dati rimossi con successo');
                resolve();
              };
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.error('Errore nella rimozione dei dati:', error);
          }
        }
      })),
      partialize: (state) => ({
        tracks: state.tracks || [],
        currentTrack: state.currentTrack,
        loadedFindings: state.loadedFindings
      })
    }
  )
);

// Initialize the store only in browser environment
if (typeof window !== 'undefined') {
  // Wrap in setTimeout to ensure React is fully initialized
  setTimeout(() => {
    initializeStore();
  }, 0);
}