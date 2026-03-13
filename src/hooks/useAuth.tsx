import { useState, useEffect, createContext, useContext } from 'react';
import djangoApi, { getAuthToken, clearAuth } from '@/integrations/django/client';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  session: { access_token: string } | null;
  loading: boolean;
  onboardingCompleted: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phoneNumber?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyResetCode: (email: string, code: string) => Promise<boolean>;
  confirmPasswordReset: (email: string, code: string, newPassword: string, confirmPassword: string) => Promise<void>;
  updateUser: (user: User | null) => void;
  setOnboardingCompleted: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(true); // Default to true for existing users

  useEffect(() => {
    // Check for existing token on mount
    const token = getAuthToken();
    if (token) {
      djangoApi.auth.getCurrentUser()
        .then((userData) => {
          setUser(userData);
          setSession({ access_token: token });
          // Also get the onboarding status from the user profile
          // Default to true for existing sessions if not available
          setOnboardingCompleted((userData as any).onboarding_completed ?? true);
        })
        .catch(() => {
          clearAuth();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await djangoApi.auth.login(email, password);
    const token = getAuthToken();
    setUser(response.user);
    setSession({ access_token: token || '' });
    // Store onboarding status from backend
    setOnboardingCompleted(response.onboarding_completed ?? true);
  };

  const signUp = async (email: string, password: string, fullName: string, phoneNumber?: string) => {
    const names = fullName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    
    const response = await djangoApi.auth.register(email, password, firstName, lastName, phoneNumber);
    const token = getAuthToken();
    setUser(response.user);
    setSession({ access_token: token || '' });
    // New users haven't completed onboarding
    setOnboardingCompleted(false);
  };

  const signOut = async () => {
    await djangoApi.auth.logout();
    setUser(null);
    setSession(null);
    clearAuth();
  };

  const resetPassword = async (email: string) => {
    // Call Django API to request password reset
    await djangoApi.auth.requestPasswordReset(email);
  };

  const verifyResetCode = async (email: string, code: string): Promise<boolean> => {
    // Call Django API to verify the reset code
    const result = await djangoApi.auth.verifyResetCode(email, code);
    return result.verified || false;
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string, confirmPassword: string) => {
    // Call Django API to reset the password
    await djangoApi.auth.resetPassword(email, code, newPassword, confirmPassword);
  };

  const updateUser = (newUser: User | null) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      onboardingCompleted, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      verifyResetCode,
      confirmPasswordReset,
      updateUser, 
      setOnboardingCompleted 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
