// Draws the pictures of this profile in the paper-sketch style of LexViz Explorer: pencil lines on warm paper, a teal route, red for
// what matters most, a gold arrow, handwritten notes. Node 20, no packages.
//
//   node scripts/build.mjs             every picture
//   node scripts/build.mjs --activity  only the activity calendar (the daily GitHub Action runs this)
//
// The activity calendar reads the public contribution calendar of the profile. If GitHub changes that page and the script finds
// no calendar, the old picture stays as it is.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const USER = 'OgbondaGlory';

// ---------- the look ----------

const C = {
  paper: '#fffdf8', paperEdge: '#e7dcc6', ink: '#2b2a26', lead: '#5b5750', faint: '#a39b8b',
  teal: '#0f766e', tealMid: '#14a091', tealDark: '#0b3b3a', red: '#c0392b', gold: '#f2c14e', goldEdge: '#5c4310',
  tape: '#e9dcb8', sticky: '#fde68a', cork: '#c39a6b', corkEdge: '#8a6a45',
};

const font = (name) => readFileSync(join(ASSETS, 'fonts', `${name}.woff`)).toString('base64');
const FONT_CSS = [
  ['Lex', 400, 'Lexend-Regular'], ['Lex', 700, 'Lexend-Bold'], ['Hand', 700, 'Caveat-Bold'],
].map(([family, weight, file]) => `@font-face{font-family:${family};font-weight:${weight};src:url(data:font/woff;base64,${font(file)}) format('woff')}`).join('');

const BASE_CSS = `
.lex{font-family:Lex,Lexend,'Segoe UI',Helvetica,Arial,sans-serif}
.b{font-weight:700}
.hand{font-family:Hand,Caveat,'Segoe Print','Bradley Hand',cursive;font-weight:700}
.ink{fill:${C.ink}}.lead{fill:${C.lead}}.teal{fill:${C.teal}}.red{fill:${C.red}}.faint{fill:${C.faint}}
.box{transform-box:fill-box;transform-origin:center}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@keyframes fade{from{opacity:0}}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes bob{50%{transform:translateY(-7px)}}
@keyframes grow{from{transform:scaleX(0)}}
@keyframes pop{0%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.15)}100%{transform:scale(1)}}
.rise{animation:rise .7s ease-out backwards}
.fade{animation:fade .8s ease-out backwards}
.draw{stroke-dasharray:1;animation:draw 2.4s ease-in-out backwards}
.bob{animation:bob 1.6s ease-in-out infinite}
.grow{transform-box:fill-box;transform-origin:left center;animation:grow 1.1s cubic-bezier(.2,.8,.2,1) backwards}
.pop{transform-box:fill-box;transform-origin:center;animation:pop .5s ease-out backwards}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const delay = (seconds) => `animation-delay:${seconds.toFixed(2)}s`;

/** The shared filters: paper grain, a pencil wobble for lines, and a soft shadow under a sheet. */
const DEFS = `
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/>
  <feColorMatrix in="n" values="0 0 0 0 0.42  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.09 0"/>
  <feComposite in2="SourceGraphic" operator="in"/>
</filter>
<filter id="pencil" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1000" height="760">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="9" result="w"/>
  <feDisplacementMap in="SourceGraphic" in2="w" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="shadow" x="-5%" y="-5%" width="110%" height="120%">
  <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#3b2f1e" flood-opacity="0.2"/>
</filter>`;

function svg({ w, h, title, desc, css = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>${DEFS}</defs>
<style>${FONT_CSS}${BASE_CSS}${css}</style>
${body}
</svg>
`;
}

/** A sheet of paper: shadow, grain, a red margin line, and tape on the top corners. */
function sheet(x, y, w, h, { turn = 0, margin = 44, tape = true } = {}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `<g transform="rotate(${turn} ${cx} ${cy})">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.paper}" stroke="${C.paperEdge}" filter="url(#shadow)"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.paper}" filter="url(#grain)"/>
  ${margin ? `<line x1="${x + margin}" y1="${y + 6}" x2="${x + margin}" y2="${y + h - 6}" stroke="${C.red}" stroke-opacity="0.35" stroke-width="1.4"/>` : ''}
  ${tape ? `${tapeStrip(x + 34, y - 10, 92, -5)}${tapeStrip(x + w - 126, y - 10, 92, 4)}` : ''}
</g>`;
}

function tapeStrip(x, y, w, turn) {
  return `<rect x="${x}" y="${y}" width="${w}" height="24" fill="${C.tape}" fill-opacity="0.78" transform="rotate(${turn} ${x + w / 2} ${y + 12})"/>`;
}

/** A pencil line: the stroke twice, a little apart, through the wobble, as a pencil goes over a line. */
function pencil(d, color, width, { cls = '', style = '', dash = '' } = {}) {
  const dashed = dash ? ` stroke-dasharray="${dash}"` : '';
  const length = cls.includes('draw') ? ' pathLength="1"' : '';
  return `<g filter="url(#pencil)">
  <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${length}${dashed} class="${cls}" style="${style}"/>
  <path d="${d}" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="${(width * 0.55).toFixed(2)}" stroke-linecap="round" transform="translate(0.9 0.7)"${length}${dashed} class="${cls}" style="${style}"/>
</g>`;
}

