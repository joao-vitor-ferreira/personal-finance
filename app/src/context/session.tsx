import { createContext, use, type PropsWithChildren } from 'react';
import { useStorageState } from '@/hooks/use-storage-state';
import { login as loginRequest } from '@/services/auth';

const AuthContext = createContext<{
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  session?: string | null;
  isLoading: boolean;
} | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession precisa estar dentro de <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');

  return (
    <AuthContext
      value={{
        signIn: async (email, password) => {
          const { accessToken } = await loginRequest(email, password);
          setSession(accessToken);
        },
        signOut: () => setSession(null),
        session,
        isLoading,
      }}>
      {children}
    </AuthContext>
  );
}