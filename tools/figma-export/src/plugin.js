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

const hexOf = (tok) => (TOKEN[tok] ? TOKEN[tok][1] : tok);
const rgb = (hex) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
});
const solid = (tok, opacity) =>
  opacity === undefined ? { type: 'SOLID', color: rgb(hexOf(tok)) } : { type: 'SOLID', color: rgb(hexOf(tok)), opacity };

function fill(node, tok, opacity) {
  if (tok == null) node.fills = [];
  else if (STYLE[tok] && opacity === undefined) jobs.push(node.setFillStyleIdAsync(STYLE[tok]));
  else node.fills = [solid(tok, opacity)];
  return node;
}

function stroke(node, tok, weight, opacity) {
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
    `<svg width="${size}" height="${size}" viewBox="0 0 ${glyph.w} ${glyph.h}" xmlns="http://www.w3.org/2000/svg"><path d="${glyph.d}" fill="${hexOf(tok)}"/></svg>`,
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
    `<svg width="${w + s}" height="${h + s}" viewBox="0 0 ${w + s} ${h + s}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${far} ${s / 2}L${near} ${(h + s) / 2}L${far} ${h + s / 2}" stroke="${hexOf(tok)}" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
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

/** 켜고 끄는 스위치. 켜진 색은 화면마다 다르다(주황·graphite). */
function toggle(on, onTok) {
  const t = AL('HORIZONTAL', on ? '토글/켜짐' : '토글/꺼짐', { w: 44, h: 24, px: 3, main: on ? 'MAX' : 'MIN', cross: 'CENTER', fill: on ? onTok : 'stone', r: 9999 });
  const knob = figma.createEllipse();
  knob.name = '손잡이';
  knob.resize(18, 18);
  fill(knob, 'eggshell');
  t.appendChild(knob);
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
  const h = AL('HORIZONTAL', '헤더', { w: W, h: 60 + TOP, pt: TOP, px: 12, main: 'SPACE_BETWEEN', cross: 'CENTER', fill: { light: 'eggshell', paper: 'taupe', dark: 'ink' }[tone] });
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
function myPage(name, title) {
  const s = screen(name, 'eggshell');
  header(s, title);
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
const DECK_PAGES = 1 + DATA.lesson.story.length + 1;

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
    d.appendChild(T(day, 'med', 16, 24, 'eggshell'));
    days.appendChild(d);
  }
  const footer = add(s, AL('HORIZONTAL', '아래', { p: 8, pb: 8 + BOTTOM, fill: 'eggshell' }), 'FILL');
  add(footer, button('저장', '저장', { h: 48, fill: 'ember', r: 4, size: 16, lh: 24, color: 'eggshell' }), 'FILL');
  return s;
}

function buildToc() {
  const s = screen('목차', 'eggshell');
  header(s, '목차');
  const body = scrollBody(s, {});
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

/** 덱의 뼈대 — 위 진행 바, 계정 줄, 카드, 재생기, 아래 줄. page는 0부터. */
function deck(name, page, kind) {
  const s = figma.createFrame();
  s.name = name;
  s.resize(W, H);
  s.clipsContent = true;
  s.fills = [solid(BROWN100)];

  const bars = AL('HORIZONTAL', '진행 바', { w: W, h: 14, px: 12, gap: 4, cross: 'CENTER' });
  abs(s, bars, 0, TOP);
  for (let i = 0; i < DECK_PAGES; i += 1) {
    const one = add(bars, AL('HORIZONTAL', i === page ? '칸(지금)' : '칸', { w: 10, h: 3, fill: BROWN50, r: 1.5, clip: true }), 'FILL', 'FIXED');
    if (i < page) add(one, rect('지나온 장', 10, 3, WHITE), 'FILL');
    // 지금 칸은 시간에 맞춰 차오른다 — 반쯤 찬 순간으로 둔다.
    if (i === page) one.appendChild(rect('차오르는 중', 4, 3, WHITE));
  }

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

  const card = AL('VERTICAL', `카드/${kind}`, { w: CARD_W, h: SHORT_CARD_H, gap: 16, px: 28, py: 32, main: 'CENTER', cross: 'CENTER', r: 20, clip: true, fill: kind === 'cover' ? SEL.design.paper : PAPER });
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
  for (const [label, glyph] of [['자동으로 읽기', 'headset'], ['감상 노트', 'create']]) {
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

function deckDesc(name) {
  const { s, card } = deck(name, 1, 'desc');
  add(card, T(DATA.lesson.story[0], 'serifR', 15, 26, BROWN100, { ls: -0.3 }), 'FILL');
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
  myRow(group, { icon: 'musical-note-outline', label: '배경음악 설정', value: DATA.bgm[0].label });
  myRow(group, { icon: 'color-palette-outline', label: '책 배경 설정', value: '기본', last: true });

  const bannerSlot = add(body, AL('VERTICAL', '배너 자리', { pt: 16 }), 'FILL');
  const banner = add(bannerSlot, AL('HORIZONTAL', '프리미엄 배너', { gap: 12, px: 20, py: 20, cross: 'CENTER', fill: 'ember' }), 'FILL');
  add(banner, T('평생 광고 없이\n쾌적하게 독서하세요', 'med', 13, 20, 'eggshell', { ls: 0.13 }), 'FILL');
  banner.appendChild(button('프리미엄 멤버십 보기', '프리미엄 멤버십 보기', { h: 40, px: 16, r: 9999, fill: 'eggshell', size: 13, lh: 20, ls: 0.13, color: 'ink' }));

  const group2 = add(body, AL('VERTICAL', '묶음', { pt: 8 }), 'FILL');
  myRow(group2, { label: '설정' });
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

function buildBgm() {
  const { s, body } = myPage('배경음악 설정', '배경음악 설정');
  hint(body, '오디오 듣기를 누르면 여기서 고른 음악이 낭독 아래에 깔립니다.', 'smoke', 16);
  DATA.bgm.forEach((option, index) => pickRow(body, option.label, null, index === 0, index === DATA.bgm.length - 1));
  return s;
}

function buildBookTheme() {
  const { s, body } = myPage('책 배경 설정', '책 배경 설정');
  hint(body, '오늘의 공부를 읽을 때의 종이색입니다.', 'smoke', 16);
  pickRow(body, '라이트', '밝은 종이 위에 검은 글씨', true, false);
  pickRow(body, '다크', '어두운 종이 위에 흰 글씨', false, true);
  const note = add(body, AL('VERTICAL', '알림', { px: 20, pt: 16 }), 'FILL');
  add(note, T('아직 고른 값이 화면에 반영되지 않습니다.', 'reg', 11, 17, 'ash'), 'FILL');
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
function buildReport(name) {
  const s = screen(name, 'eggshell');
  header(s, '리포트', { tone: 'dark', action: headerIcon('ellipsis-vertical') });
  const body = scrollBody(s, {});
  const band = add(body, AL('HORIZONTAL', '책', { gap: 12, px: 20, pb: 24, cross: 'CENTER', fill: 'ink' }), 'FILL');
  band.appendChild(cover(SEL.design, 56));
  const text = add(band, AL('VERTICAL', '글', { gap: 4 }), 'FILL');
  add(text, T(SEL.title, 'serif', 16, 24, 'eggshell'), 'FILL');
  add(text, T(SEL.author, 'reg', 13, 20, 'stone', { ls: 0.13 }), 'FILL');
  band.appendChild(button('선택 중', '선택 중', { h: 40, px: 16, r: 9999, fill: 'graphite', size: 13, lh: 20, ls: 0.13, color: 'stone' }));

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
    const box = add(choices, AL('HORIZONTAL', `${no}${answer ? ' (정답)' : mine ? ' (내 답)' : ''}`, { gap: 8, p: 12, r: 10, fill: answer ? RIGHT_BG : mine ? WRONG_BG : 'eggshell', stroke: [tok || 'stone', HAIR] }), 'FILL');
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

// ── 내보내기 ───────────────────────────────────────────────────────────────
const BOOKSTORE_SCREENS = [
  buildStoreHome,
  () => buildStoreList('하루 서점 — 목록(전체 도서)', '전체 도서', DATA.grid),
  () => buildStoreList('하루 서점 — 목록(읽기 가능)', '읽기 가능', STORE.readable),
  buildStoreSearch,
  buildBookDetail,
];
const GROUPS = [
  ['홈 · 읽기', [buildHome, buildAlarm, buildToc, buildDeckCover, () => deckDesc('읽기 — 본문 장'), buildDeckOutro, buildNoteSheet, () => buildQuiz('퀴즈 — 고르기 전', 0, null), () => buildQuiz('퀴즈 — 틀렸을 때', WRONG_INDEX, WRONG_PICK), buildStudyReport, buildPurchase]],
  ['하루 서점', BOOKSTORE_SCREENS],
  ['마이페이지', [buildMyPage, buildPlanned, buildFinished, buildBgm, buildBookTheme, buildPermissions, buildAccount, () => buildReport('리포트'), buildReportMenu, buildWrongQuizzes, buildBookmarks, buildNotes, buildSettings]],
];

const SECTION_NAME = '앱 구현 — 홈·서점·마이페이지 (코드에서 내보냄)';
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
      : exportScreens(GROUPS, SECTION_NAME);
run.catch((error) => {
  console.error(error);
  figma.closePlugin(`멈췄습니다: ${error && error.message ? error.message : error}`);
});