/** A rubber stamp: a border and words in capitals, in ink with a rough edge. */
function stamp(x, y, words, color, { size = 12, turn = -4, sub = '', cls = '', style = '' } = {}) {
  const wide = Math.max(words.length * size * 0.71 + (words.length - 1) * 1.6, sub ? sub.length * (size - 1) * 0.6 : 0) + 22;
  const tall = sub ? size * 2 + 22 : size + 18;
  // The animation on the outer group, the turn on the inner one: a CSS transform-origin would also move a rotate attribute.
  return `<g class="${cls}" style="${style}"><g transform="rotate(${turn} ${x + wide / 2} ${y + tall / 2})">
  <g filter="url(#pencil)" opacity="0.92">
    <rect x="${x}" y="${y}" width="${wide.toFixed(1)}" height="${tall}" rx="4" fill="none" stroke="${color}" stroke-width="2.4"/>
    <text x="${(x + wide / 2).toFixed(1)}" y="${y + size + 7}" text-anchor="middle" class="lex b" font-size="${size}" letter-spacing="1.6" fill="${color}">${esc(words)}</text>
    ${sub ? `<text x="${(x + wide / 2).toFixed(1)}" y="${y + size * 2 + 13}" text-anchor="middle" class="lex" font-size="${size - 1}" letter-spacing="0.6" fill="${color}">${esc(sub)}</text>` : ''}
  </g>
</g></g>`;
}

/** The gold arrow of the LexViz Explorer game, the tip at x, y, bobbing. */
function goldArrow(x, y, { style = '' } = {}) {
  return `<g class="bob" style="${style}"><g transform="translate(${x} ${y})">
  <rect x="-4.5" y="-34" width="9" height="20" rx="2" fill="${C.gold}" stroke="${C.goldEdge}" stroke-width="1.2"/>
  <path d="M -13 -16 L 13 -16 L 0 0 Z" fill="${C.gold}" stroke="${C.goldEdge}" stroke-width="1.2" stroke-linejoin="round"/>
</g></g>`;
}

/** A red pen ring round a point, drawn in one go, as on the LexViz map. */
function penRing(cx, cy, rx, ry, { style = '' } = {}) {
  const d = `M ${cx - rx * 0.2} ${cy - ry * 1.02} C ${cx + rx * 0.9} ${cy - ry * 1.15}, ${cx + rx * 1.1} ${cy + ry * 0.7}, ${cx + rx * 0.1} ${cy + ry} C ${cx - rx * 0.95} ${cy + ry * 1.1}, ${cx - rx * 1.15} ${cy - ry * 0.4}, ${cx - rx * 0.3} ${cy - ry * 0.95} L ${cx + rx * 0.2} ${cy - ry * 1.1}`;
  return pencil(d, C.red, 2.4, { cls: 'draw', style });
}

function textLines(x, y, lines, { size, cls, gap = 1.25, anchor = 'start', style = '' }) {
  return lines.map((line, at) => `<text x="${x}" y="${(y + at * size * gap).toFixed(1)}" text-anchor="${anchor}" class="${cls}" font-size="${size}" style="${style}">${esc(line)}</text>`).join('\n');
}

// ---------- the pictures ----------

