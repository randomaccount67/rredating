import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rredating.com';

export const metadata: Metadata = {
  title: 'RRedating — Find Your Valorant Edate',
  description: 'a (totally not serious) community edating site. find your edate here so you stop dropping your ep 7 immortal buddy in swiftplay',
  metadataBase: new URL(siteUrl),
  robots: 'noindex',
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
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
