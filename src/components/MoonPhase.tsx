import React, { useState, useEffect } from 'react';
import { Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface MoonData {
  phase: string;
  illumination: number;
  moonrise: string;
  moonset: string;
  age: number;
}

const MoonPhase: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [moonData, setMoonData] = useState<MoonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMoonData = async (date: Date) => {
    try {
      setLoading(true);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=auto:ip&appid=${import.meta.env.VITE_OPENWEATHERMAP_API_KEY}&units=metric&dt=${formattedDate}`
      );

      if (!response.ok) throw new Error('Errore nel caricamento dei dati lunari');
      const data = await response.json();
      const astronomy = data.astronomy.astro;

      setMoonData({
        phase: astronomy.moon_phase,
        illumination: parseInt(astronomy.moon_illumination),
        moonrise: astronomy.moonrise,
        moonset: astronomy.moonset,
        age: calculateMoonAge(astronomy.moon_phase)
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setLoading(false);
    }
  };

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
      'Waning Crescent': { age: 25, italian: 'Luna Calante' }
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
      'Waning Crescent': 'Luna Calante'
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
    
    if (Math.abs(newDate.getTime() - new Date().getTime()) <= 14 * 24 * 60 * 60 * 1000) {
      setSelectedDate(newDate);
    }
  };

  useEffect(() => {
    fetchMoonData(selectedDate);
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>Errore: {error}</p>
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
            aria-label="Giorno precedente"
          >
            <ChevronLeft className="w-5 h-5 text-indigo-600" />
          </button>
          <span className="text-sm font-medium text-indigo-800">
            {format(selectedDate, 'd MMMM yyyy', { locale: it })}
          </span>
          <button
            onClick={() => navigateDate('next')}
            className="p-1 rounded-full hover:bg-indigo-100"
            aria-label="Giorno successivo"
          >
            <ChevronRight className="w-5 h-5 text-indigo-600" />
          </button>
        </div>
      </div>

      {moonData && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Moon 
                className={`w-24 h-24 text-indigo-600 ${getMoonPhaseIcon(moonData.phase)}`} 
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-indigo-100 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-indigo-800">
                  {moonData.illumination}%
                </span>
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-medium text-indigo-900">{getItalianPhase(moonData.phase)}</h4>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <span className="text-indigo-900">Alba lunare</span>
              <span className="font-medium text-indigo-700">{moonData.moonrise}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
              <span className="text-indigo-900">Tramonto lunare</span>
              <span className="font-medium text-indigo-700">{moonData.moonset}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-4 space-x-1">
          {Array.from({ length: 15 }, (_, i) => {
            const date = subDays(new Date(), 7 - i);
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            return (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-indigo-200'}`}
              />
            );
          })}
        </div>
        </>
      )}
    </div>
  );
};

export default MoonPhase;