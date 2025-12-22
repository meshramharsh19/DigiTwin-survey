import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 🔹 1. token state
  const [token, setToken] = useState(null);

  // 🔹 2. loading state (CRITICAL)
  const [authLoading, setAuthLoading] = useState(true);

  // 🔹 3. on app load, read token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      setToken(storedToken);
    } else {
      setToken(null);
    }

    setAuthLoading(false); // auth resolved
  }, []);

  // 🔹 4. auth boolean
  const isAuthenticated = Boolean(token);

  // 🔹 5. login
  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  // 🔹 6. logout
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        login,
        logout,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
