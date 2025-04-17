import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Clock, Route, X, AlertTriangle, Navigation, Save, Info, Thermometer, Droplets, Wind, Cloud, Sun, ArrowUp, ArrowDown, Timer, Mountain } from 'lucide-react';
import { Track, Finding, WeatherData } from '../types';
import Map from './Map';
import { useWeatherStore } from '../store/weatherStore';
import { useTrackStore } from '../store/trackStore';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import SVG icons
import mushroomIconUrl from '../assets/icons/mushroom-tag-icon.svg';
import truffleIconUrl from '../assets/icons/truffle-tag-icon.svg';
import poiIconUrl from '../assets/icons/point-of-interest-tag-icon.svg';

interface TrackingData {
  totalTime: number;
  totalDistance: number;
  averageSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  averageHeight: number;
  calories: number;
  steps: number;
}

interface TrackDetailsProps {
  track: Track;
  onClose: () => void;
}

const TrackDetails: React.FC<TrackDetailsProps> = ({ track, onClose }) => {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const { currentWeather } = useWeatherStore();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  useEffect(() => {
    if (!track) return;

    // Calcola i dati di tracking
    const totalTime = track.endTime 
      ? (new Date(track.endTime).getTime() - new Date(track.startTime).getTime()) / (1000 * 60)
      : (new Date().getTime() - new Date(track.startTime).getTime()) / (1000 * 60);

    const totalDistance = track.totalDistance || track.distance || 0;
    const averageSpeed = totalDistance / (totalTime / 60);

    // Calcola l'elevazione usando le coordinate
    let elevationGain = 0;
    let elevationLoss = 0;
    let totalHeight = 0;

    if (track.coordinates && track.coordinates.length > 1) {
      for (let i = 1; i < track.coordinates.length; i++) {
        const prevHeight = track.coordinates[i - 1][0] || 0;
        const currHeight = track.coordinates[i][0] || 0;
        const diff = currHeight - prevHeight;
        
        if (diff > 0) elevationGain += diff;
        else elevationLoss += Math.abs(diff);
        
        totalHeight += currHeight;
      }
    }

    const averageHeight = track.coordinates && track.coordinates.length > 0
      ? totalHeight / track.coordinates.length
      : 0;

    // Stima calorie e passi
    const calories = Math.round(totalDistance * 60);
    const steps = Math.round(totalDistance * 1312);

    setTrackingData({
      totalTime,
      totalDistance,
      averageSpeed,
      elevationGain,
      elevationLoss,
      averageHeight,
      calories,
      steps
    });
  }, [track]);

  const getFindingStyles = (finding: Finding) => {
    return {
      bg: finding.type === 'Fungo' ? 'bg-[#8eaa36]/10' : 'bg-[#8B4513]/10',
      hover: finding.type === 'Fungo' ? 'hover:bg-[#8eaa36]/20' : 'hover:bg-[#8B4513]/20',
      text: finding.type === 'Fungo' ? 'text-[#8eaa36]' : 'text-[#8B4513]'
    };
  };

  const getFindingIcon = (type: string) => {
    switch (type) {
      case 'Fungo':
        return <img src={mushroomIconUrl} alt="Fungo" className="w-6 h-6" />;
      case 'Tartufo':
        return <img src={truffleIconUrl} alt="Tartufo" className="w-6 h-6" />;
      case 'poi':
        return <img src={poiIconUrl} alt="Punto di interesse" className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      case 'rain':
        return <Droplets className="w-5 h-5 text-blue-500" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
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
          <div className="h-64 mb-6 rounded-lg overflow-hidden border">
            <Map track={track} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Durata</span>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {track.endTime ? formatDuration(trackingData?.totalTime || 0) : 'In corso'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Distanza</span>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {trackingData ? `${trackingData.totalDistance.toFixed(2)} km` : '0.00 km'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Dislivello +</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{Math.round(trackingData?.elevationGain || 0)} m</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <ArrowDown className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">Dislivello -</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{Math.round(trackingData?.elevationLoss || 0)} m</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Altezza Media</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{Math.round(trackingData?.averageHeight || 0)} m</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">Velocità Media</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{trackingData ? trackingData.averageSpeed.toFixed(1) : '0.00'} km/h</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">Temperatura</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{currentWeather?.temperature || 0}°C</p>
          </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Umidità</span>
        </div>
              <p className="text-2xl font-semibold mt-2">{currentWeather?.humidity || 0}%</p>
                      </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#FF9800]" />
                <span className="text-sm font-medium">Calorie</span>
                  </div>
              <p className="text-2xl font-semibold mt-2">{trackingData?.calories || 0} kcal</p>
          </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#FF9800]" />
                <span className="text-sm font-medium">Passi</span>
        </div>
              <p className="text-2xl font-semibold mt-2">{trackingData?.steps || 0}</p>
            </div>
                      </div>

          {/* Current Weather */}
          {currentWeather && (
            <div className="bg-white rounded-lg shadow mb-6">
              <h3 className="p-4 border-b text-lg font-semibold">Meteo Attuale</h3>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getWeatherIcon(currentWeather.condition)}
                    <div>
                      <p className="text-2xl font-semibold">{currentWeather.temperature}°C</p>
                      <p className="text-sm text-gray-600">Umidità: {currentWeather.humidity}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Condizioni</p>
                    <p className="font-medium">{currentWeather.condition}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Findings List */}
          {track.findings && track.findings.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Ritrovamenti</h3>
                <span className="text-sm text-gray-500">{track.findings.length} totali</span>
        </div>
              <div className="divide-y">
                {track.findings.map((finding, index) => {
                  const styles = getFindingStyles(finding);
                  return (
                    <div
                      key={`finding-${track.id}-${finding.id}-${index}`}
                      className={`p-4 ${styles.bg} ${styles.hover} transition-colors cursor-pointer`}
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getFindingIcon(finding.type)}
                    </div>
                    <div>
                          <span className={`font-medium ${styles.text}`}>{finding.name || finding.type}</span>
                          {finding.description && (
                            <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                          )}
                    </div>
                  </div>
                  {finding.photoUrl && (
                      <img 
                        src={finding.photoUrl} 
                          alt={finding.name || finding.type}
                          className="mt-2 rounded-lg w-full max-h-48 object-cover"
                      />
                      )}
                    </div>
                  );
                })}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;