/**
 * 피그마 플러그인(code.js)을 만든다 — `node tools/figma-export/build.mjs`
 *
 * 플러그인은 피그마 안에서 돌아 이 저장소의 파일을 읽을 수 없다. 그래서 화면에 찍을 값
 * (책·목차·퀴즈·표지 값·아이콘)을 여기서 미리 뽑아 code.js 맨 위에 DATA로 박아 넣는다.
 * 값은 전부 data/*.json과 lib/*.ts에서 읽는다 — 이 파일이 지어내는 글은 없다.
 *
 * 아이콘은 앱이 쓰는 Ionicons 글꼴(@expo/vector-icons)에서 윤곽을 직접 꺼낸다. 앱과 같은
 * 판본의 같은 그림이 나오고, 새 패키지도 필요 없다.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// ── 분류(lib/tags.ts와 같은 셈) ────────────────────────────────────────────
const taxonomy = readJson('data/tag-taxonomy.json');
const TAG_TO_FIELDS = new Map();
for (const group of taxonomy.fieldGroups) {
  for (const tag of group.tags) TAG_TO_FIELDS.set(tag, [...(TAG_TO_FIELDS.get(tag) ?? []), group.name]);
}
function fieldsOf(tags) {
  const found = new Set();
  for (const tag of tags) for (const name of TAG_TO_FIELDS.get(tag) ?? []) found.add(name);
  return [...found];
}
const FIELD_NAMES = taxonomy.fieldGroups.map((g) => g.name);

// ── lib/*.ts에서 값 꺼내기 ─────────────────────────────────────────────────
/** `const NAME ... = {` 뒤의 객체 리터럴을 통째로 잘라 값으로 만든다. */
function objectLiteral(source, name) {
  const at = source.indexOf(`const ${name}`);
  if (at < 0) throw new Error(`${name}을 찾지 못했습니다`);
  const start = source.indexOf('{', source.indexOf('=', at));
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return new Function(`return (${source.slice(start, i + 1)});`)();
  }
  throw new Error(`${name}의 끝을 찾지 못했습니다`);
}

const COVER_DESIGNS = objectLiteral(read('lib/coverDesign.ts'), 'COVER_DESIGNS');

