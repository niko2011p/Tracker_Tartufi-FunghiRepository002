import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MapPin, Clock, Route, X, AlertTriangle, Navigation, Save, Info } from 'lucide-react';
import { Track, Finding } from '../types';
import Map from './Map';

interface TrackDetailsProps {
  track: Track;
  onClose: () => void;
}

const TrackDetails: React.FC<TrackDetailsProps> = ({ track, onClose }) => {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const getFindingStyles = (finding: Finding) => {
    return {
      bg: finding.type === 'Fungo' ? 'bg-[#8eaa36]/10' : 'bg-[#8B4513]/10',
      hover: finding.type === 'Fungo' ? 'hover:bg-[#8eaa36]/20' : 'hover:bg-[#8B4513]/20',
      text: finding.type === 'Fungo' ? 'text-[#8eaa36]' : 'text-[#8B4513]'
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{track.name}</h2>
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
            <Map track={track} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Durata</span>
              </div>
              <p className="text-2xl font-semibold mt-2">
                {track.endTime 
                  ? `${Math.round((track.endTime.getTime() - track.startTime.getTime()) / 1000 / 60)} min`
                  : 'In corso'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#FF9800]" />
                <span className="text-sm font-medium">Distanza</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{track.distance.toFixed(2)} km</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium">Ritrovamenti</span>
              </div>
              <p className="text-2xl font-semibold mt-2">{track.findings.length}</p>
            </div>
          </div>

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
                      <MapPin className={`w-5 h-5 ${styles.text}`} />
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