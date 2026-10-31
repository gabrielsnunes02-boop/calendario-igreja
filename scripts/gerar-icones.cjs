// Gera ícone e tela de abertura do app (rode: node scripts/gerar-icones.cjs)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RES = path.join(__dirname, '../android/app/src/main/res');

// Vestido num cabide (desenho vetorial). viewBox 0 0 100 100
const dress = (color) => `
  <path d="M50 14 a6 6 0 1 1 6 6 q-6 1 -6 7" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M26 36 L50 27 L74 36" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M41 33 q9 7 18 0 l3 14 q-1 4 -3 6 l15 30 q-24 7 -48 0 l15 -30 q-2 -2 -3 -6 z" fill="${color}"/>
  <path d="M38 55 q12 4 24 0" fill="none" stroke="#e0567f" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
`;

const iconSvg = (round, size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  ${round ? '<circle cx="50" cy="50" r="50" fill="#e0567f"/>' : '<rect width="100" height="100" rx="22" fill="#e0567f"/>'}
  <g transform="translate(14 12) scale(.72)">${dress('#ffffff')}</g></svg>`;

const fgSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <g transform="translate(27 25) scale(.46)">${dress('#ffffff')}</g></svg>`;

const splashSvg = (w, h) => {
  const s = Math.min(w, h) * 0.32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#fbf3ee"/>
  <g transform="translate(${(w - s) / 2} ${(h - s) / 2 - s * 0.15}) scale(${s / 100})">
    <circle cx="50" cy="50" r="50" fill="#e0567f"/><g transform="translate(14 12) scale(.72)">${dress('#ffffff')}</g></g>
  <text x="${w / 2}" y="${h / 2 + s * 0.62}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${s * 0.26}" fill="#2b1d23">Ateliê de Bolso</text>
  </svg>`;
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  async function render(svg, w, h, out) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = path.join(RES, `mipmap-${d}`);
    await render(iconSvg(false, 48 * k), 48 * k, 48 * k, path.join(dir, 'ic_launcher.png'));
    await render(iconSvg(true, 48 * k), 48 * k, 48 * k, path.join(dir, 'ic_launcher_round.png'));
    await render(fgSvg(108 * k), 108 * k, 108 * k, path.join(dir, 'ic_launcher_foreground.png'));
  }
  for (const dir of fs.readdirSync(RES).filter((f) => f.startsWith('drawable'))) {
    const f = path.join(RES, dir, 'splash.png');
    if (!fs.existsSync(f)) continue;
    const [w, h] = execSync(`python3 -c "from PIL import Image; print(*Image.open('${f}').size)"`).toString().trim().split(' ').map(Number);
    await render(splashSvg(w, h), w, h, f);
  }
  await render(iconSvg(false, 512), 512, 512, path.join(__dirname, '../public/icon.png'));
  await b.close();
  console.log('ok');
})();
