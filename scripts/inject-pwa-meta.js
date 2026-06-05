const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Fix viewport to include viewport-fit=cover for iOS edge-to-edge
html = html.replace(
  /content="width=device-width,\s*initial-scale=1[^"]*"/,
  'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"'
);

// Patch the expo-reset block to add flex-direction:column so React Native
// flex layout fills height correctly (default row doesn't work for full-screen)
html = html.replace(
  '#root {\n        display: flex;\n        height: 100%;\n        flex: 1;\n      }',
  '#root {\n        display: flex;\n        flex-direction: column;\n        height: 100%;\n        flex: 1;\n      }'
);

// Keep the exported Expo web document painted through the full iOS PWA viewport.
// In standalone mode, -webkit-fill-available can exclude the home-indicator area,
// so the final override uses 100dvh for the full dynamic viewport.
const extraCss = `  <style>
    html {
      min-height: 100%;
      min-height: 100dvh;
      background-color: #ede0c4;
    }
    body {
      display: flex;
      flex-direction: column;
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      overflow: hidden;
      background-color: #ede0c4;
    }
    #root {
      min-height: 100vh;
      min-height: 100dvh;
      background-color: #ede0c4;
    }
    @supports (-webkit-touch-callout: none) {
      html { height: -webkit-fill-available; }
      body, #root { min-height: -webkit-fill-available; }
    }
    @media all and (display-mode: standalone) {
      html,
      body,
      #root {
        height: 100dvh !important;
        min-height: 100dvh !important;
        background-color: #ede0c4;
      }
    }
  </style>`;

// Inject PWA tags + service worker before </head>
const pwaTags = `${extraCss}
  <link rel="manifest" href="/manifest.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="CREWDAY" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  <script>if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}</script>
</head>`;

html = html.replace('</head>', pwaTags);

fs.writeFileSync(indexPath, html);
console.log('✓ PWA meta tags injected into dist/index.html');
