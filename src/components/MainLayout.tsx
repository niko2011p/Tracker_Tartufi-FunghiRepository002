import React, { useEffect, useState } from 'react';
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
  const [hideHeader, setHideHeader] = useState(false);
  
  // Check for the 'no-header' class on body
  useEffect(() => {
    const updateHeaderVisibility = () => {
      setHideHeader(document.body.classList.contains('no-header'));
    };
    
    // Initial check
    updateHeaderVisibility();
    
    // Set up a mutation observer to watch for class changes on body
    const observer = new MutationObserver(updateHeaderVisibility);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  // Also check the route to determine if header should be hidden
  useEffect(() => {
    const isDetailPage = location.pathname.startsWith('/logger/');
    if (isDetailPage) {
      document.body.classList.add('no-header');
    }
  }, [location.pathname]);

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isRecording || isNavigationPage ? '' : 'pb-[60px]'}`}>
      <main className={`flex-1 ${hideHeader ? 'pt-0' : ''}`}>
        {children}
      </main>
      {!isNavigationPage && !hideHeader && <FixedFooter show={!isRecording} />}
    </div>
  );
};

export default MainLayout; 