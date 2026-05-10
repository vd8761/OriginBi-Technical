"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

export interface UserProfile {
  name: string;
  email: string;
  joinedAt?: string;
  mobile_number?: string;
  programCode?: string;
}

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

  useEffect(() => {
    // Check localStorage on mount
    const loadSession = () => {
      try {
        const token = localStorage.getItem("originbi:access-token");
        const storedProfile = localStorage.getItem("originbi:user-profile");

        if (token && storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          setUser(parsedProfile);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Failed to restore session from localStorage", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = (accessToken: string, idToken: string, profile: UserProfile) => {
    try {
      localStorage.setItem("originbi:access-token", accessToken);
      localStorage.setItem("originbi:id-token", idToken);
      localStorage.setItem("originbi:user-profile", JSON.stringify(profile));

      setUser(profile);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error setting session storage", error);
    }
  };

  const logout = () => {
    try {
      // Clear all originbi keys to avoid state leakage
      localStorage.removeItem("originbi:access-token");
      localStorage.removeItem("originbi:id-token");
      localStorage.removeItem("originbi:user-profile");
      localStorage.removeItem("originbi:assessment-results");
      localStorage.removeItem("originbi:paid-assessments");
      localStorage.removeItem("originbi:completed-assessments");
      
      // Clear any legacy userEmail keys if present
      localStorage.removeItem("userEmail");
      sessionStorage.removeItem("userEmail");

      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error clearing session storage", error);
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
