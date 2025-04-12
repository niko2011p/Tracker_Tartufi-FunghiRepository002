import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente che resetta lo scroll all'inizio della pagina quando si cambia rotta
 * Da inserire all'interno del BrowserRouter in App.tsx
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Forza lo scroll al top ad ogni cambio di rotta
    const scrollToTop = () => {
      // Prima prova con window.scrollTo
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });

      // Poi prova con document.documentElement.scrollTop
      document.documentElement.scrollTop = 0;
      
      // Infine prova con document.body.scrollTop
      document.body.scrollTop = 0;
    };

    // Eseguiamo lo scroll immediatamente
    scrollToTop();

    // Aggiungiamo un listener per il caricamento della pagina
    const handleLoad = () => {
      scrollToTop();
    };

    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [pathname]);
  
  return null;
};

export default ScrollToTop;