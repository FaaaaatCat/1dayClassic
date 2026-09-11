/**
 * 데모 콘텐츠 전체 점검 — 화면을 열지 않고 잡을 수 있는 것만 여기서 잡는다.
 *
 * check:quizzes가 문항의 속(보기와 본문이 맞는지, 문단이 길지 않은지)을 보고, 여기서는
 * 그 바깥의 짜임을 본다 — 카탈로그와 데이터가 같은 수를 말하는지, 화면이 부르는 파일이
 * 실제로 있는지, 표지 색이 읽히는지, 글꼴에 없는 글자가 본문에 섞여 있는지.
 *
 * 실기기에서만 알 수 있는 것(글자가 뭉개지는지, 사진 위에서 시계가 읽히는지)은 여기서
 * 확인할 수 없다. 그건 사람이 봐야 한다.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const FAIL = [];
const WARN = [];
const fail = (what) => FAIL.push(what);
const warn = (what) => WARN.push(what);

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const source = (path) => readFileSync(path, 'utf8');

/** 책마다 어느 파일에 들었는지. tracks만 이름이 다르다(클래식). */
const BOOKS = {
  quote: 'quote', hanja: 'hanja', hanmun: 'hanmun', listening: 'listening',
  psychology: 'psychology', latin: 'latin', english: 'english', writing: 'writing',
  classic: 'tracks',
};

const lessonsOf = (file) => {
  const data = read(`data/${file}.json`);
  return Array.isArray(data) ? data : (data.lessons ?? data.tracks ?? []);
};

console.log('― 화수와 카탈로그 ―\n');

const catalog = read('data/bookstore-catalog.json').books;
const counts = {};

for (const [bookId, file] of Object.entries(BOOKS)) {
  const lessons = lessonsOf(file);
  counts[bookId] = lessons.length;

  const entry = catalog.find((book) => book.bookId === bookId);
  if (!entry) { fail(`${bookId}: 카탈로그에 없다`); continue; }

  // 목차 절의 '(n꼭지)'를 더하면 실제 화수와 같아야 한다 — 홈의 진도 막대가 이 수를 쓴다.
  const contents = entry.sections.find((s) => s.title === '목차')?.paragraphs ?? [];
  const claimed = contents.reduce((sum, line) => {
    const found = line.match(/\((\d+)꼭지\)/);
    return sum + (found ? Number(found[1]) : 0);
  }, 0);

  const same = claimed === lessons.length;
  if (!same) {
    // 아직 원고가 없는 책은 카탈로그가 '앞으로 나올 책'을 적고 있는 것이라 틀렸다고 하기
    // 어렵다. 다만 홈의 진도 막대가 이 수를 쓰므로 눈에는 띄어야 한다.
    const say = `${bookId}: 실제 ${lessons.length}화 / 카탈로그 ${claimed}꼭지`;
    if (lessons.length === 0) warn(`${say} — 준비 중인 책이라 카탈로그만 앞서 있다`);
    else fail(say);
  }
  console.log(`  ${bookId.padEnd(11)} ${String(lessons.length).padStart(2)}화${same ? '' : `  △ 카탈로그는 ${claimed}꼭지`}`);
}

console.log('\n― 화마다 갖춰야 할 것 ―\n');

for (const [bookId, file] of Object.entries(BOOKS)) {
  const lessons = lessonsOf(file);
  if (lessons.length === 0) { console.log(`  ${bookId.padEnd(11)} 비어 있음(준비 중)`); continue; }

  let noSource = 0;
  let badQuiz = 0;
  let noVideo = 0;

  for (const lesson of lessons) {
    if (!lesson.source) noSource += 1;

    const quizzes = lesson.quizzes ?? [];
    if (quizzes.length !== 3) badQuiz += 1;
    for (const quiz of quizzes) {
      const choices = quiz.choices ?? [];
      if (choices.length !== 4) badQuiz += 1;
      // answer는 1부터 센다 — 화면이 '2번'처럼 보여 주는 값 그대로다.
      if (typeof quiz.answer !== 'number' || quiz.answer < 1 || quiz.answer > choices.length) {
        badQuiz += 1;
      }
      if (!quiz.question || !quiz.explanation) badQuiz += 1;
    }

    // 클래식은 모든 화가 youtubeId를 들고 있어야 한다 — 없으면 그 화는 들을 수 없다.
    if (bookId === 'classic' && !lesson.youtubeId) noVideo += 1;
  }

  if (noSource) fail(`${bookId}: 출전이 빈 화 ${noSource}개`);
  if (badQuiz) fail(`${bookId}: 문항이 어긋난 자리 ${badQuiz}군데`);
  if (noVideo) fail(`${bookId}: youtubeId 없는 화 ${noVideo}개`);

  const notes = [noSource ? `출전 ${noSource}` : '', badQuiz ? `문항 ${badQuiz}` : '', noVideo ? `영상 ${noVideo}` : '']
    .filter(Boolean).join(' · ');
  console.log(`  ${bookId.padEnd(11)} ${notes || '갖춰짐'}`);
}

