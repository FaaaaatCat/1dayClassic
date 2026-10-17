/**
 * 1dayClassic 화면을 피그마에 그리는 플러그인.
 *
 * 앱을 찍어 붙이는 것이 아니라, 화면 코드(app/, components/)의 치수와 색을 그대로 옮겨
 * 오토레이아웃 레이어로 다시 그린다. 화면에 찍히는 글은 맨 위의 DATA에서 온다 —
 * build.mjs가 data/*.json에서 뽑아 넣은 값이라 여기서 지어내는 것은 없다.
 *
 * 화면 상태는 하나로 가정했다: 클래식을 읽는 중이고, 1화를 끝냈고(퀴즈 3문제 중 2문제 정답),
 * 그 화의 둘째 장에 책갈피 하나, 서재에는 클래식과 천자문이 담겨 있다.
 */

const W = 360;
const H = 780;
/** 상태바와 아래 제스처 바의 높이 — 기기마다 다르다. 온보딩 화면을 내보낼 때 쓴 값과 같다. */
const TOP = 32;
const BOTTOM = 16;
/** StyleSheet.hairlineWidth 자리. */
const HAIR = 0.5;

// ── 색 ─────────────────────────────────────────────────────────────────────
/** constants/theme의 토큰 ↔ 파일에 있는 페인트 스타일. 스타일이 없으면 값으로 칠한다. */
const TOKEN = {
  ink: ['Neutrals/Ink', '#000000'],
  graphite: ['Neutrals/Graphite', '#44403B'],
  smoke: ['Neutrals/Smoke', '#777169'],
  ash: ['Neutrals/Ash', '#A59F97'],
  stone: ['Neutrals/Stone', '#EBE8E4'],
  taupe: ['Neutrals/Warm Taupe', '#F5F3F1'],
  eggshell: ['Neutrals/Eggshell', '#FDFCFC'],
  ember: ['Brand/Ember Orange', '#FF4704'],
};
const RIGHT = '#2E7D4F';
const RIGHT_BG = '#EDF6F0';
const WRONG = '#EB5757';
const WRONG_BG = '#FEF3F4';
/** 읽기 화면(카드 덱)은 아직 예전 팔레트(Colors)를 쓴다. */
const BROWN100 = '#030303';
const BROWN50 = '#827F7A';
const BROWN10 = '#E0DBD5';
const PAPER = '#FAF6EE';
const WHITE = '#FFFFFF';

const STYLE = {};
const jobs = [];
let F = {};
const fallbacks = [];

/**
 * 다크 화면(알림·목차·마이페이지 계열) — 앱에서 라이트 토큰을 한 벌로 바꿔 끼운 그대로다.
 * DARK가 켜진 동안 그리는 것은 이 표를 따라 색이 바뀐다. 판(프레임·도형)과 잉크(글·아이콘)는
 * 표가 다르다 — 주황 버튼 위의 흰 글처럼 원래 어두운 곳 위에 있던 흰 글은 그대로 흰색이어야 한다.
 * 이름 앞에 '!'를 붙인 토큰은 바꾸지 않는다(종이 견본처럼 색 자체를 보여 주는 자리).
 */
let DARK = false;
const DARK_FILL = { eggshell: 'ink', taupe: '#272323', stone: 'graphite', ink: 'eggshell', graphite: 'stone', smoke: 'ash', ash: 'smoke' };
const DARK_INK = { ink: 'eggshell', graphite: 'stone', smoke: 'ash', ash: 'smoke' };
function tone(tok, ink) {
  if (typeof tok !== 'string') return tok;
  if (tok[0] === '!') return tok.slice(1);
  if (!DARK) return tok;
  return (ink ? DARK_INK : DARK_FILL)[tok] || tok;
}
/** 다크로 그리는 화면 — 그리는 동안만 DARK를 켠다. */
const dark = (build) => () => {
  DARK = true;
  try {
    return build();
  } finally {
    DARK = false;
  }
};

const hexOf = (tok) => {
  const key = typeof tok === 'string' && tok[0] === '!' ? tok.slice(1) : tok;
  return TOKEN[key] ? TOKEN[key][1] : key;
};
const rgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
});
const solid = (tok, opacity) =>
  opacity === undefined ? { type: 'SOLID', color: rgb(hexOf(tok)) } : { type: 'SOLID', color: rgb(hexOf(tok)), opacity };

function fill(node, tok, opacity) {
  tok = tone(tok, node.type === 'TEXT');
  if (tok == null) node.fills = [];
  else if (STYLE[tok] && opacity === undefined) jobs.push(node.setFillStyleIdAsync(STYLE[tok]));
  else node.fills = [solid(tok, opacity)];
  return node;
}

function stroke(node, tok, weight, opacity) {
  tok = tone(tok, false);
  if (STYLE[tok] && opacity === undefined) jobs.push(node.setStrokeStyleIdAsync(STYLE[tok]));
  else node.strokes = [solid(tok, opacity)];
  node.strokeWeight = weight;
  node.strokeAlign = 'INSIDE';
  return node;
}

/** 한쪽에만 긋는 선 — RN의 borderBottomWidth·borderTopWidth 자리. */
function edge(frame, tok, weight, side) {
  stroke(frame, tok, weight);
  frame.strokeTopWeight = side === 'top' ? weight : 0;
  frame.strokeBottomWeight = side === 'bottom' ? weight : 0;
  frame.strokeLeftWeight = side === 'left' ? weight : 0;
  frame.strokeRightWeight = 0;
  return frame;
}

// ── 서체 ───────────────────────────────────────────────────────────────────
/** 앱의 서체를 찾고, 이 PC에 없으면 Noto로 물러선다. */
async function loadFonts() {
  const available = await figma.listAvailableFontsAsync();
  const norm = (s) => s.toLowerCase().replace(/[\s-]/g, '');
  const find = (families, style) => {
    for (const family of families) {
      const hit = available.find((f) => f.fontName.family === family && norm(f.fontName.style) === norm(style));
      if (hit) return hit.fontName;
    }
    return null;
  };
  const sans = ['Pretendard', 'Pretendard Variable'];
  const serif = ['Eulyoo1945', '을유1945'];
  const want = {
    light: [sans, 'Light', { family: 'Noto Sans KR', style: 'Light' }],
    reg: [sans, 'Regular', { family: 'Noto Sans KR', style: 'Regular' }],
    med: [sans, 'Medium', { family: 'Noto Sans KR', style: 'Medium' }],
    serif: [serif, 'SemiBold', { family: 'Noto Serif KR', style: 'SemiBold' }],
    serifR: [serif, 'Regular', { family: 'Noto Serif KR', style: 'Regular' }],
    display: [['DM Serif Display'], 'Regular', { family: 'Noto Serif KR', style: 'Regular' }],
  };
  F = {};
  for (const key of Object.keys(want)) {
    const [families, style, fallback] = want[key];
    const found = find(families, style);
    if (!found) fallbacks.push(`${families[0]} ${style}`);
    F[key] = found || fallback;
  }
  await Promise.all(Object.keys(F).map((key) => figma.loadFontAsync(F[key])));
}

async function loadStyles() {
  const styles = await figma.getLocalPaintStylesAsync();
  for (const tok of Object.keys(TOKEN)) {
    const hit = styles.find((s) => s.name === TOKEN[tok][0]);
    if (hit) STYLE[tok] = hit.id;
  }
}

// ── 그리는 손 ──────────────────────────────────────────────────────────────
/**
 * 오토레이아웃 프레임 하나. RN의 View 한 겹에 해당한다.
 * w·h를 주면 그 축은 고정이고, 안 주면 내용만큼이다.
 */
function AL(dir, name, p = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  f.fills = [];
  f.clipsContent = !!p.clip;
  if (p.w != null || p.h != null) f.resize(p.w != null ? p.w : f.width, p.h != null ? p.h : f.height);
  const horizontal = dir === 'HORIZONTAL';
  f.primaryAxisSizingMode = (horizontal ? p.w != null : p.h != null) ? 'FIXED' : 'AUTO';
  f.counterAxisSizingMode = (horizontal ? p.h != null : p.w != null) ? 'FIXED' : 'AUTO';
  if (p.gap != null) f.itemSpacing = p.gap;
  const py = p.py != null ? p.py : p.p;
  const px = p.px != null ? p.px : p.p;
  const pad = { paddingTop: p.pt != null ? p.pt : py, paddingBottom: p.pb != null ? p.pb : py, paddingLeft: p.pl != null ? p.pl : px, paddingRight: p.pr != null ? p.pr : px };
  for (const key of Object.keys(pad)) if (pad[key] != null) f[key] = pad[key];
  if (p.main) f.primaryAxisAlignItems = p.main;
  if (p.cross) f.counterAxisAlignItems = p.cross;
  if (p.wrap) {
    f.layoutWrap = 'WRAP';
    if (p.gapY != null) f.counterAxisSpacing = p.gapY;
  }
  if (p.minH != null) f.minHeight = p.minH;
  if (p.minW != null) f.minWidth = p.minW;
  if (p.fill) fill(f, p.fill, p.fillOp);
  if (p.r != null) f.cornerRadius = p.r;
  if (p.stroke) stroke(f, p.stroke[0], p.stroke[1]);
  return f;
}

/** 붙이고 나서 늘린다 — FILL은 오토레이아웃 부모 안에 들어간 뒤에만 줄 수 있다. */
function add(parent, child, h, v) {
  parent.appendChild(child);
  if (h) {
    if (child.type === 'TEXT' && h === 'FILL') child.textAutoResize = 'HEIGHT';
    child.layoutSizingHorizontal = h;
  }
  if (v) child.layoutSizingVertical = v;
  return child;
}

/** 흐름에서 빼내 자리를 못 박는다 — RN의 position: 'absolute'. */
function abs(parent, child, x, y) {
  parent.appendChild(child);
  if (parent.layoutMode && parent.layoutMode !== 'NONE') child.layoutPositioning = 'ABSOLUTE';
  child.x = x;
  child.y = y;
  return child;
}

/** 글 한 덩이. lh를 비우면 서체의 기본 줄높이다(RN에서 lineHeight를 안 준 경우). */
function T(text, font, size, lh, tok, o = {}) {
  const t = figma.createText();
  t.fontName = F[font];
  t.characters = text;
  t.fontSize = size;
  if (lh) t.lineHeight = { unit: 'PIXELS', value: lh };
  if (o.ls) t.letterSpacing = { unit: 'PIXELS', value: o.ls };
  t.textAlignHorizontal = o.align || 'LEFT';
  fill(t, tok);
  if (o.op != null) t.opacity = o.op;
  t.name = o.name || text.replace(/\n/g, ' ').slice(0, 40);
  return t;
}

/** 폭을 못 박은 글 — 그 안에서 줄이 넘어간다. */
function fixedWidth(t, width) {
  t.textAutoResize = 'HEIGHT';
  t.resize(width, t.height);
  return t;
}

function rect(name, w, h, tok, opacity) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(Math.max(0.01, w), Math.max(0.01, h));
  fill(r, tok, opacity);
  return r;
}

/** Ionicons 한 개 — 글꼴에서 꺼낸 윤곽을 그대로 그린다. */
function icon(name, size, tok) {
  const glyph = DATA.icons[name];
  const node = figma.createNodeFromSvg(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${glyph.w} ${glyph.h}" xmlns="http://www.w3.org/2000/svg"><path d="${glyph.d}" fill="${hexOf(tone(tok, true))}"/></svg>`,
  );
  node.name = `icon/${name}`;
  return node;
}

