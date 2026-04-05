export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <span className="label text-[#FF4655]">// LEGAL</span>
      <h1 className="font-extrabold text-5xl uppercase text-[#E8EAF0] mt-1 mb-8" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
        TERMS OF SERVICE
      </h1>
      <div className="space-y-6 text-[#8B8FA8] text-sm leading-relaxed">
        <p className="font-mono text-[10px] text-[#525566]">LAST UPDATED: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</p>

        <div className="bg-[#1A1D24] border border-[#FF4655]/20 p-4">
          <p className="text-[#FF4655] font-bold text-sm uppercase" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
            NOT AFFILIATED WITH RIOT GAMES
          </p>
          <p className="text-[#8B8FA8] text-xs mt-1">
            RRedating is a fan-made community project. It is not affiliated with, endorsed by, or connected to Riot Games, Inc. in any way.
            Valorant™ is a trademark of Riot Games, Inc.
          </p>
        </div>

        {[
          { title: '1. ELIGIBILITY', content: 'You must be at least 18 years old to use RRedating. By creating an account, you confirm that you are 18 or older. We reserve the right to terminate accounts of users who misrepresent their age.' },
          { title: '2. ACCEPTABLE USE', content: 'You agree not to: harass, abuse, or threaten other users; post illegal content; impersonate other people; use the service for commercial purposes; attempt to hack or disrupt the service; create multiple accounts to circumvent bans.' },
          { title: '3. USER CONTENT', content: 'You are responsible for all content you post. By posting content, you grant RRedating a license to display it on the platform. We reserve the right to remove any content that violates these terms.' },
          { title: '4. NO OFFICIAL AFFILIATION', content: 'RRedating has no connection to Riot Games. Game data you enter (rank, Riot ID, etc.) is self-reported on the honor system. We do not verify any in-game claims.' },
          { title: '5. BANS AND TERMINATION', content: 'We can ban your account at any time, for any reason, including but not limited to: harassment, inappropriate content, suspected age fraud, or just being a general menace.' },
          { title: '6. DISCLAIMER OF WARRANTIES', content: 'RRedating is provided "as is" for entertainment purposes only. We make no guarantees about uptime, data preservation, or finding you a duo. Use at your own risk.' },
          { title: '7. LIMITATION OF LIABILITY', content: 'To the fullest extent permitted by law, RRedating and its operators shall not be liable for any damages arising from your use of this service.' },
          { title: '8. CHANGES TO TERMS', content: 'We may update these terms at any time. Continued use of the service constitutes acceptance of the updated terms.' },
        ].map(section => (
          <div key={section.title}>
            <h2 className="font-bold text-base uppercase text-[#E8EAF0] mb-2" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              {section.title}
            </h2>
            <p>{section.content}</p>
          </div>
        ))}

        <p className="text-[#525566] font-mono text-xs">
          Questions? You probably won&apos;t find us but you can try.
        </p>
      </div>
    </div>
  );
}
