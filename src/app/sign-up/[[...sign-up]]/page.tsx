'use client';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
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
        <SignUp />
      </div>
    </div>
  );
}