/** 손으로 그린 꺾쇠 — components/Chevron과 같은 치수다. */
function chevron(size, tok, direction) {
  const s = size * 0.063;
  const h = size * 0.58;
  const w = h / 2;
  const far = direction === 'forward' ? s / 2 : w + s / 2;
  const near = direction === 'forward' ? w + s / 2 : s / 2;
  const node = figma.createNodeFromSvg(
    `<svg width="${w + s}" height="${h + s}" viewBox="0 0 ${w + s} ${h + s}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${far} ${s / 2}L${near} ${(h + s) / 2}L${far} ${h + s / 2}" stroke="${hexOf(tone(tok, true))}" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
  node.name = direction === 'forward' ? 'icon/chevron-forward' : 'icon/chevron-back';
  return node;
}

/** 가운데에 글 하나가 선 버튼. */
function button(name, label, p) {
  const b = AL('HORIZONTAL', name, { h: p.h, w: p.w, px: p.px, gap: p.gap, main: 'CENTER', cross: 'CENTER', fill: p.fill, r: p.r, stroke: p.stroke });
  if (p.icon) b.appendChild(p.icon);
  b.appendChild(T(label, p.font || 'med', p.size, p.lh, p.color, { ls: p.ls }));
  if (p.after) b.appendChild(p.after);
  return b;
}

/**
 * 켜고 끄는 스위치 — components/Toggle. 앱의 모든 토글이 이 하나다(안드로이드 Switch).
 * 켜면 주황, 끄면 graphite, 손잡이는 eggshell. 다크·라이트 어디서나 같은 색이라 '!'로 못 박는다.
 * 치수는 안드로이드 Switch의 것(트랙 36×14, 손잡이 20)이다.
 */
function toggle(on) {
  const t = figma.createFrame();
  t.name = on ? '토글/켜짐' : '토글/꺼짐';
  t.resize(36, 20);
  t.fills = [];
  t.clipsContent = false;
  const track = rect('트랙', 36, 14, on ? '!ember' : '!graphite');
  track.cornerRadius = 7;
  abs(t, track, 0, 3);
  const knob = figma.createEllipse();
  knob.name = '손잡이';
  knob.resize(20, 20);
  fill(knob, '!eggshell');
  knob.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: 'NORMAL' }];
  abs(t, knob, on ? 16 : 0, 0);
  return t;
}

/** 칩 — components/TagChip. size는 'compact'(서점 카드)·'detail'(책 정보). */
const chipMasters = {};
function tagChip(label, size) {
  const key = size;
  if (!chipMasters[key]) {
    const c = figma.createComponent();
    c.name = `태그 칩/${size === 'compact' ? '작게' : '책 정보'}`;
    c.layoutMode = 'HORIZONTAL';
    c.resize(40, size === 'compact' ? 22 : 24);
    c.primaryAxisSizingMode = 'AUTO';
    c.counterAxisSizingMode = 'FIXED';
    c.primaryAxisAlignItems = 'CENTER';
    c.counterAxisAlignItems = 'CENTER';
    c.paddingLeft = 8;
    c.paddingRight = 8;
    c.cornerRadius = 9999;
    fill(c, 'taupe');
    stroke(c, 'stone', HAIR);
    const fontSize = size === 'compact' ? 11 : 12;
    c.appendChild(T('칩', 'reg', fontSize, null, 'smoke', { ls: fontSize / 100, name: 'label' }));
    chipMasters[key] = c;
  }
  const instance = chipMasters[key].createInstance();
  instance.findOne((n) => n.type === 'TEXT').characters = label;
  instance.name = label;
  return instance;
}

// ── 표지 — components/book/BookCover를 그대로 옮긴 것 ──────────────────────
const COVER_RATIO = 1.45;
const FULL_WIDTH = /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹏＀-｠]/;

function emWidth(text) {
  let width = 0;
  for (const ch of text) width += FULL_WIDTH.test(ch) ? 1 : 0.5;
  return width;
}

/** 앱의 wrapTitle 그대로다(공백 판별의 /s/까지) — 고치면 앱과 제목 크기가 달라진다. */
function wrapTitle(text, capacity) {
  const chars = [...text];
  let lines = 1;
  let used = 0;
  let clean = true;
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const w = FULL_WIDTH.test(ch) ? 1 : 0.5;
    if (used + w > capacity && used > 0) {
      const atSpace = /s/.test(ch) || (i > 0 && /s/.test(chars[i - 1]));
      if (!atSpace) clean = false;
      lines += 1;
      used = 0;
      if (/s/.test(ch)) continue;
    }
    used += w;
  }
  return { lines, clean };
}

function subtitleMetrics(titleSize, width) {
  const size = Math.max(width * 0.05, titleSize * 0.3);
  return { size, lineHeight: size * 1.5, gap: width * 0.04 };
}

function fitTitleBlock(sheet, maxH, withSub) {
  const { design, usableW, width } = sheet;
  const withSubtitle = withSub !== false && Boolean(design.subtitle);
  const floor = usableW / 12;
  let fallback = null;
  for (let size = usableW / 2; size > floor; size -= 0.5) {
    const wrapped = wrapTitle(design.title, (usableW * 0.96) / (size * 1.02));
    let block = wrapped.lines * size * 1.15;
    if (withSubtitle) {
      const sub = subtitleMetrics(size, width);
      const subLines = Math.min(2, wrapTitle(design.subtitle || '', (usableW * 0.96) / (sub.size * 1.1)).lines);
      block += sub.gap + subLines * sub.lineHeight;
    }
    if (block > maxH) continue;
    if (wrapped.clean) return { size, height: block };
    if (!fallback) fallback = { size, height: block };
  }
  return fallback || { size: floor, height: maxH };
}

/** 출판사 마크 — components/book/CoverMark. */
function coverMark(kind, size, tok) {
  const box = figma.createFrame();
  box.name = `마크/${kind}`;
  box.resize(size, size);
  box.fills = [];
  box.clipsContent = false;
  const rule = Math.max(1, size * 0.09);
  if (kind === 'underline') {
    const top = (size - (rule * 2 + size * 0.26)) / 2;
    abs(box, rect('줄', size, rule, tok), 0, top);
    abs(box, rect('줄', size, rule, tok), 0, top + rule + size * 0.26);
  } else if (kind === 'lowline') {
    const dot = figma.createEllipse();
    dot.name = '점';
    dot.resize(size * 0.24, size * 0.24);
    fill(dot, tok);
    abs(box, dot, (size - size * 0.24) / 2, size - rule - size * 0.14 - size * 0.24);
    abs(box, rect('바닥선', size, rule, tok), 0, size - rule);
  } else if (kind === 'quadrant') {
    const border = Math.max(1, size * 0.07);
    stroke(box, tok, border);
    abs(box, rect('첫 칸', (size - border * 2) / 2, (size - border * 2) / 2, tok), border, border);
  } else {
    const moon = rect('반달', size, size / 2, tok);
    moon.topLeftRadius = size / 2;
    moon.topRightRadius = size / 2;
    abs(box, moon, 0, size / 2);
  }
  return box;
}

function coverTitle(parent, sheet, fit, color, centered) {
  const { design, width } = sheet;
  const align = centered ? 'CENTER' : 'LEFT';
  add(parent, T(design.title, 'serif', fit.size, fit.size * 1.15, color, { ls: fit.size * 0.02, align }), 'FILL');
  if (design.subtitle) {
    const sub = subtitleMetrics(fit.size, width);
    parent.itemSpacing = sub.gap;
    add(parent, T(design.subtitle, 'med', sub.size, sub.lineHeight, color, { ls: sub.size * 0.1, op: 0.8, align }), 'FILL');
  }
}

function coverZone(cv, name, x, y, w, h, main, centered) {
  const zone = AL('VERTICAL', name, { w, h: h == null ? undefined : h, main, cross: centered ? 'CENTER' : 'MIN' });
  return abs(cv, zone, x, y);
}

function coverImprint(sheet, color) {
  const { design, width } = sheet;
  const row = AL('HORIZONTAL', '출판사', { gap: width * 0.035, cross: 'CENTER' });
  row.appendChild(coverMark(design.mark, width * 0.075, color));
  row.appendChild(T(design.imprint, 'reg', width * 0.05, null, color, { op: 0.68 }));
  return row;
}

function coverFooter(cv, sheet, color, centered) {
  const { design, width, height, inset } = sheet;
  const footer = AL('VERTICAL', '지은이·출판사', { gap: width * 0.05, cross: centered ? 'CENTER' : 'MIN' });
  footer.appendChild(T(design.author, 'reg', width * 0.058, null, color, { op: 0.68 }));
  footer.appendChild(coverImprint(sheet, color));
  abs(cv, footer, centered ? (width - footer.width) / 2 : inset, height - inset - footer.height);
}

function coverPattern(cv, sheet, top, boxH) {
  const { design, width, inset, usableW } = sheet;
  if (boxH <= 0) return;
  if (design.patternKind === 'staff') {
    const rule = Math.max(1, width * 0.004);
    const step = width * 0.022;
    const staffH = step * 4 + rule;
    const staffGap = width * 0.055;
    const count = Math.max(1, Math.floor((boxH + staffGap) / (staffH + staffGap)));
    const head = step * 1.15;
    const staff = figma.createFrame();
    staff.name = '오선';
    staff.fills = [];
    staff.clipsContent = true;
    staff.resize(usableW, boxH);
    abs(cv, staff, inset, top);
    for (let s = 0; s < count; s += 1) {
      const y0 = s * (staffH + staffGap);
      for (let line = 0; line < 5; line += 1) abs(staff, rect('줄', usableW, rule, design.ink, 0.22), 0, y0 + line * step);
      for (let note = 0; note < 4; note += 1) {
        const dot = figma.createEllipse();
        dot.name = '음표';
        dot.resize(head * 1.25, head);
        dot.fills = [solid(design.ink, 0.3)];
        abs(staff, dot, usableW * (0.1 + ((s * 3 + note * 2) % 7) * 0.12), y0 + ((s + note * 3) % 8) * (step / 2) - head / 2 + rule / 2);
      }
    }
    return;
  }
  if (!design.pattern || design.pattern.length === 0) return;
  const size = width * 0.062;
  const columnGap = width * 0.05;
  const rowGap = width * 0.042;
  const averageEm = design.pattern.reduce((sum, text) => sum + emWidth(text), 0) / design.pattern.length;
  const perRow = Math.floor((usableW + columnGap) / Math.max(1, averageEm * size + columnGap));
  const rows = Math.floor((boxH + rowGap) / (size * 1.2 + rowGap));
  const want = Math.max(1, perRow * rows + perRow);
  const box = AL('HORIZONTAL', '패턴', { w: usableW, h: boxH, gap: columnGap, wrap: true, gapY: rowGap, clip: true });
  abs(cv, box, inset, top);
  for (let i = 0; i < want; i += 1) {
    box.appendChild(T(design.pattern[i % design.pattern.length], 'serifR', size, size * 1.2, design.ink, { op: 0.22 }));
  }
}

const COVER_LAYOUT = {
  band(cv, sheet) {
    const { design, width, height, inset, usableW, bodyBottom } = sheet;
    const gap = height * 0.035;
    const fit = fitTitleBlock(sheet, height * 0.42);
    const top = design.align !== 'top';
    const bottom = design.align !== 'bottom';
    const count = (top ? 1 : 0) + (bottom ? 1 : 0);
    const zoneBottom = bodyBottom - gap;
    const bandH = (zoneBottom - inset - fit.height - gap * count) / Math.max(1, count);
    const banded = bandH >= width * 0.062 * 1.2;
    if (banded && top) coverPattern(cv, sheet, inset, bandH);
    if (banded && bottom) coverPattern(cv, sheet, zoneBottom - bandH, bandH);
    const centered = design.align === 'center';
    const main = design.align === 'top' ? 'MIN' : design.align === 'bottom' ? 'MAX' : 'CENTER';
    coverTitle(coverZone(cv, '제목', inset, inset, usableW, zoneBottom - inset, main, centered), sheet, fit, design.ink, centered);
    coverFooter(cv, sheet, design.ink, centered);
  },
  plaque(cv, sheet) {
    const { design, width, height, inset } = sheet;
    const side = inset * 1.6;
    const pad = width * 0.06;
    const border = Math.max(1, width * 0.004);
    const plaqueW = width - side * 2 - pad * 2 - border * 2;
    const fit = fitTitleBlock(Object.assign({}, sheet, { usableW: plaqueW }), height * 0.26);
    coverPattern(cv, sheet, inset, height - inset * 2);
    const plaque = AL('VERTICAL', '라벨', { w: width - side * 2, p: pad, gap: width * 0.045, cross: 'CENTER' });
    plaque.fills = [solid(design.paper)];
    stroke(plaque, design.ink, border);
    abs(cv, plaque, side, height * 0.24);
    const titles = AL('VERTICAL', '제목', { cross: 'CENTER' });
    add(plaque, titles, 'FILL');
    coverTitle(titles, sheet, fit, design.ink, true);
    add(plaque, rect('괘선', plaqueW, Math.max(1, width * 0.003), design.ink, 0.5), 'FILL');
    plaque.appendChild(T(design.author, 'reg', width * 0.052, null, design.ink, { op: 0.68 }));
    const imprint = coverImprint(sheet, design.ink);
    abs(cv, imprint, inset, height - inset - imprint.height);
  },
  rule(cv, sheet) {
    const { design, width, height, inset, usableW, bodyBottom } = sheet;
    const heavy = Math.max(1.5, width * 0.018);
    const hair = Math.max(1, width * 0.005);
    const gap = height * 0.045;
    const fit = fitTitleBlock(sheet, height * 0.3);
    const topY = height * 0.2;
    const titleY = topY + heavy + gap;
    const hairY = titleY + fit.height + gap;
    const patternY = hairY + hair + height * 0.03;
    abs(cv, rect('굵은 괘선', usableW, heavy, design.ink), inset, topY);
    coverTitle(coverZone(cv, '제목', inset, titleY, usableW, null, 'MIN', false), sheet, fit, design.ink, false);
    abs(cv, rect('가는 괘선', usableW, hair, design.ink, 0.55), inset, hairY);
    coverPattern(cv, sheet, patternY, bodyBottom - patternY - gap);
    coverFooter(cv, sheet, design.ink, false);
  },
  vertical(cv, sheet) {
    const { design, width, inset, bodyBottom } = sheet;
    const room = bodyBottom - inset;
    const letters = [...design.title.replace(/\s+/g, '')];
    const size = Math.min(width * 0.2, room / (letters.length * 1.14));
    const subSize = size * 0.34;
    const column = (text, font, fontSize, leading, opacity, right, name) => {
      const t = T(text, font, fontSize, leading, design.ink, { op: opacity, align: 'CENTER', name });
      abs(cv, t, width - right - fontSize - (t.width - fontSize) / 2, inset);
    };
    const patternSize = width * 0.048;
    const pattern = [...(design.pattern || []).join('').replace(/\s+/g, '')].slice(0, Math.max(0, Math.floor(room / (patternSize * 1.18))));
    if (pattern.length > 0) {
      const t = T(pattern.join('\n'), 'serifR', patternSize, patternSize * 1.18, design.ink, { op: 0.22, align: 'CENTER', name: '패턴 기둥' });
      abs(cv, t, inset - (t.width - patternSize) / 2, inset);
    }
    if (design.subtitle) {
      const sub = [...design.subtitle.replace(/\s+/g, '')].slice(0, Math.floor(room / (subSize * 1.2)));
      column(sub.join('\n'), 'serifR', subSize, subSize * 1.2, 0.66, inset + size * 1.5, '부제');
    }
    column(letters.join('\n'), 'serif', size, size * 1.14, 1, inset, design.title);
    coverFooter(cv, sheet, design.ink, false);
  },
  block(cv, sheet) {
    const { design, width, height, inset, usableW, bodyBottom } = sheet;
    const blockH = height * 0.46;
    const fit = fitTitleBlock(sheet, blockH - inset * 2);
    const gap = height * 0.035;
    abs(cv, rect('색면', width, blockH, design.ink), 0, 0);
    coverTitle(coverZone(cv, '제목', inset, inset, usableW, blockH - inset * 2, 'MAX', false), sheet, fit, design.paper, false);
    coverPattern(cv, sheet, blockH + gap, bodyBottom - blockH - gap * 2);
    coverFooter(cv, sheet, design.ink, false);
  },
  margin(cv, sheet) {
    const { design, width, height, inset, usableW, bodyBottom } = sheet;
    const frame = inset * 0.55;
    const fit = fitTitleBlock(sheet, height * 0.22);
    const line = figma.createRectangle();
    line.name = '테두리';
    line.resize(width - frame * 2, height - frame * 2);
    line.fills = [];
    stroke(line, design.ink, Math.max(1, width * 0.003));
    line.opacity = 0.45;
    abs(cv, line, frame, frame);
    coverPattern(cv, sheet, inset * 1.5, width * 0.062 * 1.35);
    coverTitle(coverZone(cv, '제목', inset, bodyBottom - height * 0.24, usableW, height * 0.22, 'MAX', false), sheet, fit, design.ink, false);
    coverFooter(cv, sheet, design.ink, false);
  },
};

/** 표지 한 장. 폭만 받고 높이는 비율이 정한다. */
function cover(design, width, radius) {
  const height = width * COVER_RATIO;
  const inset = width * 0.09;
  const sheet = { design, width, height, inset, usableW: width - inset * 2, bodyBottom: height - height * 0.2 };
  const cv = figma.createFrame();
  cv.name = `표지/${design.title}`;
  cv.resize(width, height);
  cv.cornerRadius = radius == null ? 2 : radius;
  cv.clipsContent = true;
  cv.fills = [solid(design.paper)];
  if (design.dark) stroke(cv, WHITE, 1, 0.16);

  if (width < 80) {
    // 좁은 자리 — 종이색과 제목만 남긴다.
    const fit = fitTitleBlock(sheet, height * 0.5, false);
    const size = Math.min(fit.size, sheet.usableW * 0.5);
    const centered = design.align === 'center';
    const main = design.align === 'top' ? 'MIN' : design.align === 'bottom' ? 'MAX' : 'CENTER';
    const zone = coverZone(cv, '제목', inset, inset, sheet.usableW, height - inset * 2, main, centered);
    add(zone, T(design.title, 'serif', size, size * 1.28, design.ink, { align: centered ? 'CENTER' : 'LEFT' }), 'FILL');
    return cv;
  }
  (COVER_LAYOUT[design.layout] || COVER_LAYOUT.band)(cv, sheet);
  return cv;
}

/**
 * 세워 둔 책 — 책등과 앞표지.
 *
 * 앱은 앞표지를 26° 돌려 원근을 넣는데(BookCover3D) 피그마에는 원근이 없다. 책등을 같은
 * 폭으로 세우고 앞표지는 돌리지 않은 채 붙인다.
 */
function standingCover(design, width) {
  const radians = (26 * Math.PI) / 180;
  const half = width / 2;
  const thickness = width * 0.22;
  const scaleAt = (z) => 850 / (850 - z);
  const zFold = Math.sin(radians) * half;
  const zBack = zFold - Math.cos(radians) * thickness;
  const foldX = scaleAt(zFold) * -(Math.cos(radians) * half);
  const backX = scaleAt(zBack) * -(Math.cos(radians) * half + Math.sin(radians) * thickness);
  const spineW = foldX - backX;
  const height = width * COVER_RATIO;

  const stage = figma.createFrame();
  stage.name = `세워 둔 책/${design.title}`;
  stage.fills = [];
  stage.clipsContent = false;
  stage.resize(spineW + width, height);

  const spine = figma.createFrame();
  spine.name = '책등';
  spine.resize(spineW, height);
  spine.fills = [solid(design.paper), solid('#000000', 0.2)];
  if (design.dark) stroke(spine, WHITE, 1, 0.16);
  abs(stage, spine, 0, 0);
  if (spineW >= 8) {
    const size = spineW * 0.72;
    const padding = width * 0.05;
    const marks = spineW * 0.6;
    const room = height - padding * 2 - marks - width * 0.04;
    const letters = [...design.title.replace(/\s+/g, '')].slice(0, Math.max(0, Math.floor(room / (size * 1.16))));
    const t = T(letters.join('\n'), 'serifR', size, size * 1.16, design.ink, { align: 'CENTER', name: '책등 제목' });
    abs(spine, t, (spineW - t.width) / 2, padding);
    abs(spine, coverMark(design.mark, marks, design.ink), (spineW - marks) / 2, height - padding - marks);
  }
  abs(stage, cover(design, width), spineW, 0);
  return stage;
}

// ── 화면 껍데기 ────────────────────────────────────────────────────────────
function screen(name, tok) {
  return AL('VERTICAL', name, { w: W, h: H, clip: true, fill: tok });
}

/** 공용 헤더 — components/ScreenHeader. 상태바 높이도 여기서 댄다. */
function header(s, title, o = {}) {
  const tone = o.tone || 'light';
  const ink = tone === 'dark' ? 'eggshell' : 'ink';
  const h = AL('HORIZONTAL', '헤더', { w: W, h: 60 + TOP, pt: TOP, px: 12, main: 'SPACE_BETWEEN', cross: 'CENTER', fill: { light: 'eggshell', paper: 'taupe', dark: '!ink' }[tone] });
  add(s, h, 'FILL', 'FIXED');
  const left = AL('HORIZONTAL', '뒤로', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  left.appendChild(chevron(24, ink, 'back'));
  h.appendChild(left);
  const right = AL('HORIZONTAL', '기능', { h: 40, main: 'MAX', cross: 'CENTER', minW: 40 });
  if (o.action) right.appendChild(o.action(ink));
  h.appendChild(right);
  // 제목은 흐름에서 빼내 화면 정가운데에 둔다 — 좌우 것의 폭이 달라도 흔들리지 않는다.
  const t = T(title, 'med', 18, 25, ink, { align: 'CENTER' });
  abs(h, t, 56, TOP + (60 - 25) / 2);
  fixedWidth(t, W - 112);
  return h;
}

const headerIcon = (name) => (ink) => {
  const slot = AL('HORIZONTAL', name, { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  slot.appendChild(icon(name, 22, ink));
  return slot;
};
const headerText = (label) => (ink) => {
  const slot = AL('HORIZONTAL', label, { h: 40, px: 8, main: 'CENTER', cross: 'CENTER' });
  slot.appendChild(T(label, 'med', 15, 24, ink, { ls: 0.15 }));
  return slot;
};

/** 헤더 아래 스크롤되는 본문. 넘치는 것은 화면이 잘라 낸다. */
function scrollBody(s, p) {
  return add(s, AL('VERTICAL', '본문', Object.assign({ clip: true }, p)), 'FILL', 'FILL');
}

/** 마이페이지 계열의 껍데기 — components/mypage/MyPageShell. */
function myPage(name, title, action) {
  const s = screen(name, 'eggshell');
  header(s, title, { action });
  return { s, body: scrollBody(s, { pt: 8 }) };
}

/** 뒤를 가라앉히는 어둠. */
function dim(s, opacity) {
  return abs(s, rect('딤', W, H, '#000000', opacity), 0, 0);
}

/** 시각을 고르는 휠 셋 — components/WheelPicker 셋과 쌍점. */
function clock(p) {
  const row = AL('HORIZONTAL', '시각', Object.assign({ gap: 20, main: 'CENTER', cross: 'CENTER' }, p));
  const wheel = (name, width, items, font) => {
    const w = AL('VERTICAL', `휠/${name}`, { w: width, h: 192, clip: true });
    row.appendChild(w);
    items.forEach((item, i) => {
      const cell = AL('VERTICAL', i === 1 ? '칸(고른 것)' : '칸', { w: width, h: 64, main: 'CENTER', cross: 'CENTER' });
      w.appendChild(cell);
      if (item) cell.appendChild(T(item, font, 36, 43.2, i === 1 ? 'ink' : 'ash', { align: 'CENTER' }));
    });
  };
  wheel('오전·오후', 76, ['', '오전', '오후'], 'reg');
  wheel('시', 56, ['6', '7', '8'], 'light');
  row.appendChild(T(':', 'light', 36, 43.2, 'ink', { name: '쌍점' }));
  wheel('분', 56, ['', '00', '01'], 'light');
  return row;
}

/** 화면 한가운데 뜨는 목록 — SelectField의 대화상자와 리포트의 더보기가 같은 모양이다. */
function dialog(s, name) {
  dim(s, 0.5);
  const d = AL('VERTICAL', name, { w: W - 64, py: 8, fill: 'eggshell', r: 20 });
  abs(s, d, 32, 0);
  return d;
}
const centerDialog = (d) => {
  d.y = Math.round((H - d.height) / 2);
};

// ── 가정한 상태에서 나오는 값들 ────────────────────────────────────────────
const SEL = DATA.selected;
const READ_LESSONS = 1;
const READ_PAGES = Math.min(READ_LESSONS * DATA.perLesson, DATA.totalPages);
const PERCENT = Math.round((READ_PAGES / DATA.totalPages) * 100);
const QUIZZES = DATA.lesson.quizzes;
/** 틀린 것으로 가정한 문제(둘째)와 그때 고른 보기. */
const WRONG_INDEX = 1;
const WRONG_PICK = QUIZZES[WRONG_INDEX].answer === 1 ? 2 : 1;
/** 책 넘김 효과에서의 장 수와 첫 본문 장 — 앱의 장 나누기(lib/card-pages) 결과다(build.mjs). */
const DECK_PAGES = DATA.reader.turn.length;
const DESC_PAGE = DATA.reader.turn.findIndex((page) => page.kind === 'desc');

// ── 홈·알람·목차 ───────────────────────────────────────────────────────────
function buildHome() {
  const s = screen('홈', 'ink');
  add(s, AL('HORIZONTAL', '상태바', { w: W, h: TOP }), 'FILL', 'FIXED');
  const body = add(s, AL('VERTICAL', '본문', { gap: 12, p: 20, pb: BOTTOM + 20 }), 'FILL', 'FILL');

  const topRow = add(body, AL('HORIZONTAL', '위 줄', { main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  const store = AL('HORIZONTAL', '하루 서점', { w: 34, h: 34, main: 'CENTER', cross: 'CENTER', fill: 'graphite', r: 9999 });
  store.appendChild(icon('book', 18, 'eggshell'));
  topRow.appendChild(store);
  const right = AL('HORIZONTAL', '알람·마이페이지', { gap: 12, cross: 'CENTER' });
  topRow.appendChild(right);
  const alarm = AL('HORIZONTAL', '알람', { h: 34, px: 12, gap: 4, cross: 'CENTER', fill: 'graphite', r: 9999 });
  alarm.appendChild(icon('notifications-outline', 18, 'eggshell'));
  alarm.appendChild(T('오전 7:00', 'med', 11, 17, 'eggshell'));
  right.appendChild(alarm);
  const my = AL('HORIZONTAL', '마이페이지', { w: 28, h: 28, main: 'CENTER', cross: 'CENTER', fill: 'graphite', r: 9999 });
  my.appendChild(icon('person', 18, 'ash'));
  right.appendChild(my);

  const card = add(body, AL('VERTICAL', '지금 읽는 책', { gap: 20, p: 16, pb: 8, main: 'MAX', cross: 'CENTER' }), 'FILL', 'FILL');
  const slot = add(card, AL('VERTICAL', '표지 자리', { main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  slot.appendChild(standingCover(SEL.design, 160));
  const titles = add(card, AL('VERTICAL', '제목·지은이', { gap: 4, cross: 'CENTER' }), 'FILL');
  add(titles, T(SEL.title, 'serif', 26, 30, 'eggshell', { ls: -0.52, align: 'CENTER' }), 'FILL');
  titles.appendChild(T(SEL.author, 'med', 11, 17, 'eggshell', { align: 'CENTER' }));
  const progress = add(card, AL('VERTICAL', '진행 줄', { gap: 4 }), 'FILL');
  const bar = add(progress, AL('HORIZONTAL', '줄', { w: 100, h: 4, fill: 'graphite', r: 4, clip: true }), 'FILL', 'FIXED');
  bar.appendChild(rect('읽은 만큼', (W - 72) * (PERCENT / 100), 4, 'ember'));
  const barText = add(progress, AL('HORIZONTAL', '쪽수', { main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  barText.appendChild(T(`${READ_PAGES}p 읽음`, 'med', 11, 17, 'ember'));
  barText.appendChild(T(`총 ${DATA.totalPages}p`, 'reg', 11, 17, 'ash'));

  // 말풍선(42)과 그 아래 틈(8)만큼 위를 비워 둔다 — 말풍선은 흐름 밖에서 그 자리에 뜬다.
  const area = add(body, AL('VERTICAL', '문 셋', { pt: 50, cross: 'CENTER' }), 'FILL');
  const actions = AL('HORIZONTAL', '버튼', { gap: 31, main: 'CENTER', cross: 'CENTER' });
  area.appendChild(actions);
  const side = (name, label) => {
    const b = AL('VERTICAL', label, { w: 48, h: 48, gap: 4, main: 'CENTER', cross: 'CENTER' });
    b.appendChild(icon(name, 24, 'ash'));
    b.appendChild(T(label, 'med', 13, 20, 'ash', { ls: 0.13, align: 'CENTER' }));
    return b;
  };
  actions.appendChild(side('list', '목차'));
  const read = AL('HORIZONTAL', '읽기', { w: 72, h: 72, main: 'CENTER', cross: 'CENTER', fill: 'ember', r: 9999 });
  read.appendChild(icon('book', 32, 'eggshell'));
  actions.appendChild(read);
  actions.appendChild(side('stats-chart', '리포트'));

  const bubble = AL('VERTICAL', '말풍선', { cross: 'CENTER' });
  const pill = AL('HORIZONTAL', '알약', { px: 16, py: 8, fill: 'eggshell', r: 9999 });
  pill.appendChild(T(`이어 읽기 : 제${READ_LESSONS + 1}화`, 'med', 13, 20, 'ink', { ls: 0.13 }));
  bubble.appendChild(pill);
  const tail = figma.createNodeFromSvg(`<svg width="12" height="6" viewBox="0 0 12 6" xmlns="http://www.w3.org/2000/svg"><path d="M0 0H12L6 6Z" fill="${hexOf('eggshell')}"/></svg>`);
  tail.name = '꼬리';
  bubble.appendChild(tail);
  abs(area, bubble, (W - 40 - bubble.width) / 2, 0);
  return s;
}

function buildAlarm() {
  const s = screen('알람 설정', 'eggshell');
  header(s, '알림');
  add(s, clock({ px: 28, pb: 20 }), 'FILL', 'FILL');
  const wrap = add(s, AL('VERTICAL', '카드 자리', { p: 20 }), 'FILL');
  const card = add(wrap, AL('VERTICAL', '알람 카드', { fill: 'taupe', r: 20, stroke: ['stone', 1], clip: true }), 'FILL');
  const top = add(card, AL('VERTICAL', '켜고 끄기', { gap: 8, p: 20 }), 'FILL');
  edge(top, 'stone', 1, 'bottom');
  top.appendChild(T('알람', 'med', 13, 20, 'ink', { ls: 0.13 }));
  const row = add(top, AL('HORIZONTAL', '스위치 줄', { main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  row.appendChild(T('알림 사용 중', 'med', 13, 20, 'smoke', { ls: 0.13 }));
  row.appendChild(toggle(true, 'ember'));
  const bottom = add(card, AL('VERTICAL', '반복 요일', { gap: 16, p: 20 }), 'FILL');
  bottom.appendChild(T('매일', 'med', 13, 20, 'ink', { ls: 0.13 }));
  const days = add(bottom, AL('HORIZONTAL', '요일', { main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  for (const day of ['일', '월', '화', '수', '목', '금', '토']) {
    const d = AL('HORIZONTAL', day, { w: 32, h: 32, main: 'CENTER', cross: 'CENTER', fill: 'ink', r: 9999, stroke: ['ink', 1] });
    // 다크에서는 고른 요일이 흰 원이 되고 글자가 검어진다.
    d.appendChild(T(day, 'med', 16, 24, DARK ? '!ink' : 'eggshell'));
    days.appendChild(d);
  }
  const footer = add(s, AL('HORIZONTAL', '아래', { p: 8, pb: 8 + BOTTOM, fill: 'eggshell' }), 'FILL');
  add(footer, button('저장', '저장', { h: 48, fill: 'ember', r: 4, size: 16, lh: 24, color: 'eggshell' }), 'FILL');
  return s;
}

/**
 * 성적 현황 — components/toc/ScoreBoard. 목차 맨 위의 두 칸짜리 판(진행도·오답률).
 * 목차가 다크라 이 판은 다크에서만 그려지는 것으로 보고 색을 못 박아 둔다('!').
 */
function scoreBoard(body) {
  const slot = add(body, AL('VERTICAL', '성적 현황 자리', { px: 20, pt: 8 }), 'FILL');
  const board = add(slot, AL('VERTICAL', '성적 현황', { gap: 16, p: 20, r: 20, fill: '!#272323' }), 'FILL');
  board.appendChild(T('성적 현황', 'med', 16, null, '!eggshell', { ls: 0.16 }));
  const cells = add(board, AL('HORIZONTAL', '두 칸', { gap: 16 }), 'FILL');
  const right = QUIZZES.length - 1;
  const wrong = QUIZZES.length - right;
  const wrongRate = Math.round((wrong / QUIZZES.length) * 100);
  const cellW = (W - 40 - 40 - 16 * 2 - HAIR) / 2;
  const cell = (label, value, percent, barTok, note) => {
    const c = AL('VERTICAL', label, { w: cellW, gap: 8 });
    c.appendChild(T(label, 'reg', 13, 20, '!ash', { ls: 0.13 }));
    const v = T(`${value}%`, 'light', 32, 38, '!eggshell');
    const unitAt = String(value).length;
    v.setRangeFontName(unitAt, unitAt + 1, F.reg);
    v.setRangeFontSize(unitAt, unitAt + 1, 16);
    v.setRangeFills(unitAt, unitAt + 1, [solid('ash')]);
    c.appendChild(v);
    const track = add(c, AL('HORIZONTAL', '막대', { h: 4, r: 2, clip: true, fill: '!graphite' }), 'FILL', 'FIXED');
    track.appendChild(rect('채움', cellW * (percent / 100), 4, barTok));
    c.appendChild(T(note, 'reg', 11, 17, '!smoke'));
    return c;
  };
  cells.appendChild(cell('진행도', PERCENT, PERCENT, '!ember', `${READ_PAGES}p / ${DATA.totalPages}p`));
  add(cells, rect('가름', HAIR, 10, '!graphite'), null, 'FILL');
  cells.appendChild(cell('오답률', wrongRate, wrongRate, '!stone', `틀린 ${wrong}문제 / 푼 ${QUIZZES.length}문제`));
  return board;
}

function buildToc() {
  const s = screen('목차', 'eggshell');
  header(s, '목차');
  const body = scrollBody(s, {});
  scoreBoard(body);
  const sortRow = add(body, AL('HORIZONTAL', '정렬', { w: W, h: 40, px: 20, main: 'MAX', cross: 'CENTER' }), 'FILL', 'FIXED');
  const sort = AL('HORIZONTAL', '첫장부터', { gap: 4, py: 8, cross: 'CENTER' });
  sort.appendChild(icon('swap-vertical', 18, 'ink'));
  sort.appendChild(T('첫장부터', 'med', 11, 17, 'ink'));
  sortRow.appendChild(sort);

  const list = add(body, AL('VERTICAL', '목록', { gap: 8, px: 20 }), 'FILL');
  DATA.lessons.forEach((lesson, index) => {
    const free = index < DATA.freeCount;
    const read = index < READ_LESSONS;
    const row = add(list, AL('HORIZONTAL', `${index + 1}화${read ? ' (읽음)' : free ? '' : ' (잠김)'}`, { gap: 4, px: 20, py: 8, minH: 60, cross: 'CENTER', fill: read ? 'stone' : 'taupe', r: 10 }), 'FILL');
    const text = add(row, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
    const title = add(text, T(lesson.title, 'serif', 16, 24, 'ink'), 'FILL');
    title.textTruncation = 'ENDING';
    title.maxLines = 1;
    text.appendChild(T(lesson.subtitle, 'reg', 11, 17, 'ash'));
    if (free) {
      // 칩은 줄 간격(4)에 제 윗여백(4)을 더해 8만큼 떨어진다.
      const slot = AL('VERTICAL', '퀴즈', { pt: 4 });
      text.appendChild(slot);
      if (read) {
        const right = QUIZZES.length - 1;
        const chip = AL('HORIZONTAL', '성적', { h: 24, px: 8, main: 'CENTER', cross: 'CENTER', r: 9999, stroke: ['ash', 1] });
        chip.appendChild(T(`${right}/${QUIZZES.length} 정답`, 'med', 11, 17, 'smoke'));
        slot.appendChild(chip);
      } else {
        const chip = AL('HORIZONTAL', '퀴즈 풀기', { h: 24, px: 8, main: 'CENTER', cross: 'CENTER', fill: 'ember', r: 9999 });
        chip.appendChild(T('퀴즈 풀기', 'med', 11, 17, 'eggshell'));
        slot.appendChild(chip);
      }
    }
    row.appendChild(free ? chevron(18, 'ash', 'forward') : icon('lock-closed', 18, 'ash'));
  });
  return s;
}

// ── 읽기 화면(카드 덱) — components/lesson/CardDeckDetail ──────────────────
const CARD_W = W - 56;
const CARD_H = H - 260;
const PLAYER_H = 200;
/** 카드가 앉는 자리 — 세이프에어리어를 뺀 높이의 한가운데. */
const CARD_Y = TOP + (H - TOP - BOTTOM) / 2 - CARD_H / 2;
/** 유튜브가 딸린 항목은 카드가 재생기(200)와 틈(12)만큼 짧다. */
const SHORT_CARD_H = CARD_H - PLAYER_H - 12;

/** 다크 종이(책 보기 설정) — 종이는 brown90, 글자는 밝은 종이색. */
const DARK_PAPER = '#272323';

/**
 * 위 진행 바 — 몇 장 중 몇 번째인지만 말한다. 지나온 칸과 지금 칸을 채운다.
 * 자동 넘김을 없애면서 칸이 시간에 맞춰 차오르지 않게 됐다.
 */
function pageBars(s, total, page) {
  const bars = AL('HORIZONTAL', '진행 바', { w: W, h: 14, px: 12, gap: 4, cross: 'CENTER' });
  abs(s, bars, 0, TOP);
  for (let i = 0; i < total; i += 1) {
    add(bars, AL('HORIZONTAL', i === page ? '칸(지금)' : '칸', { w: 10, h: 3, fill: i <= page ? WHITE : BROWN50, r: 1.5 }), 'FILL', 'FIXED');
  }
  return bars;
}

/** 본문 글 — 책 보기 설정의 '중간'(build.mjs의 DATA.reader.body). 문단 여럿은 빈 줄로 이어져 있다. */
function bodyText(text, tok) {
  const b = DATA.reader.body;
  return T(text, 'serifR', b.fontSize, b.lineHeight, tok, { ls: b.letterSpacing });
}

/** 덱의 뼈대 — 위 진행 바, 계정 줄, 카드, 재생기, 아래 줄. page는 0부터. */
function deck(name, page, kind, dark) {
  const s = figma.createFrame();
  s.name = name;
  s.resize(W, H);
  s.clipsContent = true;
  s.fills = [solid(BROWN100)];

  pageBars(s, DECK_PAGES, page);

  const head = AL('HORIZONTAL', '계정 줄', { w: W, h: 48, gap: 10, pl: 16, pr: 8, cross: 'CENTER' });
  abs(s, head, 0, TOP + 14);
  const avatar = figma.createFrame();
  avatar.name = '표지';
  avatar.resize(34, 34);
  avatar.cornerRadius = 17;
  avatar.clipsContent = true;
  avatar.fills = [solid(BROWN50)];
  abs(avatar, cover(SEL.design, 34), 0, (34 - 34 * COVER_RATIO) / 2);
  head.appendChild(avatar);
  head.appendChild(T(SEL.store.title, 'serif', 14, null, WHITE, { ls: -0.28 }));
  add(head, AL('HORIZONTAL', '빈 자리', { h: 1 }), 'FILL');
  const close = AL('HORIZONTAL', '닫기', { w: 41, h: 41, main: 'CENTER', cross: 'CENTER' });
  close.appendChild(icon('close-outline', 24, WHITE));
  head.appendChild(close);

  const card = AL('VERTICAL', `카드/${kind}`, { w: CARD_W, h: SHORT_CARD_H, gap: 16, px: 28, py: 32, main: 'CENTER', cross: 'CENTER', r: 20, clip: true, fill: kind === 'cover' ? SEL.design.paper : dark ? DARK_PAPER : PAPER });
  abs(s, card, 28, CARD_Y);

  // 붙박이 재생기 — 유튜브 약관이 정한 가장 작은 크기(200)다. 여기서는 자리만 잡는다.
  const player = AL('VERTICAL', '유튜브 재생기 자리', { w: CARD_W, h: PLAYER_H, gap: 8, main: 'CENTER', cross: 'CENTER', fill: '#000000', r: 12 });
  player.appendChild(icon('logo-youtube', 40, WHITE));
  player.appendChild(T(`youtube.com/watch?v=${DATA.lesson.youtubeId}`, 'reg', 11, 17, 'ash'));
  abs(s, player, 28, CARD_Y + CARD_H - PLAYER_H);

  const footer = AL('HORIZONTAL', '아래 줄', { w: W - 40, h: 56, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  abs(s, footer, 20, H - BOTTOM - 8 - 56);
  footer.appendChild(T(`${page + 1} / ${DECK_PAGES}`, 'serifR', 13, null, BROWN50, { ls: -0.26 }));
  const icons = AL('HORIZONTAL', '버튼', { gap: 16, cross: 'CENTER' });
  footer.appendChild(icons);
  for (const [label, glyph] of [['자동으로 읽기', 'headset']]) {
    const hit = AL('HORIZONTAL', label, { w: 36, h: 36, main: 'CENTER', cross: 'CENTER' });
    hit.appendChild(icon(glyph, 24, WHITE));
    icons.appendChild(hit);
  }
  return { s, card };
}

function buildDeckCover() {
  const { s, card } = deck('읽기 — 표지 장', 0, 'cover');
  // 클래식의 종이색은 어둡다 — 그 위 글자와 마크는 순백이다.
  const symbol = add(card, AL('VERTICAL', '마크 자리', { h: 72, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FIXED');
  symbol.appendChild(coverMark(SEL.design.mark, 36, WHITE));
  const chip = AL('HORIZONTAL', '책 이름', { px: 8, py: 4, r: 4 });
  chip.fills = [solid(WHITE, 0.2)];
  chip.appendChild(T(SEL.store.title, 'serif', 13, null, WHITE, { ls: -0.26 }));
  card.appendChild(chip);
  add(card, T(DATA.lesson.title, 'serif', 24, 34, WHITE, { ls: -0.48, align: 'CENTER' }), 'FILL');
  add(card, T(DATA.lesson.subtitle, 'serifR', 16, 26, WHITE, { ls: -0.32, align: 'CENTER' }), 'FILL');
  return s;
}

function deckDesc(name, dark) {
  const { s, card } = deck(name, DESC_PAGE, 'desc', dark);
  add(card, bodyText(DATA.reader.turn[DESC_PAGE].paragraph, dark ? PAPER : BROWN100), 'FILL');
  // 책갈피 — 카드 오른쪽 아래. 꽂아 둔 장이라 속을 채운 붉은 것이다.
  const mark = AL('HORIZONTAL', '책갈피(꽂음)', { w: 32, h: 32, main: 'CENTER', cross: 'CENTER' });
  mark.appendChild(icon('bookmark', 18, WRONG));
  abs(s, mark, 28 + CARD_W - 24 - 32, CARD_Y + SHORT_CARD_H - 32 - 32);
  return s;
}

function buildDeckOutro() {
  const { s, card } = deck('읽기 — 맺음 장', DECK_PAGES - 1, 'outro');
  add(card, T('오늘의 이야기는\n여기까지입니다.', 'serifR', 14, 22, BROWN100, { ls: -0.28, align: 'CENTER' }), 'FILL');
  const buttons = AL('HORIZONTAL', '버튼', { gap: 8, cross: 'CENTER' });
  card.appendChild(buttons);
  buttons.appendChild(button('퀴즈 풀기', '퀴즈 풀기', { h: 36, px: 12, r: 10, stroke: ['ash', 1], font: 'reg', size: 13, lh: 20, ls: 0.13, color: 'smoke' }));
  buttons.appendChild(button('다음 화 읽기', '다음 화 읽기', { h: 36, px: 12, gap: 4, r: 10, fill: 'ember', size: 13, lh: 20, ls: 0.13, color: 'eggshell', after: chevron(16, 'eggshell', 'forward') }));
  return s;
}

function buildNoteSheet() {
  const s = deckDesc('읽기 + 감상 노트 창');
  abs(s, rect('딤', W, H, '#000000', 0.55), 0, 0);
  const sheetH = Math.round(H * 0.6);
  const sheet = AL('VERTICAL', '감상 노트 창', { w: W, h: sheetH, pb: BOTTOM, clip: true });
  sheet.fills = [solid('#000000'), solid('eggshell', 0.1)];
  sheet.topLeftRadius = 20;
  sheet.topRightRadius = 20;
  abs(s, sheet, 0, H - sheetH);
  const head = add(sheet, AL('HORIZONTAL', '위 줄', { w: W, h: 52, gap: 8, pl: 20, pr: 8, cross: 'CENTER' }), 'FILL', 'FIXED');
  edge(head, 'graphite', HAIR, 'bottom');
  head.appendChild(T('감상 노트', 'med', 16, 24, 'eggshell'));
  add(head, AL('HORIZONTAL', '빈 자리', { h: 1 }), 'FILL');
  const close = AL('HORIZONTAL', '닫기', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  close.appendChild(icon('close-outline', 24, 'eggshell'));
  head.appendChild(close);
  const empty = add(sheet, AL('VERTICAL', '빈 목록', { main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  empty.appendChild(T('작성한 노트가 없습니다', 'reg', 15, 24, 'ash', { ls: 0.15 }));
  const composer = add(sheet, AL('HORIZONTAL', '적는 자리', { gap: 8, px: 20, py: 12, cross: 'MAX' }), 'FILL');
  composer.fills = [solid('eggshell', 0.1)];
  edge(composer, 'graphite', HAIR, 'top');
  add(composer, T('노트 작성하기', 'reg', 15, 24, 'ash', { ls: 0.15 }), 'FILL');
  const send = AL('HORIZONTAL', '남기기(빈 채)', { w: 32, h: 32, main: 'CENTER', cross: 'CENTER', fill: 'graphite', r: 9999 });
  send.appendChild(icon('arrow-up', 18, 'ash'));
  composer.appendChild(send);
  return s;
}

/** 퀴즈 — components/preview/QuizSolver. pick이 null이면 아직 고르기 전이다. */
function buildQuiz(name, index, pick) {
  const quiz = QUIZZES[index];
  const s = screen(name, 'eggshell');
  s.paddingBottom = BOTTOM + 24;
  header(s, quiz.title);
  const body = scrollBody(s, { gap: 16, px: 24, py: 24 });
  body.appendChild(T(`${index + 1} / ${QUIZZES.length}`, 'med', 12, null, 'graphite', { ls: 0.12 }));
  add(body, T(quiz.question, 'med', 15, 24, 'ink', { ls: 0.15 }), 'FILL');
  const choices = add(body, AL('VERTICAL', '보기', { gap: 10 }), 'FILL');
  const answered = pick != null;
  const correct = pick === quiz.answer;
  quiz.choices.forEach((choice, i) => {
    const no = i + 1;
    const right = answered && no === quiz.answer;
    const wrong = answered && no === pick && !correct;
    const box = add(choices, AL('HORIZONTAL', `${no}${right ? ' (정답)' : wrong ? ' (고른 오답)' : ''}`, { gap: 8, px: 14, py: 12, r: 10, fill: right ? RIGHT_BG : wrong ? WRONG_BG : 'eggshell', stroke: [right ? RIGHT : wrong ? WRONG : 'stone', HAIR] }), 'FILL');
    box.appendChild(T(String(no), 'med', 13, 21, right ? RIGHT : wrong ? WRONG : 'graphite'));
    add(box, T(choice, 'reg', 13, 21, 'ink', { ls: 0.13 }), 'FILL');
  });
  if (answered) {
    const box = add(body, AL('VERTICAL', '해설', { gap: 8, p: 16, r: 10, fill: 'taupe', stroke: ['stone', HAIR] }), 'FILL');
    add(box, T(correct ? '정답입니다!' : `아쉬워요 정답은 ${quiz.answer}번 입니다.`, 'med', 14, 22, correct ? RIGHT : WRONG, { ls: 0.14 }), 'FILL');
    add(box, T(quiz.explanation, 'reg', 13, 22, 'smoke', { ls: 0.13 }), 'FILL');
  }
  const last = index === QUIZZES.length - 1;
  const wrap = add(s, AL('VERTICAL', '아래', { px: 24 }), 'FILL');
  add(wrap, button(last ? '오늘의 공부 마치기' : '다음', last ? '오늘의 공부 마치기' : '다음', { h: 52, r: 9999, fill: answered ? 'ink' : 'stone', size: 16, lh: 24, color: answered ? 'eggshell' : 'smoke' }), 'FILL');
  return s;
}

function buildStudyReport() {
  const s = screen('공부 리포트', 'ink');
  s.paddingLeft = 24;
  s.paddingRight = 24;
  s.paddingTop = TOP + 24;
  s.paddingBottom = BOTTOM + 24;
  const center = add(s, AL('VERTICAL', '가운데', { gap: 16, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  center.appendChild(T('Keep it up!', 'display', 30, null, 'eggshell'));
  const count = T('7일', 'med', 96, 112, 'eggshell', { name: '연속 일수' });
  count.setRangeFontSize(1, 2, 36);
  count.effects = [{ type: 'DROP_SHADOW', color: { r: 1, g: 1, b: 1, a: 0.45 }, offset: { x: 0, y: 0 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
  center.appendChild(count);
  const chip = AL('HORIZONTAL', '연속 공부', { px: 16, py: 8, fill: 'graphite', r: 9999 });
  let chipText;
  try {
    chipText = T('🔥 연속 공부', 'med', 14, null, 'eggshell', { ls: 0.14 });
  } catch (error) {
    chipText = T('연속 공부', 'med', 14, null, 'eggshell', { ls: 0.14 });
  }
  chip.appendChild(chipText);
  center.appendChild(chip);
  const meta = AL('VERTICAL', '날짜·책', { gap: 4, pt: 24, cross: 'CENTER' });
  center.appendChild(meta);
  meta.appendChild(T(DATA.today, 'reg', 14, null, 'smoke', { ls: 0.14 }));
  meta.appendChild(T(SEL.store.title, 'med', 16, null, 'stone', { ls: 0.16 }));
  add(s, button('다음 화 읽기', '다음 화 읽기', { h: 56, r: 9999, fill: 'eggshell', size: 16, ls: 0.16, color: 'ink' }), 'FILL');
  return s;
}

function buildPurchase() {
  const s = screen('구매 안내', 'ink');
  // 배경 — 그 책의 종이색을 위쪽 60%에 깔고, 어둠과 그라데이션으로 검정에 잇는다.
  const backdrop = rect('배경', W, H * 0.6, SEL.design.paper);
  backdrop.fills = [
    solid(SEL.design.paper),
    solid(BROWN100, 0.55),
    {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
        { position: 0.55, color: { r: 0, g: 0, b: 0, a: 0.85 } },
        { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    },
  ];
  abs(s, backdrop, 0, 0);
  const close = AL('HORIZONTAL', '닫기', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  close.appendChild(icon('close-outline', 24, 'eggshell'));
  abs(s, close, W - 12 - 40, TOP + 8);

  const body = add(s, AL('VERTICAL', '본문', { gap: 16, px: 24, pt: TOP + 56, pb: 24, cross: 'CENTER', clip: true }), 'FILL', 'FILL');
  const art = cover(SEL.design, 180);
  art.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 0, y: 8 }, radius: 16, spread: 0, visible: true, blendMode: 'NORMAL' }];
  body.appendChild(art);
  const badge = AL('HORIZONTAL', '잠긴 이유', { gap: 4, px: 12, py: 8, cross: 'CENTER', fill: 'graphite', r: 9999 });
  badge.appendChild(icon('lock-closed', 12, 'ember'));
  badge.appendChild(T(`무료로 열린 ${DATA.freeCount}편을 모두 읽으셨어요`, 'med', 11, 17, 'stone'));
  body.appendChild(badge);
  add(body, T('뒷 내용이 더 궁금하시다면\n이 책을 만나 보세요', 'serif', 22, 34, 'eggshell', { ls: -0.44, align: 'CENTER' }), 'FILL');
  const titles = add(body, AL('VERTICAL', '책', { gap: 4, cross: 'CENTER' }), 'FILL');
  add(titles, T(`『${SEL.title}』`, 'med', 16, 24, 'eggshell', { align: 'CENTER' }), 'FILL');
  add(titles, T(SEL.author, 'reg', 13, 20, 'ash', { ls: 0.13, align: 'CENTER' }), 'FILL');
  const meta = AL('HORIZONTAL', '분야·쪽수', { gap: 4, main: 'CENTER' });
  body.appendChild(meta);
  for (const label of SEL.fields.slice(0, 3).concat(SEL.pages ? [SEL.pages] : [])) {
    const chip = AL('HORIZONTAL', label, { px: 8, py: 4, fill: 'graphite', r: 4 });
    chip.appendChild(T(label, 'reg', 11, 17, 'stone'));
    meta.appendChild(chip);
  }
  add(body, T(`이 책에는 아직 잠긴 ${DATA.lockedCount}편이 남아 있어요`, 'reg', 13, 20, 'ash', { ls: 0.13, align: 'CENTER' }), 'FILL');

  const footer = add(s, AL('VERTICAL', '아래', { gap: 8, px: 24, pt: 12, pb: BOTTOM + 16 }), 'FILL');
  const price = SEL.price ? `${SEL.price.toLocaleString('ko-KR')}원 · 책 구매하기` : '책 보러 가기';
  add(footer, button('구매하기', price, { h: 60, r: 9999, fill: 'ember', size: 18, lh: 25, color: 'eggshell' }), 'FILL');
  const later = add(footer, AL('HORIZONTAL', '다음에 볼게요', { py: 12, main: 'CENTER' }), 'FILL');
  later.appendChild(T('다음에 볼게요', 'reg', 13, 20, 'ash', { ls: 0.13 }));
  return s;
}

// ── 하루 서점 ──────────────────────────────────────────────────────────────
const STORE = DATA.store;
/** 화면 좌우 여백 — 배너와 줄 제목이 같은 선에 선다(BookstoreHome의 GUTTER). */
const GUTTER = 20;
/** 분야 바로가기의 그림(BookstoreHome의 FIELD_ICONS). */
const FIELD_ICONS = {
  고전: 'library-outline',
  '한자·한문': 'brush-outline',
  '철학·사상': 'bulb-outline',
  '언어·번역': 'language-outline',
  '글쓰기·문장': 'create-outline',
  '음악·예술': 'musical-notes-outline',
  '심리·마음': 'heart-outline',
  '교양·역사': 'globe-outline',
  '읽기·책': 'book-outline',
};

/** 기획전 배너 한 장 — 바탕은 첫 책의 종이색, 글자는 그 잉크색. */
function storeBanner(exhibition, index, count) {
  const lead = exhibition.books[0];
  const paper = lead && lead.design ? lead.design.paper : 'stone';
  const ink = lead && lead.design ? lead.design.ink : 'ink';
  const page = AL('HORIZONTAL', '배너', { px: GUTTER });
  const banner = AL('VERTICAL', `배너/${exhibition.title}`, { w: W - GUTTER * 2, h: 216, p: 20, main: 'SPACE_BETWEEN', clip: true, fill: paper, r: 20 });
  page.appendChild(banner);
  const text = add(banner, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
  add(text, T('기획전', 'med', 11, 17, ink, { op: 0.7 }), 'FILL');
  add(text, T(exhibition.title, 'serif', 22, 26, ink, { ls: -0.44 }), 'FILL');
  add(text, T(exhibition.subtitle, 'reg', 13, 20, ink, { ls: 0.13, op: 0.8 }), 'FILL');
  const covers = add(banner, AL('HORIZONTAL', '표지', { gap: 8, main: 'MAX', cross: 'MAX' }), 'FILL');
  for (const book of exhibition.books) {
    const cv = cover(book.design, 52);
    // 바탕과 표지가 같은 색일 때(첫 책) 표지가 묻히지 않도록 가는 테를 두른다.
    stroke(cv, 'stone', HAIR);
    covers.appendChild(cv);
  }
  const pill = AL('HORIZONTAL', '배너 번호', { px: 8, py: 2, r: 9999, fill: 'ink' });
  pill.appendChild(T(`${index + 1} / ${count}`, 'med', 11, 17, 'eggshell'));
  abs(banner, pill, 20, 216 - 20 - 21);
  return page;
}

/** 분야 바로가기 한 칸. */
function storeField(label, iconName) {
  const f = AL('VERTICAL', `바로가기/${label}`, { w: (W - GUTTER * 2) / 5, gap: 8, cross: 'CENTER' });
  const circle = AL('HORIZONTAL', '그림', { w: 48, h: 48, r: 9999, main: 'CENTER', cross: 'CENTER', fill: 'taupe' });
  circle.appendChild(icon(iconName, 22, 'graphite'));
  f.appendChild(circle);
  f.appendChild(T(label, 'reg', 11, 17, 'graphite', { align: 'CENTER' }));
  return f;
}

/** 책 줄 — 제목 한 줄과 오른쪽 끝의 '더보기', 그 아래 가로로 늘어놓은 표지. */
function storeShelf(title, books) {
  const shelf = AL('VERTICAL', `책 줄/${title}`, { pt: 40, gap: 16 });
  const head = add(shelf, AL('HORIZONTAL', '제목 줄', { px: GUTTER, gap: 12, cross: 'CENTER' }), 'FILL');
  add(head, T(title, 'serif', 18, 25, 'ink'), 'FILL');
  head.appendChild(T('더보기', 'reg', 13, 20, 'ash', { ls: 0.13 }));
  const row = add(shelf, AL('HORIZONTAL', '책들', { w: W, px: GUTTER, gap: 16, clip: true }), 'FIXED');
  for (const book of books) {
    const b = AL('VERTICAL', book.title, { w: 100, gap: 4 });
    row.appendChild(b);
    b.appendChild(cover(book.design, 100));
    const titleBox = add(b, AL('VERTICAL', '제목', { pt: 8 }), 'FILL');
    add(titleBox, T(book.title, 'serif', 14, 20, 'ink', { ls: 0.14 }), 'FILL');
    add(b, T(book.author, 'reg', 11, 17, 'ash'), 'FILL');
  }
  return shelf;
}

/** 서점 첫 화면 — 스크롤 끝까지 펼쳐 그린다(높이는 내용만큼). */
function buildStoreHome() {
  const s = AL('VERTICAL', '하루 서점 — 첫 화면 (펼친 길이)', { w: W, fill: 'eggshell' });
  header(s, '하루 서점', { action: headerIcon('search-outline') });
  const body = add(s, AL('VERTICAL', '본문', { pt: 8, pb: 48 }), 'FILL');
  if (STORE.exhibitions.length > 0) add(body, storeBanner(STORE.exhibitions[0], 0, STORE.exhibitions.length), 'FILL');

  const fields = add(body, AL('HORIZONTAL', '분야 바로가기', { px: GUTTER, pt: 24, wrap: true, gapY: 16 }), 'FILL');
  fields.appendChild(storeField('전체', 'grid-outline'));
  fields.appendChild(storeField('읽기 가능', 'reader-outline'));
  for (const name of STORE.fields) fields.appendChild(storeField(name, FIELD_ICONS[name] || 'book-outline'));

  add(body, storeShelf('지금 바로 읽을 수 있는 책', STORE.readable), 'FILL');
  for (const exhibition of STORE.exhibitions) add(body, storeShelf(exhibition.title, exhibition.books), 'FILL');
  if (STORE.fresh.length > 0) add(body, storeShelf('새로 나온 책', STORE.fresh), 'FILL');

  const allWrap = add(body, AL('HORIZONTAL', '전체 보기', { px: GUTTER, pt: 48 }), 'FILL');
  const all = add(allWrap, AL('HORIZONTAL', `전체 도서 ${STORE.total}권 보기`, { h: 48, gap: 4, main: 'CENTER', cross: 'CENTER', r: 9999, stroke: ['stone', 1] }), 'FILL', 'FIXED');
  all.appendChild(T(`전체 도서 ${STORE.total}권 보기`, 'med', 15, null, 'graphite', { ls: 0.15 }));
  all.appendChild(chevron(18, 'graphite', 'forward'));
  return s;
}

/** 목록 페이지 — 헤더 밑에 1px 선, 격자 칸은 아주 옅은 머리카락 선. */
function buildStoreList(name, title, books) {
  const s = screen(name, 'eggshell');
  const h = header(s, title, { action: headerIcon('search-outline') });
  edge(h, 'ash', 1, 'bottom');
  const list = scrollBody(s, { pb: 40 });
  for (let i = 0; i < books.length; i += 2) {
    const row = add(list, AL('HORIZONTAL', '줄', {}), 'FILL');
    const cards = books.slice(i, i + 2).map((book) => {
      const card = AL('VERTICAL', `책 카드/${book.title}`, { w: W / 2, gap: 16, px: 20, py: 32, cross: 'CENTER', fill: 'eggshell', stroke: ['stone', HAIR] });
      row.appendChild(card);
      card.appendChild(cover(book.design, 108));
      add(card, T(book.title, 'serif', 16, 24, 'ink', { ls: 0.16, align: 'CENTER' }), 'FILL');
      // 칩은 제 윗여백을 8만큼 되당긴다(marginTop: -8) — 지은이와 한 묶음으로 두고 틈을 8로 준다.
      const tail = add(card, AL('VERTICAL', '지은이·칩', { gap: 8, cross: 'CENTER' }), 'FILL');
      add(tail, T(book.author, 'reg', 13, 20, 'ash', { ls: 0.13, align: 'CENTER' }), 'FILL');
      if (book.fields.length > 0) {
        const chips = add(tail, AL('HORIZONTAL', '칩', { w: 100, gap: 6, gapY: 6, wrap: true, main: 'CENTER' }), 'FILL');
        for (const label of book.fields) chips.appendChild(tagChip(label, 'compact'));
      }
      if (book.readable) {
        const tab = AL('HORIZONTAL', '읽기 가능', { px: 8, py: 4, fill: 'ink' });
        tab.appendChild(T('읽기 가능', 'med', 11, 13, 'eggshell', { ls: 0.11 }));
        abs(card, tab, W / 2 - tab.width, 0);
      }
      return card;
    });
    // 한 줄의 두 카드는 키가 같다 — 짧은 쪽이 긴 쪽까지 늘어난다.
    const tall = Math.max.apply(null, cards.map((c) => c.height));
    for (const card of cards) {
      card.primaryAxisSizingMode = 'FIXED';
      card.resize(W / 2, tall);
    }
  }
  return s;
}

/** 검색 페이지의 칩 한 개 — 최근 검색어는 지우기 표시가 붙는다. */
function searchChip(label, removable) {
  const c = AL('HORIZONTAL', label, { h: 32, pl: 12, pr: removable ? 8 : 12, gap: 4, r: 9999, cross: 'CENTER', fill: 'eggshell', stroke: ['stone', 1] });
  c.appendChild(T(label, 'reg', 13, null, 'smoke', { ls: 0.13 }));
  if (removable) c.appendChild(icon('close', 14, 'smoke'));
  return c;
}

function searchSection(body, title, action, labels, removable) {
  const sec = add(body, AL('VERTICAL', title, { gap: 12 }), 'FILL');
  const head = add(sec, AL('HORIZONTAL', '제목 줄', { main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  head.appendChild(T(title, 'med', 16, 24, 'ink'));
  if (action) head.appendChild(T(action, 'reg', 13, 20, 'smoke', { ls: 0.13 }));
  const chips = add(sec, AL('HORIZONTAL', '칩', { gap: 8, gapY: 8, wrap: true }), 'FILL');
  for (const label of labels) chips.appendChild(searchChip(label, removable));
}

/** 검색 페이지 — 맨 위 검색창, 그 아래 최근 검색어와 추천 검색어. */
function buildStoreSearch() {
  const s = screen('하루 서점 — 검색', 'eggshell');
  const bar = add(s, AL('HORIZONTAL', '검색 줄', { w: W, h: 60 + TOP, pt: TOP, pl: 12, pr: 20, gap: 4, cross: 'CENTER', fill: 'eggshell' }), 'FILL', 'FIXED');
  const back = AL('HORIZONTAL', '뒤로', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  back.appendChild(chevron(24, 'ink', 'back'));
  bar.appendChild(back);
  const box = add(bar, AL('HORIZONTAL', '검색창', { h: 40, px: 12, gap: 8, r: 9999, cross: 'CENTER', fill: 'taupe', stroke: ['stone', HAIR] }), 'FILL', 'FIXED');
  box.appendChild(icon('search-outline', 18, 'smoke'));
  add(box, T('제목, 작가, 출판사 검색', 'reg', 14, null, 'smoke', { ls: 0.14 }), 'FILL');

  const body = scrollBody(s, { px: GUTTER, pt: 16, pb: 40, gap: 32 });
  searchSection(body, '최근 검색어', '전체 삭제', STORE.recent, true);
  searchSection(body, '추천 검색어', null, STORE.recommended, false);
  return s;
}

function buildBookDetail() {
  const book = DATA.detail;
  const s = screen('책 정보', 'taupe');
  header(s, '책 정보', { tone: 'paper', action: headerText('미리보기') });
  const body = scrollBody(s, { pb: 40 });
  const hero = add(body, AL('VERTICAL', '표지·제목', { gap: 12, px: 20, pb: 20, cross: 'CENTER' }), 'FILL');
  const coverSlot = AL('VERTICAL', '표지', { pt: 4 });
  const art = cover(book.design, 140);
  art.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }];
  coverSlot.appendChild(art);
  hero.appendChild(coverSlot);
  const titleSlot = add(hero, AL('VERTICAL', '제목', { pt: 4 }), 'FILL');
  add(titleSlot, T(book.store.title, 'serif', 22, null, 'ink', { ls: -0.44, align: 'CENTER' }), 'FILL');
  add(hero, T(book.store.author, 'reg', 14, null, 'smoke', { ls: 0.14, align: 'CENTER' }), 'FILL');
  const chips = add(hero, AL('HORIZONTAL', '칩', { w: 100, gap: 8, gapY: 8, pt: 4, wrap: true, main: 'CENTER' }), 'FILL');
  for (const label of book.fields) chips.appendChild(tagChip(label, 'detail'));

  for (const section of book.sections) {
    const title = add(body, AL('HORIZONTAL', `절/${section.title}`, { px: 20, py: 14, fill: 'taupe' }), 'FILL');
    edge(title, BROWN10, 1, 'top');
    title.appendChild(T(section.title, 'med', 18, null, 'ink', { ls: 0.18 }));
    const text = add(body, AL('VERTICAL', '본문', { gap: 14, px: 20, pt: 14, pb: 32 }), 'FILL');
    for (const paragraph of section.paragraphs) add(text, T(paragraph, 'reg', 15, 26, 'ink', { ls: 0.15 }), 'FILL');
  }

  const footer = add(s, AL('VERTICAL', '아래', { p: 8, pb: 8 + BOTTOM }), 'FILL');
  add(footer, button('읽을 책에 추가하기', '읽을 책에 추가하기', { h: 48, px: 20, gap: 6, r: 4, fill: 'ember', size: 14, ls: 0.14, color: 'eggshell', icon: icon('add', 18, 'eggshell') }), 'FILL');
  return s;
}

// ── 마이페이지 ─────────────────────────────────────────────────────────────
/** 줄 하나 — components/mypage/MyPageRow. */
function myRow(parent, p) {
  const row = add(parent, AL('HORIZONTAL', p.label, { gap: 12, px: 20, minH: 56, cross: 'CENTER' }), 'FILL');
  if (!p.last) edge(row, 'stone', HAIR, 'bottom');
  if (p.icon) row.appendChild(icon(p.icon, 20, 'ink'));
  add(row, T(p.label, 'reg', 15, 24, 'ink', { ls: 0.15 }), 'FILL');
  if (p.value) row.appendChild(T(p.value, 'reg', 13, 20, 'ash', { ls: 0.13 }));
  row.appendChild(chevron(18, 'ash', 'forward'));
  return row;
}

function buildMyPage() {
  const { s, body } = myPage('마이페이지', '마이페이지');
  const group = add(body, AL('VERTICAL', '묶음', { pt: 8 }), 'FILL');
  myRow(group, { icon: 'layers-outline', label: '읽을 예정인 책', value: `${DATA.shelf.length}권`, last: true });
  const strip = add(group, AL('HORIZONTAL', '표지 띠', { gap: 8, px: 20, py: 8, cross: 'CENTER' }), 'FILL');
  const plus = AL('HORIZONTAL', '책 담기', { w: 52, h: 52, main: 'CENTER', cross: 'CENTER', r: 9999, stroke: ['stone', 1] });
  plus.appendChild(icon('add', 24, 'ash'));
  strip.appendChild(plus);
  for (const book of DATA.shelf) {
    // 바깥은 검은 실선 한 겹, 안쪽은 종이색 두 겹 — 표지가 어떤 색이든 원의 윤곽이 끊기지 않는다.
    const circle = figma.createFrame();
    circle.name = book.title;
    circle.resize(52, 52);
    circle.cornerRadius = 26;
    circle.fills = [];
    stroke(circle, 'ink', 1);
    const ring = figma.createFrame();
    ring.name = '원';
    ring.resize(50, 50);
    ring.cornerRadius = 25;
    ring.clipsContent = true;
    ring.fills = [];
    abs(ring, cover(book.design, 52), -1, (50 - 52 * COVER_RATIO) / 2);
    abs(circle, ring, 1, 1);
    const rim = figma.createEllipse();
    rim.name = '종이색 테';
    rim.resize(50, 50);
    rim.fills = [];
    stroke(rim, 'eggshell', 2);
    abs(circle, rim, 1, 1);
    strip.appendChild(circle);
  }
  myRow(group, { icon: 'sparkles-outline', label: '완독한 책', value: '0권' });
  // 설정 셋 — 책 보기 > 배경음악 > TTS.
  myRow(group, { icon: 'color-palette-outline', label: '책 보기 설정', value: '라이트 · 글자 중간' });
  myRow(group, { icon: 'musical-note-outline', label: '배경음악 설정', value: DATA.bgm[0].label });
  myRow(group, { icon: 'mic-outline', label: 'TTS 설정', value: '여자 · 자동읽기 끔', last: true });

  const bannerSlot = add(body, AL('VERTICAL', '배너 자리', { pt: 16 }), 'FILL');
  const banner = add(bannerSlot, AL('HORIZONTAL', '프리미엄 배너', { gap: 12, px: 20, py: 20, cross: 'CENTER', fill: 'ember' }), 'FILL');
  add(banner, T('평생 광고 없이\n쾌적하게 독서하세요', 'med', 13, 20, 'eggshell', { ls: 0.13 }), 'FILL');
  banner.appendChild(button('프리미엄 멤버십 보기', '프리미엄 멤버십 보기', { h: 40, px: 16, r: 9999, fill: 'eggshell', size: 13, lh: 20, ls: 0.13, color: 'ink' }));

  // 설정(미리보기 모음)은 개발 빌드에서만 보인다 — 출시 빌드 모습으로 그린다.
  const group2 = add(body, AL('VERTICAL', '묶음', { pt: 8 }), 'FILL');
  myRow(group2, { label: '권한 관리' });
  myRow(group2, { label: '계정 관리', last: true });
  return s;
}

function buildPlanned() {
  const { s, body } = myPage('읽을 예정인 책', '읽을 예정인 책');
  DATA.shelf.forEach((book, index) => {
    const mine = book.bookId === SEL.bookId;
    const percent = mine ? PERCENT : 0;
    const row = add(body, AL('HORIZONTAL', book.title, { gap: 12, px: 20, py: 16, cross: 'CENTER' }), 'FILL');
    if (index < DATA.shelf.length - 1) edge(row, 'stone', HAIR, 'bottom');
    row.appendChild(cover(book.design, 44));
    const text = add(row, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
    add(text, T(book.title, 'serif', 16, 24, 'ink'), 'FILL');
    add(text, T(book.author, 'reg', 13, 20, 'smoke', { ls: 0.13 }), 'FILL');
    const barSlot = add(text, AL('VERTICAL', '진행 줄 자리', { pt: 4 }), 'FILL');
    const bar = add(barSlot, AL('HORIZONTAL', '진행 줄', { w: 100, h: 4, fill: 'stone', r: 2, clip: true }), 'FILL', 'FIXED');
    if (percent > 0) bar.appendChild(rect('읽은 만큼', 220 * (percent / 100), 4, 'ember'));
    row.appendChild(T(`${percent}%`, 'med', 15, 24, 'ink', { ls: 0.15 }));
  });
  return s;
}

function buildFinished() {
  const { s, body } = myPage('완독한 책 (빈 목록)', '완독한 책');
  const empty = add(body, AL('VERTICAL', '빈 목록', { px: 20, py: 40 }), 'FILL');
  add(empty, T('아직 완독한 책이 없습니다.', 'reg', 15, 24, 'ash', { ls: 0.15, align: 'CENTER' }), 'FILL');
  return s;
}

/** 고르는 목록의 줄 — 고른 것은 굵기와 체크로 알린다. */
function pickRow(parent, label, sub, picked, last) {
  const row = add(parent, AL('HORIZONTAL', `${label}${picked ? ' (고름)' : ''}`, { px: 20, py: sub ? 12 : 0, minH: 56, main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  if (!last) edge(row, 'stone', HAIR, 'bottom');
  const text = AL('VERTICAL', '글', { gap: 4 });
  row.appendChild(text);
  text.appendChild(T(label, picked ? 'med' : 'reg', 15, 24, 'ink', { ls: 0.15 }));
  if (sub) text.appendChild(T(sub, 'reg', 13, 20, 'ash', { ls: 0.13 }));
  if (picked) row.appendChild(icon('checkmark', 20, 'ink'));
}

function hint(parent, text, tok, pb) {
  const slot = add(parent, AL('VERTICAL', '안내', { px: 20, pb }), 'FILL');
  add(slot, T(text, 'reg', 13, 20, tok, { ls: 0.13 }), 'FILL');
}

/**
 * 줄 오른쪽의 '미리듣기' — components/mypage/SettingSection의 PreviewButton.
 * 듣는 동안은 주황으로 채워지고 '멈춤'이 된다.
 */
function previewButton(playing) {
  const b = AL('HORIZONTAL', playing ? '미리듣기(재생 중)' : '미리듣기', { h: 28, px: 12, gap: 4, cross: 'CENTER', r: 9999, fill: playing ? 'ember' : null, stroke: [playing ? 'ember' : 'stone', 1] });
  b.appendChild(icon(playing ? 'pause' : 'play', 12, playing ? 'eggshell' : 'stone'));
  b.appendChild(T(playing ? '멈춤' : '미리듣기', 'med', 11, 17, playing ? 'eggshell' : 'stone'));
  return b;
}

function buildBgm() {
  const { s, body } = myPage('배경음악 설정', '배경음악 설정', headerTextColor('저장', 'ember'));
  settingSection(body, {
    title: '배경음악 설정',
    icon: 'musical-note-outline',
    picked: 0,
    // 음원이 없는 '없음'에는 미리듣기가 없다. 둘째 곡을 듣고 있는 순간으로 그린다.
    options: DATA.bgm.map((option, index) => [option.label, option.id === 'none' ? null : previewButton(index === 1)]),
  }, 0);
  return s;
}

function buildTts() {
  const { s, body } = myPage('TTS 설정', 'TTS 설정', headerTextColor('저장', 'ember'));
  settingSection(body, { title: '보이스 설정', icon: 'mic-outline', picked: 0, options: [['여자', previewButton(false)], ['남자', previewButton(false)]] }, 0);
  settingSection(body, { title: '자동읽기 설정', icon: 'headset-outline', picked: 1, options: [['켜기', null], ['끄기', null]] }, 1);
  return s;
}

function buildPermissions() {
  const { s, body } = myPage('권한 관리', '권한 관리');
  hint(body, '알람이 제때 울리려면 아래 네 가지가 모두 허용되어야 합니다. 줄을 누르면 시스템 설정이 열립니다.', 'smoke', 16);
  const rows = add(body, AL('VERTICAL', '권한', { pt: 8 }), 'FILL');
  const items = [
    ['알림', '알람이 울리는 동안 앱이 살아 있으려면 필요합니다.'],
    ['정확한 알람', '없으면 정한 시각에서 몇 분씩 밀릴 수 있습니다.'],
    ['전체 화면 알림', '잠금화면 위에 알람 화면을 띄우는 데 필요합니다.'],
  ];
  items.forEach(([label, text], index) => {
    const row = add(rows, AL('HORIZONTAL', label, { gap: 12, px: 20, py: 12, minH: 56, cross: 'CENTER' }), 'FILL');
    if (index < items.length - 1) edge(row, 'stone', HAIR, 'bottom');
    const col = add(row, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
    add(col, T(label, 'reg', 15, 24, 'ink', { ls: 0.15 }), 'FILL');
    add(col, T(text, 'reg', 13, 20, 'ash', { ls: 0.13 }), 'FILL');
    // 이 화면의 토글은 켜지면 주황이 아니라 graphite다(AlarmPermissionCard).
    row.appendChild(toggle(true, 'graphite'));
  });
  return s;
}

function buildAccount() {
  const { s, body } = myPage('계정 관리', '계정 관리');
  hint(body, '아직 로그인 기능이 없어 두 버튼은 동작하지 않습니다.', 'ash', 24);
  const buttons = add(body, AL('VERTICAL', '버튼', { gap: 12, px: 20 }), 'FILL');
  add(buttons, button('로그아웃', '로그아웃', { h: 52, r: 9999, fill: 'eggshell', stroke: ['stone', HAIR], size: 15, lh: 24, ls: 0.15, color: 'ink' }), 'FILL');
  add(buttons, button('회원탈퇴', '회원탈퇴', { h: 52, r: 9999, font: 'reg', size: 13, lh: 20, ls: 0.13, color: WRONG }), 'FILL');
  return s;
}

/** 리포트 — components/library/LibraryBookDetailScreen. */
/**
 * 서재 책 상세 — components/library/LibraryBookDetailScreen. 머리 이름은 지금 읽는 책만 '리포트'이고,
 * 그 밖의 책은 들어온 목록의 이름('읽을 예정인 책'·'완독한 책')을 단다. 그때 오른쪽 버튼은 '이 책 읽기'.
 */
function buildReport(name, o = {}) {
  const book = o.book || SEL;
  const s = screen(name, 'eggshell');
  header(s, o.title || '리포트', { tone: 'dark', action: headerIcon('ellipsis-vertical') });
  const body = scrollBody(s, {});
  const band = add(body, AL('HORIZONTAL', '책', { gap: 12, px: 20, pb: 24, cross: 'CENTER', fill: '!ink' }), 'FILL');
  band.appendChild(cover(book.design, 56));
  const text = add(band, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
  add(text, T(book.title, 'serif', 16, 24, 'eggshell'), 'FILL');
  add(text, T(book.author, 'reg', 13, 20, 'stone', { ls: 0.13 }), 'FILL');
  band.appendChild(
    o.title
      ? button('이 책 읽기', '이 책 읽기', { h: 40, px: 16, gap: 4, r: 9999, fill: '!ember', size: 13, lh: 20, ls: 0.13, color: '!eggshell', icon: icon('sync', 16, '!eggshell') })
      : button('선택 중', '선택 중', { h: 40, px: 16, r: 9999, fill: '!graphite', size: 13, lh: 20, ls: 0.13, color: 'stone' }),
  );

  const section = (title, value, note, right, last) => {
    const box = add(body, AL('VERTICAL', title, { gap: 8, px: 20, py: 16 }), 'FILL');
    if (!last) edge(box, 'stone', HAIR, 'bottom');
    box.appendChild(T(title, 'med', 13, 20, 'ink', { ls: 0.13 }));
    const row = add(box, AL('HORIZONTAL', '값', { gap: 12, cross: 'CENTER' }), 'FILL');
    const col = add(row, AL('VERTICAL', '숫자', { gap: 4 }), 'FILL');
    col.appendChild(T(value, 'med', 22, null, 'ink', { ls: -0.44 }));
    if (note) col.appendChild(T(note, 'reg', 13, 20, 'ash', { ls: 0.13 }));
    if (right) row.appendChild(right);
  };
  const outline = (label) => button(label, label, { h: 36, px: 12, r: 10, stroke: ['ash', 1], font: 'reg', size: 13, lh: 20, ls: 0.13, color: 'smoke' });
  const bar = AL('HORIZONTAL', '진도 막대', { w: 160, h: 6, fill: 'stone', r: 3, clip: true });
  bar.appendChild(rect('읽은 만큼', 160 * (PERCENT / 100), 6, 'ember'));
  const right = QUIZZES.length - 1;
  section('독서 진도', `${READ_PAGES}p`, `(총 ${DATA.totalPages}p)`, bar);
  section('퀴즈 정답률', `${Math.round((right / QUIZZES.length) * 100)}%`, `(${QUIZZES.length}문제 중 ${right}개)`, outline('틀린 문제 보러가기'));
  section('책갈피', '1개', null, outline('책갈피 보기'));
  section('독서 노트', '0개', null, outline('기록한 노트 보기'));
  section('마지막으로 읽은 날', DATA.lastRead, null, null, true);
  return s;
}

function buildReportMenu() {
  const s = buildReport('리포트 + 더보기');
  const d = dialog(s, '더보기');
  const item = (glyph, label, tok) => {
    const row = add(d, AL('HORIZONTAL', label, { gap: 12, px: 20, minH: 52, cross: 'CENTER' }), 'FILL');
    row.appendChild(icon(glyph, 20, tok));
    row.appendChild(T(label, 'reg', 15, 24, tok, { ls: 0.15 }));
  };
  item('eye-outline', '미리보기', 'ink');
  const divider = add(d, AL('VERTICAL', '선 자리', { px: 20 }), 'FILL');
  add(divider, rect('선', 100, HAIR, 'stone'), 'FILL');
  item('trash-outline', '내 서재에서 삭제하기', WRONG);
  centerDialog(d);
  return s;
}

function buildWrongQuizzes() {
  const quiz = QUIZZES[WRONG_INDEX];
  const { s, body } = myPage('틀린 문제', '틀린 문제');
  const list = add(body, AL('VERTICAL', '목록', { gap: 16, px: 20, pt: 8 }), 'FILL');
  list.appendChild(T('1문제', 'reg', 13, 20, 'smoke', { ls: 0.13 }));
  const card = add(list, AL('VERTICAL', '문제 카드', { gap: 8, p: 20, fill: 'taupe', r: 20 }), 'FILL');
  add(card, T(DATA.lesson.title, 'med', 13, 20, 'graphite', { ls: 0.13 }), 'FILL');
  card.appendChild(T(`${WRONG_INDEX + 1}번째 문제 (총 ${QUIZZES.length}문제)`, 'reg', 11, 17, 'ash'));
  const question = add(card, AL('VERTICAL', '문제', { pt: 4 }), 'FILL');
  add(question, T(quiz.question, 'med', 15, 24, 'ink', { ls: 0.15 }), 'FILL');
  const choices = add(card, AL('VERTICAL', '보기', { gap: 8, pt: 4 }), 'FILL');
  quiz.choices.forEach((choice, i) => {
    const no = i + 1;
    const answer = no === quiz.answer;
    const mine = no === WRONG_PICK && !answer;
    const tok = answer ? RIGHT : mine ? WRONG : null;
    const box = add(choices, AL('HORIZONTAL', `${no}${answer ? ' (정답)' : mine ? ' (내 답)' : ''}`, { gap: 8, p: 12, r: 10, fill: DARK && tok ? '#272323' : answer ? RIGHT_BG : mine ? WRONG_BG : 'eggshell', stroke: [tok || 'stone', HAIR] }), 'FILL');
    box.appendChild(T(String(no), 'med', 13, 21, tok || 'graphite'));
    add(box, T(choice, 'reg', 13, 21, 'ink', { ls: 0.13 }), 'FILL');
    if (tok) box.appendChild(T(answer ? '정답' : '내 답', 'med', 12, 21, tok, { ls: 0.12 }));
  });
  const slot = add(card, AL('VERTICAL', '해설 자리', { pt: 4 }), 'FILL');
  const box = add(slot, AL('VERTICAL', '해설', { gap: 4, p: 16, fill: 'stone', r: 10 }), 'FILL');
  add(box, T(`정답은 ${quiz.answer}번 입니다`, 'med', 14, 22, RIGHT, { ls: 0.14 }), 'FILL');
  add(box, T(quiz.explanation, 'reg', 13, 22, 'smoke', { ls: 0.13 }), 'FILL');
  return s;
}

function buildBookmarks() {
  const { s, body } = myPage('책갈피', '책갈피');
  const list = add(body, AL('VERTICAL', '목록', { gap: 12, px: 20, pt: 8 }), 'FILL');
  list.appendChild(T('1개', 'reg', 13, 20, 'smoke', { ls: 0.13 }));
  // 사진이 없는 책이라 그 책의 종이색이 깔리고, 그 위에 어둠 한 겹이 얹힌다.
  const card = add(list, AL('VERTICAL', '책갈피 카드', { gap: 20, px: 24, pt: 32, pb: 48, minH: 300, main: 'MAX', r: 20, clip: true }), 'FILL');
  card.fills = [solid(SEL.design.paper), solid(BROWN100, 0.55)];
  add(card, T(DATA.lesson.story[0], 'serifR', 16, 30, 'eggshell', { align: 'CENTER' }), 'FILL');
  const credit = add(card, AL('VERTICAL', '출처', { gap: 4, pb: 20 }), 'FILL');
  add(credit, T(DATA.lesson.title, 'med', 13, 20, 'eggshell', { ls: 0.13, align: 'CENTER' }), 'FILL');
  add(credit, T(DATA.lesson.subtitle, 'reg', 13, 20, 'stone', { ls: 0.13, align: 'CENTER' }), 'FILL');
  const remove = AL('HORIZONTAL', '빼기', { w: 32, h: 32, main: 'CENTER', cross: 'CENTER' });
  remove.appendChild(icon('close-outline', 18, 'stone'));
  abs(card, remove, W - 40 - 12 - 32, card.height - 12 - 32);
  return s;
}

function buildNotes() {
  const { s, body } = myPage('독서 노트 (빈 목록)', '독서 노트');
  const empty = add(body, AL('VERTICAL', '빈 목록', { gap: 4, px: 20, pt: 72, cross: 'CENTER' }), 'FILL');
  empty.appendChild(T('아직 남긴 노트가 없어요', 'med', 16, 24, 'ink'));
  add(empty, T('읽다가 떠오른 생각을 노트로 남겨 보세요', 'reg', 13, 20, 'smoke', { ls: 0.13, align: 'CENTER' }), 'FILL');
  return s;
}

/** 개발용 설정 — 출시 전에 지울 화면이지만 지금은 앱에 있다. */
function buildSettings() {
  const s = screen('설정 (개발용)', 'eggshell');
  header(s, '설정');
  const body = scrollBody(s, { gap: 12, px: 24, pt: 20, pb: 48 });
  const card = (name) => add(body, AL('VERTICAL', name, { p: 24, fill: 'taupe', r: 20, stroke: ['stone', HAIR] }), 'FILL');
  const filled = (label) => button(label, label, { h: 44, r: 9999, fill: 'graphite', size: 15, ls: 0.15, color: 'eggshell' });
  const section = (title, text, buttons, strong) => {
    const c = card(title);
    add(c, T(title, 'med', 16, null, 'ink', { ls: 0.16 }), 'FILL');
    const slot = add(c, AL('VERTICAL', '설명', { pt: 4 }), 'FILL');
    const t = add(slot, T(text, 'reg', 13, 20, 'smoke', { ls: 0.13 }), 'FILL');
    for (const word of strong || []) {
      const at = text.indexOf(word);
      t.setRangeFontName(at, at + word.length, F.med);
      t.setRangeFills(at, at + word.length, [solid('ink')]);
    }
    buttons.forEach((b, index) => add(add(c, AL('VERTICAL', '버튼 자리', { pt: index === 0 ? 16 : 8 }), 'FILL'), b, 'FILL'));
  };

  const intro = card('개발용 설정');
  add(intro, T('개발용 설정', 'serif', 22, 26, 'ink', { ls: -0.44 }), 'FILL');
  const introSlot = add(intro, AL('VERTICAL', '설명', { pt: 16 }), 'FILL');
  add(introSlot, T('만드는 동안 화면을 견주어 보려고 둔 자리입니다. 사용자가 쓰는 설정(배경음악·권한· 계정)은 마이페이지로 옮겼습니다. 출시 전에 이 화면을 지우거나 __DEV__로 감쌉니다.', 'reg', 15, 24, 'smoke', { ls: 0.15 }), 'FILL');

  section('알람 화면 미리보기', '아홉 권의 알람 화면을 차례로 봅니다. 화면을 누르면 다음 책, 우측 상단 ✕로 닫습니다.', [filled('알람 테스트')]);
  section(
    '첫 실행 흐름',
    '설치하고 처음 켰을 때 지나는 길입니다 — 스플래시, 질문 넷, 로딩, 그리고 홈까지.\n\n미리보기는 아무것도 저장하지 않습니다. 권한도 묻지 않고, 여기서 맞춘 알람으로 아침에 울리지도 않습니다. 실제 흐름에서는 지나가는 로그인 시트도 여기서만 뜹니다.\n\n다시 겪어보기는 첫 실행 기록을 지우고 진짜 흐름을 엽니다. 고른 책과 알람이 실제로 바뀌고 권한 팝업도 뜹니다.',
    [filled('미리보기 (저장 안 함)'), button('다시 겪어보기 (실제 저장)', '다시 겪어보기 (실제 저장)', { h: 44, r: 9999, stroke: ['graphite', 1], size: 15, ls: 0.15, color: 'graphite' })],
    ['미리보기', '다시 겪어보기'],
  );
  section('카드 슬라이드 미리보기', '오늘의 공부를 좌우로 넘겨 보는 카드 형식으로 바꾸면 어떤 느낌인지 봅니다. 좌우로 쓸어 넘기고, 우측 상단 ✕로 닫습니다.', [filled('카드 넘겨보기')]);
  section('인스타 스토리 미리보기', '같은 내용을 인스타그램 스토리 형식으로 봅니다. 좌우를 탭해 넘기고, 우측 상단 ✕로 닫습니다.', [filled('스토리로 보기')]);
  section('원페이지 미리보기', '지금 오늘의 공부 상세가 쓰는 형식입니다. 위의 두 가지와 같은 글을 견주어 보려고 같은 자리에 두었습니다. 우측 상단 ✕로 닫습니다.', [filled('원페이지로 보기')]);

  const version = card('버전');
  const row = add(version, AL('HORIZONTAL', '버전', { p: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  row.appendChild(T('버전', 'reg', 15, 24, 'ink', { ls: 0.15 }));
  row.appendChild(T('1.0.0 (데모)', 'reg', 13, 20, 'smoke', { ls: 0.13 }));
  return s;
}

// ── 첫 실행 — components/splash ─────────────────────────────────────────────
/** 인트로의 종이 그림(carbon:page-break) — 시안의 SVG 경로 그대로. */
const PAGE_BREAK_PATH = 'M7.5 67.5H22.5V75H7.5V67.5ZM97.5 67.5H112.5V75H97.5V67.5ZM90 82.5V105H30V82.5H22.5V105C22.5059 106.987 23.298 108.892 24.7033 110.297C26.1085 111.702 28.0127 112.494 30 112.5H90C91.9873 112.494 93.8915 111.702 95.2967 110.297C96.702 108.892 97.4941 106.987 97.5 105V82.5H90ZM30 60V15H60V37.5C60.0059 39.4873 60.798 41.3915 62.2033 42.7967C63.6085 44.202 65.5127 44.9941 67.5 45H90V60H97.5V37.5C97.5132 37.0072 97.4195 36.5173 97.2253 36.0642C97.0311 35.611 96.741 35.2053 96.375 34.875L70.125 8.625C69.7963 8.25699 69.3909 7.96553 68.9374 7.77116C68.4838 7.57679 67.9932 7.48423 67.5 7.5H30C28.0127 7.50594 26.1085 8.29802 24.7033 9.70326C23.298 11.1085 22.5059 13.0127 22.5 15V60H30ZM67.5 16.5L88.5 37.5H67.5V16.5ZM37.5 67.5H52.5V75H37.5V67.5ZM67.5 67.5H82.5V75H67.5V67.5Z';

function pageBreakIcon(size, tok) {
  const node = figma.createNodeFromSvg(
    `<svg width="${size}" height="${size}" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><path d="${PAGE_BREAK_PATH}" fill="${hexOf(tok)}"/></svg>`,
  );
  node.name = 'carbon:page-break';
  return node;
}

/**
 * 첫 실행 고침본 — 10월 16일 시안으로 고친 판이고, 10월 17일 그대로 앱의 첫 실행(components/splash)이
 * 됐다. 그 전 판과 견주어 볼 수 있게 DRAFT로 갈라 둔다. DRAFT가 켜진 동안 그리는 첫 실행 화면은: 인트로 버튼 고정('하루서점 시작하기'),
 * 퀴즈 그림은 아이콘, 물음 자리를 위로, 아래 버튼 56·둘레 20, 시안의 열네 분야, 밝은 환영 창.
 */
let DRAFT = false;
const draft = (build) => () => {
  DRAFT = true;
  try {
    return build();
  } finally {
    DRAFT = false;
  }
};
/** 퀴즈 아이콘(hugeicons quiz-03) — 시안의 SVG 경로 그대로. 108칸 틀에 앉힌다(assets/images/splash/quiz.png와 같은 자리). */
const QUIZ_ICON_PATHS = [
  ['M21.518 10.25C14.516 10.4615 10.3445 11.24 7.45551 14.129C3.50001 18.089 3.50001 24.4565 3.50001 37.196V66.473C3.50001 79.217 3.50001 85.5845 7.45551 89.5445C11.4065 93.5 17.774 93.5 30.5 93.5H53C65.7305 93.5 72.0935 93.5 76.0445 89.54C80.0045 85.5845 80.0045 79.217 80.0045 66.473V37.196C80.0045 24.461 80.0045 18.089 76.0445 14.129C73.16 11.24 68.984 10.4615 61.982 10.25', ''],
  ['M21.5 11.375C21.5 7.028 25.028 3.5 29.375 3.5H54.125C56.2136 3.5 58.2166 4.32969 59.6935 5.80653C61.1703 7.28338 62 9.28642 62 11.375C62 13.4636 61.1703 15.4666 59.6935 16.9435C58.2166 18.4203 56.2136 19.25 54.125 19.25H29.375C27.2864 19.25 25.2834 18.4203 23.8065 16.9435C22.3297 15.4666 21.5 13.4636 21.5 11.375Z', ' stroke-linejoin="round"'],
  ['M17.018 39.5H35.018', ' stroke-linecap="round"'],
  ['M48.518 44C48.518 44 50.768 44 53.018 48.5C53.018 48.5 60.164 37.25 66.518 35', ' stroke-linecap="round" stroke-linejoin="round"'],
  ['M17.018 66.5H35.018', ' stroke-linecap="round"'],
  ['M48.518 71C48.518 71 50.768 71 53.018 75.5C53.018 75.5 60.164 64.25 66.518 62', ' stroke-linecap="round" stroke-linejoin="round"'],
];
function quizIcon(tok) {
  const paths = QUIZ_ICON_PATHS.map(([d, extra]) => `<path d="${d}" stroke-width="7" stroke="${hexOf(tok)}"${extra}/>`).join('');
  const node = figma.createNodeFromSvg(
    `<svg width="108" height="108" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(12.24 5.5)">${paths}</g></svg>`,
  );
  node.name = 'hugeicons:quiz-03';
  return node;
}