function hero() {
  const W = 900;
  const H = 318;
  // The route of a small claim, as on the LexViz map: the step you are at ringed in red, the gold arrow over the next one.
  const nodes = [
    { x: 606, y: 246, label: 'claim', lx: -10, ly: 30 },
    { x: 664, y: 178, label: 'defence', lx: -62, ly: -4 },
    { x: 742, y: 214, label: 'mediation', lx: 18, ly: 26 },
    { x: 796, y: 132, label: 'hearing', lx: 20, ly: 6, hearing: true },
    { x: 852, y: 70, label: 'decision', lx: -78, ly: -10 },
  ];
  const route = nodes.map((one, at) => `${at ? 'L' : 'M'} ${one.x} ${one.y}`).join(' ');
  const now = ['writing up my PhD thesis', 'building LexViz Explorer', 'a new paper, out soon in IRLCT'];
  const nowCss = `.now{opacity:0;animation:now 10.5s linear infinite}
@keyframes now{0%{opacity:0}3%{opacity:1}30%{opacity:1}33.3%{opacity:0}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.now{opacity:0}.now.first{opacity:1}}`;
  const body = `
${sheet(14, 18, 872, 282, { turn: -0.4 })}
<text x="92" y="80" class="hand teal rise" font-size="31">Hi, I'm Glory</text>
<text x="92" y="128" class="lex b ink rise" font-size="38" style="${delay(0.15)}">Ebube Glory Ogbonda</text>
<text x="92" y="161" class="lex lead rise" font-size="16.5" style="${delay(0.3)}">PhD researcher in computer science, Bangor University.</text>
<text x="92" y="186" class="lex lead rise" font-size="16.5" style="${delay(0.4)}">I build AI systems that draw legal processes</text>
<text x="92" y="209" class="lex lead rise" font-size="16.5" style="${delay(0.45)}">people can follow.</text>
<text x="92" y="241" class="hand ink" font-size="21">Right now:</text>
${now.map((line, at) => `<text x="186" y="241" class="hand teal now${at ? '' : ' first'}" font-size="21" style="${delay(at * 3.5)}">${esc(line)}</text>`).join('\n')}
${stamp(92, 258, 'LEGAL VISUALISATION', C.teal, { size: 10.5, turn: -2, cls: 'fade', style: delay(0.8) })}
${stamp(296, 260, 'ACCESS TO JUSTICE', C.tealDark, { size: 10.5, turn: 1.5, cls: 'fade', style: delay(0.95) })}
${stamp(480, 257, 'AIMLAC CDT', C.ink, { size: 10.5, turn: -1, cls: 'fade', style: delay(1.1) })}
${pencil(route, C.teal, 2.6, { cls: 'draw', style: delay(0.3) })}
${nodes.map((one, at) => `<g class="pop" style="${delay(0.5 + at * 0.4)}">${one.hearing
    ? `<g filter="url(#pencil)"><path d="M ${one.x} ${one.y - 13} L ${one.x + 13} ${one.y} L ${one.x} ${one.y + 13} L ${one.x - 13} ${one.y} Z" fill="${C.paper}" stroke="${C.red}" stroke-width="2.2"/></g>`
    : `<g filter="url(#pencil)"><circle cx="${one.x}" cy="${one.y}" r="11" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.8"/></g>`}
  <text x="${one.x + one.lx}" y="${one.y + one.ly}" class="hand lead" font-size="19">${one.label}</text></g>`).join('\n')}
${penRing(742, 214, 24, 20, { style: delay(2.6) })}
<text x="676" y="262" class="hand red fade" font-size="18" style="${delay(3)}">you are here</text>
${goldArrow(796, 112, { style: delay(0) })}`;
  return svg({ w: W, h: H, title: 'Ebube Glory Ogbonda', desc: 'Hi, I am Glory: a PhD researcher in computer science at Bangor University. I build AI systems that draw legal processes people can follow. A sketch of the route of a small claim: claim, defence, mediation, hearing, decision. A red ring marks mediation as you are here, and a gold arrow points at the hearing.', css: nowCss, body });
}

function paper() {
  const W = 900;
  const H = 250;
  const css = `@keyframes slam{0%{opacity:0;transform:scale(1.8) rotate(-24deg)}60%{opacity:1;transform:scale(.95) rotate(-12deg)}100%{opacity:1;transform:scale(1) rotate(-12deg)}}
.slam{transform-box:fill-box;transform-origin:center;transform:rotate(-12deg);animation:slam .5s ease-out backwards}`;
  // A journal page, drawn small: the title bar, then two columns of lines.
  const page = (x, y) => {
    const lines = [];
    for (let at = 0; at < 9; at += 1) {
      lines.push(`M ${x + 14} ${y + 62 + at * 11} L ${x + 62 - (at % 3) * 6} ${y + 62 + at * 11}`);
      lines.push(`M ${x + 74} ${y + 62 + at * 11} L ${x + 122 - ((at + 1) % 4) * 5} ${y + 62 + at * 11}`);
    }
    return `<g transform="rotate(-4 ${x + 68} ${y + 88})">
  <rect x="${x}" y="${y}" width="136" height="176" rx="3" fill="${C.paper}" stroke="${C.paperEdge}" filter="url(#shadow)"/>
  ${pencil(`M ${x + 14} ${y + 22} L ${x + 120} ${y + 22} M ${x + 14} ${y + 34} L ${x + 96} ${y + 34}`, C.ink, 3)}
  ${pencil(`M ${x + 14} ${y + 47} L ${x + 70} ${y + 47}`, C.teal, 1.6)}
  ${pencil(lines.join(' '), C.faint, 1.1)}
  <path d="M ${x + 98} ${y - 8} q 9 -3 11 6 l 3 32 q 1 8 -6 9 q -7 1 -8 -7 l -3 -26" fill="none" stroke="#8b8f96" stroke-width="2"/>
</g>`;
  };
  const body = `
${sheet(14, 18, 872, 212, { turn: 0.3 })}
${page(84, 34)}
<g class="slam" style="${delay(1)}">${stamp(92, 106, 'ACCEPTED', C.red, { size: 17, turn: 0 })}</g>
<text x="270" y="68" class="hand teal rise" font-size="24">New paper, accepted on 25 November 2026</text>
<text x="270" y="108" class="lex b ink rise" font-size="25" style="${delay(0.15)}">Legal Visualisation in Practice:</text>
<text x="270" y="140" class="lex b ink rise" font-size="25" style="${delay(0.25)}">What LegalVis Reveals About Law</text>
<text x="270" y="174" class="lex lead rise" font-size="15.5" style="${delay(0.4)}">With Sarah Nason. International Review of Law, Computers &amp; Technology</text>
<text x="270" y="200" class="lex teal rise" font-size="14" style="${delay(0.5)}">doi.org/10.1080/13600869.2026.2771561</text>`;
  return svg({ w: W, h: H, title: 'New paper accepted', desc: 'Legal Visualisation in Practice: What LegalVis Reveals About Law, with Sarah Nason. Accepted on 25 November 2026 by the International Review of Law, Computers and Technology. DOI 10.1080/13600869.2026.2771561.', css, body });
}

