// Servizio centralizzato per la ricerca delle località

interface Location {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

/**
 * Cerca località in base alla query fornita
 * @param query - Stringa di ricerca o coordinate (lat,lon)
 * @returns Array di località trovate
 */
export const searchLocations = async (query: string): Promise<Location[]> => {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=${import.meta.env.VITE_WEATHERAPI_KEY}&q=${encodeURIComponent(query)}&lang=it`
    );
    
    if (!response.ok) throw new Error('Errore nella ricerca delle località');
    const locations = await response.json();
    
    return locations.map((loc: any) => ({
      name: loc.name,
      region: loc.region || '',
      country: loc.country || '',
      lat: loc.lat,
      lon: loc.lon
    }));
  } catch (err) {
    console.error('Errore nella ricerca delle località:', err);
    return [];
  }
};

/**
 * Ottiene la località in base alle coordinate GPS
 * @param latitude - Latitudine
 * @param longitude - Longitudine
 * @returns La località trovata o null
 */
export const getLocationByCoordinates = async (latitude: number, longitude: number): Promise<Location | null> => {
  try {
    const locations = await searchLocations(`${latitude},${longitude}`);
    if (locations && locations.length > 0) {
      return locations[0];
    }
    // Se non trova una località specifica, usa le coordinate
    return {
      name: 'Posizione attuale',
      region: '',
      country: '',
      lat: latitude,
      lon: longitude
    };
  } catch (err) {
    console.error('Errore nel recupero della località:', err);
    return null;
  }
};