/** 질문 화면의 걸음 수 — SplashQuestion의 QUESTION_COUNT. */
const QUESTION_COUNT = 6;

/** 인트로 세 장 — SplashIntro의 SLIDES. 장마다 그림 하나와 한 줄. */
const INTRO_SLIDES = [
  { key: 'cut', lead: '좋은 책을 하루치로 잘라 드립니다' },
  { key: 'alarm', lead: '까먹지 않게 매일 알람을 드려요' },
  { key: 'quiz', lead: '퀴즈로 까먹지않게 복습까지 챙겨요.' },
];

/** 울리는 자명종 — 떨림이 가장 큰 순간이 아니라, 울림 선이 보이는 가만한 모습으로 그린다. */
function alarmArt() {
  const box = figma.createFrame();
  box.name = '울리는 자명종';
  box.resize(120, 120);
  box.fills = [];
  box.clipsContent = false;
  box.appendChild(icon('alarm-outline', 120, 'eggshell'));
  const waves = [
    [-18, 34, -30],
    [-20, 52, 0],
    [120 + 18 - 14, 34, 30],
    [120 + 20 - 14, 52, 0],
  ];
  for (const [x, y, angle] of waves) {
    const w = rect('울림', 14, 4, 'eggshell');
    w.cornerRadius = 2;
    box.appendChild(w);
    w.x = x;
    w.y = y;
    if (angle) w.rotation = -angle;
  }
  return box;
}