console.log('\n― 무료로 열리는 화 ―\n');

/** lib/progress의 규칙과 같아야 한다 — 전체의 10%, 다만 최소 두 화. */
const freeCount = (total) => Math.min(total, Math.max(2, Math.floor(total * 0.1)));
const progress = source('lib/progress.ts');
if (!progress.includes('FREE_LESSON_RATIO = 0.1') || !progress.includes('FREE_LESSON_MIN = 2')) {
  fail('lib/progress의 무료 규칙이 10%·최소 2가 아니다');
}
for (const [bookId, total] of Object.entries(counts)) {
  if (total === 0) continue;
  console.log(`  ${bookId.padEnd(11)} ${total}화 중 ${freeCount(total)}화`);
}

console.log('\n― 화면이 부르는 파일 ―\n');

/**
 * require('@/assets/...')로 부르는 것이 실제로 있는지. 없으면 번들이 통째로 깨진다.
 *
 * 화면 전체(app·components·lib)를 훑는다. 처음에는 lib/bookstore.ts 한 파일만 봤는데,
 * 그 사이 미리보기 모달이 유유출판사 책 표지 열 장을 부르고 있던 것을 놓쳤다.
 */
const sourceFiles = (dir) => readdirSync(dir, { recursive: true })
  .map(String)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => `${dir}/${file}`.replace(/\\/g, '/'));
