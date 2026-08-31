/**
 * 生成 public/og-default.png：极光渐变 + 站点名的默认社交分享图。
 * 用 sharp 内置的 librsvg 渲染 SVG（无外部浏览器依赖）。
 * 运行：npm run og
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="a1" cx="0.18" cy="0.2" r="0.65">
      <stop offset="0" stop-color="#6366f1" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="a2" cx="0.85" cy="0.35" r="0.6">
      <stop offset="0" stop-color="#a855f7" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="a3" cx="0.5" cy="1.05" r="0.7">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="#07070d"/>
  <rect width="${W}" height="${H}" fill="url(#a1)"/>
  <rect width="${W}" height="${H}" fill="url(#a2)"/>
  <rect width="${W}" height="${H}" fill="url(#a3)"/>

  <!-- 玻璃卡片 -->
  <rect x="300" y="200" width="600" height="230" rx="36"
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>

  <!-- 徽标圆环 -->
  <circle cx="600" cy="272" r="26" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="3.5"/>
  <circle cx="600" cy="272" r="9" fill="#ffffff"/>

  <text x="600" y="352" text-anchor="middle" fill="#f4f4f8"
        font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="44" font-weight="700">lbx's Blog</text>
  <text x="600" y="396" text-anchor="middle" fill="#a2a2b5"
        font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="20">记录、思考、与技术同行</text>
</svg>`;

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
await mkdir(outDir, { recursive: true });

await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(path.join(outDir, 'og-default.png'));
console.log('✓ public/og-default.png 已生成');