/** '퀴즈' 위로 떠오른 말풍선 셋(?, !, ✓) — 셋이 다 모인 순간. */
function quizArt() {
  const box = figma.createFrame();
  box.name = '퀴즈 위로 떠오르는 말풍선';
  box.resize(240, 120);
  box.fills = [];
  box.clipsContent = false;
  if (DRAFT) {
    // 고침본 — 글자 대신 아이콘이 틀 한가운데에 선다. 말풍선 자리는 같다.
    const art = quizIcon('eggshell');
    box.appendChild(art);
    art.x = (240 - 108) / 2;
    art.y = (120 - 108) / 2;
  } else {
    const word = T('퀴즈', 'serif', 48, 60, 'eggshell', { ls: -1.92 });
    box.appendChild(word);
    word.x = (240 - word.width) / 2;
    word.y = 120 - 60;
  }
  for (const [x, y, glyph] of [[-64, -78, '?'], [0, -104, '!'], [64, -78, '✓']]) {
    const bubble = AL('HORIZONTAL', `말풍선 ${glyph}`, { h: 40, minW: 40, px: 12, main: 'CENTER', cross: 'CENTER', r: 10, fill: 'eggshell' });
    let text;
    try {
      text = T(glyph, 'med', 18, 22, 'ink');
    } catch (error) {
      text = T('v', 'med', 18, 22, 'ink');
    }
    bubble.appendChild(text);
    box.appendChild(bubble);
    bubble.x = (240 - bubble.width) / 2 + x;
    bubble.y = 120 - 40 - 40 + y;
    const tail = rect('꼬리', 10, 10, 'eggshell');
    box.appendChild(tail);
    tail.rotation = 45;
    tail.x = bubble.x + bubble.width / 2;
    tail.y = bubble.y + 40 - 5 - 7;
  }
  return box;
}

