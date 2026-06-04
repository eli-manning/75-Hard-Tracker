import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA */}
        <meta name="theme-color" content="#0c0b08" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="75 HARD" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />

        <ScrollViewStyleReset />

        <style>{`
          html {
            height: 100%;
            height: -webkit-fill-available;
            background-color: #0c0b08;
          }
          body {
            display: flex;
            flex-direction: column;
            margin: 0;
            padding: 0;
            overflow: hidden;
            min-height: -webkit-fill-available;
            background-color: #0c0b08;
          }
          #root {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            background-color: #0c0b08;
          }

          /* PWA standalone: -webkit-fill-available excludes the home indicator zone,
             causing body's overflow:hidden to clip #root ~34px short of the screen.
             Override html+body to 100dvh so the full physical screen is available. */
          @media all and (display-mode: standalone) {
            html, body {
              height: 100dvh !important;
              min-height: 100dvh !important;
            }
          }
        `}</style>
      </head>
      <body style={{ height: '100%' }}>
        {children}
      </body>
    </html>
  );
}
