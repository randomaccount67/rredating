'use client';
import Link from 'next/link';
import { Crosshair, Zap, Users, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApi } from '@/lib/api';
import { createClient } from '@/lib/supabase';
import AnnouncementBanner from '@/components/shared/AnnouncementBanner';

function HeroCTA() {
  const api = useApi();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setHasProfile(false); return; }
      api('/api/profile').then(async res => {
        if (res.ok) {
          const d = await res.json();
          setHasProfile(!!d.profile);
        } else {
          setHasProfile(false);
        }
      }).catch(() => setHasProfile(false));
    });
  }, []);

  if (hasProfile === null) {
    // Loading state — show placeholder button
    return (
      <div className="inline-flex items-center gap-2 bg-[#FF4655]/50 text-white font-bold text-lg uppercase tracking-wider px-8 py-3"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
        <Crosshair size={18} />
        SETUP YOUR PROFILE
      </div>
    );
  }

  if (hasProfile) {
    return (
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 bg-[#FF4655] text-white font-bold text-lg uppercase tracking-wider px-8 py-3 hover:bg-[#FF5F6D] transition-colors"
        style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
      >
        <Crosshair size={18} />
        EDIT PROFILE
      </Link>
    );
  }

  return (
    <Link
      href="/onboarding"
      className="inline-flex items-center gap-2 bg-[#FF4655] text-white font-bold text-lg uppercase tracking-wider px-8 py-3 hover:bg-[#FF5F6D] transition-colors"
      style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
    >
      <Crosshair size={18} />
      SETUP YOUR PROFILE
    </Link>
  );
}

export default function LandingPage() {
  const features = [
    {
      icon: <Crosshair size={22} />,
      color: '#FF4655',
      title: 'Find Your Perfect Duo',
      desc: "Boblow jett won't enter site for you? Filter by role, rank, and region to find a partner. They will also probably be shit but at least yall can flirt while your elo gets sold.",
    },
    {
      icon: <Zap size={22} />,
      color: '#00E5FF',
      title: 'Real Time Messages',
      desc: 'Start chatting the second you match. No more lurking mid alone at 3 am while your entire team dies on site.',
    },
    {
      icon: <Lock size={22} />,
      color: '#FFE84D',
      title: 'Your Data, Your Choice',
      desc: 'Delete your account anytime in your Account Settings. Get out while you still can.',
    },
    {
      icon: <Users size={22} />,
      color: '#A78BFA',
      title: 'Community Driven',
      desc: 'We all suffer playing this game every day. Might as well find another person suffering while your gains are +15-25.',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Red glow — bottom left */}
        <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #FF4655 0%, transparent 65%)' }} />
        {/* Cyan glow — top right */}
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #00E5FF 0%, transparent 65%)' }} />
      </div>

      {/* Disclaimer */}
      <div className="relative pt-20 flex justify-center px-4">
        <div className="inline-flex items-center gap-2 border border-[#FF4655]/30 bg-[#FF4655]/5 px-4 py-1.5">
          <div className="w-1.5 h-1.5 bg-[#FF4655] rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-[#FF4655] tracking-widest uppercase">
            NOT AFFILIATED WITH RIOT GAMES · 18+ ONLY · FOR ENTERTAINMENT
          </span>
        </div>
      </div>

      {/* Announcement banner — full width, collapses when no active announcement */}
      <div className="mt-6">
        <AnnouncementBanner />
      </div>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 pt-10 pb-24 text-center">
        <h1
          className="font-extrabold text-6xl sm:text-8xl uppercase tracking-tight text-[#ECF0F8] mb-4 leading-none"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          FIND YOUR<br />
          <span className="text-[#FF4655]">EDATE</span>
        </h1>

        <p className="text-[#8B90A8] text-lg max-w-xl mx-auto mb-10">
          a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <HeroCTA />
          <Link
            href="/match"
            className="inline-flex items-center gap-2 border border-[#252830] text-[#8B90A8] font-bold text-lg uppercase tracking-wider px-8 py-3 hover:border-[#00E5FF]/50 hover:text-[#00E5FF] transition-colors"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            BROWSE FIRST
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <span className="font-mono text-[10px] tracking-widest uppercase text-[#00E5FF]">// HOW IT WORKS</span>
          <h2
            className="font-extrabold text-4xl uppercase text-[#ECF0F8] mt-2"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            BUILT DIFFERENT
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-[#171A22] border border-[#252830] p-6 relative overflow-hidden transition-colors hover:border-[#252830]/80"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
            >
              {/* Colored top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${f.color}90, transparent)` }}
              />
              {/* Subtle corner glow */}
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-[0.06]"
                style={{ background: `radial-gradient(circle at top right, ${f.color}, transparent 70%)` }}
              />
              <div className="mb-4" style={{ color: f.color }}>{f.icon}</div>
              <h3
                className="font-bold text-base uppercase tracking-wider text-[#ECF0F8] mb-2"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                {f.title}
              </h3>
              <p className="text-[#8B90A8] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
