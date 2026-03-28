import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setThemeExplicit: (theme: Theme) => void;
  setDarkFlavorExplicit: (flavor: 'OLED'|'CLASSIC'|'MIDNIGHT'|undefined) => void;
  setLightFlavorExplicit: (flavor: 'SOFT'|'COOL'|'STANDARD'|undefined) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme_preference');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [darkFlavor, setDarkFlavor] = useState<'OLED'|'CLASSIC'|'MIDNIGHT'|undefined>(undefined);
  const [lightFlavor, setLightFlavor] = useState<'SOFT'|'COOL'|'STANDARD'|undefined>(undefined);
  const [systemSettings, setSystemSettings] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('theme_preference', theme);
  }, [theme]);

  // Initial load of settings and listeners
  useEffect(() => {
    const initSettings = async () => {
      try {
        const { db } = await import('../services/storage');
        const settings = await db.getSystemSettings();
        setSystemSettings(settings);
      } catch (e) {
        console.error('Failed to load theme settings', e);
      }
    };
    initSettings();

    const handleSettingsChange = (e: any) => {
      if (e.detail?.settings) {
        setSystemSettings(e.detail.settings);
      }
    };

    window.addEventListener('settings-changed', handleSettingsChange);
    return () => window.removeEventListener('settings-changed', handleSettingsChange);
  }, []);

  // Apply CSS Classes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-classic', 'theme-midnight', 'theme-light-soft', 'theme-light-cool');
    root.classList.add(theme);

    const activeDark = darkFlavor || systemSettings?.darkModeStyle || 'OLED';
    if (activeDark === 'CLASSIC') {
      root.classList.add('theme-classic');
    } else if (activeDark === 'MIDNIGHT') {
      root.classList.add('theme-midnight');
    }

    const activeLight = lightFlavor || systemSettings?.lightModeStyle || 'STANDARD';
    if (activeLight === 'SOFT') {
      root.classList.add('theme-light-soft');
    } else if (activeLight === 'COOL') {
      root.classList.add('theme-light-cool');
    }
  }, [theme, darkFlavor, lightFlavor, systemSettings]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setThemeExplicit = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const setDarkFlavorExplicit = (flavor: 'OLED'|'CLASSIC'|'MIDNIGHT'|undefined) => setDarkFlavor(flavor);
  const setLightFlavorExplicit = (flavor: 'SOFT'|'COOL'|'STANDARD'|undefined) => setLightFlavor(flavor);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeExplicit, setDarkFlavorExplicit, setLightFlavorExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
