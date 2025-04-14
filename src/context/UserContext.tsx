import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  // Altri campi utente che potrebbero essere necessari
}

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Controlla se esiste una sessione utente al caricamento
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
          setUser(JSON.parse(sessionUser));
        }
      } catch (error) {
        console.error('Errore nel recupero della sessione utente:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  // Funzione di login simulata
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      // Simulazione di una chiamata API di autenticazione
      // In futuro, questo sarà sostituito con Firebase Auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Utente di esempio
      const mockUser: User = {
        id: '1',
        username: email.split('@')[0],
        email: email
      };
      
      // Salva l'utente nel sessionStorage per persistenza tra ricaricamenti
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Errore durante il login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Funzione di logout
  const logout = () => {
    try {
      // Rimuovi solo l'utente dalla session storage
      sessionStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      // In caso di errore, procedi comunque con il logout
      sessionStorage.removeItem('user');
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Hook personalizzato per utilizzare il contesto utente
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve essere utilizzato all\'interno di un UserProvider');
  }
  return context;
};