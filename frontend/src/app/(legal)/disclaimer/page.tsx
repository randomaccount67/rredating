import { AlertTriangle } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <span className="label text-[#FF4655]">// IMPORTANT</span>
      <h1 className="font-extrabold text-5xl uppercase text-[#E8EAF0] mt-1 mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        DISCLAIMER
      </h1>

      <div className="bg-[#FF4655]/10 border-2 border-[#FF4655]/40 p-6 mb-8"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="flex items-start gap-4">
          <AlertTriangle size={24} className="text-[#FF4655] flex-shrink-0 mt-1" />
          <div>
            <h2 className="font-extrabold text-2xl uppercase text-[#FF4655] mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              NOT AFFILIATED WITH OR ENDORSED BY RIOT GAMES
            </h2>
            <p className="text-[#8B8FA8] leading-relaxed">
              RRedating is an independent, fan-made community project created by Valorant players, for Valorant players.
              It has absolutely no connection to Riot Games, Inc.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-[#8B8FA8] text-sm leading-relaxed">
        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6">
          <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            RIOT GAMES TRADEMARKS
          </h2>
          <p>
            Valorant™, Riot Games™, and all related marks, logos, and character names are trademarks or registered
            trademarks of Riot Games, Inc.
          </p>
        </div>

        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6">
          <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            PURPOSE
          </h2>
          <p>
            RRedating exists purely for entertainment purposes. It is a community-built tool to help players find
            duo partners based on self-reported game data, preferences, and vibe compatibility. Nothing on this site
            is verified by or connected to Riot Games in any way.
          </p>
        </div>

        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6">
          <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            NO OFFICIAL DATA
          </h2>
          <p>
            All player data on RRedating is entirely self-reported. We do not access
            the Riot Games API, and we cannot verify any claims users make about their in-game statistics.
          </p>
        </div>

        <div className="bg-[#1A1D24] border border-[#2A2D35] p-6">
          <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-3" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            18+ ONLY
          </h2>
          <p>
            RRedating is intended for adults 18 years of age and older. All users must confirm their age on
            registration. This is a community platform and includes user-generated content that may not be
            appropriate for minors.
          </p>
        </div>
      </div>
    </div>
  );
}
