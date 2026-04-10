import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#252830] bg-[#0B0D11] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#505568] text-xs">RREDATING</span>
          <span className="text-[#252830]">·</span>
          <span className="font-mono text-[#505568] text-xs">NOT AFFILIATED WITH RIOT GAMES</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="label hover:text-[#00E5FF] transition-colors">TERMS</Link>
          <Link href="/privacy" className="label hover:text-[#00E5FF] transition-colors">PRIVACY</Link>
          <Link href="/disclaimer" className="label hover:text-[#00E5FF] transition-colors">DISCLAIMER</Link>
        </div>
        <p className="label text-center">© {new Date().getFullYear()} RREDATING · FOR ENTERTAINMENT ONLY · 18+</p>
      </div>
    </footer>
  );
}