function board() {
  const W = 900;
  const H = 372;
  const photo = (name) => `data:image/jpeg;base64,${readFileSync(join(ASSETS, 'photos', name)).toString('base64')}`;
  const shots = [
    { x: 36, y: 88, turn: -3, file: 'journey.jpg', caption: 'The legal steps of a PIP appeal' },
    { x: 320, y: 76, turn: 2.2, file: 'court.jpg', caption: 'Court 1, in the LexViz town' },
    { x: 604, y: 92, turn: -2, file: 'door.jpg', caption: 'Chapter 8: at the court door' },
  ];
  const FW = 262;
  const FH = 218;
  const pins = shots.map((one) => ({ x: one.x + FW / 2, y: one.y + 10 }));
  const string = `M ${pins[0].x} ${pins[0].y} Q ${(pins[0].x + pins[1].x) / 2} ${pins[0].y + 36} ${pins[1].x} ${pins[1].y} Q ${(pins[1].x + pins[2].x) / 2} ${pins[1].y + 40} ${pins[2].x} ${pins[2].y}`;
  const css = `@keyframes drop{from{opacity:0;transform:translateY(-18px)}}
.drop{animation:drop .7s cubic-bezier(.2,.8,.2,1) backwards}`;
  const body = `
<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="14" fill="${C.cork}" stroke="${C.corkEdge}" stroke-width="5" filter="url(#shadow)"/>
<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="14" fill="${C.cork}" filter="url(#grain)" opacity="0.9"/>
<g transform="rotate(-2 160 44)">
  <rect x="34" y="22" width="262" height="44" rx="3" fill="${C.paper}" filter="url(#shadow)"/>
  ${tapeStrip(140, 12, 52, 3)}
  <text x="52" y="53" class="hand ink" font-size="26">LexViz Explorer, in pictures</text>
</g>
${pencil(string, C.red, 2.2, { cls: 'draw', style: delay(1.4) })}
${shots.map((one, at) => `<g class="drop" style="${delay(0.2 + at * 0.35)}"><g transform="rotate(${one.turn} ${one.x + FW / 2} ${one.y + FH / 2})">
  <rect x="${one.x}" y="${one.y}" width="${FW}" height="${FH}" rx="3" fill="${C.paper}" filter="url(#shadow)"/>
  <image href="${photo(one.file)}" x="${one.x + 11}" y="${one.y + 13}" width="${FW - 22}" height="${(FW - 22) * 0.625}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${one.x + 11}" y="${one.y + 13}" width="${FW - 22}" height="${(FW - 22) * 0.625}" fill="none" stroke="#00000022"/>
  <text x="${one.x + FW / 2}" y="${one.y + FH - 22}" text-anchor="middle" class="hand ink" font-size="19">${esc(one.caption)}</text>
</g></g>`).join('\n')}
${pins.map((one, at) => `<g class="pop" style="${delay(0.5 + at * 0.35)}"><circle cx="${one.x}" cy="${one.y}" r="8" fill="${C.red}" stroke="#7e2318" stroke-width="1.2"/><circle cx="${one.x - 2.5}" cy="${one.y - 2.5}" r="2.4" fill="#ffffff" fill-opacity="0.75"/></g>`).join('\n')}`;
  return svg({ w: W, h: H, title: 'LexViz Explorer, in pictures', desc: 'A cork board with three photos pinned up and joined by red string: the legal steps of a PIP appeal on the LexViz map; Court 1, a county court in the LexViz town; and chapter 8 of the story, at the court door.', css, body });
}

// The publications, one row for each kind, as the lanes of a LexViz map. The same outputs as Papers and talks in the README: keep the
// two lists the same. `at` is the month (year, month); an output with no month known goes in the middle of the year.
const TRACKS = [
  { lane: 'Journal', items: [{ at: [2026, 11], lines: ['IRLCT, accepted', '25 Nov 2026'], now: true }] },
  { lane: 'Conference papers', items: [{ at: [2023, 9], lines: ['2 short papers,', 'CGVC'], count: 2 }, { at: [2025, 6], lines: ['ICAIL workshop', 'paper, Chicago'] }] },
  { lane: 'Posters', items: [{ at: [2023, 9], lines: ['CGVC poster'] }, { at: [2025, 11], lines: ['IEEE VIS,', 'Vienna'] }] },
  { lane: 'Policy and reports', items: [{ at: [2025, 6], lines: ['Law Society report, OPRC', 'response, written evidence'], count: 3 }] },
  { lane: 'Talks', items: [{ at: [2024, 5], lines: ['Liverpool and', 'Swansea'], count: 2 }] },
  // The thesis: the track from the start of the PhD, and the thesis ahead (drawn in tracks()).
  { lane: 'PhD thesis', items: [{ at: [2023, 9], lines: ['PhD starts,', 'Bangor'] }] },
];
/**
 * The rows of the outputs still ahead: the 2 journal papers under review, and the thesis. While a paper is under review, the profile names
 * no journal, title or manuscript ID (the owner, 27 November 2026), so a reviewer cannot link the profile to the submission.
 */
