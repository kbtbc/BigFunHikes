import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// Helper to get backend URL
// When Vite proxy is configured, use relative URLs so requests go through the proxy
// This makes everything same-origin so cookies work properly
function getBackendUrl(): string {
  // Use relative URLs (empty string) so Vite proxy handles routing to backend
  // This ensures same-origin requests so cookies work across ports
  if (import.meta.env.VITE_DISABLE_VIBECODE === "true") {
    return ""; // Empty string = relative URLs, uses current origin
  }
  
  // For Vibecode mode, use explicit backend URL
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
}

const API_BASE_URL = getBackendUrl();

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_auth_token");
}

// Helper to set auth token in localStorage
function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("admin_auth_token", token);
  } else {
    localStorage.removeItem("admin_auth_token");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/session`, {
        credentials: "include",
        headers,
      });

      if (response.ok) {
        const { data } = await response.json();
        setIsAuthenticated(data.authenticated);
      } else {
        setIsAuthenticated(false);
        // Clear token if session check fails
        if (token) {
          setAuthToken(null);
        }
      }
    } catch (error) {
      console.error("Failed to check auth:", error);
      setIsAuthenticated(false);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || "Invalid password");
    }

    // Parse response once
    const result = await response.json();
    
    // Check if response includes a token (for cross-origin HTTP)
    if (result.data?.token) {
      setAuthToken(result.data.token);
    }

    // Update auth state
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch(`${API_BASE_URL}/api/admin/logout`, {
        method: "POST",
        credentials: "include",
        headers,
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setAuthToken(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
