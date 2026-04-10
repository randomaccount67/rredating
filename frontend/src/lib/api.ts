'use client';
import { createClient } from '@/lib/supabase';
import { useCallback } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

/**
 * Hook that returns an authenticated fetch function for the backend API.
 * Automatically attaches the Supabase Auth Bearer token to every request.
 * Automatically sets Content-Type to application/json unless body is FormData.
 *
 * H3 fix: Uses getUser() for validated session, falls back to getSession()
 * for the access token (since getUser() doesn't return the token directly).
 * Attempts session refresh if no valid session is found.
 *
 * Usage:
 *   const api = useApi();
 *   const data = await api('/api/profile');
 *   await api('/api/messages', { method: 'POST', body: JSON.stringify({ ... }) });
 *   await api('/api/upload', { method: 'POST', body: formData }); // Content-Type set by browser
 */
export function useApi() {
  return useCallback(
    async (path: string, options?: RequestInit) => {
      const supabase = createClient();

      // Get current session — if expired, attempt a refresh first
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
      }

      const token = session?.access_token;
      const isFormData = options?.body instanceof FormData;

      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options?.headers,
        },
      });
    },
    [],
  );
}
