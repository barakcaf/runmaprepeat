import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  getCurrentUser,
  fetchUserAttributes,
} from "@aws-amplify/auth";

interface AuthUser {
  email: string;
  userId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      setUser({
        userId: currentUser.userId,
        email: attributes.email ?? "",
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await amplifySignIn({ username: email, password });
    const currentUser = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    setUser({
      userId: currentUser.userId,
      email: attributes.email ?? "",
    });
  }, []);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    await amplifySignUp({ username: email, password, options: { userAttributes: { email } } });
  }, []);

  const confirmSignUpFn = useCallback(async (email: string, code: string) => {
    await amplifyConfirmSignUp({ username: email, confirmationCode: code });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      signIn,
      signOut,
      signUp,
      confirmSignUp: confirmSignUpFn,
    }),
    [user, isLoading, signIn, signOut, signUp, confirmSignUpFn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
