'use client';
import { createClient } from '@/lib/supabase';
import { useState } from 'react';

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-[#525566] font-mono text-[10px] tracking-widest uppercase">// NEW RECRUIT</span>
          <h1 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            CREATE ACCOUNT
          </h1>
          <p className="text-[#8B8FA8] text-sm mt-1">Must be 18+. No bots. No smurfs.</p>
        </div>

        <div
          className="bg-[#1A1D24] border border-[#2A2D35] p-6"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
        >
          <button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 font-bold text-sm uppercase tracking-wider transition-all bg-white text-[#1A1D24] hover:bg-gray-100 disabled:opacity-50"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'REDIRECTING...' : 'SIGN UP WITH GOOGLE'}
          </button>
        </div>

        <p className="text-center text-[#525566] text-xs mt-6">
          Already have an account?{' '}
          <a href="/sign-in" className="text-[#FF4655] hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
