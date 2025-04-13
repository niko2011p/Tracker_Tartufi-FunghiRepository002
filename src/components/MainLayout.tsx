import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackStore } from '../store/trackStore';
import FixedFooter from './FixedFooter';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { isRecording } = useTrackStore();
  const isNavigationPage = location.pathname === '/NavigationPage';

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isRecording || isNavigationPage ? '' : 'pb-[60px]'}`}>
      <main className="flex-1">
        {children}
      </main>
      {!isNavigationPage && <FixedFooter show={!isRecording} />}
    </div>
  );
};

export default MainLayout; 