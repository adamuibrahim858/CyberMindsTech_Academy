import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('cmt_user') || localStorage.getItem('cmt_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [student, setStudent] = useState(() => {
    try {
      const stored = sessionStorage.getItem('cmt_student') || localStorage.getItem('cmt_student');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('cmt_token') || localStorage.getItem('cmt_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setStudent(null);
    setToken(null);
    sessionStorage.removeItem('cmt_token');
    sessionStorage.removeItem('cmt_user');
    sessionStorage.removeItem('cmt_student');
    localStorage.removeItem('cmt_token');
    localStorage.removeItem('cmt_user');
    localStorage.removeItem('cmt_student');
  }, []);

  // Check auth session validity on mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const activeToken = sessionStorage.getItem('cmt_token') || localStorage.getItem('cmt_token');
      if (!activeToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (isMounted && response?.status === 'success') {
          const freshUser = response.user;
          const freshStudent = response.student || null;
          setUser(freshUser);
          setStudent(freshStudent);

          // Update storage with fresh data
          const storage = localStorage.getItem('cmt_token') ? localStorage : sessionStorage;
          storage.setItem('cmt_user', JSON.stringify(freshUser));
          if (freshStudent) {
            storage.setItem('cmt_student', JSON.stringify(freshStudent));
          }
        }
      } catch {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    verifySession();

    const handleExpired = () => {
      clearSession();
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [clearSession]);

  const login = async (credentials, rememberMe = false) => {
    const data = await authService.login(credentials);
    const receivedToken = data.token;
    const receivedUser = data.user;
    const receivedStudent = receivedUser.student || null;

    setToken(receivedToken);
    setUser(receivedUser);
    setStudent(receivedStudent);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('cmt_token', receivedToken);
    storage.setItem('cmt_user', JSON.stringify(receivedUser));
    if (receivedStudent) {
      storage.setItem('cmt_student', JSON.stringify(receivedStudent));
    }

    return {
      user: receivedUser,
      redirectPath: receivedUser.role === 'admin' ? '/admin/dashboard' : '/student/dashboard',
    };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearSession();
    }
  };

  const updateUserData = (updatedUser, updatedStudent = null) => {
    setUser(updatedUser);
    if (updatedStudent) {
      setStudent(updatedStudent);
    }
    const storage = localStorage.getItem('cmt_token') ? localStorage : sessionStorage;
    storage.setItem('cmt_user', JSON.stringify(updatedUser));
    if (updatedStudent) {
      storage.setItem('cmt_student', JSON.stringify(updatedStudent));
    }
  };

  const value = {
    user,
    student,
    token,
    role: user?.role,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    isLoading,
    login,
    logout,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
