import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-classic', 'theme-midnight', 'theme-light-soft', 'theme-light-cool');
    root.classList.add(theme);

    // Initial load of settings to check for custom dark mode style
    const checkStyle = async () => {
      try {
        const { db } = await import('../services/storage');
        const settings = await db.getSystemSettings();
        if (settings?.darkModeStyle === 'CLASSIC') {
          root.classList.add('theme-classic');
        } else if (settings?.darkModeStyle === 'MIDNIGHT') {
          root.classList.add('theme-midnight');
        }

        if (settings?.lightModeStyle === 'SOFT') {
          root.classList.add('theme-light-soft');
        } else if (settings?.lightModeStyle === 'COOL') {
          root.classList.add('theme-light-cool');
        }
      } catch (e) {
        console.error('Failed to load theme settings', e);
      }
    };
    checkStyle();

    // Listen for setting changes
    const handleSettingsChange = (e: any) => {
      const newSettings = e.detail?.settings;
      root.classList.remove('theme-classic', 'theme-midnight', 'theme-light-soft', 'theme-light-cool');
      if (newSettings?.darkModeStyle === 'CLASSIC') {
        root.classList.add('theme-classic');
      } else if (newSettings?.darkModeStyle === 'MIDNIGHT') {
        root.classList.add('theme-midnight');
      }

      if (newSettings?.lightModeStyle === 'SOFT') {
        root.classList.add('theme-light-soft');
      } else if (newSettings?.lightModeStyle === 'COOL') {
        root.classList.add('theme-light-cool');
      }
    };

    window.addEventListener('settings-changed', handleSettingsChange);
    return () => window.removeEventListener('settings-changed', handleSettingsChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
