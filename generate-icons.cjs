const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const svgInner = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D4006A"/>
      <stop offset="100%" stop-color="#FF8EB8"/>
    </linearGradient>
    <linearGradient id="lotusGrad" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FFE8F4"/>
      <stop offset="60%" stop-color="#FFBAD8"/>
      <stop offset="100%" stop-color="#FF90C0"/>
    </linearGradient>
    <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
      <feFlood flood-color="white" flood-opacity="0.3" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background rounded square -->
  <rect width="1024" height="1024" rx="210" fill="url(#bg)"/>

  <!-- Lotus / crown shape: main filled silhouette -->
  <path d="
    M 512 335
    L 482 415  L 452 352  L 416 445  L 380 392
    L 332 525  L 285 472  L 228 614  L 178 582
    L 114 702  L 64  688
    Q 20  820  40  1000
    Q 512 1085 984 1000
    Q 1004 820 960 688
    L 910 702  L 846 582  L 796 614  L 739 472
    L 692 525  L 644 392  L 608 445  L 572 352
    L 542 415
    Z
  " fill="url(#lotusGrad)" filter="url(#softGlow)"/>

  <!-- White edge highlights on left-side petals -->
  <path d="M 512 335 L 482 415" stroke="rgba(255,255,255,0.7)" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M 452 352 L 416 445" stroke="rgba(255,255,255,0.6)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M 380 392 L 332 525" stroke="rgba(255,255,255,0.55)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M 285 472 L 228 614" stroke="rgba(255,255,255,0.5)" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M 178 582 L 114 702" stroke="rgba(255,255,255,0.45)" stroke-width="6" stroke-linecap="round" fill="none"/>

  <!-- White edge highlights on right-side petals -->
  <path d="M 512 335 L 542 415" stroke="rgba(255,255,255,0.7)" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M 572 352 L 608 445" stroke="rgba(255,255,255,0.6)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M 644 392 L 692 525" stroke="rgba(255,255,255,0.55)" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M 739 472 L 796 614" stroke="rgba(255,255,255,0.5)" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M 846 582 L 910 702" stroke="rgba(255,255,255,0.45)" stroke-width="6" stroke-linecap="round" fill="none"/>

  <!-- 4-pointed sparkle star in upper right -->
  <path d="
    M 818 148
    C 824 182, 844 196, 876 208
    C 844 220, 824 234, 818 268
    C 812 234, 792 220, 760 208
    C 792 196, 812 182, 818 148 Z
  " fill="white"/>
`;

async function generateIcons() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const configs = [
    { name: 'icon-512.png',          size: 512 },
    { name: 'icon-192.png',          size: 192 },
    { name: 'apple-touch-icon.png',  size: 180 },
  ];

  for (const { name, size } of configs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
</style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
    ${svgInner}
  </svg>
</body>
</html>`);

    await page.screenshot({
      path: path.join('/home/user/velor-web/public', name),
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: false,
    });
    console.log(`Generated ${name} (${size}x${size})`);
  }

  await browser.close();
  console.log('All icons generated.');
}

generateIcons().catch(err => { console.error(err); process.exit(1); });