/** 첫 화면 — SplashIntro. slide는 몇째 장인지(0부터). 첫 장의 그림은 애니메이션이 갈라 놓은 순간이다. */
function buildIntro(name, slide) {
  const index = slide || 0;
  const last = index === INTRO_SLIDES.length - 1;
  const s = screen(name || `첫 실행 — 인트로 ${index + 1}/${INTRO_SLIDES.length}`, 'ink');
  add(s, AL('HORIZONTAL', '상태바', { w: W, h: TOP }), 'FILL', 'FIXED');
  const body = add(s, AL('VERTICAL', '본문', { px: 28, main: 'MAX' }), 'FILL', 'FILL');
  const art = add(body, AL('VERTICAL', '그림 자리', { main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  const key = INTRO_SLIDES[index].key;
  art.appendChild(key === 'cut' ? pageBreakIcon(120, 'eggshell') : key === 'alarm' ? alarmArt() : quizArt());
  const words = add(body, AL('VERTICAL', '글씨 자리', { gap: 8, py: 20, cross: 'CENTER' }), 'FILL');
  words.appendChild(T(INTRO_SLIDES[index].lead, 'reg', 18, 24, 'ash', { ls: -0.36, align: 'CENTER' }));
  words.appendChild(T('하루서점', 'serif', 40, 86, 'eggshell', { ls: -1.6, align: 'CENTER' }));
  // 몇 장 중 몇째인지 — 점 셋.
  const dots = add(s, AL('HORIZONTAL', '점', { gap: 8, pb: 24, main: 'CENTER', cross: 'CENTER' }), 'FILL');
  INTRO_SLIDES.forEach((_, i) => {
    const dot = figma.createEllipse();
    dot.name = i === index ? '점(지금)' : '점';
    dot.resize(6, 6);
    fill(dot, i === index ? 'eggshell' : 'graphite');
    dots.appendChild(dot);
  });
  // 고침본은 버튼이 장과 상관없이 '하루서점 시작하기'로 고정이고, 56에 아래 20.
  const foot = add(s, AL('VERTICAL', '아래', { gap: 20, px: 20, pb: (DRAFT ? 20 : 36) + BOTTOM }), 'FILL');
  const cta = DRAFT || last ? '하루서점 시작하기' : '다음';
  add(foot, button(cta, cta, { h: DRAFT ? 56 : 60, r: 9999, fill: 'ember', size: 16, lh: 24, color: 'eggshell' }), 'FILL');
  const row = add(foot, AL('HORIZONTAL', '로그인 줄', { gap: 8, main: 'CENTER', cross: 'CENTER' }), 'FILL');
  row.appendChild(T('이미 계정이 있나요?', 'reg', 11, 17, 'ash'));
  row.appendChild(T('로그인하기', 'med', 11, 17, 'eggshell'));
  return s;
}

/** 시작하기를 누르면 올라오는 가입 시트 — SplashLogin(데모용). */
function buildIntroLogin() {
  const s = buildIntro('첫 실행 — 인트로 + 가입 시트', INTRO_SLIDES.length - 1);
  dim(s, 0.5);
  const sheet = AL('VERTICAL', '가입 시트', { w: W, gap: 12, px: 20, pt: 32, pb: 36 + BOTTOM, fill: 'eggshell' });
  sheet.topLeftRadius = 24;
  sheet.topRightRadius = 24;
  const head = add(sheet, AL('VERTICAL', '표제', { pb: 8 }), 'FILL');
  add(head, T('하루를 여는 알람이\n한 쪽의 책이 되도록', 'serif', 22, 35.2, 'ink', { ls: -0.44, align: 'CENTER' }), 'FILL');
  add(sheet, button('데모계정으로 계속하기', '데모계정으로 계속하기', { h: DRAFT ? 56 : 52, r: 9999, gap: 8, fill: 'ember', size: 16, lh: 24, color: 'eggshell', icon: icon('person-circle-outline', 18, 'eggshell') }), 'FILL');
  add(sheet, button('회원가입', '회원가입', { h: DRAFT ? 56 : 52, r: 9999, fill: 'eggshell', stroke: [BROWN10, 1], size: 16, lh: 24, color: 'ink' }), 'FILL');
  const terms = add(sheet, AL('VERTICAL', '약관', { pt: 8 }), 'FILL');
  add(terms, T('회원가입 시 이용약관 및 개인정보처리방침에 동의합니다.', 'reg', 11, 17, 'ash', { align: 'CENTER' }), 'FILL');
  abs(s, sheet, 0, 0);
  sheet.y = H - sheet.height;
  return s;
}

/**
 * 질문 화면 넷의 껍데기 — SplashQuestion. 위 머리띠(뒤로·진행 줄), 물음, 본문, 다음 버튼.
 * opts.left: 물음을 왼쪽에(질문 4). opts.padded: 본문 좌우 여백(기본 20).
 */
function question(name, step, title, hintText, opts) {
  const o = opts || {};
  const s = screen(name, 'taupe');
  // 뒤로 버튼은 왼쪽으로 8 당겨 앉는다(marginLeft -8) — 머리띠 왼쪽 여백이 실제로는 20이다.
  const head = add(s, AL('HORIZONTAL', '머리띠', { w: W, h: 60 + TOP, pt: TOP, pl: 20, pr: 28, gap: 8, cross: 'CENTER' }), 'FILL', 'FIXED');
  const back = AL('HORIZONTAL', '뒤로', { w: 32, h: 32, main: 'CENTER', cross: 'CENTER' });
  back.appendChild(chevron(22, 'ink', 'back'));
  head.appendChild(back);
  const trackW = W - 20 - 28 - 32 - 8;
  const track = add(head, AL('HORIZONTAL', `진행 줄 ${step}/${QUESTION_COUNT}`, { h: 4, r: 4, fill: 'stone', clip: true }), 'FILL', 'FIXED');
  track.appendChild(rect('채움', trackW * (step / QUESTION_COUNT), 4, 'ink'));

  const left = !!o.left;
  // 고침본은 물음을 진행 줄 바로 아래로 올린다(위 16, 아래 40).
  const block = add(s, AL('VERTICAL', '물음', { gap: 8, px: left ? 28 : 20, pt: DRAFT ? 16 : 48, pb: DRAFT ? 40 : 48, cross: left ? 'MIN' : 'CENTER' }), 'FILL');
  add(block, T(title, 'med', 22, 26, 'ink', { ls: -0.44, align: left ? 'LEFT' : 'CENTER' }), 'FILL');
  if (hintText) add(block, T(hintText, 'med', 16, 24, 'smoke', { align: left ? 'LEFT' : 'CENTER' }), 'FILL');

  const body = add(s, AL('VERTICAL', '본문', { px: o.padded === false ? 0 : 20, clip: true }), 'FILL', 'FILL');
  const foot = add(s, AL('VERTICAL', '아래', DRAFT ? { p: 20, pb: 20 + BOTTOM } : { p: 8, pb: 8 + BOTTOM }), 'FILL');
  const on = o.next !== false;
  add(foot, button('다음', '다음', { h: DRAFT ? 56 : 48, r: 9999, gap: 6, fill: on ? 'ember' : 'ash', size: 16, lh: 24, color: 'eggshell', after: chevron(14, 'eggshell', 'forward') }), 'FILL');
  return { s, body };
}

/** 질문 1 — 분야. 셋을 고른 순간이다. */
function buildQ1() {
  const { s, body } = DRAFT
    ? question('첫 실행 — 질문 1 분야', 1, '관심있는 분야가 무엇인가요?', '최소 3개 이상 선택지를 골라주세요')
    : question('첫 실행 — 질문 1 분야', 1, '관심있는 책이 어떤 쪽인가요?', '최소 3개 이상의 분야를 골라주세요');
  const grid = add(body, AL('HORIZONTAL', '격자', { gap: 12, gapY: 12, wrap: true }), 'FILL');
  const chipW = (W - 40 - 12) / 2;
  // 고침본은 시안의 열네 분야(components/splash/SplashFields).
  const names = DRAFT ? DATA.draftFields : DATA.fieldNames;
  const picked = DRAFT ? names.slice(0, 3) : ['고전', '철학·사상', '음악·예술'];
  for (const name of names) {
    const on = picked.includes(name);
    const chip = AL('HORIZONTAL', `${name}${on ? ' (고름)' : ''}`, { w: chipW, h: 52, px: 12, main: 'CENTER', cross: 'CENTER', r: 9999, fill: on ? 'ink' : 'eggshell', stroke: [on ? 'ink' : 'stone', 1] });
    chip.appendChild(T(name, 'med', 16, 24, on ? 'eggshell' : 'smoke'));
    grid.appendChild(chip);
  }
  return s;
}

/**
 * 하나만 고르는 질문 — SplashChoice(독서 빈도·독서 목적). 알약이 줄마다 하나씩 화면 폭을 다 쓴다.
 * 보기와 물음은 SplashFlow의 것 그대로다. 안내 문구는 앱이 둘 다 '얼마나 자주 읽는지 궁금해요'를 쓴다.
 */
function buildChoice(name, step, title, options, picked) {
  // 고침본은 독서 빈도(질문 2)의 안내 문구만 시안대로 바꿨다.
  const hintText = DRAFT && step === 2 ? '알맞은 길이의 책을 추천해드릴게요' : '얼마나 자주 읽는지 궁금해요';
  const { s, body } = question(name, step, title, hintText);
  const list = add(body, AL('VERTICAL', '보기', { gap: 12 }), 'FILL');
  options.forEach((option, index) => {
    const on = index === picked;
    const chip = add(list, AL('HORIZONTAL', `${option}${on ? ' (고름)' : ''}`, { h: 52, px: 12, main: 'CENTER', cross: 'CENTER', r: 9999, fill: on ? 'ink' : 'eggshell', stroke: [on ? 'ink' : 'stone', 1] }), 'FILL', 'FIXED');
    chip.appendChild(T(option, 'med', 16, 24, on ? 'eggshell' : 'smoke'));
  });
  return s;
}
const buildFrequency = () =>
  buildChoice('첫 실행 — 질문 2 독서 빈도', 2, '평소 책을 얼마나 자주 읽으시나요?', ['거의 읽지 않아요', '한 달에 1~2권', '일주일에 1권', '일주일에 2권 이상', '매일 읽어요'], 2);
const buildPurpose = () =>
  buildChoice('첫 실행 — 질문 3 독서 목적', 3, '책을 읽는 목적이 무엇인가요?', ['새로운 지식 획득', '여가를 위한 재밌는 이야기 탐독', '마음 수양'], 0);

/** 책 추천 중 — SplashLoading. 60% 찬 순간이다. */
function buildLoading() {
  const s = screen('첫 실행 — 책 추천 중', 'taupe');
  const center = add(s, AL('VERTICAL', '가운데', { gap: 20, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  const SIZE = 160;
  const done = 0.6;
  const label = `${Math.round(done * 100)}%`;
  const circle = figma.createFrame();
  circle.name = '원';
  circle.resize(SIZE, SIZE);
  circle.cornerRadius = SIZE / 2;
  circle.clipsContent = true;
  circle.fills = [solid('stone')];
  const below = T(label, 'med', 32, 38, 'ink');
  abs(circle, below, (SIZE - below.width) / 2, (SIZE - 38) / 2);
  const filled = figma.createFrame();
  filled.name = '차오른 자리';
  filled.resize(SIZE, SIZE * done);
  filled.clipsContent = true;
  filled.fills = [solid('ember')];
  abs(circle, filled, 0, SIZE * (1 - done));
  const above = T(label, 'med', 32, 38, 'eggshell');
  abs(filled, above, (SIZE - above.width) / 2, (SIZE - 38) / 2 - SIZE * (1 - done));
  center.appendChild(circle);
  center.appendChild(T('책 추천하는 중 …', 'med', 16, 24, 'ink'));
  return s;
}

/** 질문 2 — 첫 권. 카드는 물음 바로 아래에 붙고, 첫 카드를 고른 순간이다. */
function buildQ2() {
  const { s, body } = question('첫 실행 — 질문 4 첫 권', 4, '처음 읽을 책 1권을 선택해주세요', '고른 관심분야에서 가장 인기있는 책입니다.', { padded: false });
  const row = add(body, AL('HORIZONTAL', '책 카드', { w: W, gap: 12, pl: (W - 205) / 2, clip: true }), 'FIXED');
  DATA.splashBooks.forEach((book, index) => {
    const on = index === 0;
    const card = AL('VERTICAL', `책 카드/${book.title}${on ? ' (고름)' : ''}`, { w: 205, h: 280, gap: 8, p: 20, cross: 'CENTER', r: 20, fill: 'eggshell', stroke: [on ? 'ember' : 'stone', 2] });
    row.appendChild(card);
    const box = add(card, AL('VERTICAL', '표지 자리', { pb: 8, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
    box.appendChild(cover(book.design, 120));
    add(card, T(book.title, 'med', 16, 24, 'ink', { align: 'CENTER' }), 'FILL');
    card.appendChild(T(book.author, 'reg', 13, 18, 'ash'));
  });
  return s;
}

/** 질문 3 — 알림. 시각은 물음 바로 아래, 카드는 맨 아래. */
function buildQ3() {
  const { s, body } = question('첫 실행 — 질문 5 알림', 5, '매일 알림을 드릴까요?', '매일 책 한쪽의 내용으로 아침을 시작해보세요');
  body.primaryAxisAlignItems = 'SPACE_BETWEEN';
  body.paddingBottom = 8;
  add(body, clock({}), 'FILL');
  const card = add(body, AL('VERTICAL', '카드', { r: 20, fill: 'eggshell', stroke: ['stone', 1], clip: true }), 'FILL');
  const use = add(card, AL('HORIZONTAL', '알림 사용하기', { px: 20, py: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  edge(use, 'stone', 1, 'bottom');
  use.appendChild(T('알림 사용하기', 'med', 13, 20, 'ink', { ls: 0.13 }));
  use.appendChild(toggle(true, 'ember'));
  const listen = add(card, AL('HORIZONTAL', '알림 미리듣기', { px: 20, py: 16, main: 'SPACE_BETWEEN', cross: 'CENTER' }), 'FILL');
  listen.appendChild(T('알림 미리듣기(30초)', 'med', 13, 20, 'ink', { ls: 0.13 }));
  listen.appendChild(icon('play', 20, 'smoke'));
  return s;
}

/** 질문 4 — 권한. 물음은 왼쪽, 셋 다 켜진 채로 시작한다. */
function buildQ4() {
  const { s, body } = question('첫 실행 — 질문 6 권한', 6, '꼭 필요한 몇가지 권한을 승인해주세요', null, { left: true, padded: false });
  const rows = [
    ['알림', '알림기능을 위해 필요해요'],
    ['정확한 알람', '없으면 몇 분씩 밀릴 수 있습니다.'],
    ['전체 화면 알림', '잠금화면 위에 알람을 띄워야 해요.'],
  ];
  for (const [label, text] of rows) {
    const row = add(body, AL('HORIZONTAL', label, { gap: 16, px: 28, py: 20, cross: 'CENTER' }), 'FILL');
    edge(row, 'stone', 1, 'bottom');
    const col = add(row, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
    add(col, T(label, 'med', 16, 24, 'ink'), 'FILL');
    add(col, T(text, 'reg', 13, 20, 'ash', { ls: 0.13 }), 'FILL');
    row.appendChild(toggle(true, 'ember'));
  }
  return s;
}

/** 첫 실행을 마치면 홈 위로 올라오는 환영 창 — WelcomeSheet. */
function buildWelcome() {
  const s = buildHome();
  s.name = '첫 실행 — 홈 + 환영 창';
  dim(s, 0.55);
  const sheetH = Math.round(H * 0.57);
  // 고침본은 가입 시트와 같은 밝은 창 — 둘레 20, 모서리 24, 버튼 56.
  const sheet = AL('VERTICAL', '환영 창', { w: W, h: sheetH, px: DRAFT ? 20 : 8, pb: (DRAFT ? 20 : 8) + BOTTOM, cross: 'CENTER', clip: true });
  sheet.fills = DRAFT ? [solid('eggshell')] : [solid('ink'), solid('eggshell', 0.1)];
  sheet.topLeftRadius = DRAFT ? 24 : 20;
  sheet.topRightRadius = DRAFT ? 24 : 20;
  abs(s, sheet, 0, H - sheetH);
  const gripSlot = AL('VERTICAL', '손잡이 자리', { pt: 12 });
  const grip = rect('손잡이', 40, 4, DRAFT ? 'stone' : 'graphite');
  grip.cornerRadius = 2;
  gripSlot.appendChild(grip);
  sheet.appendChild(gripSlot);
  const body = add(sheet, AL('VERTICAL', '본문', { gap: 16, px: DRAFT ? 0 : 20, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  body.appendChild(T('준비가 끝났어요', 'med', 13, 20, 'ember', { ls: 0.13 }));
  const badge = AL('HORIZONTAL', '배지', { w: 96, h: 96, r: 9999, fill: 'ember', main: 'CENTER', cross: 'CENTER' });
  const count = AL('HORIZONTAL', '10화', { gap: 2, cross: 'MAX' });
  count.appendChild(T('10', 'light', 44, 52, 'eggshell'));
  count.appendChild(T('화', 'med', 16, 34, 'eggshell'));
  badge.appendChild(count);
  body.appendChild(badge);
  const lines = T('회원님께는\n10화 무료보기를 제공합니다', 'med', 22, 35.2, DRAFT ? 'ink' : 'eggshell', { ls: -0.44, align: 'CENTER' });
  const markFrom = lines.characters.indexOf('10화 무료보기');
  lines.setRangeFills(markFrom, markFrom + '10화 무료보기'.length, [solid('ember')]);
  add(body, lines, 'FILL');
  add(body, T('내일 아침, 알람이 첫 화를 열어 드릴게요.', 'reg', 13, 20, 'ash', { ls: 0.13, align: 'CENTER' }), 'FILL');
  add(sheet, button('지금 바로 확인하기', '지금 바로 확인하기', { h: DRAFT ? 56 : 48, r: 9999, fill: 'ember', size: 16, lh: 24, color: 'eggshell' }), 'FILL');
  return s;
}

// ── 읽기 — 카드로 보기 · 스크롤 보기 (CardDeckDetail의 단출한 크롬) ─────────────
/** 단출한 위 줄 — 왼쪽 뒤로, 오른쪽 자동으로 읽기(감상 노트는 화면에서 잠시 뺐다). 스크롤 보기는 밑에 가는 선. */
function simpleHeader(s, y, ink, rule) {
  const h = AL('HORIZONTAL', '위 줄', { w: W, h: 48, px: 12, main: 'SPACE_BETWEEN', cross: 'CENTER' });
  abs(s, h, 0, y);
  if (rule) edge(h, 'ash', HAIR, 'bottom');
  const back = AL('HORIZONTAL', '뒤로', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  back.appendChild(chevron(24, ink, 'back'));
  h.appendChild(back);
  const icons = AL('HORIZONTAL', '버튼', { gap: 16, cross: 'CENTER' });
  h.appendChild(icons);
  for (const [label, glyph] of [['자동으로 읽기', 'headset']]) {
    const hit = AL('HORIZONTAL', label, { w: 36, h: 36, main: 'CENTER', cross: 'CENTER' });
    hit.appendChild(icon(glyph, 24, ink));
    icons.appendChild(hit);
  }
  return h;
}

/** 유튜브 재생기 자리 — 약관이 정한 가장 작은 높이(200). */
function playerSlot(width) {
  const player = AL('VERTICAL', '유튜브 재생기 자리', { w: width, h: PLAYER_H, gap: 8, main: 'CENTER', cross: 'CENTER', fill: '#333333', r: 12 });
  player.appendChild(icon('logo-youtube', 40, WHITE));
  player.appendChild(T(`youtube.com/watch?v=${DATA.lesson.youtubeId}`, 'reg', 11, 17, 'ash'));
  return player;
}

function buildCardMode() {
  const pages = DATA.reader.card;
  const index = pages.findIndex((page) => page.kind === 'desc');
  const s = figma.createFrame();
  s.name = '읽기 — 카드로 보기';
  s.resize(W, H);
  s.clipsContent = true;
  s.fills = [solid(BROWN100)];
  pageBars(s, pages.length, index);
  simpleHeader(s, TOP + 14, WHITE, false);
  // 카드는 헤더 바로 아래부터 화면 끝 16 위까지 — 재생기(200)와 틈(8)만큼 짧다.
  const top = TOP + 62;
  const cardW = W - 32;
  const full = H - TOP - BOTTOM - 62 - 16;
  const cardH = full - PLAYER_H - 8;
  const card = AL('VERTICAL', '카드/desc', { w: cardW, h: cardH, px: 28, py: 32, main: 'CENTER', cross: 'CENTER', r: 20, clip: true, fill: PAPER });
  abs(s, card, 16, top);
  add(card, bodyText(pages[index].paragraph, BROWN100), 'FILL');
  const mark = AL('HORIZONTAL', '책갈피(꽂음)', { w: 32, h: 32, main: 'CENTER', cross: 'CENTER' });
  mark.appendChild(icon('bookmark', 18, WRONG));
  abs(s, mark, 16 + cardW - 20 - 32, top + cardH - 20 - 32);
  abs(s, playerSlot(cardW), 16, top + cardH + 8);
  return s;
}

/**
 * 스크롤 보기. video가 참이면 유튜브가 있는 화 — 상태바부터 위 줄까지 검고, 그 바로 아래에
 * 재생기가 화면 폭을 다 쓰고 붙박인다(높이 200, 모서리 없음). 없으면 종이색 위 줄에 가는 선.
 */
/** 재생기 밑 접기 띠의 높이 — CardDeckDetail의 foldBar. */
const FOLD_BAR_H = 28;

function buildScrollMode(video) {
  const pages = DATA.reader.scroll;
  const s = figma.createFrame();
  s.name = video ? '읽기 — 스크롤 보기 (유튜브 있음)' : '읽기 — 스크롤 보기 (유튜브 없음)';
  s.resize(W, H);
  s.clipsContent = true;
  s.fills = [solid(PAPER)];
  if (video) {
    abs(s, rect('상태바', W, TOP, '!ink'), 0, 0);
    const head = simpleHeader(s, TOP, WHITE, false);
    fill(head, '!ink');
    const player = playerSlot(W);
    player.cornerRadius = 0;
    abs(s, player, 0, TOP + 48);
    // 재생기 밑의 접기 띠 — 위 줄과 같은 검정, 가운데에 위로 향한 꺾쇠(접기).
    const bar = AL('HORIZONTAL', '접기 띠', { w: W, h: FOLD_BAR_H, main: 'CENTER', cross: 'CENTER', fill: '!ink' });
    const caret = chevron(14, WHITE, 'back');
    caret.rotation = -90;
    bar.appendChild(caret);
    abs(s, bar, 0, TOP + 48 + PLAYER_H);
  } else {
    simpleHeader(s, TOP, BROWN100, true);
  }
  const column = AL('VERTICAL', '글', { w: W, px: 16, pt: 4, gap: 26 });
  abs(s, column, 0, TOP + 48 + (video ? PLAYER_H + FOLD_BAR_H : 0));
  // 표지 덩이 — 스크롤 보기에서도 표지 장의 글이 맨 위에 선다(높이 260으로 못 박음).
  const coverBlock = add(column, AL('VERTICAL', '표지 덩이', { h: 260, gap: 16, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FIXED');
  const symbol = add(coverBlock, AL('VERTICAL', '마크 자리', { h: 72, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FIXED');
  symbol.appendChild(coverMark(SEL.design.mark, 36, SEL.design.ink));
  const chip = AL('HORIZONTAL', '책 이름', { px: 8, py: 4, r: 4, fill: '#F2E8DA' });
  chip.appendChild(T(SEL.store.title, 'serif', 13, null, '#8B6C42', { ls: -0.26 }));
  coverBlock.appendChild(chip);
  add(coverBlock, T(DATA.lesson.title, 'serif', 24, 34, BROWN100, { ls: -0.48, align: 'CENTER' }), 'FILL');
  add(coverBlock, T(DATA.lesson.subtitle, 'serifR', 16, 26, BROWN50, { ls: -0.32, align: 'CENTER' }), 'FILL');
  for (const page of pages) {
    if (page.kind === 'desc') add(column, bodyText(page.paragraph, BROWN100), 'FILL');
  }
  return s;
}

// ── 마이페이지 — 저장 버튼이 붙은 설정 화면 ───────────────────────────────────
/** 헤더 오른쪽의 글자 버튼 — 색을 따로 준다(저장은 포인트 색). */
const headerTextColor = (label, tok) => () => {
  const slot = AL('HORIZONTAL', label, { h: 40, px: 8, main: 'CENTER', cross: 'CENTER' });
  slot.appendChild(T(label, 'med', 15, 24, tok, { ls: 0.15 }));
  return slot;
};

/** 책 보기 설정의 선택지 오른쪽 그림. */
function themeHint(hint) {
  if (hint.swatch) {
    const [paper, ink, edgeLine] = hint.swatch;
    const box = AL('HORIZONTAL', '그림', { w: 28, h: 28, r: 6, main: 'CENTER', cross: 'CENTER', fill: paper });
    if (edgeLine) stroke(box, 'ash', HAIR);
    box.appendChild(T('A', 'med', 14, null, ink));
    return box;
  }
  const box = AL('HORIZONTAL', '그림', { w: 28, h: 28, main: 'CENTER', cross: 'CENTER' });
  if (hint.glyph) box.appendChild(T('A', 'med', hint.glyph, hint.glyph * 1.2, 'graphite'));
  else box.appendChild(icon(hint.icon, 20, 'graphite'));
  return box;
}

/** 선택 표시 — 빈 원, 고르면 주황 원에 흰 체크. */
function radio(on) {
  const r = AL('HORIZONTAL', on ? '선택(고름)' : '선택', { w: 20, h: 20, r: 9999, main: 'CENTER', cross: 'CENTER', fill: on ? 'ember' : null });
  if (on) r.appendChild(icon('checkmark', 14, 'eggshell'));
  else stroke(r, 'ash', 1.5);
  return r;
}

function buildBookTheme() {
  const { s, body } = myPage('책 보기 설정', '책 보기 설정', headerTextColor('저장', 'ember'));
  const sections = [
    // 견본은 그 배경의 종이색·글자색 자체라 다크에서도 바꾸지 않는다('!'). 어두운 판 위라 둘 다 가는 테를 두른다.
    { title: '책 배경 설정', icon: 'color-palette-outline', picked: 0, options: [['라이트', { swatch: ['!eggshell', '!ink', true] }], ['다크', { swatch: ['!ink', '!eggshell', true] }]] },
    { title: '폰트 크기 설정', icon: 'text-outline', picked: 1, options: [['작게', { glyph: 15 }], ['중간', { glyph: 17 }], ['크게', { glyph: 22 }]] },
  ];
  sections.forEach((section, sectionIndex) => {
    settingSection(body, Object.assign({}, section, { options: section.options.map(([label, hint]) => [label, themeHint(hint)]) }), sectionIndex);
  });
  // '책 넘기기 설정'은 걷었다(본문은 늘 스크롤 보기). 책 오픈 효과는 켜고 끄기라 토글 줄 하나다.
  toggleSection(body, { title: '책 오픈 효과', icon: 'sparkles-outline', label: '책이 열리는 모션', on: true, right: themeHint({ icon: 'book-outline' }) }, sections.length);
  return s;
}

/**
 * 켜고 끄기만 하는 설정 한 구역 — components/mypage/SettingSection의 SettingToggle.
 * 머리와 판은 settingSection과 같고, 판 위 한 줄의 왼쪽은 토글, 글은 켜고 꺼도 늘 연하다.
 */
function toggleSection(body, section, sectionIndex) {
  const block = add(body, AL('VERTICAL', section.title, { px: 20, gap: 12, pt: sectionIndex > 0 ? 32 : 0 }), 'FILL');
  const head = add(block, AL('HORIZONTAL', '제목 줄', { gap: 8, cross: 'CENTER' }), 'FILL');
  const circle = AL('HORIZONTAL', '그림', { w: 32, h: 32, r: 9999, main: 'CENTER', cross: 'CENTER', fill: 'taupe' });
  circle.appendChild(icon(section.icon, 18, 'graphite'));
  head.appendChild(circle);
  head.appendChild(T(section.title, 'med', 16, null, 'ink', { ls: 0.16 }));
  const panel = add(block, AL('VERTICAL', '판', { r: 10, fill: 'taupe', clip: true }), 'FILL');
  const row = add(panel, AL('HORIZONTAL', `${section.label}${section.on ? ' (켜짐)' : ''}`, { gap: 12, px: 16, minH: 56, cross: 'CENTER' }), 'FILL');
  row.appendChild(toggle(section.on));
  add(row, T(section.label, 'reg', 15, 24, 'smoke', { ls: 0.15 }), 'FILL');
  if (section.right) row.appendChild(section.right);
  return block;
}

/**
 * 하나만 고르는 설정 한 구역 — components/mypage/SettingSection. 책 보기·배경음악·TTS 설정이 같이 쓴다.
 * options는 [이름, 오른쪽에 놓을 것(없으면 null)]. 마이페이지 안이라 다크(DARK)로 그린다.
 */
function settingSection(body, section, sectionIndex) {
  const block = add(body, AL('VERTICAL', section.title, { px: 20, gap: 12, pt: sectionIndex > 0 ? 32 : 0 }), 'FILL');
  const head = add(block, AL('HORIZONTAL', '제목 줄', { gap: 8, cross: 'CENTER' }), 'FILL');
  const circle = AL('HORIZONTAL', '그림', { w: 32, h: 32, r: 9999, main: 'CENTER', cross: 'CENTER', fill: 'taupe' });
  circle.appendChild(icon(section.icon, 18, 'graphite'));
  head.appendChild(circle);
  head.appendChild(T(section.title, 'med', 16, null, 'ink', { ls: 0.16 }));
  const panel = add(block, AL('VERTICAL', '판', { r: 10, fill: 'taupe', clip: true }), 'FILL');
  section.options.forEach(([label, right], index) => {
    const on = index === section.picked;
    const row = add(panel, AL('HORIZONTAL', `${label}${on ? ' (고름)' : ''}`, { gap: 12, px: 16, minH: 56, cross: 'CENTER' }), 'FILL');
    if (index < section.options.length - 1) edge(row, 'stone', HAIR, 'bottom');
    row.appendChild(radio(on));
    add(row, T(label, on ? 'med' : 'reg', 15, 24, on ? 'ink' : 'smoke', { ls: 0.15 }), 'FILL');
    if (right) row.appendChild(right);
  });
  return block;
}

// ── 오늘의 독서 — components/reading(첫페이지장부터 광고까지) ─────────────────
/** 화면 아래에서 올라오는 판 — 위 두 귀만 둥글다. 다 그린 뒤 settle로 바닥에 붙인다. */
function bottomSheet(s, name, p) {
  const sheet = AL('VERTICAL', name, Object.assign({ w: W }, p));
  sheet.topLeftRadius = p.radius;
  sheet.topRightRadius = p.radius;
  abs(s, sheet, 0, 0);
  return sheet;
}
const settle = (sheet) => {
  sheet.y = H - sheet.height;
};
/** 글에 흘린 흰빛 — RN의 textShadow(흰 45%, 반경 24). */
const GLOW = [{ type: 'DROP_SHADOW', color: { r: 1, g: 1, b: 1, a: 0.45 }, offset: { x: 0, y: 0 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
/** 표지 그림자 — 시안의 Elevation 3. */
const LIFT = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 4 }, radius: 8, spread: 3, visible: true, blendMode: 'NORMAL' },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: 'NORMAL' },
];
/** 이모지가 이 PC의 서체에 없으면 빼고 쓴다. */
function emojiText(withEmoji, without, font, size, lh, tok, o) {
  try {
    return T(withEmoji, font, size, lh, tok, o);
  } catch (error) {
    return T(without, font, size, lh, tok, o);
  }
}
/** 분야·쪽수 칩 줄 — 다음 책 권유·구매 안내가 같은 모양이다. */
function metaChips(parent, book, chipFill, chipInk) {
  const meta = add(parent, AL('HORIZONTAL', '분야·쪽수', { gap: 4, main: 'CENTER', wrap: true, gapY: 4 }), 'FILL');
  for (const label of book.fields.slice(0, 3).concat(book.pages ? [book.pages] : [])) {
    const chip = AL('HORIZONTAL', label, { px: 8, py: 4, fill: chipFill, r: 4 });
    chip.appendChild(T(label, 'reg', 11, 17, chipInk));
    meta.appendChild(chip);
  }
  return meta;
}

/** 첫페이지장 — components/reading/ReadingIntro. 그 화의 사진에 검정 50%, 가운데에 마크·책 이름·표제·부제. */
function buildReadingIntro() {
  const s = screen('오늘의 독서 — 첫페이지장', 'ink');
  abs(s, rect('그 화의 사진 (앱에서는 그 화의 표지 사진)', W, H, '!graphite'), 0, 0);
  dim(s, 0.5);
  const body = AL('VERTICAL', '본문', { w: W, h: H, px: 28, pt: TOP + 32, pb: 32 + BOTTOM, gap: 16, main: 'CENTER', cross: 'CENTER' });
  abs(s, body, 0, 0);
  const symbol = add(body, AL('VERTICAL', '마크 자리', { h: 72, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FIXED');
  symbol.appendChild(coverMark(SEL.design.mark, 36, WHITE));
  const chip = AL('HORIZONTAL', '책 이름', { px: 8, py: 4, r: 4, fill: WHITE, fillOp: 0.2 });
  chip.appendChild(T(SEL.store.title, 'serif', 13, null, WHITE, { ls: -0.26 }));
  body.appendChild(chip);
  add(body, T(DATA.lesson.title, 'serif', 24, 34, WHITE, { ls: -0.48, align: 'CENTER' }), 'FILL');
  if (DATA.lesson.subtitle) add(body, T(DATA.lesson.subtitle, 'serifR', 16, 26, WHITE, { ls: -0.32, align: 'CENTER' }), 'FILL');
  return s;
}

/**
 * 본문을 끝까지 내린 순간 — 스크롤 보기(유튜브 있음)의 끝에 떠오르는 퀴즈 버튼(CardDeckDetail의 finishCta).
 * 마지막 문단과 버튼 사이는 100(FINISH_BREATH)이다.
 */
function buildScrollEnd() {
  const s = buildScrollMode(true);
  s.name = '오늘의 독서 — 본문 끝 + 퀴즈 버튼';
  const column = s.children.find((n) => n.name === '글');
  const pillTop = H - BOTTOM - 20 - 80;
  // 끝까지 내렸으므로 글의 끝이 버튼 위 100에 닿는다. 위로 넘친 것은 재생기 뒤로 가려진다.
  const playerBottom = TOP + 48 + PLAYER_H + FOLD_BAR_H;
  column.y = Math.min(playerBottom, pillTop - 100 - column.height);
  // 위 줄·재생기·접기 띠를 글 위로 다시 올린다.
  for (const name of ['상태바', '위 줄', '유튜브 재생기 자리', '접기 띠']) {
    const node = s.children.find((n) => n.name === name);
    if (node) s.appendChild(node);
  }
  const pill = AL('HORIZONTAL', '읽기 완료하고 퀴즈 풀기', { w: W - 32, h: 80, gap: 4, px: 20, py: 10, cross: 'CENTER', r: 9999, fill: '!ink' });
  const texts = add(pill, AL('VERTICAL', '글', { gap: 2, px: 8, pb: 8 }), 'FILL');
  const row = AL('HORIZONTAL', '읽기 진행', { gap: 4, cross: 'CENTER' });
  texts.appendChild(row);
  row.appendChild(T('읽기 진행', 'reg', 12, 24, WHITE, { op: 0.7 }));
  row.appendChild(T('100%', 'med', 14, 24, WHITE));
  texts.appendChild(T('읽기 완료하고 퀴즈 풀기', 'med', 18, 24, WHITE));
  const arrow = AL('HORIZONTAL', '화살표', { w: 40, h: 40, r: 9999, main: 'CENTER', cross: 'CENTER', fill: '!ember' });
  arrow.appendChild(chevron(26, WHITE, 'forward'));
  pill.appendChild(arrow);
  abs(s, pill, 16, pillTop);
  return s;
}

/**
 * 오늘의 퀴즈 — components/quiz/TodayQuiz(검은 화면). pick이 null이면 고르기 전이고, 고르면 아래에서
 * 주황 판이 올라와 맞고 틀림과 해설을 알린다. 마지막 문제의 버튼은 '완료'.
 */
function buildTodayQuiz(name, index, pick) {
  const quiz = QUIZZES[index];
  const answered = pick != null;
  const correct = pick === quiz.answer;
  const last = index === QUIZZES.length - 1;
  const s = screen(name, 'ink');
  const head = add(s, AL('HORIZONTAL', '위 줄', { w: W, h: 60 + TOP, pt: TOP, px: 12, cross: 'CENTER' }), 'FILL', 'FIXED');
  const back = AL('HORIZONTAL', '뒤로', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  back.appendChild(chevron(24, 'eggshell', 'back'));
  head.appendChild(back);
  const title = T('오늘의 퀴즈', 'med', 18, 25, 'eggshell', { align: 'CENTER' });
  abs(head, title, 56, TOP + 17.5);
  fixedWidth(title, W - 112);

  const body = scrollBody(s, { gap: 16, px: 20, pb: 24 });
  const box = add(body, AL('VERTICAL', '물음', { py: 20 }), 'FILL');
  add(box, T(`Q. ${quiz.question}`, 'med', 20, 24, 'eggshell', { ls: 0.15, align: 'CENTER' }), 'FILL');
  // 푼 만큼 주황 — 앞 문제는 다 풀었고, 이 문제는 골랐을 때만.
  const dots = add(body, AL('HORIZONTAL', '진행 점', { gap: 8, main: 'CENTER' }), 'FILL');
  QUIZZES.forEach((_, i) => {
    const done = i < index || (i === index && answered);
    const dot = figma.createEllipse();
    dot.name = done ? '점(푼 것)' : '점';
    dot.resize(6, 6);
    fill(dot, done ? 'ember' : 'smoke');
    dots.appendChild(dot);
  });
  const choices = add(body, AL('VERTICAL', '보기', { gap: 8 }), 'FILL');
  quiz.choices.forEach((choice, i) => {
    const no = i + 1;
    const isAnswer = answered && no === quiz.answer;
    const isMine = answered && no === pick && !correct;
    const row = add(choices, AL('HORIZONTAL', `${no}${isAnswer ? ' (정답)' : isMine ? ' (내 답)' : ''}`, { gap: 8, p: 12, r: 10, cross: 'CENTER', fill: isAnswer ? 'ember' : isMine ? '#0447FF' : WHITE, fillOp: isAnswer || isMine ? undefined : 0.15 }), 'FILL');
    row.appendChild(T(String(no), 'med', 13, 21, 'eggshell', { ls: 0.13 }));
    add(row, T(choice, 'med', 13, 21, 'eggshell', { ls: 0.13 }), 'FILL');
    if (isAnswer) row.appendChild(T('정답', 'med', 12, 21, 'eggshell'));
    if (isMine) row.appendChild(T('내 답', 'med', 12, 21, 'eggshell'));
  });

  const label = last ? '완료' : '다음';
  if (!answered) {
    const foot = add(s, AL('VERTICAL', '아래', { p: 20, pb: 20 + BOTTOM }), 'FILL');
    add(foot, button(label, label, { h: 52, r: 9999, fill: 'graphite', size: 16, lh: 24, color: 'smoke' }), 'FILL');
    return s;
  }
  const sheet = bottomSheet(s, '맞고 틀림', { radius: 20, gap: 20, pt: 32, px: 20, pb: 20 + BOTTOM, fill: 'ember' });
  const texts = add(sheet, AL('VERTICAL', '글', { gap: 8 }), 'FILL');
  add(texts, T(correct ? '정답이에요!' : '아쉬워요...!', 'med', 20, 22, 'eggshell', { ls: 0.14 }), 'FILL');
  add(texts, T(quiz.explanation, 'med', 14, 22, 'eggshell', { ls: 0.14 }), 'FILL');
  add(sheet, button(label, label, { h: 52, r: 9999, fill: 'eggshell', size: 16, lh: 24, color: 'ink' }), 'FILL');
  settle(sheet);
  return s;
}

/**
 * 오늘의 독서 완료 — components/reading/StudyComplete. 인용문과 출처, 퀴즈 정답 수, 연속 독서 칩,
 * 아래 버튼 둘. 다 떠오른 뒤의 모습이다. 마지막 화면 '다음 화 읽기'가 '마지막 화 입니다'(눌리지 않음).
 */
function buildStudyComplete(name, isLast) {
  const s = screen(name, 'ink');
  s.itemSpacing = 32;
  s.paddingLeft = 20;
  s.paddingRight = 20;
  s.paddingTop = TOP + 20;
  s.paddingBottom = BOTTOM + 20;
  const body = add(s, AL('VERTICAL', '본문', { gap: 32, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  const quote = add(body, AL('VERTICAL', '인용문', { gap: 8, px: 20, cross: 'CENTER' }), 'FILL');
  add(quote, T(`“${DATA.quote.ko}”`, 'serif', 22, 34, 'eggshell', { ls: -0.44, align: 'CENTER' }), 'FILL');
  add(quote, T(`『${DATA.quote.work}』`, 'med', 16, 24, 'ash', { align: 'CENTER' }), 'FILL');
  const score = AL('VERTICAL', '오늘의 퀴즈 정답', { cross: 'CENTER' });
  body.appendChild(score);
  const row = AL('HORIZONTAL', '맞힌 수', { gap: 10, cross: 'CENTER' });
  score.appendChild(row);
  const right = QUIZZES.length - 1;
  for (const [text, size, lh] of [[String(right), 64, 76], ['/', 40, 48], [String(QUIZZES.length), 64, 76]]) {
    const t = T(text, 'med', size, lh, 'eggshell');
    t.effects = GLOW;
    row.appendChild(t);
  }
  score.appendChild(T('오늘의 퀴즈 정답', 'med', 18, 25, 'eggshell'));
  const chip = AL('HORIZONTAL', '연속 독서', { px: 16, py: 8, r: 9999, fill: 'graphite' });
  chip.appendChild(emojiText(`🔥 ${DATA.streakDays}일째 독서중`, `${DATA.streakDays}일째 독서중`, 'med', 14, null, 'eggshell', { ls: 0.14 }));
  body.appendChild(chip);
  const buttons = add(s, AL('VERTICAL', '아래', { gap: 16, cross: 'CENTER' }), 'FILL');
  add(buttons, button('오늘 독서 완료하기', '오늘 독서 완료하기', { h: 56, r: 9999, fill: 'eggshell', size: 16, ls: 0.16, color: 'ink' }), 'FILL');
  const next = AL('HORIZONTAL', isLast ? '마지막 화 입니다 (눌리지 않음)' : '다음 화 읽기', { py: 8 });
  next.appendChild(T(isLast ? '마지막 화 입니다' : '다음 화 읽기', 'med', 14, null, isLast ? 'smoke' : 'ash', { ls: 0.14 }));
  buttons.appendChild(next);
  return s;
}

/** 구매 안내 — components/lesson/BookPurchaseNotice. 무료 편을 다 읽고 '다음 화 읽기'를 누르면 아래에서 올라온다. */
function buildPurchaseSheet() {
  const s = buildStudyComplete('오늘의 독서 — 구매 안내', false);
  dim(s, 0.5);
  const sheet = bottomSheet(s, '구매 안내', { radius: 24, pt: 20, px: 20, pb: 20 + BOTTOM, cross: 'CENTER', fill: 'eggshell' });
  const closeRow = add(sheet, AL('HORIZONTAL', '닫기 줄', { main: 'MAX' }), 'FILL');
  const close = AL('HORIZONTAL', '닫기', { w: 40, h: 40, main: 'CENTER', cross: 'CENTER' });
  close.appendChild(icon('close-outline', 24, 'ink'));
  closeRow.appendChild(close);
  const body = add(sheet, AL('VERTICAL', '본문', { gap: 28, pb: 32, cross: 'CENTER' }), 'FILL');
  const heading = add(body, AL('VERTICAL', '물음', { gap: 4 }), 'FILL');
  add(heading, T('뒷 내용이 궁금하신가요?', 'serif', 22, 35.2, 'ink', { ls: -0.44, align: 'CENTER' }), 'FILL');
  add(heading, T(`이 책에는 아직 잠긴 ${DATA.lockedCount}편이 남아 있어요`, 'reg', 13, 20, 'smoke', { ls: 0.13, align: 'CENTER' }), 'FILL');
  const art = cover(SEL.design, 120, 4);
  art.effects = LIFT;
  body.appendChild(art);
  const info = add(body, AL('VERTICAL', '책', { gap: 16, cross: 'CENTER' }), 'FILL');
  const titles = add(info, AL('VERTICAL', '제목', { gap: 4, cross: 'CENTER' }), 'FILL');
  add(titles, T(`『${SEL.title}』`, 'med', 16, 24, 'ink', { align: 'CENTER' }), 'FILL');
  add(titles, T(SEL.author, 'reg', 13, 20, 'smoke', { ls: 0.13, align: 'CENTER' }), 'FILL');
  metaChips(info, SEL, 'stone', 'ink');
  const price = SEL.price ? `${SEL.price.toLocaleString('ko-KR')}원 · 책 구매하기` : '책 보러 가기';
  add(sheet, button('구매하기', price, { h: 60, r: 9999, fill: 'ember', size: 18, lh: 25, color: 'eggshell' }), 'FILL');
  settle(sheet);
  return s;
}

/**
 * 광고_다음책 — components/reading/NextBookAd. 바탕은 그 책 표지의 두 색(잉크 → 종이) 그라데이션에
 * 검정 50%. 권하는 책은 읽을 수 있는 책 가운데 지금 읽는 책이 아닌 첫 권으로 가정했다(앱은 무작위).
 */
function buildNextBookAd() {
  const book = DATA.nextBook;
  const s = screen('오늘의 독서 — 다음 책 권유', 'ink');
  const backdrop = rect('표지 두 색', W, H, book.design.ink);
  backdrop.fills = [
    {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [[0, 1, 0], [-1, 0, 1]],
      gradientStops: [
        { position: 0, color: Object.assign(rgb(book.design.ink), { a: 1 }) },
        { position: 1, color: Object.assign(rgb(book.design.paper), { a: 1 }) },
      ],
    },
  ];
  abs(s, backdrop, 0, 0);
  dim(s, 0.5);
  const content = AL('VERTICAL', '내용', { w: W, h: H, px: 20, pt: TOP + 20, pb: BOTTOM + 20 });
  abs(s, content, 0, 0);
  const body = add(content, AL('VERTICAL', '본문', { gap: 32, main: 'CENTER', cross: 'CENTER' }), 'FILL', 'FILL');
  const heading = add(body, AL('VERTICAL', '권하는 말', { gap: 8, px: 20, cross: 'CENTER' }), 'FILL');
  add(heading, T('다음에 이 책을 만나볼까요?', 'serif', 22, 34, 'eggshell', { ls: -0.44, align: 'CENTER' }), 'FILL');
  if (book.promo) add(heading, T(book.promo, 'med', 16, 24, 'ash', { align: 'CENTER' }), 'FILL');
  const art = cover(book.design, 120, 4);
  art.effects = LIFT;
  body.appendChild(art);
  const info = add(body, AL('VERTICAL', '책', { gap: 16, cross: 'CENTER' }), 'FILL');
  const titles = add(info, AL('VERTICAL', '제목', { gap: 4, cross: 'CENTER' }), 'FILL');
  add(titles, T(`『${book.title}』`, 'med', 16, 24, 'eggshell', { align: 'CENTER' }), 'FILL');
  add(titles, T(book.author, 'reg', 13, 20, 'eggshell', { ls: 0.13, align: 'CENTER' }), 'FILL');
  metaChips(info, book, 'graphite', 'eggshell');
  const buttons = add(content, AL('VERTICAL', '아래', { gap: 16 }), 'FILL');
  add(buttons, button('내일은 이 책으로 읽을래요', '내일은 이 책으로 읽을래요', { h: 56, r: 9999, fill: 'eggshell', size: 16, ls: 0.16, color: 'ink' }), 'FILL');
  add(buttons, button('아니오, 괜찮아요', '아니오, 괜찮아요', { h: 56, r: 9999, stroke: ['stone', 1], size: 16, ls: 0.16, color: 'eggshell' }), 'FILL');
  return s;
}

/**
 * 광고_구글애즈 — components/reading/GoogleAdScreen. 광고 자리는 예시 그림(assets/images/ads/sample-google-ad.png)이
 * 서는 자리만 비워 둔다. ready가 거짓이면 10초를 세는 중(숫자만, 눌리지 않음), 참이면 '홈으로 돌아가기 →'.
 */
function buildGoogleAd(ready) {
  const s = screen(ready ? '오늘의 독서 — 광고 (다 센 뒤)' : '오늘의 독서 — 광고 (세는 중)', 'ink');
  const top = add(s, AL('VERTICAL', '위', { pt: TOP + 40, pb: 32, px: 20, cross: 'CENTER' }), 'FILL');
  add(top, T('시청해 주신 광고는 더 좋은 앱을\n만드는 데 도움이 됩니다.', 'med', 20, 32, 'eggshell', { ls: -0.8, align: 'CENTER' }), 'FILL');
  const ad = AL('VERTICAL', '광고 자리', { w: W, h: Math.round(W / (360 / 375)), gap: 8, main: 'CENTER', cross: 'CENTER', fill: '!stone' });
  ad.appendChild(T('광고 (예시 그림 자리)', 'med', 14, 20, '!smoke'));
  ad.appendChild(T('assets/images/ads/sample-google-ad.png', 'reg', 11, 17, '!ash'));
  add(s, ad, 'FILL', 'FIXED');
  const bottom = add(s, AL('VERTICAL', '아래', { gap: 16, pt: 20, px: 20, pb: 20 + BOTTOM, main: 'MAX', cross: 'CENTER' }), 'FILL', 'FILL');
  add(
    bottom,
    button(ready ? '홈으로 돌아가기' : '10초 세는 중', ready ? '홈으로 돌아가기' : '10', { h: 56, r: 9999, gap: 6, fill: 'eggshell', size: 16, ls: 0.16, color: 'ink', after: ready ? icon('arrow-forward', 18, 'ink') : null }),
    'FILL',
  );
  const remove = AL('HORIZONTAL', '광고 제거하기', { py: 8 });
  remove.appendChild(T('광고 제거하기', 'med', 14, null, 'ember', { ls: 0.14 }));
  bottom.appendChild(remove);
  return s;
}

/** 서점 외 전체 — 메뉴의 '서점 빼고 전부 내보내기'. 설정(미리보기 모음)은 출시 빌드에서 숨기므로 뺀다. */
const INTRO_SCREENS = INTRO_SLIDES.map((_, i) => () => buildIntro(null, i));
const SPLASH_SCREENS = [...INTRO_SCREENS, buildIntroLogin, buildQ1, buildFrequency, buildPurpose, buildLoading, buildQ2, buildQ3, buildQ4];
/** 마이페이지 계열 — 전부 다크다. 책 보기 > 배경음악 > TTS 순서. */
const buildPlannedReport = () => buildReport('서재 책 상세 — 읽을 예정인 책', { title: '읽을 예정인 책', book: DATA.shelf[0] });
const MYPAGE_SCREENS = [buildMyPage, buildPlanned, buildFinished, buildBookTheme, buildBgm, buildTts, buildPermissions, buildAccount, () => buildReport('리포트'), buildPlannedReport, buildReportMenu, buildWrongQuizzes, buildBookmarks, buildNotes].map(dark);
/** 첫 실행 — 지금 앱의 판(10월 16일 시안으로 고친 것, components/splash). */
const DRAFT_SPLASH_SCREENS = [...INTRO_SCREENS, buildIntroLogin, buildQ1, buildFrequency, buildPurpose, buildLoading, buildQ2, buildQ3, buildQ4, buildWelcome].map(draft);
/** 오늘의 독서 — 홈의 읽기 버튼으로 책이 펼쳐진 뒤 지나는 차례(components/reading/ReadingFlow). */
const LAST_QUIZ = QUIZZES.length - 1;
const READING_SCREENS = [
  buildReadingIntro,
  () => {
    const s = buildScrollMode(true);
    s.name = '오늘의 독서 — 본문 (유튜브 있음)';
    return s;
  },
  buildScrollEnd,
  () => buildTodayQuiz('오늘의 퀴즈 — 고르기 전', 0, null),
  () => buildTodayQuiz('오늘의 퀴즈 — 틀렸을 때', WRONG_INDEX, WRONG_PICK),
  () => buildTodayQuiz('오늘의 퀴즈 — 마지막 문제 맞혔을 때', LAST_QUIZ, QUIZZES[LAST_QUIZ].answer),
  () => buildStudyComplete('오늘의 독서 — 독서 완료', false),
  () => buildStudyComplete('오늘의 독서 — 독서 완료 (마지막 화)', true),
  buildPurchaseSheet,
  buildNextBookAd,
  () => buildGoogleAd(false),
  () => buildGoogleAd(true),
];
const SCROLL_SCREENS = [() => buildScrollMode(true), () => buildScrollMode(false)];

/**
 * 지금 앱에 있는 화면 전부(서점 빼고). 책 넘김 효과·카드로 보기는 앱에서 걷어 내어 뺐다 —
 * 본문은 이제 늘 스크롤 보기이고, 퀴즈·리포트·구매는 '오늘의 독서' 줄의 새 화면들이 대신한다.
 */
const ALL_BUT_STORE_GROUPS = [
  ['첫 실행', DRAFT_SPLASH_SCREENS],
  ['홈 · 알람 · 목차', [buildHome, dark(buildAlarm), dark(buildToc)]],
  ['오늘의 독서 — 첫페이지장부터 광고까지', READING_SCREENS],
  ['읽기 — 스크롤 보기 (유튜브 없음)', [() => buildScrollMode(false)]],
  ['마이페이지', MYPAGE_SCREENS],
];

/** 지난번(10월 10일) 내보낸 뒤로 바뀐 화면만 — 메뉴의 '바뀐 화면만 내보내기'. */
const UPDATED_GROUPS = [
  ['오늘의 독서 — 첫페이지장부터 광고까지 (새 화면)', READING_SCREENS],
  ['첫 실행 — 시안대로 고침(문구·분야·56 버튼·밝은 환영 창)', DRAFT_SPLASH_SCREENS],
  ['마이페이지 — 책 보기 설정 · 토글 · 서재 책 상세', [dark(buildBookTheme), dark(buildPermissions), dark(buildPlannedReport)]],
  ['알람 — 토글', [dark(buildAlarm)]],
];
const UPDATED_SECTION_NAME = '앱 구현 — 바뀐 화면 10월 16일 (코드에서 내보냄)';
const ALL_BUT_STORE_SECTION_NAME = '앱 구현 — 서점 외 전체 (코드에서 내보냄)';

// ── 내보내기 ───────────────────────────────────────────────────────────────
const BOOKSTORE_SCREENS = [
  buildStoreHome,
  () => buildStoreList('하루 서점 — 목록(전체 도서)', '전체 도서', DATA.grid),
  () => buildStoreList('하루 서점 — 목록(읽기 가능)', '읽기 가능', STORE.readable),
  buildStoreSearch,
  buildBookDetail,
];
const GROUPS = [
  ...ALL_BUT_STORE_GROUPS,
  ['하루 서점', BOOKSTORE_SCREENS],
];

const SECTION_NAME = '앱 구현 — 전체 화면 10월 16일 (코드에서 내보냄)';
/** 하루 서점만 따로 내보낼 때(메뉴의 둘째 명령). */
const BOOKSTORE_GROUPS = [['하루 서점', BOOKSTORE_SCREENS]];
const BOOKSTORE_SECTION_NAME = '앱 구현 — 하루 서점 (코드에서 내보냄)';
const GAP = 60;
const ROW_GAP = 160;

async function exportScreens(groups, sectionName) {
  const page = figma.root.children.find((p) => p.name === '디자인') || figma.currentPage;
  await figma.setCurrentPageAsync(page);
  await loadFonts();
  await loadStyles();

  // 이미 있는 것의 아래에 놓는다 — 기존 프레임을 덮지 않는다.
  let left = 0;
  let bottom = 0;
  for (const node of page.children) {
    left = Math.min(left, node.x);
    bottom = Math.max(bottom, node.y + node.height);
  }
  const section = figma.createSection();
  section.name = sectionName;
  section.x = left;
  section.y = bottom + 200;

  const failed = [];
  let built = 0;
  let width = 0;
  let y = 200;
  for (const [title, builders] of groups) {
    const label = T(title, 'med', 32, null, 'ink');
    section.appendChild(label);
    label.x = GAP;
    label.y = y - 80;
    let x = GAP;
    // 첫 화면처럼 펼친 길이로 그린 화면이 있어 줄 높이는 가장 긴 화면을 따른다.
    let rowH = H;
    for (const build of builders) {
      try {
        const frame = build();
        section.appendChild(frame);
        frame.x = x;
        frame.y = y;
        x += W + GAP;
        rowH = Math.max(rowH, frame.height);
        built += 1;
      } catch (error) {
        failed.push(`${title} #${builders.indexOf(build) + 1}: ${error && error.message ? error.message : error}`);
      }
    }
    width = Math.max(width, x);
    y += rowH + ROW_GAP;
  }
  // 칩 원본은 섹션 맨 위 한 줄에 모아 둔다.
  let cx = GAP;
  for (const key of Object.keys(chipMasters)) {
    section.appendChild(chipMasters[key]);
    chipMasters[key].x = cx;
    chipMasters[key].y = 40;
    cx += chipMasters[key].width + 16;
  }
  section.resizeWithoutConstraints(Math.max(width, cx), y - ROW_GAP + GAP);
  await Promise.all(jobs);

  figma.viewport.scrollAndZoomIntoView([section]);
  const notes = [`${built}개 화면을 그렸습니다.`];
  if (fallbacks.length > 0) notes.push(`이 PC에 없는 서체는 Noto로 대신했습니다: ${fallbacks.join(', ')}`);
  if (failed.length > 0) {
    notes.push(`그리지 못한 화면 ${failed.length}개 — 콘솔을 확인하세요.`);
    console.error(failed.join('\n'));
  }
  figma.closePlugin(notes.join(' '));
}

/**
 * 먼저 내보낸 온보딩 화면의 서체를 앱의 것으로 바꾼다.
 *
 * 그 화면들은 서체가 없는 환경에서 그려져 Noto로 들어가 있다. 고른 것이 있으면 그 안에서,
 * 없으면 온보딩 섹션 전체에서 바꾼다.
 */
async function refont() {
  await loadFonts();
  if (fallbacks.some((name) => !name.startsWith('DM Serif'))) {
    figma.closePlugin(`이 PC에 서체가 없습니다: ${fallbacks.join(', ')}`);
    return;
  }
  const map = {
    'Noto Sans KR/Light': F.light,
    'Noto Sans KR/Regular': F.reg,
    'Noto Sans KR/Medium': F.med,
    'Noto Serif KR/SemiBold': F.serif,
    'Noto Serif KR/Regular': F.serifR,
  };
  const roots = figma.currentPage.selection.length > 0
    ? figma.currentPage.selection
    : figma.currentPage.children.filter((n) => n.type === 'SECTION' && n.name.startsWith('앱 구현 — 온보딩'));
  if (roots.length === 0) {
    figma.closePlugin('바꿀 화면을 고르거나, 온보딩 섹션이 있는 페이지에서 실행하세요.');
    return;
  }
  let changed = 0;
  for (const root of roots) {
    const texts = root.type === 'TEXT' ? [root] : root.findAllWithCriteria({ types: ['TEXT'] });
    for (const text of texts) {
      for (const segment of text.getStyledTextSegments(['fontName'])) {
        const next = map[`${segment.fontName.family}/${segment.fontName.style}`];
        if (!next) continue;
        await figma.loadFontAsync(segment.fontName);
        text.setRangeFontName(segment.start, segment.end, next);
        changed += 1;
      }
    }
  }
  figma.closePlugin(`글 ${changed}곳의 서체를 바꿨습니다.`);
}

const run =
  figma.command === 'refont'
    ? refont()
    : figma.command === 'bookstore'
      ? exportScreens(BOOKSTORE_GROUPS, BOOKSTORE_SECTION_NAME)
      : figma.command === 'all-but-store'
        ? exportScreens(ALL_BUT_STORE_GROUPS, ALL_BUT_STORE_SECTION_NAME)
        : figma.command === 'updated'
          ? exportScreens(UPDATED_GROUPS, UPDATED_SECTION_NAME)
          : exportScreens(GROUPS, SECTION_NAME);
run.catch((error) => {
  console.error(error);
  figma.closePlugin(`멈췄습니다: ${error && error.message ? error.message : error}`);
});
