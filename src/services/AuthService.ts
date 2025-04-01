// Servizio di autenticazione simulato
// In futuro, questo sarà sostituito con Firebase Auth

interface User {
  id: string;
  username: string;
  email: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  // Simula un login con credenziali
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulazione di una chiamata API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verifica delle credenziali (simulata)
    if (!credentials.email || !credentials.password) {
      throw new Error('Email e password sono richiesti');
    }
    
    if (credentials.password.length < 6) {
      throw new Error('La password deve essere di almeno 6 caratteri');
    }
    
    // Genera un token fake
    const token = `fake-jwt-token-${Math.random().toString(36).substring(2, 15)}`;
    
    // Crea un utente mock
    const user: User = {
      id: '1',
      username: credentials.email.split('@')[0],
      email: credentials.email
    };
    
    return { user, token };
  }
  
  // Simula un logout
  async logout(): Promise<void> {
    // Simulazione di una chiamata API
    await new Promise(resolve => setTimeout(resolve, 500));
    // In un'implementazione reale, qui si invaliderebbe il token sul server
  }
  
  // Verifica se l'utente è autenticato
  isAuthenticated(): boolean {
    return !!sessionStorage.getItem('user');
  }
  
  // Ottiene l'utente corrente dal sessionStorage
  getCurrentUser(): User | null {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Errore nel parsing dell\'utente:', error);
      return null;
    }
  }
}

export default new AuthService();