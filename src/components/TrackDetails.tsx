import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MapPin, Clock, Route, X, AlertTriangle, Navigation, Save, Info, Thermometer, Droplet, Wind, Cloud, Sun } from 'lucide-react';
import { Track, Finding, WeatherData } from '../types';
import Map from './Map';
import { useWeatherStore } from '../store/weatherStore';

interface TrackingData {
  avgSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  calories: number;
  steps: number;
  temperature: number;
  humidity: number;
  totalDistance: number;
  totalTime: number;
}

interface TrackDetailsProps {
  track: Track;
  onClose: () => void;
}

const TrackDetails: React.FC<TrackDetailsProps> = ({ track, onClose }) => {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const { currentWeather, historicalData } = useWeatherStore();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  const handleTakePhoto = async (findingId: string) => {
    try {
      // Verifica se il browser supporta l'API della fotocamera
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La fotocamera non è supportata dal browser');
      }

      // Richiedi l'accesso alla fotocamera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Preferisci la fotocamera posteriore
        } 
      });

      // Crea un elemento video per mostrare l'anteprima
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // Crea un elemento canvas per catturare la foto
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // Quando il video è pronto, cattura la foto
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Converti la foto in base64
        const photoData = canvas.toDataURL('image/jpeg');

        // Ferma lo stream della fotocamera
        stream.getTracks().forEach(track => track.stop());

        // TODO: Salva la foto nel ritrovamento
        console.log('Foto scattata:', photoData);
      };
    } catch (error) {
      console.error('Errore durante l\'accesso alla fotocamera:', error);
      alert('Impossibile accedere alla fotocamera. Assicurati di aver concesso i permessi necessari.');
    }
  };

  useEffect(() => {
    // Calcola i dati di tracking basati sulla traccia
    if (track.coordinates && track.coordinates.length > 1) {
      const totalDistance = track.distance;
      const totalTime = track.endTime 
        ? (track.endTime.getTime() - track.startTime.getTime()) / 1000 / 60 // in minuti
        : 0;
      
      // Calcola velocità media e massima
      const avgSpeed = totalTime > 0 ? (totalDistance / totalTime) * 60 : 0; // km/h
      
      // Calcola dislivello
      let elevationGain = 0;
      let elevationLoss = 0;
      for (let i = 1; i < track.coordinates.length; i++) {
        const prevCoord = track.coordinates[i-1];
        const currCoord = track.coordinates[i];
        const diff = currCoord[1] - prevCoord[1]; // Usa l'indice 1 per l'altitudine
        if (diff > 0) elevationGain += diff;
        else elevationLoss += Math.abs(diff);
      }

      // Stima calorie e passi
      const calories = Math.round(totalDistance * 60); // Stima approssimativa
      const steps = Math.round(totalDistance * 1300); // Stima approssimativa

      setTrackingData({
        totalDistance,
        totalTime,
        avgSpeed,
        maxSpeed: avgSpeed * 1.5, // Stima approssimativa
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        calories,
        steps,
        temperature: currentWeather?.temperature || 0,
        humidity: currentWeather?.humidity || 0
      });
    }
  }, [track, currentWeather]);

  const getFindingStyles = (finding: Finding) => {
    return {
      bg: finding.type === 'Fungo' ? 'bg-[#8eaa36]/10' : 'bg-[#8B4513]/10',
      hover: finding.type === 'Fungo' ? 'hover:bg-[#8eaa36]/20' : 'hover:bg-[#8B4513]/20',
      text: finding.type === 'Fungo' ? 'text-[#8eaa36]' : 'text-[#8B4513]'
    };
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      case 'rain':
        return <Droplet className="w-5 h-5 text-blue-500" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFindingIcon = (type: string) => {
    switch (type) {
      case 'Fungo':
        return <img src="/icon/mushroom-tag-icon.svg" alt="Fungo" className="w-5 h-5" />;
      case 'Tartufo':
        return <img src="/icon/Truffle-tag-icon.svg" alt="Tartufo" className="w-5 h-5" />;
      case 'poi':
        return <img src="/icon/point-of-interest-tag-icon.svg" alt="Punto di interesse" className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{track.location?.name || 'Traccia senza nome'}</h2>
          <p className="text-sm text-gray-600">
            {format(track.startTime, "PPP p", { locale: it })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Map */}
          <div className="h-64 mb-6 rounded-lg overflow-hidden">
            <Map track={track} onTakePhoto={handleTakePhoto} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Durata</span>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {trackingData?.totalTime ? `${Math.round(trackingData.totalTime)} min` : 'In corso'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#FF9800]" />
                <span className="text-sm font-medium">Distanza</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{trackingData?.totalDistance.toFixed(2) || '0.00'} km</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Ritrovamenti</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{track.findings.length}</p>
            </div>
          </div>

          {/* Tracking Data */}
          {trackingData && (
            <div className="bg-white rounded-lg shadow mb-6">
              <h3 className="p-4 border-b text-lg font-semibold">Dati di Tracking</h3>
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-[#FF9800]" />
                  <div>
                    <p className="text-sm text-gray-600">Velocità media</p>
                    <p className="text-lg font-semibold">{trackingData.avgSpeed.toFixed(1)} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-[#FF9800]" />
                  <div>
                    <p className="text-sm text-gray-600">Velocità max</p>
                    <p className="text-lg font-semibold">{trackingData.maxSpeed.toFixed(1)} km/h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-[#8eaa36]" />
                  <div>
                    <p className="text-sm text-gray-600">Dislivello positivo</p>
                    <p className="text-lg font-semibold">{trackingData.elevationGain} m</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-[#8B4513]" />
                  <div>
                    <p className="text-sm text-gray-600">Dislivello negativo</p>
                    <p className="text-lg font-semibold">{trackingData.elevationLoss} m</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Temperatura</p>
                    <p className="text-lg font-semibold">{trackingData.temperature}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Umidità</p>
                    <p className="text-lg font-semibold">{trackingData.humidity}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Calorie</p>
                    <p className="text-lg font-semibold">{trackingData.calories} kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Passi</p>
                    <p className="text-lg font-semibold">{trackingData.steps}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weather History */}
          {historicalData && historicalData.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-6">
              <h3 className="p-4 border-b text-lg font-semibold">Storico Meteo</h3>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {historicalData.map((day: WeatherData, index: number) => (
                    <div key={index} className="text-center">
                      <p className="text-sm text-gray-600">{format(day.timestamp, 'dd/MM')}</p>
                      <div className="my-2">
                        {getWeatherIcon(day.condition)}
                      </div>
                      <p className="text-sm font-medium">{day.temperature}°C</p>
                      <p className="text-xs text-gray-500">{day.humidity}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Findings List */}
          <div className="bg-white rounded-lg shadow">
            <h3 className="p-4 border-b text-lg font-semibold">Ritrovamenti</h3>
            <div className="divide-y">
              {track.findings.map((finding, index) => {
                const styles = getFindingStyles(finding);
                return (
                  <div
                    key={`finding-${track.id}-${finding.id}-${index}`}
                    className={`p-4 ${styles.bg} ${styles.hover} transition-colors cursor-pointer`}
                    onClick={() => setSelectedFinding(finding)}
                  >
                    <div className="flex items-center gap-2">
                      {getFindingIcon(finding.type)}
                      <span className={`font-medium ${styles.text}`}>{finding.name}</span>
                    </div>
                    {finding.description && (
                      <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;