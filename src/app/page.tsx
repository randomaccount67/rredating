import Link from 'next/link';
import { Crosshair, Zap, Users, Lock } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <Crosshair size={20} className="text-[#FF4655]" />,
      title: 'Find Your Perfect Duo',
      desc: "Boblow jett won't enter site for you? Filter by role, rank, and region to find a partner. They will also probably be shit but at least yall can flirt while your elo gets sold.",
    },
    {
      icon: <Zap size={20} className="text-[#FF4655]" />,
      title: 'Real Time Messages',
      desc: 'Start chatting the second you match. No more lurking mid alone at 3 am while your entire team dies on site.',
    },
    {
      icon: <Lock size={20} className="text-[#FF4655]" />,
      title: 'Your Data, Your Choice',
      desc: 'Delete your account anytime in your Account Settings. Get out while you still can.',
    },
    {
      icon: <Users size={20} className="text-[#FF4655]" />,
      title: 'Community Driven',
      desc: 'We all suffer playing this game every day. Might as well find another person suffering while your gains are +15-25.',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#FF4655 1px, transparent 1px), linear-gradient(90deg, #FF4655 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <section className="relative max-w-7xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 border border-[#FF4655]/30 bg-[#FF4655]/5 px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 bg-[#FF4655] rounded-full animate-pulse" />
          <span className="font-mono text-[10px] text-[#FF4655] tracking-widest uppercase">
            NOT AFFILIATED WITH RIOT GAMES · 18+ ONLY · FOR ENTERTAINMENT
          </span>
        </div>

        <h1 className="font-barlow font-extrabold text-6xl sm:text-8xl uppercase tracking-tight text-[#E8EAF0] mb-4 leading-none"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          FIND YOUR<br />
          <span className="text-[#FF4655]">EDATE</span>
        </h1>

        <p className="text-[#8B8FA8] text-lg max-w-xl mx-auto mb-10">
          a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/match"
            className="inline-flex items-center gap-2 bg-[#FF4655] text-white font-bold text-lg uppercase tracking-wider px-8 py-3 hover:bg-[#FF5F6D] transition-colors"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            <Crosshair size={18} />
            FIND YOUR DUO
          </Link>
          <Link href="/match"
            className="inline-flex items-center gap-2 border border-[#2A2D35] text-[#8B8FA8] font-bold text-lg uppercase tracking-wider px-8 py-3 hover:border-[#8B8FA8] hover:text-[#E8EAF0] transition-colors"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            BROWSE FIRST
          </Link>
        </div>
      </section>

      <div className="border-t border-b border-[#2A2D35] bg-[#13151A]">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#2A2D35]">
          {[
            { value: '100%', label: 'FREE TO USE' },
            { value: 'ALL RANKS', label: 'IRON TO RADIANT' },
            { value: '18+', label: 'AGE VERIFIED' },
            { value: '0', label: 'RIOT AFFILIATION' },
          ].map((stat) => (
            <div key={stat.label} className="px-6 py-2 text-center">
              <div className="font-extrabold text-2xl text-[#FF4655] uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{stat.value}</div>
              <div className="text-[#525566] font-mono text-[10px] tracking-widest uppercase mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <span className="text-[#525566] font-mono text-[10px] tracking-widest uppercase text-[#FF4655]">// HOW IT WORKS</span>
          <h2 className="font-extrabold text-4xl uppercase text-[#E8EAF0] mt-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            BUILT DIFFERENT
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-[#1A1D24] border border-[#2A2D35] p-6"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-bold text-base uppercase tracking-wider text-[#E8EAF0] mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>{f.title}</h3>
              <p className="text-[#8B8FA8] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#2A2D35] bg-[#13151A]">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="font-extrabold text-5xl uppercase text-[#E8EAF0] mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            STOP SOLOQUEUEING.<br />
            <span className="text-[#FF4655]">START SUFFERING TOGETHER.</span>
          </h2>
          <p className="text-[#8B8FA8] mb-8 max-w-lg mx-auto">
            Free. Community-built. Completely unaffiliated with Riot Games.
            Just vibes and ranked anxiety.
          </p>
          <Link href="/onboarding"
            className="inline-flex items-center gap-2 bg-[#FF4655] text-white font-bold text-xl uppercase tracking-wider px-10 py-4 hover:bg-[#FF5F6D] transition-colors"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            CREATE PROFILE
          </Link>
        </div>
      </section>
    </div>
  );
}
