'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Bell, MessageSquare, Users, User, MessageCircle, X, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [complainOpen, setComplainOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    const supabase = createClient();

    // Fetch via API — anon Supabase client has no Clerk auth context so
    // direct queries return wrong results (auth.uid() is null in RLS)
    async function fetchUnread() {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        const unread = (data.notifications ?? []).filter((n: { read: boolean }) => !n.read).length;
        setUnreadNotifs(unread);
      } catch {}
    }

    fetchUnread();

    fetch('/api/profile').then(r => r.json()).then(d => {
      if (d.profile?.is_admin) setIsAdmin(true);
    }).catch(() => {});

    // Realtime channel acts as a push trigger — any notification change refetches from API
    const channel = supabase
      .channel('navbar-notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSignedIn]);

  const navLinks = [
    { href: '/match', label: 'BROWSE', icon: <Users size={14} /> },
    { href: '/inbox', label: 'INBOX', icon: <MessageSquare size={14} /> },
    { href: '/notifications', label: 'ALERTS', icon: <Bell size={14} />, badge: unreadNotifs },
    { href: '/profile', label: 'PROFILE', icon: <User size={14} /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#2A2D35] bg-[#0F1013]/95 backdrop-blur-sm">
        {/* Disclaimer strip */}
        <div className="bg-[#FF4655]/10 border-b border-[#FF4655]/20 py-1 px-4 text-center">
          <span className="text-[10px] font-mono text-[#FF4655]/80 tracking-widest uppercase">
            NOT AFFILIATED WITH OR ENDORSED BY RIOT GAMES · FOR ENTERTAINMENT ONLY · 18+ ONLY
          </span>
        </div>

        {/* Main nav */}
        <nav className="max-w-7xl mx-auto px-4 h-14 grid grid-cols-3 items-center">
          {/* Logo — left */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 border border-[#FF4655] flex items-center justify-center"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
              <span className="text-[#FF4655] font-mono font-bold text-xs">RR</span>
            </div>
            <span className="font-barlow font-extrabold text-xl tracking-widest text-[#E8EAF0] uppercase group-hover:text-[#FF4655] transition-colors"
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
                <Shield size={14} />
                <span className="hidden sm:inline">ADMIN</span>
              </Link>
            )}
            {isSignedIn && navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-150
                    ${active
                      ? 'text-[#FF4655] border-b border-[#FF4655]'
                      : 'text-[#8B8FA8] hover:text-[#E8EAF0]'
                    }`}
                  style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
                >
                  {link.icon}
                  <span className="hidden sm:inline">{link.label}</span>
                  {link.badge && link.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF4655] text-white text-[9px] font-mono rounded-full flex items-center justify-center">
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => setComplainOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wider uppercase text-[#8B8FA8] hover:text-[#E8EAF0] transition-all duration-150"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">COMPLAIN</span>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center justify-end gap-3">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/sign-in" className="btn-ghost text-xs py-1.5 px-3">SIGN IN</Link>
                <Link href="/sign-up" className="btn-primary text-xs py-1.5 px-3">JOIN UP</Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Complain modal */}
      {complainOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setComplainOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-[#1A1D24] border border-[#2A2D35] p-6"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setComplainOpen(false)} className="absolute top-4 right-4 text-[#525566] hover:text-[#E8EAF0] transition-colors">
              <X size={16} />
            </button>
            <span className="text-[#525566] font-mono text-[10px] tracking-widest uppercase">// COMPLAINTS DEPT</span>
            <h2 className="font-extrabold text-2xl uppercase text-[#E8EAF0] mt-1 mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              GOT A COMPLAINT?
            </h2>
            <p className="text-[#8B8FA8] text-sm leading-relaxed mb-6">
              If you run into any issues, problems, weird people, or just want to complain about shit, DM me on Twitter @JDawesome23
            </p>
            <a
              href="https://twitter.com/JDawesome23"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 font-bold text-sm uppercase tracking-wider bg-[#FF4655] text-white hover:bg-[#FF5F6D] transition-colors"
              style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
            >
              <MessageCircle size={14} />
              @JDAWESOME23 ON TWITTER
            </a>
          </div>
        </div>
      )}
    </>
  );
}