const JOURNAL_ROW = 0;
const THESIS_ROW = 5;

function tracks() {
  const W = 900;
  const H = 626;
  const x0 = 228;
  const x1 = 858;
  const months = 60;
  const xOf = ([year, month]) => x0 + (((year - 2023) * 12 + month - 1) / months) * (x1 - x0);
  const top = 138;
  const lane = 70;
  // The track runs low in the lane, so the words of each output sit above the track, clear of the line.
  const yOf = (at) => top + 46 + at * lane;
  const bottom = top + TRACKS.length * lane;
  const now = xOf([2026, 11]);
  const ahead = xOf([2027, 9]);
  const node = (x, y, fill, edge, count = 1) => Array.from({ length: count }, (_, at) => count - 1 - at)
    .map((back) => `<circle cx="${(x - back * 5).toFixed(1)}" cy="${(y - back * 4).toFixed(1)}" r="9" fill="${fill}" stroke="${edge}" stroke-width="1.8"/>`).join('');
  const items = TRACKS.flatMap((row, at) => row.items.map((one) => ({ ...one, x: xOf(one.at), y: yOf(at) })));
  const body = `
${sheet(14, 18, 872, 590, { turn: -0.25 })}
<text x="74" y="70" class="hand ink rise" font-size="28">My publications so far</text>
<text x="76" y="96" class="lex lead rise" font-size="14" style="${delay(0.15)}">Each row is one kind of output. Time runs from left to right.</text>
<rect x="${now.toFixed(1)}" y="${top - 18}" width="${(x1 - now + 14).toFixed(1)}" height="${bottom - top + 18}" fill="${C.paperEdge}" fill-opacity="0.28" rx="4"/>
${[2023, 2024, 2025, 2026, 2027].map((year) => `<line x1="${xOf([year, 1]).toFixed(1)}" y1="${top - 6}" x2="${xOf([year, 1]).toFixed(1)}" y2="${bottom}" stroke="${C.faint}" stroke-opacity="0.45" stroke-dasharray="2 5"/>
<text x="${(xOf([year, 1]) + 4).toFixed(1)}" y="${top - 2}" class="lex b" font-size="12" letter-spacing="1" fill="${C.tealDark}">${year}</text>`).join('\n')}
${TRACKS.map((row, at) => {
    const y = yOf(at);
    const first = Math.min(...row.items.map((one) => xOf(one.at)));
    return `<line x1="74" y1="${top + at * lane + lane}" x2="${x1 + 10}" y2="${top + at * lane + lane}" stroke="${C.faint}" stroke-opacity="0.25"/>
<text x="74" y="${y + 5}" class="lex b ink" font-size="13">${esc(row.lane)}</text>
${pencil(`M ${first} ${y} L ${now} ${y}`, C.teal, 2.2, { cls: 'draw', style: delay(0.3 + at * 0.12) })}
${pencil(`M ${now} ${y} L ${ahead} ${y}`, C.faint, 1.6, { dash: '4 7' })}`;
  }).join('\n')}
${items.map((one) => {
    const order = 0.6 + ((one.x - x0) / (x1 - x0)) * 2.2;
    const left = !!one.now;
    // The output of now has the red ring round the node, so the words keep clear of the ring.
    const tx = left ? one.x - 28 : one.x + 12;
    const ty = one.y - 12 - (one.lines.length - 1) * 16;
    return `<g class="pop" style="${delay(order)}"><g filter="url(#pencil)">${node(one.x, one.y, one.now ? C.red : C.teal, one.now ? '#7e2318' : C.tealDark, one.count)}</g>
  ${textLines(tx, ty, one.lines, { size: 16, cls: `hand ${one.now ? 'red' : 'ink'}`, gap: 1.0, anchor: left ? 'end' : 'start' })}</g>`;
  }).join('\n')}
${penRing(now, yOf(0), 20, 17, { style: delay(3.2) })}
<line x1="${now.toFixed(1)}" y1="${top - 18}" x2="${now.toFixed(1)}" y2="${bottom + 8}" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="5 4" class="fade" style="${delay(3)}"/>
<text x="${now.toFixed(1)}" y="${bottom + 30}" text-anchor="middle" class="hand red fade" font-size="19" style="${delay(3.4)}">you are here</text>
<g class="pop" style="${delay(3.6)}">
  <g filter="url(#pencil)"><circle cx="${ahead.toFixed(1)}" cy="${yOf(JOURNAL_ROW)}" r="9" fill="${C.paper}" stroke="${C.faint}" stroke-width="1.8" stroke-dasharray="3 3"/><circle cx="${(ahead - 5).toFixed(1)}" cy="${yOf(JOURNAL_ROW) - 4}" r="9" fill="${C.paper}" stroke="${C.faint}" stroke-width="1.8" stroke-dasharray="3 3"/></g>
  ${textLines(ahead, yOf(JOURNAL_ROW) - 30, ['2 journal papers', 'under review'], { size: 16, cls: 'hand faint', gap: 1.0, anchor: 'middle' })}
</g>
<g class="pop" style="${delay(3.8)}">
  <g filter="url(#pencil)"><circle cx="${ahead.toFixed(1)}" cy="${yOf(THESIS_ROW)}" r="9" fill="${C.paper}" stroke="${C.faint}" stroke-width="1.8" stroke-dasharray="3 3"/></g>
  ${textLines(ahead, yOf(THESIS_ROW) + 28, ['My thesis, 2027'], { size: 16, cls: 'hand faint', gap: 1.0, anchor: 'middle' })}
</g>
${goldArrow(ahead, yOf(THESIS_ROW) - 14, { style: delay(0) })}`;
  const list = TRACKS.flatMap((row) => row.items.map((one) => `${row.lane}: ${one.lines.join(' ')}`)).join('; ');
  return svg({ w: W, h: H, title: 'My publications so far', desc: `My publications from 2023 to 2027, one row for each kind of output. ${list}. A red line marks now, November 2026. Ahead: 2 journal papers under review, and my thesis in 2027.`, body });
}

