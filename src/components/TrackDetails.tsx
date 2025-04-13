import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import Map from './Map';
import { Track } from '../types/track';
import { formatDistance, formatDuration, formatSpeed } from '../utils/format';

const TrackDetails: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const { tracks } = useTrackHistoryStore();
  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    if (trackId) {
      const foundTrack = tracks.find(t => t.id === trackId);
      if (foundTrack) {
        setTrack(foundTrack);
      }
    }
  }, [trackId, tracks]);

  if (!track) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Traccia non trovata</h2>
          <p className="text-gray-600 mt-2">La traccia richiesta non esiste o è stata eliminata.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header con informazioni principali */}
      <div className="bg-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">{track.name}</h1>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Inizio: {new Date(track.startTime).toLocaleString()}</span>
          <span>Fine: {new Date(track.endTime).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Pannello laterale con statistiche */}
        <div className="w-80 bg-white p-4 shadow-md overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Statistiche</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Distanza</h3>
              <p className="text-2xl font-bold text-orange-500">
                {formatDistance(track.distance)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Durata</h3>
              <p className="text-2xl font-bold text-orange-500">
                {formatDuration(track.duration)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Velocità Media</h3>
              <p className="text-2xl font-bold text-orange-500">
                {formatSpeed(track.averageSpeed)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Velocità Massima</h3>
              <p className="text-2xl font-bold text-orange-500">
                {formatSpeed(track.maxSpeed)}
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Dislivello</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Salita</p>
                  <p className="text-lg font-bold text-green-500">
                    +{formatDistance(track.elevationGain)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Discesa</p>
                  <p className="text-lg font-bold text-red-500">
                    -{formatDistance(track.elevationLoss)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-medium text-gray-700">Quota</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">Minima</p>
                  <p className="text-lg font-bold text-blue-500">
                    {formatDistance(track.minElevation)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Massima</p>
                  <p className="text-lg font-bold text-blue-500">
                    {formatDistance(track.maxElevation)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista dei ritrovamenti */}
          {track.findings.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Ritrovamenti</h2>
              <div className="space-y-3">
                {track.findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="bg-gray-50 p-3 rounded-lg border-l-4 border-orange-500"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{finding.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        finding.type === 'Fungo' ? 'bg-green-100 text-green-800' : 'bg-brown-100 text-brown-800'
                      }`}>
                        {finding.type}
                      </span>
                    </div>
                    {finding.description && (
                      <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                    )}
                    {finding.photo && (
                      <img
                        src={finding.photo}
                        alt={finding.name}
                        className="mt-2 rounded-lg w-full h-32 object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mappa */}
        <div className="flex-1">
          <Map
            initialCenter={track.path[0]}
            initialZoom={15}
            showControls={true}
            showCurrentLocation={false}
            track={track}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;