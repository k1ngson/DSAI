"use client";

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isInitialized = useRef(false);

  const applyThemeFromStorage = useCallback(() => {
    // If login page, force black theme (don't apply dark class)
    if (pathname === '/login') {
      document.documentElement.classList.remove('dark');
      return;
    }

    // Other pages: read theme from localStorage
    const savedTheme = localStorage.getItem('dsai_theme') as 'dark' | 'light' | null;
    const theme = savedTheme || 'dark'; // Default to dark (black)

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [pathname]);

  // Initialize theme when pathname changes
  useEffect(() => {
    applyThemeFromStorage();
  }, [pathname, applyThemeFromStorage]);

  // Listen to theme change events (same page and cross-tab)
  useEffect(() => {
    // Don't listen to theme changes on login page
    if (pathname === '/login') {
      return;
    }

    // Listen to storage event (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dsai_theme') {
        applyThemeFromStorage();
      }
    };

    // Listen to custom event (same page)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTheme = customEvent.detail?.theme;
      
      // If event contains theme info, use it directly
      if (newTheme) {
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Otherwise read from localStorage
        applyThemeFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themechange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, [pathname, applyThemeFromStorage]);

  return <>{children}</>;
}