// What LexViz Explorer is made of, measured from the private repository on 26 November 2026: lines in the files git tracks, without
// packages, builds and data.
const CODE = {
  measured: '26 November 2026',
  bars: [['TypeScript', 384043], ['JavaScript', 146547], ['Python', 2398], ['HTML and CSS', 989]],
  commits: 1371, since: 'Aug 2025', tests: 395, notes: 207, noteLines: 24830,
};

function code() {
  const W = 900;
  const H = 300;
  const x0 = 196;
  const most = 400000;
  const wide = 380;
  const ticks = [0, 100000, 200000, 300000, 400000];
  const n = (value) => value.toLocaleString('en-GB');
  const body = `
${sheet(14, 18, 872, 262, { turn: 0.25 })}
<text x="74" y="70" class="hand ink rise" font-size="28">What LexViz Explorer is made of</text>
<text x="76" y="96" class="lex lead rise" font-size="14" style="${delay(0.15)}">Lines of code in the private repository, measured on ${CODE.measured}.</text>
${ticks.map((tick) => `<line x1="${x0 + (tick / most) * wide}" y1="116" x2="${x0 + (tick / most) * wide}" y2="236" stroke="${C.faint}" stroke-opacity="0.35" stroke-dasharray="2 4"/>
<text x="${x0 + (tick / most) * wide}" y="254" text-anchor="middle" class="lex faint" font-size="11">${tick ? `${tick / 1000}k` : '0'}</text>`).join('\n')}
${CODE.bars.map(([name, lines], at) => {
    const y = 124 + at * 28;
    const length = Math.max(4, (lines / most) * wide);
    return `<text x="${x0 - 12}" y="${y + 12}" text-anchor="end" class="lex ink" font-size="14">${name}</text>
<rect x="${x0}" y="${y}" width="${length.toFixed(1)}" height="16" rx="4" fill="${C.teal}" class="grow" style="${delay(0.4 + at * 0.2)}"/>
<text x="${(x0 + length + 10).toFixed(1)}" y="${y + 12.5}" class="lex b ink fade" font-size="13.5" style="${delay(1.2 + at * 0.2)}">${n(lines)}</text>`;
  }).join('\n')}
${stamp(642, 112, `${n(CODE.commits)} COMMITS`, C.teal, { size: 13, turn: -3, sub: `since ${CODE.since}`, cls: 'fade', style: delay(1.4) })}
${stamp(658, 172, `${CODE.tests} TEST FILES`, C.tealDark, { size: 13, turn: 2, cls: 'fade', style: delay(1.6) })}
${stamp(640, 214, `${CODE.notes} DESIGN NOTES`, C.red, { size: 13, turn: -2, sub: `${n(CODE.noteLines)} lines of Markdown`, cls: 'fade', style: delay(1.8) })}`;
  return svg({ w: W, h: H, title: 'What LexViz Explorer is made of', desc: `Lines of code in the LexViz Explorer repository on ${CODE.measured}: TypeScript ${n(384043)}, JavaScript ${n(146547)}, Python ${n(2398)}, HTML and CSS ${n(989)}. ${n(CODE.commits)} commits since August 2025, ${CODE.tests} test files and ${CODE.notes} design notes.`, body });
}

