import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
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
        <meta name="apple-mobile-web-app-title" content="CrewDay" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />

        <ScrollViewStyleReset />

        <style>{`
          html {
            height: 100%;
            min-height: 100dvh;
            height: -webkit-fill-available;
            /* Match nav surface color so any gap below the nav is invisible */
            background-color: #161410;
          }
          body {
            display: flex;
            flex-direction: column;
            margin: 0;
            padding: 0;
            overflow: hidden;
            min-height: 100vh;
            min-height: 100dvh;
            min-height: -webkit-fill-available;
            background-color: #161410;
          }
          #root {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
            background-color: #0c0b08;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
