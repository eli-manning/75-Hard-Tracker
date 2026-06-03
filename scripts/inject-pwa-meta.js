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

// Add -webkit-fill-available for iOS PWA full-screen + fix bottom nav to viewport bottom
const extraCss = `  <style>
    html { height: -webkit-fill-available; background-color: #0c0b08; }
    body { display: flex; flex-direction: column; background-color: #0c0b08; min-height: -webkit-fill-available; }
    #bottom-nav { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; padding-bottom: env(safe-area-inset-bottom) !important; }
  </style>`;

// Inject PWA tags + service worker before </head>
const pwaTags = `${extraCss}
  <link rel="manifest" href="/manifest.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="75 HARD" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  <script>if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}</script>
</head>`;

html = html.replace('</head>', pwaTags);

fs.writeFileSync(indexPath, html);
console.log('✓ PWA meta tags injected into dist/index.html');
