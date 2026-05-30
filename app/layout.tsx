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
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --bg: #f5f0e8;
            --surface: #ffffff;
            --border: #d4c9b0;
            --text: #2a2318;
            --text-muted: #7a6e5f;
            --accent: #c85c3a;
            --accent-light: #f4e4dc;
            --green: #4a7c59;
            --green-light: #dff0e4;
            --yellow: #e8a820;
            --yellow-light: #fdf3d0;
            --red: #b83232;
            --red-light: #f5dada;
            --pixel-shadow: 2px 2px 0px #2a2318;
          }
          * { box-sizing: border-box; }
          body { background: var(--bg); color: var(--text); }
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