const bookstoreSource = read('lib/bookstore.ts');
const BOOKSTORE = [...bookstoreSource.matchAll(/id: '(\w+)',\s*title: '([^']+)',\s*author: '([^']+)'/g)].map(
  ([, id, title, author]) => ({ id, title, author }),
);
const READABLE = [...bookstoreSource.slice(bookstoreSource.indexOf('READABLE_BOOK_IDS')).split('];')[0].matchAll(/'(\w+)'/g)].map((m) => m[1]);
const BGM = [...read('lib/bgm.ts').matchAll(/\{ id: '(\w+)', label: '([^']+)'/g)].map(([, id, label]) => ({ id, label }));
if (BOOKSTORE.length === 0 || READABLE.length === 0 || BGM.length === 0) {
  throw new Error('lib/bookstore.ts 또는 lib/bgm.ts의 모양이 바뀌었습니다 — build.mjs의 정규식을 맞춰 주세요');
}

// ── 카탈로그 ───────────────────────────────────────────────────────────────
const catalog = readJson('data/bookstore-catalog.json').books;
function entry(book) {
  return {
    id: book.id,
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    price: book.price,
    pages: book.pages,
    sections: book.sections.filter((s) => s.paragraphs.some((p) => p.trim() !== '')),
    fields: fieldsOf(book.tags),
    readable: book.bookId !== null && READABLE.includes(book.bookId),
    design: book.bookId ? COVER_DESIGNS[book.bookId] : book.coverDesign,
  };
}
const byBookId = (bookId) => entry(catalog.find((b) => b.bookId === bookId));

// ── 서점 첫 화면 — components/bookstore/BookstoreHome과 같은 셈 ────────────
/** 2026년에 나온 책을 신간으로 본다(BookstoreHome의 NEW_SINCE). */
const NEW_SINCE = '2026-01-01';
/** 한 기획전에 묶는 책의 상한(lib/exhibitions의 MAX_EXHIBITION_BOOKS). */
const MAX_EXHIBITION_BOOKS = 3;
const exhibitions = readJson('data/exhibitions.json').exhibitions.map((raw) => ({
  title: raw.title,
  subtitle: raw.subtitle,
  books: raw.books
    .map((id) => catalog.find((b) => b.id === id))
    .filter(Boolean)
    .slice(0, MAX_EXHIBITION_BOOKS)
    .map(entry),
}));
const readableBooks = catalog.filter((b) => b.bookId !== null && READABLE.includes(b.bookId)).map(entry);
const freshBooks = catalog.filter((b) => b.pubDate >= NEW_SINCE).reverse().map(entry);
/** 추천 검색어 — 분야 이름을 권수 많은 순으로(BookstoreSearch). */
const fieldTally = {};
for (const book of catalog) for (const name of fieldsOf(book.tags)) fieldTally[name] = (fieldTally[name] ?? 0) + 1;
const recommended = FIELD_NAMES.filter((name) => (fieldTally[name] ?? 0) > 0).sort((a, b) => fieldTally[b] - fieldTally[a]);

// ── 클래식(지금 읽는 책으로 가정) ──────────────────────────────────────────
const SELECTED = 'classic';
const tracks = readJson('data/tracks.json').tracks;
const total = tracks.length;
/** lib/progress.ts의 getFreeLessonCount와 같은 셈. */
const freeCount = Math.min(total, Math.max(2, Math.floor(total * 0.1)));
const selected = byBookId(SELECTED);
const totalPages = Number(selected.pages.match(/\d+/)?.[0]) || total;
const perLesson = Math.max(1, Math.round(totalPages / total));
const first = tracks[0];
// 본문은 문단 하나가 카드 한 장이다 — 200자를 넘는 문단이 생기면 앱은 그것을 나눈다
// (lib/card-pages의 splitParagraphToCards). 그때는 여기 장 수가 앱과 어긋난다.
const long = first.story.filter((p) => p.length >= 200).length;
if (long > 0) console.warn(`[figma-export] 200자를 넘는 문단이 ${long}개 있습니다 — 장 수가 앱과 다를 수 있습니다.`);

// ── 아이콘 — Ionicons.ttf에서 윤곽을 꺼낸다 ────────────────────────────────
const ICON_NAMES = [
  'book', 'notifications-outline', 'person', 'list', 'stats-chart', 'search', 'chevron-down',
  'checkmark', 'close-outline', 'swap-vertical', 'lock-closed', 'layers-outline', 'sparkles-outline',
  'search-outline', 'grid-outline', 'reader-outline', 'library-outline', 'brush-outline', 'bulb-outline', 'language-outline',
  'create-outline', 'musical-notes-outline', 'heart-outline', 'globe-outline', 'book-outline', 'close', 'close-circle',
  'musical-note-outline', 'color-palette-outline', 'add', 'sync', 'ellipsis-vertical', 'eye-outline',
  'trash-outline', 'headset', 'create', 'bookmark-outline', 'bookmark', 'play', 'pause', 'arrow-up',
  'logo-youtube', 'albums-outline', 'text-outline', 'person-circle-outline', 'chevron-forward', 'alarm-outline', 'mic-outline', 'headset-outline',
];
function loadIcons(names) {
  const base = 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons';
  const buf = fs.readFileSync(path.join(root, base, 'Fonts/Ionicons.ttf'));
  const glyphMap = readJson(`${base}/glyphmaps/Ionicons.json`);

  const tables = {};
  for (let i = 0; i < buf.readUInt16BE(4); i += 1) {
    const o = 12 + i * 16;
    tables[buf.toString('ascii', o, o + 4)] = buf.readUInt32BE(o + 8);
  }
  const longLoca = buf.readInt16BE(tables.head + 50) === 1;
  // 그림이 앉는 정사각형은 OS/2의 typo 값(448 ~ -64)이다. hhea 값(454 ~ -71)으로 재면
  // 아이콘이 6만큼 아래로 내려앉는다.
  const ascent = buf.readInt16BE(tables['OS/2'] + 68);
  const descent = buf.readInt16BE(tables['OS/2'] + 70);
  const hMetrics = buf.readUInt16BE(tables.hhea + 34);

  /** 코드포인트 → 글리프 번호. 4번(BMP)과 12번 형식만 읽는다. */
  const glyphOf = (() => {
    const cmap = tables.cmap;
    let f4 = 0;
    let f12 = 0;
    for (let i = 0; i < buf.readUInt16BE(cmap + 2); i += 1) {
      const sub = cmap + buf.readUInt32BE(cmap + 4 + i * 8 + 4);
      const format = buf.readUInt16BE(sub);
      if (format === 4) f4 = sub;
      if (format === 12) f12 = sub;
    }
    return (code) => {
      if (f12) {
        for (let i = 0; i < buf.readUInt32BE(f12 + 12); i += 1) {
          const g = f12 + 16 + i * 12;
          const start = buf.readUInt32BE(g);
          if (code >= start && code <= buf.readUInt32BE(g + 4)) return buf.readUInt32BE(g + 8) + (code - start);
        }
      }
      if (f4) {
        const segs = buf.readUInt16BE(f4 + 6) / 2;
        const ends = f4 + 14;
        const starts = ends + segs * 2 + 2;
        const deltas = starts + segs * 2;
        const ranges = deltas + segs * 2;
        for (let i = 0; i < segs; i += 1) {
          const end = buf.readUInt16BE(ends + i * 2);
          const start = buf.readUInt16BE(starts + i * 2);
          if (code < start || code > end) continue;
          const delta = buf.readInt16BE(deltas + i * 2);
          const range = buf.readUInt16BE(ranges + i * 2);
          if (range === 0) return (code + delta) & 0xffff;
          const g = buf.readUInt16BE(ranges + i * 2 + range + (code - start) * 2);
          return g === 0 ? 0 : (g + delta) & 0xffff;
        }
      }
      return 0;
    };
  })();

  const locaAt = (i) => (longLoca ? buf.readUInt32BE(tables.loca + i * 4) : buf.readUInt16BE(tables.loca + i * 2) * 2);

  /** 글리프의 윤곽들 — 점은 {x, y, on}. 합성 글리프는 풀어서 돌려준다. */
  function contoursOf(glyph, depth = 0) {
    const start = tables.glyf + locaAt(glyph);
    if (locaAt(glyph + 1) === locaAt(glyph) || depth > 4) return [];
    const count = buf.readInt16BE(start);
    let p = start + 10;

    if (count < 0) {
      const out = [];
      for (;;) {
        const flags = buf.readUInt16BE(p);
        const child = buf.readUInt16BE(p + 2);
        p += 4;
        let dx;
        let dy;
        if (flags & 1) { dx = buf.readInt16BE(p); dy = buf.readInt16BE(p + 2); p += 4; }
        else { dx = buf.readInt8(p); dy = buf.readInt8(p + 1); p += 2; }
        let [a, b, c, d] = [1, 0, 0, 1];
        const f2 = () => { const v = buf.readInt16BE(p) / 16384; p += 2; return v; };
        if (flags & 8) { a = d = f2(); }
        else if (flags & 0x40) { a = f2(); d = f2(); }
        else if (flags & 0x80) { a = f2(); b = f2(); c = f2(); d = f2(); }
        for (const contour of contoursOf(child, depth + 1)) {
          out.push(contour.map((pt) => ({ x: a * pt.x + c * pt.y + dx, y: b * pt.x + d * pt.y + dy, on: pt.on })));
        }
        if (!(flags & 0x20)) break;
      }
      return out;
    }

    const ends = [];
    for (let i = 0; i < count; i += 1) { ends.push(buf.readUInt16BE(p)); p += 2; }
    p += 2 + buf.readUInt16BE(p);
    const points = count === 0 ? 0 : ends[count - 1] + 1;
    const flags = [];
    while (flags.length < points) {
      const flag = buf[p]; p += 1;
      flags.push(flag);
      if (flag & 8) { for (let r = buf[p]; r > 0; r -= 1) flags.push(flag); p += 1; }
    }
    const axis = (short, same) => {
      const values = [];
      let v = 0;
      for (const flag of flags) {
        if (flag & short) { v += flag & same ? buf[p] : -buf[p]; p += 1; }
        else if (!(flag & same)) { v += buf.readInt16BE(p); p += 2; }
        values.push(v);
      }
      return values;
    };
    const xs = axis(2, 16);
    const ys = axis(4, 32);
    const out = [];
    let from = 0;
    for (const end of ends) {
      const contour = [];
      for (let i = from; i <= end; i += 1) contour.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
      out.push(contour);
      from = end + 1;
    }
    return out;
  }

  const n = (v) => String(Math.round(v * 10) / 10);
  const at = (pt) => `${n(pt.x)} ${n(ascent - pt.y)}`;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function pathOf(contour) {
    if (contour.length === 0) return '';
    const firstOn = contour.findIndex((pt) => pt.on);
    const start = firstOn < 0 ? mid(contour[contour.length - 1], contour[0]) : contour[firstOn];
    const rest = firstOn < 0 ? contour : [...contour.slice(firstOn + 1), ...contour.slice(0, firstOn)];
    let d = `M${at(start)}`;
    let off = null;
    for (const pt of rest) {
      if (pt.on) { d += off ? `Q${at(off)} ${at(pt)}` : `L${at(pt)}`; off = null; }
      else { if (off) d += `Q${at(off)} ${at(mid(off, pt))}`; off = pt; }
    }
    if (off) d += `Q${at(off)} ${at(start)}`;
    return `${d}Z`;
  }

  const icons = {};
  for (const name of names) {
    const code = glyphMap[name];
    const glyph = code === undefined ? 0 : glyphOf(code);
    if (!glyph) throw new Error(`Ionicons에 '${name}'이 없습니다`);
    const advance = buf.readUInt16BE(tables.hmtx + Math.min(glyph, hMetrics - 1) * 4);
    icons[name] = { w: advance, h: ascent - descent, d: contoursOf(glyph).map(pathOf).join('') };
  }
  return icons;
}

const now = new Date();
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (v) => String(v).padStart(2, '0');

// ── 읽기 화면의 장 — 앱의 장 나누기(lib/card-pages.ts)를 그대로 돌린다 ────────
/**
 * 카드에 무엇이 몇 장으로 담기는지는 앱이 글자 크기·카드 크기로 셈한다. 여기서 흉내 내면
 * 앱과 어긋나므로, TypeScript를 그 자리에서 풀어 앱의 셈을 그대로 부른다. 화면 크기는
 * 플러그인의 프레임(360×780)으로 못 박는다.
 */
function loadCardPages() {
  const require = createRequire(import.meta.url);
  const ts = require(path.join(root, 'node_modules/typescript'));
  const Module = require('node:module');
  const stubs = {
    'react-native': { Dimensions: { get: () => ({ width: 360, height: 780 }) } },
    '@/lib/books': { getLessonHeading: () => ({ title: '', subtitle: '' }) },
    '@/lib/coverDesign': { getCoverDesign: () => ({}) },
  };
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, ...rest) {
    if (stubs[request]) return request;
    if (request.startsWith('@/')) {
      return originalResolve.call(this, path.join(root, request.slice(2)) + '.ts', parent, ...rest);
    }
    return originalResolve.call(this, request, parent, ...rest);
  };
  for (const key of Object.keys(stubs)) {
    require.cache[key] = { id: key, filename: key, loaded: true, exports: stubs[key] };
  }
  require.extensions['.ts'] = (module, filename) => {
    const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    module._compile(out.outputText, filename);
  };
  try {
    return require(path.join(root, 'lib/card-pages.ts'));
  } finally {
    Module._resolveFilename = originalResolve;
  }
}
const cardPages = loadCardPages();
/** 플러그인의 상태바(32)와 아래 제스처 바(16) — plugin.js의 TOP·BOTTOM과 같은 값. */
const FRAME_TOP = 32;
const FRAME_BOTTOM = 16;
const firstLesson = { book: SELECTED, lesson: first };
const hasQuiz = (first.quizzes ?? []).length > 0;
const body = cardPages.BODY_METRICS.medium;
const pagesOf = (options) =>
  cardPages.buildCardPages(firstLesson, { hasQuiz, body, ...options }).map((page) => ({
    kind: page.kind,
    paragraph: page.paragraph ?? null,
  }));
