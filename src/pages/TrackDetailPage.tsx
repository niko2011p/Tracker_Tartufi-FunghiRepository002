import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import TrackDetail from './TrackDetail';

const TrackDetailPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const location = useLocation();
  const trackData = location.state?.trackData; // Get any passed track data from navigation state

  useEffect(() => {
    // Hide any potential logo or header when this page is mounted
    document.body.classList.add('no-header');
    
    // Cleanup when the component unmounts
    return () => {
      document.body.classList.remove('no-header');
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <TrackDetail trackId={trackId} trackData={trackData} />
    </div>
  );
};

export default TrackDetailPage; 