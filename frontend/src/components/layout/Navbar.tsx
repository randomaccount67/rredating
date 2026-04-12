'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, MessageSquare, Users, User, MessageCircle, X, Shield, LogOut, Settings } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useApi } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const api = useApi();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [complainOpen, setComplainOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  // Stable ref so the ping interval can call api without being re-created
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Fetch unread count — called on mount, on pathname change, and via realtime
  const fetchUnread = async () => {
    try {
      const res = await apiRef.current('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const unread = (data.notifications ?? []).filter((n: { read: boolean }) => !n.read).length;
      setUnreadNotifs(unread);
    } catch {}
  };

  useEffect(() => {
    if (!isSignedIn) { setUnreadNotifs(0); setMyProfileId(null); setIsAdmin(false); return; }

    fetchUnread();

    apiRef.current('/api/profile').then(r => r.json()).then(d => {
      if (d.profile?.is_admin) setIsAdmin(true);
      if (d.profile?.id) setMyProfileId(d.profile.id);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Re-fetch badge when the user navigates (e.g. back from /notifications after marking read)
  useEffect(() => {
    if (!isSignedIn) return;
    fetchUnread();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Realtime subscription — filtered by the user's own profile ID so only their rows trigger
  useEffect(() => {
    if (!myProfileId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`navbar-notifs-${myProfileId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${myProfileId}`,
      }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfileId]);

  // Global presence ping — keeps is_online = true while the user is active on any page
  useEffect(() => {
    if (!isSignedIn) return;

    const ping = () => apiRef.current('/api/presence', {
      method: 'POST',
      body: JSON.stringify({}),
    }).catch(() => {});

    // Ping immediately, then every 30 seconds
    ping();
    const interval = setInterval(ping, 30_000);

    const leave = () => apiRef.current('/api/presence', {
      method: 'DELETE',
      body: JSON.stringify({}),
    }).catch(() => {});

    window.addEventListener('beforeunload', leave);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', leave);
    };
  }, [isSignedIn]);

  const handleSignOut = async () => {
    const supabase = createClient();
    // Mark offline before signing out
    await apiRef.current('/api/presence', { method: 'DELETE', body: JSON.stringify({}) }).catch(() => {});
    await supabase.auth.signOut();
    router.push('/');
  };

  const navLinks = [
    { href: '/match', label: 'BROWSE', icon: <Users size={14} aria-hidden="true" /> },
    { href: '/inbox', label: 'INBOX', icon: <MessageSquare size={14} aria-hidden="true" /> },
    { href: '/notifications', label: 'ALERTS', icon: <Bell size={14} aria-hidden="true" />, badge: unreadNotifs },
    { href: '/profile', label: 'PROFILE', icon: <User size={14} aria-hidden="true" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#252830] bg-[#0B0D11]/95 backdrop-blur-sm">
        {/* Disclaimer strip */}
        <div className="bg-[#0B0D11] border-b border-[#252830]/70 py-1 px-4 text-center">
          <span className="text-[10px] font-mono text-[#505568] tracking-widest uppercase">
            <span className="text-[#FF4655]">●</span>
            {' '}NOT AFFILIATED WITH OR ENDORSED BY RIOT GAMES · FOR ENTERTAINMENT ONLY · 18+ ONLY{' '}
            <span className="text-[#00E5FF]">●</span>
          </span>
        </div>

        {/* Main nav */}
        <nav className="max-w-7xl mx-auto px-4 h-14 grid grid-cols-3 items-center" aria-label="Main navigation">
          {/* Logo — left */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="RRedating home">
            <div className="w-7 h-7 border border-[#FF4655] flex items-center justify-center"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
              <span className="text-[#FF4655] font-mono font-bold text-xs">RR</span>
            </div>
            <span className="font-barlow font-extrabold text-xl tracking-widest text-[#ECF0F8] uppercase group-hover:text-[#FF4655] transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              RREDATING
            </span>
          </Link>

          {/* Nav links — center */}
          <div className="flex items-center justify-center gap-1">
            {isSignedIn && isAdmin && (
              <Link
                href="/admin"
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-150
                  ${pathname.startsWith('/admin')
                    ? 'text-[#FF4655] border-b border-[#FF4655]'
                    : 'text-amber-400 hover:text-amber-300'
                  }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                <Shield size={14} aria-hidden="true" />
                <span className="hidden sm:inline">ADMIN</span>
              </Link>
            )}
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-150
                    ${active
                      ? 'text-[#FF4655] border-b border-[#FF4655]'
                      : 'text-[#8B90A8] hover:text-[#ECF0F8]'
                    }`}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                  {link.badge && link.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF4655] text-white text-[9px] font-mono rounded-full flex items-center justify-center"
                      aria-label={`${link.badge} unread`}>
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => setComplainOpen(true)}
              aria-label="Submit feedback or complaint"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase text-[#8B90A8] hover:text-[#ECF0F8] transition-all duration-150"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span className="hidden sm:inline">COMPLAIN</span>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDiscordOpen(true)}
              aria-label="Join our Discord server"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/10 hover:border-[#5865F2] transition-all min-h-[44px] min-w-[44px]"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="hidden sm:inline">DISCORD</span>
            </button>
            {isSignedIn && (
              <Link
                href="/settings"
                aria-label="Settings"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all min-h-[44px] min-w-[44px]
                  ${pathname.startsWith('/settings')
                    ? 'border-[#FF4655] text-[#FF4655]'
                    : 'border-[#2A2D35] text-[#8B90A8] hover:text-[#ECF0F8] hover:border-[#525566]'
                  }`}
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                <Settings size={12} aria-hidden="true" />
              </Link>
            )}
            {isSignedIn ? (
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#2A2D35] text-[#8B90A8] hover:text-[#ECF0F8] hover:border-[#525566] transition-all min-h-[44px]"
                style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
              >
                <LogOut size={12} aria-hidden="true" />
                <span className="hidden sm:inline">SIGN OUT</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/sign-in" className="btn-ghost text-xs py-1.5 px-3">SIGN IN</Link>
                <Link href="/sign-up" className="btn-primary text-xs py-1.5 px-3">JOIN UP</Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Discord modal */}
      {discordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDiscordOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-[#171A22] border border-[#5865F2]/40 p-6"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setDiscordOpen(false)} aria-label="Close Discord dialog" className="absolute top-4 right-4 text-[#505568] hover:text-[#ECF0F8] transition-colors">
              <X size={16} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-[#505568] font-mono text-[10px] tracking-widest uppercase">// COMMUNITY</span>
            </div>
            <h2 className="font-extrabold text-2xl uppercase text-[#ECF0F8] mt-1 mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              JOIN THE SERVER
            </h2>
            <p className="text-[#8B90A8] text-sm leading-relaxed mb-6">
              Join the RRedating Discord server to connect with the community, report bugs, and stay updated.
            </p>
            <a
              href="https://discord.gg/PJtpcuq8VN"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm uppercase tracking-wider text-white hover:opacity-90 transition-opacity"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', backgroundColor: '#5865F2', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              JOIN DISCORD
            </a>
          </div>
        </div>
      )}

      {/* Complain modal */}
      {complainOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setComplainOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-[#171A22] border border-[#252830] p-6"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setComplainOpen(false)} aria-label="Close feedback dialog" className="absolute top-4 right-4 text-[#505568] hover:text-[#ECF0F8] transition-colors">
              <X size={16} aria-hidden="true" />
            </button>
            <span className="text-[#505568] font-mono text-[10px] tracking-widest uppercase">// COMPLAINTS DEPT</span>
            <h2 className="font-extrabold text-2xl uppercase text-[#ECF0F8] mt-1 mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              GOT A COMPLAINT?
            </h2>
            <p className="text-[#8B90A8] text-sm leading-relaxed mb-6">
              If you run into any issues, problems, weird people, or just want to complain about shit, DM me on Twitter @JDawesome23
            </p>
            <a
              href="https://twitter.com/JDawesome23"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
            >
              <MessageCircle size={14} aria-hidden="true" />
              @JDAWESOME23 ON TWITTER
            </a>
          </div>
        </div>
      )}
    </>
  );
}