const READER = {
  body,
  paragraphBreak: cardPages.PARAGRAPH_BREAK,
  /** 책 넘김 효과 — 카드 기본 크기. */
  turn: pagesOf({}),
  /** 카드로 보기 — 좌우 16, 헤더 아래부터 화면 끝 16 위까지. */
  card: pagesOf({
    cardW: cardPages.CARD_W_WIDE,
    cardH: cardPages.simpleCardHeight(780, FRAME_TOP, FRAME_BOTTOM),
  }),
  /** 스크롤 보기 — 문단을 나누지 않는다. */
  scroll: pagesOf({ cardW: cardPages.CARD_W_WIDE, split: false }),
};

/** 첫 권 고르기의 다섯 권 — components/splash/SplashBooks와 같은 셈(학습 가능한 책 앞의 다섯). */
const SPLASH_BOOKS = BOOKSTORE.filter((book) => READABLE.includes(book.id))
  .slice(0, 5)
  .map((book) => ({ title: book.title, author: book.author, design: COVER_DESIGNS[book.id] }));

const DATA = {
  /** 화면에 날짜가 필요한 자리(공부 리포트·마지막으로 읽은 날)에 쓴다 — 만든 날이다. */
  today: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
  lastRead: `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}(${DAYS[now.getDay()]})`,
  selected: { ...selected, store: BOOKSTORE.find((b) => b.id === SELECTED) },
  /** 책 정보 화면에 올릴 책 — 서재에 담지 않은 것으로 가정한다. */
  detail: { ...byBookId('quote'), store: BOOKSTORE.find((b) => b.id === 'quote') },
  /** 서재에 담아 둔 책 — 나중에 담은 것이 앞에 온다(useShelfBooks). */
  shelf: [byBookId('hanja'), selected],
  /** 서점 격자의 앞 여덟 권 — 고른 책이 맨 앞, 나머지는 카탈로그 차례. */
  grid: [selected, ...catalog.filter((b) => b.bookId !== SELECTED).slice(0, 7).map(entry)],
  store: {
    exhibitions,
    readable: readableBooks,
    fresh: freshBooks,
    fields: FIELD_NAMES,
    total: catalog.length,
    recommended,
    /** 검색 페이지에 미리 쌓여 있다고 가정한 최근 검색어 — 지어내지 않으려고 읽기 가능한 책 제목에서 고른다. */
    recent: readableBooks.slice(0, 3).map((b) => b.title),
  },
  lessons: tracks.map((t) => ({ title: t.title, subtitle: t.composer })),
  freeCount,
  lockedCount: total - freeCount,
  totalPages,
  perLesson,
  lesson: { title: first.title, subtitle: first.composer, story: first.story, quizzes: first.quizzes, youtubeId: first.youtubeId },
  bgm: BGM,
  reader: READER,
  splashBooks: SPLASH_BOOKS,
  fieldNames: FIELD_NAMES,
  icons: loadIcons(ICON_NAMES),
};

const source = fs.readFileSync(path.join(here, 'src/plugin.js'), 'utf8');
const banner = '// 만들어진 파일입니다 — 고칠 때는 src/plugin.js를 고치고 `node tools/figma-export/build.mjs`를 다시 돌리세요.\n';
fs.writeFileSync(path.join(here, 'code.js'), `${banner}const DATA = ${JSON.stringify(DATA)};\n${source}`);
console.log(`code.js를 만들었습니다 — 아이콘 ${ICON_NAMES.length}개, 서점 ${DATA.grid.length}권, 목차 ${total}화`);
