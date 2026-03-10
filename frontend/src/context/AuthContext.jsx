import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

/**
 * Decodes a JWT payload without verifying the signature.
 * Good enough for the client — the server re-validates on every request.
 */
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // On first render, restore session from localStorage if a token exists.
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      const decoded = decodeToken(saved);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setToken(saved);
        setUser(decoded);
      } else {
        // Token expired — clean up.
        localStorage.removeItem("token");
      }
    }
  }, []);

  /** Store token and set decoded user — does NOT make an API call. */
  function login(jwt) {
    localStorage.setItem("token", jwt);
    setToken(jwt);
    setUser(decodeToken(jwt));
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
