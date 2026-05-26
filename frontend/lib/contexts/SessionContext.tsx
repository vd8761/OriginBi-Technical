"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
} from "react";
import { setActiveStudent, clearAllAssessmentCaches } from "../assessmentCache";

export interface UserProfile {
  name: string;
  email: string;
  joinedAt?: string;
  mobile_number?: string;
  programCode?: string;
  // 'SELF' | 'ADMIN' | 'CORPORATE' | 'RESELLER' | 'AFFILIATE'. Drives the
  // "ADMIN-registered users get all assessments free" gate — used by
  // PaymentModal to skip Razorpay and by ExploreDetailView to render
  // assessments as already unlocked.
  registrationSource?: string;
}

export const isAdminRegisteredProfile = (
  user: UserProfile | null | undefined,
): boolean => {
  if (!user?.registrationSource) return false;
  return user.registrationSource.toUpperCase() === "ADMIN";
};

interface SessionContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (accessToken: string, idToken: string, profile: UserProfile) => void;
  logout: () => void;
  updateProfile: (profileUpdates: Partial<UserProfile>) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Defined before the session-restore effect so that effect can both call it
  // (on an invalid session) and depend on it for the cross-tab storage listener.
  const logout = useCallback(() => {
    try {
      // Clear all assessment caches first to prevent cross-student leakage
      clearAllAssessmentCaches().catch(() => {});

      // Clear all originbi keys to avoid state leakage
      localStorage.removeItem("originbi:access-token");
      localStorage.removeItem("originbi:id-token");
      localStorage.removeItem("originbi:user-profile");
      localStorage.removeItem("originbi:assessment-results");
      localStorage.removeItem("originbi:paid-assessments");
      localStorage.removeItem("originbi:completed-assessments");
      
      // Do not clear the admin's user info if they are in an admin session
      if (localStorage.getItem("originbi:admin-session") !== "true") {
        localStorage.removeItem("user");
      }

      // Clear any legacy userEmail keys if present
      localStorage.removeItem("userEmail");
      sessionStorage.removeItem("userEmail");

      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error clearing session storage", error);
    }
  }, []);

  useEffect(() => {
    // Check localStorage on mount
    const loadSession = async () => {
      try {
        const token = localStorage.getItem("originbi:access-token");
        const storedProfile = localStorage.getItem("originbi:user-profile");
        const hasAdminSession = localStorage.getItem("originbi:admin-session") === "true";
        const rawAdminUser = localStorage.getItem("user");
        const isClient = typeof window !== "undefined";
        const isAdminPath = isClient && window.location.pathname.startsWith("/admin");

        const hasLegacyAdminLeak =
          !storedProfile &&
          !!rawAdminUser &&
          (() => {
            try {
              const parsed = JSON.parse(rawAdminUser);
              return parsed?.role === "ADMIN";
            } catch {
              return false;
            }
          })();

        // Admin auth uses its own token namespace; if the explicit admin gate
        // is active, never try to restore a student session from this provider.
        if (hasAdminSession) {
          setIsLoading(false);
          return;
        }

        // Heal older admin logins that wrote into the student token keys.
        // Those credentials never had a student profile, so attempting
        // `/auth/session` only produces noisy fetch failures on `/`.
        // Only run this cleanup on admin routes to prevent accidental wiping of student sessions.
        if (hasLegacyAdminLeak && isAdminPath) {
          localStorage.removeItem("originbi:access-token");
          localStorage.removeItem("originbi:id-token");
          localStorage.removeItem("originbi:refresh-token");
          return;
        }

        if (token) {
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);
            setUser(parsedProfile);
            setIsLoggedIn(true);
            setActiveStudent(parsedProfile.email ?? null);
            window.dispatchEvent(new CustomEvent("originbi:session-ready", { detail: parsedProfile }));
          } else {
            // If token exists but profile doesn't, fetch it from API
            const { getSession } = await import("@/lib/api");
            const session = await getSession();
            if (session) {
              const profile: UserProfile = {
                name: session.registration?.fullName || session.user.email,
                email: session.user.email,
                registrationSource: session.registration?.registrationSource,
              };
              setUser(profile);
              setIsLoggedIn(true);
              setActiveStudent(profile.email ?? null);
              localStorage.setItem("originbi:user-profile", JSON.stringify(profile));
              window.dispatchEvent(new CustomEvent("originbi:session-ready", { detail: profile }));
            } else {
              // Session invalid, logout
              logout();
            }
          }
        } else {
          // localStorage cleared but legacy cookie may still exist
          const { getAccessToken, getSession } = await import("@/lib/api");
          const accessToken = getAccessToken();
          if (accessToken) {
            const session = await getSession();
            if (session) {
              const profile: UserProfile = {
                name: session.registration?.fullName || session.user.email,
                email: session.user.email,
                registrationSource: session.registration?.registrationSource,
              };
              setUser(profile);
              setIsLoggedIn(true);
              setActiveStudent(profile.email ?? null);
              localStorage.setItem("originbi:access-token", accessToken);
              localStorage.setItem("originbi:user-profile", JSON.stringify(profile));
              window.dispatchEvent(new CustomEvent("originbi:session-ready", { detail: profile }));
            } else {
              // Session invalid, logout
              logout();
            }
          }
        }
      } catch (error) {
        console.error("[SessionContext] Failed to restore session from localStorage:", error);
        // On error, logout to ensure clean state
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Listen for storage events (cross-tab sync and cache clear detection)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "originbi:access-token" && e.newValue === null) {
        // Token was removed (cache cleared / logged out in another tab)
        logout();
      }
    };

    const handleSessionExpired = () => {
      logout();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("originbi:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("originbi:session-expired", handleSessionExpired);
    };
  }, [logout]);

  const login = (accessToken: string, idToken: string, profile: UserProfile) => {
    try {
      localStorage.setItem("originbi:access-token", accessToken);
      localStorage.setItem("originbi:id-token", idToken);
      localStorage.setItem("originbi:user-profile", JSON.stringify(profile));

      // Clear admin session flag and tokens to avoid cross-session contamination
      localStorage.removeItem("originbi:admin-session");
      localStorage.removeItem("originbi:admin-access-token");
      localStorage.removeItem("originbi:admin-id-token");
      localStorage.removeItem("originbi:admin-refresh-token");
      localStorage.removeItem("user");

      setUser(profile);
      setIsLoggedIn(true);
      setActiveStudent(profile.email ?? null);
      window.dispatchEvent(new CustomEvent("originbi:session-ready", { detail: profile }));
    } catch (error) {
      console.error("Error setting session storage", error);
    }
  };

  const updateProfile = (profileUpdates: Partial<UserProfile>) => {
    try {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...profileUpdates };
        localStorage.setItem("originbi:user-profile", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error("Error updating profile in session storage", error);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoggedIn,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
