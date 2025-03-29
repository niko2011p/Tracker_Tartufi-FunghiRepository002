import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente che resetta lo scroll all'inizio della pagina quando si cambia rotta
 * Da inserire all'interno del BrowserRouter in App.tsx
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Assicuriamoci che lo scroll venga resettato ad ogni cambio di pagina
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Utilizziamo 'instant' invece di 'smooth' per un reset immediato
    });
  }, [pathname]);
  
  return null;
};

export default ScrollToTop;