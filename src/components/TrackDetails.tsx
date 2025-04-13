import React from 'react';
import { useTrackHistoryStore } from '../store/trackHistoryStore';
import { useParams } from 'react-router-dom';
import Map from './Map';

const TrackDetails: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const track = useTrackHistoryStore((state) => 
    state.tracks.find(t => t.id === trackId)
  );

  if (!track) {
    return <div>Traccia non trovata</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white shadow-md">
        <h2 className="text-2xl font-bold mb-2">{track.name}</h2>
        <div className="text-gray-600">
          <p>Inizio: {new Date(track.startTime).toLocaleString()}</p>
          <p>Fine: {new Date(track.endTime).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <Map 
          showTrack={true}
          fitBounds={true}
        />
      </div>
    </div>
  );
};

export default TrackDetails;