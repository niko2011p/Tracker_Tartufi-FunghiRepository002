import { useState, useEffect, useCallback } from 'react';

// Configurazione predefinita per le richieste di geolocalizzazione
export const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000
};

// Posizione predefinita da utilizzare in caso di errore
export const DEFAULT_POSITION: [number, number] = [42.8333, 12.8333]; // Centro Italia

// Interfaccia per lo stato del servizio GPS
export interface GpsState {
  position: [number, number] | null;
  error: GeolocationPositionError | Error | null;
  isLoading: boolean;
  isAvailable: boolean;
  timestamp: number | null;
  accuracy: number | null;
}

// Interfaccia per le opzioni del servizio GPS
export interface GpsServiceOptions {
  onSuccess?: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationPositionError | Error) => void;
  onUnavailable?: () => void;
  maxRetries?: number;
  retryInterval?: number;
  positionOptions?: PositionOptions;
}

/**
 * Servizio centralizzato per la gestione della geolocalizzazione
 */
export class GpsService {
  private watchId: number | null = null;
  private retryCount = 0;
  private retryTimeout: number | null = null;
  private options: GpsServiceOptions;
  
  constructor(options: GpsServiceOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryInterval: 2000,
      positionOptions: DEFAULT_GEOLOCATION_OPTIONS,
      ...options
    };
  }

  /**
   * Verifica se la geolocalizzazione è supportata dal browser
   */
  public static isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Richiede la posizione corrente con gestione degli errori e retry automatici
   */
  public getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!GpsService.isSupported()) {
        const error = new Error('Geolocalizzazione non supportata dal browser');
        this.options.onError?.(error);
        this.options.onUnavailable?.();
        reject(error);
        return;
      }

      const handleSuccess = (position: GeolocationPosition) => {
        this.retryCount = 0;
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        this.options.onSuccess?.(position);
        resolve(position);
      };

      const handleError = (error: GeolocationPositionError) => {
        console.warn('Errore di geolocalizzazione:', error.message);
        this.options.onError?.(error);

        // Implementazione della logica di retry
        if (this.retryCount < (this.options.maxRetries || 0)) {
          this.retryCount++;
          console.log(`Tentativo ${this.retryCount}/${this.options.maxRetries}...`);
          
          // Modifica le opzioni per ogni retry
          const retryOptions: PositionOptions = {
            ...this.options.positionOptions,
            enableHighAccuracy: this.retryCount < 2, // Disabilita high accuracy dopo il primo retry
            timeout: (this.options.positionOptions?.timeout || 20000) + (this.retryCount * 5000),
            maximumAge: (this.options.positionOptions?.maximumAge || 30000) * (this.retryCount + 1)
          };
          
          this.retryTimeout = window.setTimeout(() => {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              this.retryCount >= (this.options.maxRetries || 0) ? finalError : handleError,
              retryOptions
            );
          }, this.options.retryInterval);
        } else {
          finalError(error);
        }
      };

      const finalError = (error: GeolocationPositionError) => {
        console.error('Tutti i tentativi di geolocalizzazione falliti:', error.message);
        this.options.onUnavailable?.();
        reject(error);
      };

      // Prima richiesta di posizione
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        this.options.positionOptions
      );
    });
  }

  /**
   * Avvia il monitoraggio continuo della posizione
   */
  public startWatching(onUpdate: (position: GeolocationPosition) => void, onError?: (error: GeolocationPositionError) => void): void {
    if (!GpsService.isSupported()) {
      const error = new Error('Geolocalizzazione non supportata dal browser');
      this.options.onError?.(error);
      this.options.onUnavailable?.();
      return;
    }

    // Ferma eventuali watch precedenti
    this.stopWatching();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        onUpdate(position);
        this.options.onSuccess?.(position);
      },
      (error) => {
        console.warn('Errore durante il monitoraggio della posizione:', error.message);
        if (onError) onError(error);
        this.options.onError?.(error);
      },
      this.options.positionOptions
    );
  }

  /**
   * Ferma il monitoraggio della posizione
   */
  public stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Pulisce tutte le risorse utilizzate dal servizio
   */
  public dispose(): void {
    this.stopWatching();
  }
}

/**
 * Hook React per utilizzare il servizio GPS nei componenti funzionali
 */
export function useGps(options: GpsServiceOptions = {}): GpsState & {
  requestPosition: () => Promise<[number, number]>;
  startWatching: () => void;
  stopWatching: () => void;
} {
  const [state, setState] = useState<GpsState>({
    position: null,
    error: null,
    isLoading: false,
    isAvailable: GpsService.isSupported(),
    timestamp: null,
    accuracy: null
  });

  const gpsServiceRef = useCallback(() => {
    return new GpsService({
      ...options,
      onSuccess: (position) => {
        setState({
          position: [position.coords.latitude, position.coords.longitude],
          error: null,
          isLoading: false,
          isAvailable: true,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy
        });
        options.onSuccess?.(position);
      },
      onError: (error) => {
        setState(prev => ({
          ...prev,
          error,
          isLoading: false
        }));
        options.onError?.(error);
      },
      onUnavailable: () => {
        setState(prev => ({
          ...prev,
          isAvailable: false,
          isLoading: false
        }));
        options.onUnavailable?.();
      }
    });
  }, [options]);

  const requestPosition = useCallback(async (): Promise<[number, number]> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const service = gpsServiceRef();
      const position = await service.getCurrentPosition();
      return [position.coords.latitude, position.coords.longitude];
    } catch (error) {
      console.error('Errore durante la richiesta della posizione:', error);
      throw error;
    }
  }, [gpsServiceRef]);

  const startWatching = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    const service = gpsServiceRef();
    service.startWatching(
      (position) => {
        // onUpdate è già gestito nelle opzioni del servizio
      },
      (error) => {
        // onError è già gestito nelle opzioni del servizio
      }
    );
  }, [gpsServiceRef]);

  const stopWatching = useCallback(() => {
    const service = gpsServiceRef();
    service.stopWatching();
  }, [gpsServiceRef]);

  // Pulisce le risorse quando il componente viene smontato
  useEffect(() => {
    return () => {
      const service = gpsServiceRef();
      service.dispose();
    };
  }, [gpsServiceRef]);

  return {
    ...state,
    requestPosition,
    startWatching,
    stopWatching
  };
}