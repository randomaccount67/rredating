import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2D35] bg-[#0F1013] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#525566] text-xs">RREDATING</span>
          <span className="text-[#2A2D35]">·</span>
          <span className="font-mono text-[#525566] text-xs">NOT AFFILIATED WITH RIOT GAMES</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="label hover:text-[#8B8FA8] transition-colors">TERMS</Link>
          <Link href="/privacy" className="label hover:text-[#8B8FA8] transition-colors">PRIVACY</Link>
          <Link href="/disclaimer" className="label hover:text-[#8B8FA8] transition-colors">DISCLAIMER</Link>
        </div>
        <p className="label text-center">© {new Date().getFullYear()} RREDATING · FOR ENTERTAINMENT ONLY · 18+</p>
      </div>
    </footer>
  );
}
