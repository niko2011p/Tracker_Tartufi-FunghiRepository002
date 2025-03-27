import React, { useState, useEffect } from 'react';
import { Moon, ChevronLeft, ChevronRight, Sunrise, Sunset } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { getAstroData } from '../services/weatherService';
import { useWeatherStore } from '../store/weatherStore';

interface MoonData {
  phase: string;
  illumination: number;
  moonrise: string;
  moonset: string;
  sunrise: string;
  sunset: string;
  age: number;
}

const MoonPhase: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Utilizzo lo store condiviso per la località
  const selectedLocation = useWeatherStore(state => state.selectedLocation);

  const fetchMoonData = async (date: Date) => {
    try {
      setLoading(true);
      setError(null); // Reset any previous errors
      
      // Dati predefiniti da utilizzare in caso di errore
      const defaultMoonData = {
        phase: 'New Moon',
        illumination: 0,
        moonrise: 'Non disponibile',
        moonset: 'Non disponibile',
        sunrise: 'Non disponibile',
        sunset: 'Non disponibile',
        age: 0
      };
      
      // Imposta subito i dati predefiniti per evitare rendering con dati null
      setMoonData({...defaultMoonData});
      
      // Verifica connessione internet prima di fare la richiesta
      if (!navigator.onLine) {
        console.warn('Nessuna connessione internet disponibile per i dati lunari');
        // Imposta dati predefiniti invece di lanciare un'eccezione
        const offlineData = {...defaultMoonData, 
          moonrise: 'Non disponibile (offline)',
          moonset: 'Non disponibile (offline)',
          sunrise: 'Non disponibile (offline)',
          sunset: 'Non disponibile (offline)'
        };
        setMoonData(offlineData);
        setLoading(false);
        return;
      }
      
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Usa la località selezionata dall'utente se disponibile, altrimenti usa Roma come default
      let locationQuery = 'Roma';
      if (selectedLocation && selectedLocation.lat && selectedLocation.lon) {
        locationQuery = `${selectedLocation.lat},${selectedLocation.lon}`;
      }
      
      // Aggiungi un timeout per evitare blocchi indefiniti
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout nel recupero dei dati lunari')), 10000);
      });
      
      // Usa Promise.race per implementare il timeout
      let astroData;
      try {
        astroData = await Promise.race([
          getAstroData(locationQuery, formattedDate),
          timeoutPromise
        ]) as any;
      } catch (timeoutErr) {
        console.warn('Timeout durante il recupero dei dati lunari:', timeoutErr);
        // Imposta dati predefiniti invece di lanciare un'eccezione
        const timeoutData = {...defaultMoonData, 
          moonrise: 'Non disponibile (timeout)',
          moonset: 'Non disponibile (timeout)',
          sunrise: 'Non disponibile (timeout)',
          sunset: 'Non disponibile (timeout)'
        };
        setMoonData(timeoutData);
        setLoading(false);
        return;
      }
      
      // Verifica che i dati ricevuti siano validi
      if (!astroData || typeof astroData !== 'object') {
        console.warn('Dati astronomici non validi o incompleti');
        // Imposta dati predefiniti invece di lanciare un'eccezione
        const invalidData = {...defaultMoonData, 
          moonrise: 'Non disponibile (dati non validi)',
          moonset: 'Non disponibile (dati non validi)',
          sunrise: 'Non disponibile (dati non validi)',
          sunset: 'Non disponibile (dati non validi)'
        };
        setMoonData(invalidData);
        setLoading(false);
        return;
      }
      
      // Estrai i dati lunari dalla risposta con controlli di sicurezza
      const moonPhaseText = astroData.moon_phase || 'Unknown';
      const moonIllumination = parseInt(astroData.moon_illumination || '0', 10);
      
      // Converti il testo della fase lunare nel formato interno
      const moonPhase = convertWeatherApiPhaseToInternal(moonPhaseText);
      
      setMoonData({
        phase: moonPhase,
        illumination: moonIllumination,
        moonrise: astroData.moonrise || 'Non disponibile',
        moonset: astroData.moonset || 'Non disponibile',
        sunrise: astroData.sunrise || 'Non disponibile',
        sunset: astroData.sunset || 'Non disponibile',
        age: calculateMoonAge(moonPhase)
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Errore nel recupero dei dati lunari:', err);
      // Imposta un messaggio di errore più descrittivo
      setError(err instanceof Error ? 
        `Errore: ${err.message}` : 
        'Errore sconosciuto nel caricamento dei dati lunari');
      
      // Invece di impostare moonData a null, usa i dati predefiniti
      // Questo evita errori di rendering quando si tenta di accedere alle proprietà di moonData
      setMoonData({
        phase: 'New Moon',
        illumination: 0,
        moonrise: 'Non disponibile (errore)',
        moonset: 'Non disponibile (errore)',
        sunrise: 'Non disponibile (errore)',
        sunset: 'Non disponibile (errore)',
        age: 0
      });
      setLoading(false);
    }
  };
  
  // Convert WeatherAPI moon phase text to our internal format
  const convertWeatherApiPhaseToInternal = (phase: string): string => {
    // Se la fase è undefined, null o una stringa vuota, restituisci 'New Moon'
    if (!phase) return 'New Moon';
    
    const phaseMap: { [key: string]: string } = {
      'New Moon': 'New Moon',
      'Waxing Crescent': 'Waxing Crescent',
      'First Quarter': 'First Quarter',
      'Waxing Gibbous': 'Waxing Gibbous',
      'Full Moon': 'Full Moon',
      'Waning Gibbous': 'Waning Gibbous',
      'Last Quarter': 'Last Quarter',
      'Waning Crescent': 'Waning Crescent',
      // Aggiungi possibili varianti restituite da WeatherAPI
      'New': 'New Moon',
      'Waxing crescent': 'Waxing Crescent',
      'First quarter': 'First Quarter',
      'Waxing gibbous': 'Waxing Gibbous',
      'Full': 'Full Moon',
      'Waning gibbous': 'Waning Gibbous',
      'Last quarter': 'Last Quarter',
      'Waning crescent': 'Waning Crescent',
      'Unknown': 'New Moon' // Gestisci il valore predefinito restituito in caso di errore
    };
    return phaseMap[phase] || 'New Moon';
  };

  
  // WeatherAPI fornisce direttamente l'illuminazione lunare, ma calcoliamo comunque l'età della luna
  // in base alla fase per scopi informativi

  const calculateMoonAge = (phase: string): number => {
    // Calculate moon age based on the current phase and illumination percentage
    const phases: { [key: string]: { age: number, italian: string } } = {
      'New Moon': { age: 0, italian: 'Luna Nuova' },
      'Waxing Crescent': { age: 4, italian: 'Luna Crescente' },
      'First Quarter': { age: 7, italian: 'Primo Quarto' },
      'Waxing Gibbous': { age: 11, italian: 'Gibbosa Crescente' },
      'Full Moon': { age: 14, italian: 'Luna Piena' },
      'Waning Gibbous': { age: 18, italian: 'Gibbosa Calante' },
      'Last Quarter': { age: 21, italian: 'Ultimo Quarto' },
      'Waning Crescent': { age: 25, italian: 'Luna Calante' },
      // Aggiungi varianti per compatibilità con WeatherAPI
      'New': { age: 0, italian: 'Luna Nuova' },
      'Waxing crescent': { age: 4, italian: 'Luna Crescente' },
      'First quarter': { age: 7, italian: 'Primo Quarto' },
      'Waxing gibbous': { age: 11, italian: 'Gibbosa Crescente' },
      'Full': { age: 14, italian: 'Luna Piena' },
      'Waning gibbous': { age: 18, italian: 'Gibbosa Calante' },
      'Last quarter': { age: 21, italian: 'Ultimo Quarto' },
      'Waning crescent': { age: 25, italian: 'Luna Calante' }
    };
    return phases[phase]?.age || 0;
  };

  const getItalianPhase = (phase: string): string => {
    const phases: { [key: string]: string } = {
      'New Moon': 'Luna Nuova',
      'Waxing Crescent': 'Luna Crescente',
      'First Quarter': 'Primo Quarto',
      'Waxing Gibbous': 'Gibbosa Crescente',
      'Full Moon': 'Luna Piena',
      'Waning Gibbous': 'Gibbosa Calante',
      'Last Quarter': 'Ultimo Quarto',
      'Waning Crescent': 'Luna Calante',
      // Aggiungi varianti per compatibilità con WeatherAPI
      'New': 'Luna Nuova',
      'Waxing crescent': 'Luna Crescente',
      'First quarter': 'Primo Quarto',
      'Waxing gibbous': 'Gibbosa Crescente',
      'Full': 'Luna Piena',
      'Waning gibbous': 'Gibbosa Calante',
      'Last quarter': 'Ultimo Quarto',
      'Waning crescent': 'Luna Calante'
    };
    return phases[phase] || phase;
  };

  const getMoonPhaseIcon = (phase: string) => {
    const rotations: { [key: string]: string } = {
      'New Moon': 'rotate-0',
      'Waxing Crescent': 'rotate-45',
      'First Quarter': 'rotate-90',
      'Waxing Gibbous': 'rotate-135',
      'Full Moon': 'rotate-180',
      'Waning Gibbous': 'rotate-225',
      'Last Quarter': 'rotate-270',
      'Waning Crescent': 'rotate-315'
    };
    return `transform ${rotations[phase] || 'rotate-0'}`;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 1)
      : addDays(selectedDate, 1);
    
    // Limita la navigazione a 7 giorni indietro e 3 giorni avanti
    const today = new Date();
    const minDate = subDays(today, 7);
    const maxDate = addDays(today, 3);
    
    if (newDate >= minDate && newDate <= maxDate) {
      setSelectedDate(newDate);
    }
  };

  useEffect(() => {
    fetchMoonData(selectedDate);
    
    // Cleanup function per evitare memory leaks e problemi di rendering
    return () => {
      setLoading(false);
      setError(null);
    };
  }, [selectedDate, selectedLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    console.warn('Errore visualizzato nel componente MoonPhase:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="text-lg font-medium text-red-700 mb-2">Errore nel caricamento dei dati lunari</h4>
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-red-500 mt-2">Controlla la connessione internet o la configurazione dell'API WeatherAPI.</p>
        <button 
          onClick={() => fetchMoonData(selectedDate)} 
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-indigo-900">Fase Lunare</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-1 rounded-full hover:bg-indigo-100"
            disabled={subDays(selectedDate, 1) < subDays(new Date(), 7)}
          >
            <ChevronLeft className="w-5 h-5 text-indigo-700" />
          </button>
          <span className="text-indigo-800 font-medium">
            {format(selectedDate, 'd MMMM', { locale: it })}
          </span>
          <button
            onClick={() => navigateDate('next')}
            className="p-1 rounded-full hover:bg-indigo-100"
            disabled={addDays(selectedDate, 1) > addDays(new Date(), 3)}
          >
            <ChevronRight className="w-5 h-5 text-indigo-700" />
          </button>
        </div>
      </div>

      {moonData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Moon 
                className={`w-24 h-24 text-indigo-600 ${getMoonPhaseIcon(moonData.phase || 'New Moon')}`} 
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-indigo-100 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-indigo-800">
                  {moonData.illumination || 0}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-medium text-indigo-900">{getItalianPhase(moonData.phase || 'New Moon')}</h4>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <span className="text-indigo-900">Alba lunare</span>
              <span className="font-medium text-indigo-700">{moonData.moonrise || 'Non disponibile'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <span className="text-indigo-900">Tramonto lunare</span>
              <span className="font-medium text-indigo-700">{moonData.moonset || 'Non disponibile'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <div className="flex items-center">
                <Sunrise className="w-4 h-4 mr-2 text-orange-500" />
                <span className="text-indigo-900">Alba</span>
              </div>
              <span className="font-medium text-indigo-700">{moonData.sunrise || 'Non disponibile'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <div className="flex items-center">
                <Sunset className="w-4 h-4 mr-2 text-red-500" />
                <span className="text-indigo-900">Tramonto</span>
              </div>
              <span className="font-medium text-indigo-700">{moonData.sunset || 'Non disponibile'}</span>
            </div>
          </div>
          <div className="flex justify-center mt-4 space-x-1 col-span-1 md:col-span-2">
            {Array.from({ length: 11 }, (_, i) => {
              // Mostra 7 giorni indietro, oggi, e 3 giorni avanti
              const date = subDays(new Date(), 7 - i);
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              return (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                  onClick={() => setSelectedDate(date)}
                  style={{ cursor: 'pointer' }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-lg font-medium text-yellow-700 mb-2">Dati lunari non disponibili</h4>
          <p className="text-yellow-600">Non è stato possibile caricare i dati lunari per questa data.</p>
          <p className="text-sm text-yellow-500 mt-2">Riprova più tardi o seleziona un'altra data.</p>
          <button 
            onClick={() => fetchMoonData(selectedDate)} 
            className="mt-2 px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-md text-sm"
          >
            Riprova
          </button>
        </div>
      )}
    </div>
  );
};

export default MoonPhase;