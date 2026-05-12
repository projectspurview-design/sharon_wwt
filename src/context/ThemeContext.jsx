import React, { createContext, useState, useContext, useEffect } from 'react';

const lightMode = {
  bg: '#f3f6fb',
  surface: '#ffffff',
  heading: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  slate: '#475569',
  rowHover: '#f8fafc',
};

const darkMode = {
  bg: '#0f172a',
  surface: '#1e293b',
  heading: '#f8fafc',
  text: '#cbd5e1',
  muted: '#94a3b8',
  line: '#334155',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  slate: '#94a3b8',
  rowHover: '#283548',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Optional: Auto-detect user's system preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  const theme = isDark ? darkMode : lightMode;
  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);