const required = [...new Set(['app', 'components', 'lib']
  .flatMap(sourceFiles)
  // 주석은 걷고 본다 — 주석에 적힌 require 예시를 진짜 호출로 읽으면 없는 파일이라고 떠든다.
  .map((file) => source(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, ''))
  .flatMap((code) => [...code.matchAll(/require\('@\/(assets\/[^']+)'\)/g)].map((m) => m[1])))];
const missing = required.filter((path) => !existsSync(path));
if (missing.length) missing.forEach((path) => fail(`없는 파일: ${path}`));
console.log(`  부르는 에셋 ${required.length}개 · 없는 것 ${missing.length}개`);

const strays = readdirSync('assets/images/alarm').filter((f) => /\.(webp|png|jpg)$/i.test(f))
  .filter((f) => !required.some((path) => path.endsWith(f)));
if (strays.length) warn(`쓰이지 않는 알람 이미지: ${strays.join(', ')}`);

console.log('\n― 표지 ―\n');

const designSource = source('lib/coverDesign.ts');
const open = designSource.indexOf('{', designSource.indexOf('const COVER_DESIGNS'));
let depth = 0, end = -1;
for (let i = open; i < designSource.length; i += 1) {
  if (designSource[i] === '{') depth += 1;
  else if (designSource[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
}
const designs = new Function(`return ${designSource.slice(open, end).replace(/\/\/[^\n]*/g, '')}`)();

const LAYOUTS = ['band', 'plaque', 'rule', 'vertical', 'block', 'margin'];
const MARKS = ['underline', 'lowline', 'quadrant', 'halfmoon'];
const ALIGNS = ['top', 'center', 'bottom'];

function luminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

let dark = 0;
for (const [bookId, design] of Object.entries(designs)) {
  if (!LAYOUTS.includes(design.layout)) fail(`${bookId}: 모르는 짜임 ${design.layout}`);
  if (!MARKS.includes(design.mark)) fail(`${bookId}: 모르는 마크 ${design.mark}`);
  if (!ALIGNS.includes(design.align)) fail(`${bookId}: 모르는 정렬 ${design.align}`);
  if (!design.pattern?.length) warn(`${bookId}: 패턴이 비었다`);
  if (design.dark) dark += 1;

  const ratio = contrast(design.paper, design.ink);
  if (ratio < 4.5) fail(`${bookId}: 종이와 잉크의 대비 ${ratio.toFixed(2)}:1 (4.5 미만)`);
}

const catalogDark = catalog.filter((b) => b.coverDesign?.dark).length;
const catalogDesigned = catalog.filter((b) => b.coverDesign).length;
console.log(`  학습 ${Object.keys(designs).length}권 · 어두운 종이 ${dark}권`);
console.log(`  전시 ${catalogDesigned}권 · 어두운 종이 ${catalogDark}권 (${(catalogDark / catalogDesigned * 100).toFixed(1)}%)`);

/** 같은 출판사 책끼리 짜임이 겹치면 서점에서 나란히 놓였을 때 한 권처럼 보인다. */
const byImprint = {};
for (const [bookId, design] of Object.entries(designs)) {
  (byImprint[design.imprint] ??= []).push([bookId, design.layout]);
}
for (const [imprint, rows] of Object.entries(byImprint)) {
  const layouts = rows.map(([, layout]) => layout);
  if (new Set(layouts).size !== layouts.length) {
    warn(`${imprint}: 같은 짜임이 겹친다 — ${rows.map((r) => r.join(':')).join(', ')}`);
  }
}

console.log('\n― 글꼴에 없는 글자 ―\n');

function codepoints(path) {
  const buf = readFileSync(path);
  const tables = buf.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < tables; i += 1) {
    const at = 12 + i * 16;
    if (buf.toString('ascii', at, at + 4) === 'cmap') cmap = buf.readUInt32BE(at + 8);
  }
  let best = 0;
  const subtables = buf.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i += 1) {
    const sub = cmap + buf.readUInt32BE(cmap + 4 + i * 8 + 4);
    if (buf.readUInt16BE(sub) === 12) best = sub;
  }
  const has = new Set();
  const groups = buf.readUInt32BE(best + 12);
  for (let g = 0; g < groups; g += 1) {
    const at = best + 16 + g * 12;
    for (let c = buf.readUInt32BE(at); c <= buf.readUInt32BE(at + 4); c += 1) has.add(c);
  }
  return has;
}

const font = codepoints('assets/fonts/Eulyoo1945-SemiBold.ttf');
const holes = new Map();
for (const file of readdirSync('data').filter((f) => f.endsWith('.json'))) {
  for (const ch of source(`data/${file}`)) {
    const code = ch.codePointAt(0);
    // 본문에 쓰이는 글자만 본다. 아스키와 제어문자는 어느 글꼴에나 있다.
    if (code < 0x2000 || font.has(code)) continue;
    (holes.get(ch) ?? holes.set(ch, new Set()).get(ch)).add(file);
  }
}
// 표지에 찍히는 글자는 하나도 빠지면 안 된다 — 두부가 표지 한가운데에 뜬다.
const coverHoles = [];
for (const design of Object.values(designs)) {
  for (const text of [design.title, design.subtitle ?? '', design.author, design.imprint, ...design.pattern]) {
    for (const ch of text) {
      if (ch.codePointAt(0) >= 0x2000 && !font.has(ch.codePointAt(0))) coverHoles.push(ch);
    }
  }
}
if (coverHoles.length) fail(`표지에 글꼴 없는 글자: ${[...new Set(coverHoles)].join(' ')}`);
console.log(`  표지: ${coverHoles.length ? '✗ ' + [...new Set(coverHoles)].join(' ') : '없음'}`);
console.log(`  본문: ${holes.size ? [...holes.keys()].join(' ') + ` (${holes.size}자)` : '없음'}`);
if (holes.size) warn(`본문에 글꼴 없는 글자 ${holes.size}자 — 기기에서 □로 뜰 수 있다`);

console.log('\n― 유유 데이터 ―\n');

const archive = 'data/_archive/uupress';
if (!existsSync(archive)) fail('data/_archive/uupress가 없다 — 되살릴 자산을 잃었다');
else {
  const kept = readdirSync(archive, { recursive: true }).filter((f) => String(f).endsWith('.json'));
  console.log(`  보관 중인 파일 ${kept.length}개`);
  const live = readdirSync('data').filter((f) => f.endsWith('.json'));
  const leaked = live.filter((f) => source(`data/${f}`).includes('유유'));
  if (leaked.length) fail(`살아 있는 데이터에 '유유'가 남아 있다: ${leaked.join(', ')}`);
  console.log(`  살아 있는 데이터에 '유유': ${leaked.length ? '✗ ' + leaked.join(', ') : '없음'}`);
}

console.log('\n────────────────────────────\n');
for (const line of WARN) console.log(`  △ ${line}`);
for (const line of FAIL) console.log(`  ✗ ${line}`);
console.log(FAIL.length === 0 ? `\n문제 없음 ✓${WARN.length ? ` (눈여겨볼 것 ${WARN.length})` : ''}` : `\n어긋난 곳 ${FAIL.length}군데`);
process.exit(FAIL.length === 0 ? 0 : 1);
