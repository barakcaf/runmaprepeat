import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getProfile } from "../api/client";
import { useAuth } from "./AuthProvider";

interface ProfileGateContextValue {
  hasProfile: boolean;
  isCheckingProfile: boolean;
  recheckProfile: () => Promise<void>;
}

const ProfileGateContext = createContext<ProfileGateContextValue | null>(null);

export function ProfileGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [hasProfile, setHasProfile] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const checkProfile = useCallback(async () => {
    setIsCheckingProfile(true);
    try {
      await getProfile();
      setHasProfile(true);
    } catch (err: unknown) {
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
        setHasProfile(false);
      } else if (err instanceof Error && err.message.includes("404")) {
        setHasProfile(false);
      } else {
        setHasProfile(false);
      }
    } finally {
      setIsCheckingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      checkProfile();
    }
  }, [isAuthenticated, isLoading, checkProfile]);

  const value = useMemo<ProfileGateContextValue>(
    () => ({
      hasProfile,
      isCheckingProfile,
      recheckProfile: checkProfile,
    }),
    [hasProfile, isCheckingProfile, checkProfile]
  );

  if (isLoading || isCheckingProfile) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated && !hasProfile && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  if (isAuthenticated && hasProfile && location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  return (
    <ProfileGateContext.Provider value={value}>
      {children}
    </ProfileGateContext.Provider>
  );
}

export function useProfileGate(): ProfileGateContextValue {
  const context = useContext(ProfileGateContext);
  if (!context) {
    throw new Error("useProfileGate must be used within a ProfileGate");
  }
  return context;
}
