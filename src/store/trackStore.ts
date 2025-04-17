import { create } from 'zustand';
import { Track, Finding } from '../types';
import * as turf from '@turf/turf';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import LZString from 'lz-string';
import { openDB } from 'idb';

// Import SVG icons
import mushroomIconUrl from '@/assets/icons/mushroom-tag-icon.svg';
import truffleIconUrl from '@/assets/icons/truffle-tag-icon.svg';

// Update the Track interface to include historyData
interface ExtendedTrack extends Track {
  historyData?: {
    recentTracks: string[];
    lastUpdated: string;
  };
}

// Add type declarations for @turf/turf
declare module '@turf/turf' {
  export function point(coordinates: [number, number]): any;
  export function distance(from: any, to: any, options?: { units?: string }): number;
  export function bearing(from: any, to: any): number;
  export function lineString(coordinates: [number, number][]): any;
  export function length(geojson: any, options?: { units?: string }): number;
}

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

// Aggiungi queste costanti all'inizio del file
const DB_NAME = 'tracksDB';
const DB_VERSION = 2;
const STORE_NAME = 'tracks';

// Funzione per inizializzare IndexedDB
const initDB = async () => {
  console.log('🔄 Inizializzazione IndexedDB...');
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('❌ Errore apertura IndexedDB:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('✅ IndexedDB aperto con successo');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('🔄 Aggiornamento schema IndexedDB...');
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Elimina gli store esistenti se presenti
      if (db.objectStoreNames.contains('tracks')) {
        db.deleteObjectStore('tracks');
      }
      if (db.objectStoreNames.contains('state')) {
        db.deleteObjectStore('state');
      }
      
      // Crea gli store con la configurazione corretta
      db.createObjectStore('tracks', { keyPath: 'id' });
      console.log('✅ Store "tracks" creato');
      
      db.createObjectStore('state');
      console.log('✅ Store "state" creato');
    };

    request.onblocked = () => {
      console.error('❌ IndexedDB bloccato. Chiudi altre istanze dell\'applicazione.');
      reject(new Error('IndexedDB bloccato'));
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

// Update the transaction handling
const saveToIndexedDB = async (key: string, data: any) => {
  console.log(`🔄 Salvataggio in IndexedDB per ${key}...`);
  try {
    const db = await initDB();
    const tx = db.transaction(['state', 'tracks'], 'readwrite');
    const stateStore = tx.objectStore('state');
    const tracksStore = tx.objectStore('tracks');
    
    // Pre-processiamo i dati per assicurarci che siano serializzabili
    const processedData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }));
    
    if (key === 'tracks-storage') {
      await stateStore.put(processedData, key);
    } else if (key === 'tracks') {
      // Se stiamo salvando le tracce, le salviamo una per una usando l'id come chiave
      if (Array.isArray(processedData)) {
        for (const track of processedData) {
          await tracksStore.put(track);
        }
      }
    }
    
    // Wait for transaction to complete
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    console.log(`✅ Dati salvati in IndexedDB per ${key}`);
  } catch (error) {
    console.error('❌ Errore nel salvataggio in IndexedDB:', error);
    // Fallback su localStorage
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Dati salvati in localStorage come fallback per ${key}`);
    } catch (lsError) {
      console.error('❌ Errore anche nel fallback su localStorage:', lsError);
    }
  }
};

// Funzione per caricare da IndexedDB
const loadFromIndexedDB = async (key: string): Promise<any> => {
  console.log(`🔄 Caricamento da IndexedDB per ${key}...`);
  try {
    const db = await initDB();
    const tx = db.transaction(['state', 'tracks'], 'readonly');
    const stateStore = tx.objectStore('state');
    const tracksStore = tx.objectStore('tracks');
    
    let data;
    if (key === 'tracks-storage') {
      data = await stateStore.get(key);
    } else if (key === 'tracks') {
      data = await tracksStore.getAll();
    }
    
    await tx.done;
    
    if (data) {
      console.log(`✅ Dati caricati da IndexedDB per ${key}`);
      return data;
    }
    
    // Fallback su localStorage
    const localData = localStorage.getItem(key);
    if (localData) {
      console.log(`✅ Dati caricati da localStorage come fallback per ${key}`);
      return JSON.parse(localData);
    }
    
    console.log(`ℹ️ Nessun dato trovato per ${key}`);
    return null;
  } catch (error) {
    console.error('❌ Errore nel caricamento da IndexedDB:', error);
    // Fallback su localStorage
    try {
      const localData = localStorage.getItem(key);
      if (localData) {
        console.log(`✅ Dati caricati da localStorage come fallback per ${key}`);
        return JSON.parse(localData);
      }
    } catch (lsError) {
      console.error('❌ Errore anche nel fallback su localStorage:', lsError);
    }
    return null;
  }
};

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
                  const startTime = track.startTime instanceof Date ? 
                    track.startTime : new Date(track.startTime);
                  return startTime >= sevenDaysAgo;
                })
                .slice(0, 20); // Limita a 20 tracce per evitare problemi di performance
              
              // Verifica che tutti i ritrovamenti abbiano coordinate valide
              const validatedFindings = currentTrack.findings.map(finding => {
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
                historyData: {
                  recentTracks: recentTracks.map(t => t.id),
                  lastUpdated: new Date().toISOString()
                }
              };
              
              console.log('✅ Track stopped and saved successfully. Total tracks:', tracks.length + 1);
              
              const updatedTracks = [...tracks, completedTrack];
              
              set({
                tracks: updatedTracks,
                currentTrack: null,
                isRecording: false,
                loadedFindings: null
              });
              
              // Salviamo direttamente in IndexedDB
              console.log('💾 Salvando dati direttamente in IndexedDB...');
              try {
                await saveToIndexedDB('tracks', updatedTracks);
                console.log('✅ Salvataggio diretto in IndexedDB completato');
              } catch (idbError) {
                console.error('❌ Errore nel salvataggio diretto in IndexedDB:', idbError);
              }
              
              // Aggiorniamo lo stato di persist di Zustand
              try {
                get().saveTracks();
              } catch (error) {
                console.error('❌ Errore nel salvare le tracce con persist:', error);
              }
              
              // Esegui un'operazione esplicita di pulizia
              console.log('🧹 Pulizia dei dati temporanei...');
              try {
                localStorage.removeItem('currentTrack');
                const db = await initDB(); // Usa initDB invece di openDB
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
              
              // Fallback in caso di errore
              const basicCompletedTrack: Track = {
                ...currentTrack,
                endTime,
                duration: durationMs,
                avgSpeed,
                avgAltitude: 0,
                totalDistance: currentTrack.distance
              };
              
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
          
          return finalizeTrack();
        }
        return null;
      },

      deleteTrack: async (id: string) => {
        try {
          await deleteTrackFromDB(id);
        set(state => ({
          tracks: state.tracks.filter(track => track.id !== id)
        }));
          console.log('Traccia eliminata con successo da IndexedDB');
        } catch (error) {
          console.error('Errore nell\'eliminazione della traccia:', error);
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
            // Ottieni la posizione con alta precisione
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          const geoOptions = {
            enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
          };
          
              console.log('📍 Acquisizione posizione GPS per nuovo ritrovamento...');
              navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
            });
          
            // Valida e formatta le coordinate con 6 decimali di precisione
                const coordinates: [number, number] = [
              Number(position.coords.latitude.toFixed(6)),
              Number(position.coords.longitude.toFixed(6))
            ];

            // Verifica che le coordinate siano valide
            if (isNaN(coordinates[0]) || isNaN(coordinates[1]) ||
                coordinates[0] === 0 || coordinates[1] === 0) {
              throw new Error('Coordinate GPS non valide');
            }

            console.log(`✅ Coordinate acquisite: [${coordinates[0]}, ${coordinates[1]}]`);
            console.log(`📊 Precisione GPS: ${position.coords.accuracy}m`);
                
                const newFinding: Finding = {
                  ...finding,
                  id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  trackId: currentTrack.id,
                  coordinates,
                  timestamp: new Date()
                };
                
            console.log('🎯 Nuovo ritrovamento creato:', {
              id: newFinding.id,
              type: newFinding.type,
              coordinates: newFinding.coordinates
            });

            // Aggiorna la traccia corrente con il nuovo ritrovamento
            const updatedTrack = {
                    ...currentTrack,
                    findings: [...currentTrack.findings, newFinding]
            };
                
            // Aggiorna lo stato
            set({ currentTrack: updatedTrack });
                
            // Salva immediatamente in IndexedDB
                try {
              await saveToIndexedDB('currentTrack', updatedTrack);
              console.log('💾 Ritrovamento salvato in IndexedDB');
                } catch (error) {
              console.error('❌ Errore nel salvataggio in IndexedDB:', error);
            }

            // Backup in localStorage
            try {
              saveToLocalStorage('currentTrack', updatedTrack);
              console.log('💾 Backup ritrovamento in localStorage');
            } catch (error) {
              console.error('❌ Errore nel backup in localStorage:', error);
            }

            return newFinding;
          } catch (error) {
            console.error('❌ Errore nell\'acquisizione della posizione GPS:', error);
            throw new Error('Impossibile acquisire la posizione GPS. Assicurati che il GPS sia attivo e riprova.');
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
  ${track.findings.map(finding => {
    const iconUrl = finding.type === 'Fungo' 
      ? mushroomIconUrl 
      : truffleIconUrl;
    return `
  <wpt lat="${finding.coordinates[0]}" lon="${finding.coordinates[1]}">
    <name>${finding.name}</name>
    <desc>${finding.description || ''}</desc>
    <time>${finding.timestamp.toISOString()}</time>
    ${finding.photoUrl ? `<link href="${finding.photoUrl}">
      <text>Photo</text>
    </link>` : ''}
    <sym>${finding.name.startsWith('Fungo') ? 'Mushroom' : 'Flag, Blue'}</sym>
  </wpt>`;
  }).join('')}`).join('')}
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
                description: wpt.getElementsByTagName('desc')[0]?.textContent || undefined,
                photoUrl: wpt.getElementsByTagName('link')[0]?.getAttribute('href') || undefined,
                coordinates: [
                  parseFloat(wpt.getAttribute('lat') || '0'),
                  parseFloat(wpt.getAttribute('lon') || '0')
                ] as [number, number],
                timestamp: new Date(wpt.getElementsByTagName('time')[0]?.textContent || ''),
                type: 'Fungo' // Default type
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
            } as ExtendedTrack;
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
        console.log('📋 Caricamento tracce...');
        try {
          // Prima prova a caricare da IndexedDB
          const stateData = await loadFromIndexedDB('tracks-storage');
          if (stateData?.state?.tracks?.length > 0) {
            console.log(`✅ Caricate ${stateData.state.tracks.length} tracce da IndexedDB`);
            // Converti le date da string a Date
            const tracks = stateData.state.tracks.map(track => ({
          ...track,
              startTime: new Date(track.startTime),
              endTime: track.endTime ? new Date(track.endTime) : undefined,
          findings: track.findings.map(finding => ({
            ...finding,
                timestamp: new Date(finding.timestamp)
          }))
        }));
            set({ tracks });
            return;
          }
          
          // Fallback su localStorage
          const localData = localStorage.getItem('tracks-storage');
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.state?.tracks?.length > 0) {
                console.log(`✅ Caricate ${parsed.state.tracks.length} tracce da localStorage`);
                // Converti le date da string a Date
                const tracks = parsed.state.tracks.map(track => ({
            ...track,
            startTime: new Date(track.startTime),
            endTime: track.endTime ? new Date(track.endTime) : undefined,
            findings: track.findings.map(finding => ({
              ...finding,
              timestamp: new Date(finding.timestamp)
            }))
          }));
                set({ tracks });
                // Salva anche in IndexedDB per il futuro
                await saveToIndexedDB('tracks-storage', { state: { tracks } });
                return;
              }
            } catch (e) {
              console.error('❌ Errore nel parsing dei dati da localStorage:', e);
            }
          }
          
          console.log('ℹ️ Nessuna traccia trovata');
          set({ tracks: [] });
        } catch (error) {
          console.error('❌ Errore nel caricamento delle tracce:', error);
          set({ tracks: [] });
        }
      },

      saveTracks: async () => {
        const { tracks } = get();
        console.log(`📝 Salvando ${tracks.length} tracce...`);
        try {
          const state = {
            tracks,
            currentTrack: get().currentTrack,
            loadedFindings: get().loadedFindings
          };
          
          // Salva in IndexedDB
          await saveToIndexedDB('tracks-storage', { state });
          
          // Backup in localStorage
          try {
            localStorage.setItem('tracks-storage', JSON.stringify({ state }));
          } catch (e) {
            console.warn('⚠️ Errore nel salvataggio su localStorage:', e);
          }
          
          console.log('✅ Tracce salvate con successo');
        } catch (error) {
          console.error('❌ Errore nel salvataggio delle tracce:', error);
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
      partialize: (state) => ({
        tracks: state.tracks,
        currentTrack: state.currentTrack,
        loadedFindings: state.loadedFindings
      }),
      storage: {
        getItem: async (name) => {
          console.log(`🔄 Recupero dati da storage per ${name}...`);
          try {
            // Prima prova a caricare da IndexedDB
            const data = await loadFromIndexedDB(name);
            if (data) {
              console.log('📦 Dati recuperati da IndexedDB:', data);
              return JSON.stringify({
                state: {
                  ...data.state,
                  tracks: Array.isArray(data.state?.tracks) ? data.state.tracks : []
                },
                version: 0
              });
            }

            // Fallback su localStorage
            const localData = localStorage.getItem(name);
            if (localData) {
              console.log('📦 Dati recuperati da localStorage');
              return localData;
            }

            console.log('❌ Nessun dato trovato');
            return null;
          } catch (error) {
            console.error('❌ Errore nel recupero dei dati:', error);
            return null;
          }
        },
        setItem: async (name, valueStr) => {
          console.log(`💾 Salvataggio dati per ${name}...`);
          try {
            let dataToStore;
            try {
              // Parse the value string if it's a string
              const parsedValue = typeof valueStr === 'string' ? JSON.parse(valueStr) : valueStr;
              
              // Ensure we have a valid state object
              if (!parsedValue?.state) {
                throw new Error('Invalid state format');
              }
              
              // Process the data to ensure it's serializable
              dataToStore = {
                state: {
                  ...parsedValue.state,
                  tracks: Array.isArray(parsedValue.state.tracks) 
                    ? parsedValue.state.tracks.map(track => ({
                        ...track,
                        startTime: track.startTime instanceof Date 
                          ? track.startTime.toISOString() 
                          : track.startTime,
                        endTime: track.endTime instanceof Date 
                          ? track.endTime.toISOString() 
                          : track.endTime,
                        findings: Array.isArray(track.findings)
                          ? track.findings.map(finding => ({
                ...finding,
                              timestamp: finding.timestamp instanceof Date
                                ? finding.timestamp.toISOString()
                                : finding.timestamp
                            }))
                          : []
                      }))
                    : []
                }
              };
              
              console.log('📦 Dati processati per il salvataggio:', dataToStore);
            } catch (e) {
              console.warn('⚠️ Errore nel parsing JSON, uso valore originale:', e);
              dataToStore = valueStr;
            }

            // Salva in IndexedDB
            await saveToIndexedDB(name, dataToStore);

            // Backup in localStorage (solo se i dati non sono troppo grandi)
            try {
              const serialized = typeof dataToStore === 'string' ? dataToStore : JSON.stringify(dataToStore);
              if (serialized.length < 5000000) { // ~5MB limit
                localStorage.setItem(name, serialized);
              }
            } catch (e) {
              console.warn('⚠️ Fallback su localStorage non riuscito:', e);
            }
          } catch (error) {
            console.error('❌ Errore nel salvataggio dei dati:', error);
          }
        },
        removeItem: async (name) => {
          try {
            localStorage.removeItem(name);
            const db = await initDB();
            const tx = db.transaction(['state', 'tracks'], 'readwrite');
            await Promise.all([
              tx.objectStore('state').delete(name),
              tx.objectStore('tracks').clear()
            ]);
            await tx.done;
            console.log(`✅ Dati rimossi per ${name}`);
          } catch (error) {
            console.error('❌ Errore nella rimozione dei dati:', error);
          }
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('✅ Stato reidratato:', state);
          // Forza il caricamento delle tracce
          setTimeout(() => {
            useTrackStore.getState().loadTracks();
          }, 0);
        }
      }
    }
  )
);

// Funzione per creare un marker personalizzato
const createCustomMarker = (finding: Finding) => {
  // Determina l'icona in base al tipo
  const iconUrl = finding.type === 'Fungo' 
    ? mushroomIconUrl 
    : truffleIconUrl;
  
  console.log(`🎯 Creazione marker per ${finding.type} con icona: ${iconUrl}`);

  const iconHtml = `
    <div class="finding-marker" style="
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      background: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
      border-radius: 50%;
      border: 2px solid ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
    ">
      <div class="finding-pulse" style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'}40;
        animation: pulse 2s infinite;
      "></div>
      <div style="
        width: 32px;
        height: 32px;
        position: relative;
        z-index: 1000;
        background-color: ${finding.type === 'Fungo' ? '#8eaa36' : '#8B4513'};
        mask: url(${iconUrl}) no-repeat center;
        -webkit-mask: url(${iconUrl}) no-repeat center;
        mask-size: contain;
        -webkit-mask-size: contain;
      "></div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'finding-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};