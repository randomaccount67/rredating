'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useApi } from '@/lib/api';

export default function BannedGate({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const [banned, setBanned] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    api('/api/profile')
      .then(r => r.json())
      .then(d => { if (d.profile?.is_banned) setBanned(true); })
      .catch(() => {});
  }, [isSignedIn]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <>
      {children}
      {banned && (
        <div className="fixed inset-0 z-[9999] bg-[#0D0E12] flex flex-col items-center justify-center px-4">
          <span className="font-mono text-[10px] tracking-widest text-[#FF4655] uppercase mb-4">// ACCOUNT SUSPENDED</span>
          <h1
            className="font-extrabold text-5xl uppercase text-[#E8EAF0] mb-4 text-center"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            YOU HAVE BEEN BANNED
          </h1>
          <p className="text-[#525566] font-mono text-sm text-center max-w-sm">
            Your account has been suspended for violating community guidelines.
          </p>
          <div className="mt-8">
            <button onClick={handleSignOut} className="btn-ghost text-xs">SIGN OUT</button>
          </div>
        </div>
      )}
    </>
  );
}
