import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: process.env.DASHBOARD_TITLE || 'Google Ads Dashboard',
  description: 'Google Ads performance by campaign, period over period.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
