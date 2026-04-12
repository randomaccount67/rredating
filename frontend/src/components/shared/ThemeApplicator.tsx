'use client';
import { useEffect } from 'react';

export default function ThemeApplicator() {
  useEffect(() => {
    try {
      if (localStorage.getItem('colorblind_mode') === 'true') {
        document.documentElement.setAttribute('data-colorblind', '');
      }
      if (localStorage.getItem('high_contrast_mode') === 'true') {
        document.documentElement.setAttribute('data-high-contrast', '');
      }
    } catch { /* ignore */ }
  }, []);
  return null;
}