function stack() {
  const W = 900;
  const H = 280;
  const cards = [
    { head: 'Build', color: C.teal, items: ['TypeScript and React', 'Node.js and Express', 'Python and FastAPI', 'PostgreSQL', 'three.js'] },
    { head: 'AI', color: C.gold, items: ['OpenAI models', 'Retrieval (RAG)', 'Embeddings, FAISS', 'PyTorch', 'TensorFlow'] },
    { head: 'Visualise', color: C.red, items: ['D3.js', 'React Flow', 'Cytoscape.js', 'A-Frame (WebXR)', 'Pencil and paper'] },
    { head: 'Test and ship', color: '#64748b', items: ['Jest', 'Playwright', 'GitHub Actions', 'Docker, Heroku', 'Azure, AWS'] },
  ];
  const body = `
${sheet(14, 18, 872, 244, { turn: -0.25 })}
<text x="74" y="70" class="hand ink rise" font-size="28">What I build with</text>
${cards.map((card, at) => {
    const x = 74 + at * 200;
    const y = 92;
    const turn = at % 2 ? 1.2 : -1.2;
    return `<g class="rise" style="${delay(0.2 + at * 0.18)}"><g transform="rotate(${turn} ${x + 88} ${y + 74})">
  <path d="M ${x + 8} ${y - 14} h 70 l 8 14 h -86 z" fill="${card.color}"/>
  <rect x="${x}" y="${y}" width="176" height="146" rx="4" fill="#fffef9" stroke="${C.paperEdge}" filter="url(#shadow)"/>
  <rect x="${x}" y="${y}" width="176" height="5" fill="${card.color}"/>
  <text x="${x + 14}" y="${y + 30}" class="lex b ink" font-size="15">${card.head}</text>
  ${textLines(x + 14, y + 54, card.items, { size: 13.5, cls: 'lex lead', gap: 1.45 })}
</g></g>`;
  }).join('\n')}`;
  return svg({ w: W, h: H, title: 'What I build with', desc: `Build: ${cards[0].items.join(', ')}. AI: ${cards[1].items.join(', ')}. Visualize: ${cards[2].items.join(', ')}. Test and ship: ${cards[3].items.join(', ')}.`, body });
}

/**
 * A link as a small paper tag: a coloured edge on the left, the words in Lexend. Drawn here, not by a badge service, so the links show
 * even when an outside service does not answer. Only the bold Lexend is embedded, to keep each tag small.
 */
const BOLD_CSS = `@font-face{font-family:Lex;font-weight:700;src:url(data:font/woff;base64,${font('Lexend-Bold')}) format('woff')}`;
function tag(words, color) {
  const wide = Math.round(words.length * 7.4 + 38);
  const tall = 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wide}" height="${tall}" viewBox="0 0 ${wide} ${tall}" role="img" aria-label="${esc(words)}">
<title>${esc(words)}</title>
<style>${BOLD_CSS}text{font-family:Lex,Lexend,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:700}</style>
<rect x="1" y="1" width="${wide - 2}" height="${tall - 4}" rx="5" fill="${C.paper}" stroke="${C.paperEdge}"/>
<rect x="1" y="${tall - 5}" width="${wide - 4}" height="3" rx="1.5" fill="#d9ccb0"/>
<path d="M 6 1 h 6 v ${tall - 4} h -6 a 5 5 0 0 1 -5 -5 v ${-(tall - 14)} a 5 5 0 0 1 5 -5 z" fill="${color}"/>
<text x="${(wide + 12) / 2}" y="${tall / 2 + 2.5}" text-anchor="middle" font-size="12.5" fill="${C.ink}">${esc(words)}</text>
</svg>
`;
}
const TAGS = [
  ['site', 'lexvizexplorer.com', C.teal],
  ['paper', 'New paper: IRLCT 2026', C.red],
  ['orcid', 'ORCID', '#a6ce39'],
  ['linkedin', 'LinkedIn', '#0a66c2'],
  ['website', 'ebubegloryogbonda.online', C.gold],
];

// ---------- the activity calendar ----------

async function readCalendar() {
  const page = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { 'User-Agent': 'profile-pictures' } });
  if (!page.ok) throw new Error(`calendar page: ${page.status}`);
  const html = await page.text();
  const days = new Map();
  for (const one of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="([^"]+)"[^>]*data-level="(\d)"/g)) days.set(one[2], { date: one[1], level: Number(one[3]), count: 0 });
  for (const one of html.matchAll(/for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const day = days.get(one[1]);
    if (day) day.count = /^No /.test(one[2]) ? 0 : Number.parseInt(one[2].replace(/,/g, ''), 10) || 0;
  }
  const list = [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (list.length < 300) throw new Error(`calendar page: only ${list.length} days found`);
  return list;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayWords = (date) => { const [y, m, d] = date.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

function activity(days) {
  const W = 900;
  const H = 280;
  const total = days.reduce((sum, one) => sum + one.count, 0);
  const busiest = days.reduce((best, one) => (one.count > best.count ? one : best), days[0]);
  let longest = 0;
  let run = 0;
  for (const one of days) { run = one.count ? run + 1 : 0; longest = Math.max(longest, run); }
  const active = days.filter((one) => one.count).length;
  // Weeks start on Sunday, as on GitHub: the column is the week, the row the day.
  const first = new Date(`${days[0].date}T00:00:00Z`);
  const lead = first.getUTCDay();
  const cell = 11.4;
  const gap = 2.6;
  const x0 = 96;
  const y0 = 112;
  const shades = ['#efe8da', '#bfe3dc', '#74c3b4', '#1f9a87', C.teal];
  const cells = days.map((one, at) => {
    const index = at + lead;
    return { ...one, col: Math.floor(index / 7), row: index % 7 };
  });
  const cols = Math.max(...cells.map((one) => one.col)) + 1;
  const months = [];
  cells.forEach((one) => { if (one.date.endsWith('-01') || (!months.length && one.row === 0)) months.push({ col: one.col, name: MONTHS[Number(one.date.slice(5, 7)) - 1] }); });
  const today = cells[cells.length - 1];
  const tx = x0 + today.col * (cell + gap) + cell / 2;
  const ty = y0 + today.row * (cell + gap);
  const n = (value) => value.toLocaleString('en-GB');
  const grid = [];
  for (let col = 0; col < cols; col += 1) {
    const inCol = cells.filter((one) => one.col === col);
    grid.push(`<g class="fade" style="${delay(0.2 + col * 0.035)}">${inCol.map((one) => `<rect x="${(x0 + col * (cell + gap)).toFixed(1)}" y="${(y0 + one.row * (cell + gap)).toFixed(1)}" width="${cell}" height="${cell}" rx="2.5" fill="${shades[Math.min(4, one.level)]}"${one.level ? '' : ` stroke="${C.paperEdge}" stroke-width="0.8"`}><title>${one.count ? `${n(one.count)} on ${dayWords(one.date)}` : `None on ${dayWords(one.date)}`}</title></rect>`).join('')}</g>`);
  }
  const body = `
