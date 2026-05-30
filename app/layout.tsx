import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '75 Hard Tracker',
  description: 'Track your 75 Hard challenge',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --bg: #0c0b08;
            --surface: #161410;
            --surface-2: #1e1b14;
            --border: #2a2620;
            --text: #ede0c4;
            --text-muted: #4a4438;
            --accent: #e8643a;
            --accent-light: #2a1408;
            --green: #4ecb6a;
            --green-light: #0a2210;
            --yellow: #e8b020;
            --yellow-light: #1e1800;
            --red: #d43232;
            --red-light: #220a0a;
            --pixel-shadow: 2px 2px 0px #000;
            --glow-green: 0 0 8px #4ecb6a66;
            --glow-accent: 0 0 8px #e8643a66;
          }
          * { box-sizing: border-box; }
          body { background: var(--bg); color: var(--text); }
          input::placeholder { color: var(--text-muted); }
          input { color: var(--text); }
        `}</style>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
