import { useEffect, useState } from 'react';

interface CompassData {
  heading: number;
  accuracy: number | null;
}

export const useCompass = () => {
  const [compassData, setCompassData] = useState<CompassData>({
    heading: 0,
    accuracy: null
  });

  useEffect(() => {
    let isMounted = true;
    console.log('CompassService: Inizializzazione del servizio bussola');

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isMounted) return;

      // Verifica se il dispositivo supporta l'orientamento
      if (event.alpha === null) {
        console.warn('CompassService: Device orientation not supported');
        return;
      }

      // Ottieni l'angolo di rotazione (alpha) che rappresenta la direzione del nord magnetico
      const heading = event.alpha || 0;
      const accuracy = event.webkitCompassAccuracy || null;

      console.log('CompassService: Nuovi dati bussola:', { heading, accuracy });

      setCompassData({
        heading,
        accuracy
      });
    };

    // Richiedi i permessi per l'orientamento del dispositivo
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      console.log('CompassService: Richiesta permessi per l\'orientamento del dispositivo');
      (DeviceOrientationEvent as any).requestPermission()
        .then((permissionState: string) => {
          console.log('CompassService: Stato permessi:', permissionState);
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            console.log('CompassService: Permessi concessi, listener aggiunto');
          } else {
            console.warn('CompassService: Permessi per l\'orientamento negati');
          }
        })
        .catch((error: Error) => {
          console.error('CompassService: Errore nella richiesta dei permessi:', error);
        });
    } else {
      // Per dispositivi che non richiedono permessi espliciti
      console.log('CompassService: Aggiunta listener per l\'orientamento (senza richiesta permessi)');
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      console.log('CompassService: Pulizia del servizio bussola');
      isMounted = false;
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return compassData;
}; 