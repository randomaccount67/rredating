import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up — RRedating',
  robots: { index: true, follow: true },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
