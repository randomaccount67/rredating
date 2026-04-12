import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BannedGate from '@/components/shared/BannedGate';
import ThemeApplicator from '@/components/shared/ThemeApplicator';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rredating.com';
const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

export const metadata: Metadata = {
  title: 'RRedating — Find Your Valorant Edate',
  description: 'a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay',
  metadataBase: new URL(siteUrl),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'RRedating — Find Your Valorant Edate',
    description: 'a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay',
    url: siteUrl,
    siteName: 'RRedating',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RRedating — Find Your Valorant Edate',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RRedating — Find Your Valorant Edate',
    description: 'a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Barlow+Condensed:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeApplicator />
        {maintenanceMode ? (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0F14] px-4 text-center">
            <div className="border-2 border-[#FF4655] px-3 py-1 mb-8 inline-block">
              <span className="font-mono text-[10px] text-[#FF4655] tracking-widest uppercase">SYSTEM STATUS</span>
            </div>
            <h1 className="font-extrabold text-6xl uppercase text-[#E8EAF0] mb-4" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              MAINTENANCE<br /><span className="text-[#FF4655]">MODE</span>
            </h1>
            <p className="text-[#8B90A8] text-lg max-w-md">
              We&apos;re making some upgrades. RRedating will be back shortly.
            </p>
            <p className="font-mono text-xs text-[#525566] mt-6">Check back in a few minutes.</p>
          </div>
        ) : (
          <BannedGate>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </BannedGate>
        )}
      </body>
    </html>
  );
}