${sheet(14, 18, 872, 244, { turn: 0.2 })}
<text x="74" y="66" class="hand ink rise" font-size="28">My last 12 months on GitHub</text>
<text x="76" y="90" class="lex lead rise" font-size="13.5" style="${delay(0.15)}">Commits, pull requests and issues, private work included. Drawn again every day.</text>
${months.filter((one, at, all) => !at || one.col - all[at - 1].col > 2).map((one) => `<text x="${x0 + one.col * (cell + gap)}" y="${y0 - 6}" class="hand lead" font-size="15">${one.name}</text>`).join('\n')}
${[['Mon', 1], ['Wed', 3], ['Fri', 5]].map(([name, row]) => `<text x="${x0 - 10}" y="${y0 + row * (cell + gap) + cell - 1}" text-anchor="end" class="hand lead" font-size="14">${name}</text>`).join('\n')}
${grid.join('\n')}
${goldArrow(tx, ty - 3, { style: delay(0) })}
<text x="${tx + 10}" y="${ty - 26}" class="hand ink fade" font-size="16" style="${delay(2.2)}">today</text>
${stamp(96, 220, `${n(total)} CONTRIBUTIONS`, C.teal, { size: 12, turn: -2, cls: 'fade', style: delay(2) })}
${stamp(326, 222, `BUSIEST DAY: ${n(busiest.count)}`, C.red, { size: 12, turn: 1.5, cls: 'fade', style: delay(2.2) })}
${stamp(512, 219, `LONGEST STREAK: ${longest} DAYS`, C.tealDark, { size: 12, turn: -1.5, cls: 'fade', style: delay(2.4) })}
<text x="716" y="90" class="lex lead" font-size="11.5">Less</text>
${shades.map((shade, at) => `<rect x="${748 + at * 15}" y="80" width="${cell}" height="${cell}" rx="2.5" fill="${shade}"${at ? '' : ` stroke="${C.paperEdge}" stroke-width="0.8"`}/>`).join('')}
<text x="${748 + 5 * 15 + 2}" y="90" class="lex lead" font-size="11.5">More</text>`;
  return svg({ w: W, h: H, title: 'My last 12 months on GitHub', desc: `${n(total)} contributions from ${dayWords(days[0].date)} to ${dayWords(today.date)}, on ${active} days. The busiest day was ${dayWords(busiest.date)}, with ${n(busiest.count)}. The longest streak of days in a row with contributions was ${longest} days.`, body });
}

// ---------- write ----------

const only = process.argv.includes('--activity');
const write = (name, text) => { writeFileSync(join(ASSETS, name), text); console.log(`${name}: ${(text.length / 1024).toFixed(0)} KB`); };
if (!only) {
  write('hero.svg', hero());
  write('paper.svg', paper());
  write('board.svg', board());
  write('tracks.svg', tracks());
  write('code.svg', code());
  write('stack.svg', stack());
  TAGS.forEach(([name, words, color]) => write(`tag-${name}.svg`, tag(words, color)));
}
try {
  write('activity.svg', activity(await readCalendar()));
} catch (error) {
  console.log(`activity.svg kept as it was: ${error.message}`);
}
