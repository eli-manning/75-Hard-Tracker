import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { CookieBanner } from '@/components/CookieBanner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '75 Hard Tracker',
  description: 'Track your 75 Hard challenge',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '75 HARD',
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0c0b08',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* iOS PWA fullscreen — must be inline in <head> for static export */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="75 HARD" />
        <meta name="mobile-web-app-capable" content="yes" />
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
          body {
            background: var(--bg);
            color: var(--text);
            /* Safe area insets for iPhone notch/home bar */
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
          input::placeholder { color: var(--text-muted); }
          input { color: var(--text); }
        `}</style>
      </head>
      <body className={inter.className}>
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.cssText = 'position:fixed;top:8px;left:8px;z-index:9999;padding:8px 16px;background:var(--accent);color:#000;font-family:"Press Start 2P",monospace;font-size:8px;width:auto;height:auto;overflow:visible;'; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;'; }}
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ServiceWorkerRegistrar />
          <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
            {children}
          </div>
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
