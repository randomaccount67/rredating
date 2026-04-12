import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — RRedating',
  robots: { index: true, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
