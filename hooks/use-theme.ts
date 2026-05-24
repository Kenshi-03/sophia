'use client'

import { useEffect } from 'react';
import useThemeStore from '@/stores/use-theme-store';

export function useTheme() {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return {
    theme,
    toggleTheme,
    setTheme,
  };
}
export default useTheme;
