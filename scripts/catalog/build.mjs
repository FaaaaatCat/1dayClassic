/**
 * 서점 카탈로그를 짓는다 — data/bookstore-catalog.json.
 *
 * 사람이 쓴 것(제목·저자·소개·목차)은 출판사별 json에 있고, 기계적인 것(id·isbn·정가·
 * 쪽수·발행일·표지 값)은 여기서 찍는다. 그래야 백여 권의 색과 셈이 어긋나지 않는다.
 *
 * 쪽수는 규격의 '꼭지 2~4쪽'을 따른다 — 꼭지 수를 세어 비율을 곱하고 앞뒤 24쪽을 더한다.
 * 나중에 적합 도서 스크리닝 스크립트가 이 두 값을 견주게 된다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HERE = new URL('.', import.meta.url);
const OUT = new URL('../../data/bookstore-catalog.json', import.meta.url);

/**
 * 출판사 넷의 표지 팔레트.
 *
 * 세 짝 가운데 A·B는 그 출판사의 학습 가능한 책이 쓰는 색을 그대로 쓴다(부록 A) — 한
 * 출판사의 책들이 서점 격자에서 한 식구로 보이게 하려는 것이다. C만 새로 더했다.
 */
const IMPRINTS = {
  밑줄사이: {
    mark: 'underline',
    palette: [
      { paper: '#F1EBDB', ink: '#1E3A62' },
      { paper: '#EDE7D8', ink: '#26221C' },
      { paper: '#E8B84B', ink: '#2A2113' },
      { paper: '#1F2D4D', ink: '#EDE3CB', dark: true },
      { paper: '#B23820', ink: '#F7EFE0' },
    ],
  },
  낮은문장: {
    mark: 'lowline',
    palette: [
      { paper: '#E5E9E2', ink: '#25382A' },
      { paper: '#211F1B', ink: '#E6DEC9', dark: true },
      { paper: '#2E6B4F', ink: '#F2EFE4' },
      { paper: '#DDE6EA', ink: '#1F3B46' },
      { paper: '#12312C', ink: '#CFE3D6', dark: true },
    ],
  },
  첫자리: {
    mark: 'quadrant',
    palette: [
      { paper: '#ECE7DF', ink: '#77382A' },
      { paper: '#F2EEE1', ink: '#1F3C6A' },
      { paper: '#2D5FB4', ink: '#F4F1E6' },
      { paper: '#F0D9C4', ink: '#8A2F1E' },
      { paper: '#231A2E', ink: '#E4D9EF', dark: true },
    ],
  },
  한밤서가: {
    mark: 'halfmoon',
    palette: [
      { paper: '#E3E9ED', ink: '#1C3143' },
      { paper: '#F6F4EF', ink: '#17191B' },
      { paper: '#EAE6EE', ink: '#2E2A3F' },
      { paper: '#141A2B', ink: '#D9DEEC', dark: true },
      { paper: '#102A33', ink: '#7FD4E4', dark: true },
    ],
  },
};

/**
 * 표지 색을 나눠 준다.
 *
 * 출판사마다 다섯 짝인데 그중 어두운 종이가 여섯(스물에 여섯, 30%)이다. 어두운 책이
 * 몇 권이어야 하는지는 서가 전체의 성질이라, 책마다 따로 고르면 맞출 수가 없다.
 * 그래서 색은 여기서 셈해 나눠 주고, 한 번 나눠 준 색은 책마다 swatch로 적어 둔다 — 책을
 * 하나 빼거나 넣어도 이미 있는 책의 색이 바뀌지 않게. 하루 교양을 뺐을 때 순서가 한 칸씩
 * 밀려 밑줄사이 스물두 권의 색이 한꺼번에 바뀐 적이 있다.
 *
 * 차례로 돌리면 격자에 색 줄무늬가 생기므로, 제목의 글자값으로 순서를 흩은 뒤 그 차례대로
 * 다섯 색을 돌린다 — 권수는 고르게 나뉘고 자리는 흩어진다.
 */
function sharePalettes(rows, palette) {
  const order = rows
    .map((row, index) => {
      let sum = 0;
      for (const ch of row.title) sum += ch.codePointAt(0);
      return { index, key: sum };
    })
    .sort((a, b) => a.key - b.key || a.index - b.index);

  const picked = new Array(rows.length);
  order.forEach((row, rank) => { picked[row.index] = rank % palette.length; });

  // 나란히 놓인 두 권이 같은 색이면 다음 권과 바꿔 준다.
  for (let i = 1; i < picked.length; i += 1) {
    if (picked[i] !== picked[i - 1]) continue;
    const swap = picked.findIndex((value, j) => j > i && value !== picked[i - 1] && value !== picked[i + 1]);
    if (swap > 0) { [picked[i], picked[swap]] = [picked[swap], picked[i]]; }
  }
  return picked;
}

/**
 * 꼭지 하나가 차지하는 쪽수 — 규격의 2~4쪽 안에서 정한다.
 *
 * 돌려 쓰지 않고 꼭지 수에 따라 정한다. 꼭지가 많은 책은 한 꼭지가 짧고 적은 책은 길다는
 * 것이 실제로 그렇고, 돌려 쓰면 꼭지 이백스물다섯 개인 책이 구백 쪽이 되어 정가가 사만 원을
 * 넘는다. 두께와 값이 한 서점 안에서 그럴듯하게 모이도록 이 규칙을 쓴다.
 */
function pageRatio(chapters) {
  if (chapters >= 150) return 2;
  if (chapters >= 100) return 2.5;
  if (chapters >= 70) return 3;
  if (chapters >= 40) return 3.5;
  return 4;
}
/** 본문 밖의 쪽수(표제지·머리말·찾아보기). */
const FRONT_BACK = 24;

/**
 * 표지 짜임 여섯. 어느 책이 어느 짜임인지는 제목에서 뽑는다.
 *
 * 차례로 돌리면 서점 격자에 여섯 칸짜리 무늬가 생겨 오히려 규칙이 보인다. 그래서 제목의
 * 글자값으로 흩되, 바로 앞 책과 같아지면 한 칸 밀어 이웃끼리는 겹치지 않게 한다.
 */
const LAYOUTS = ['band', 'plaque', 'rule', 'vertical', 'block', 'margin'];

function layoutOf(title, previous) {
  let sum = 0;
  for (const ch of title) sum += ch.codePointAt(0);
  let picked = LAYOUTS[sum % LAYOUTS.length];
  if (picked === previous) picked = LAYOUTS[(sum + 1) % LAYOUTS.length];
  return picked;
}

/** 발행일을 흩는다 — 2023년 1월부터 한 권씩 열흘 남짓 간격으로 뒤로 온다. */
function pubDate(index) {
  const start = Date.UTC(2023, 0, 12);
  const day = 1000 * 60 * 60 * 24;
  const d = new Date(start + index * 11 * day);
  const iso = d.toISOString();
  return iso.slice(0, 10);
}

/** 정가 — 쪽수에 비례시키고 천 원 단위로 맞춘다. */
function price(pages) {
  return Math.round((pages * 40 + 6000) / 1000) * 1000;
}

/** 979-11-9xxxx 대역의 자리표시 ISBN. 체크디짓까지 계산해 형식만 갖춘다. */
function isbn(index) {
  const body = `97911${String(90000 + index).padStart(5, '0')}${String(index % 100).padStart(2, '0')}`;
  const sum = [...body].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return `979-11-${String(90000 + index).padStart(5, '0')}-${String(index % 100).padStart(2, '0')}-${check}`;
}

const IMPRINT_FILES = ['midjulsai', 'najeunmunjang', 'cheotjari', 'hanbamseoga'];

const books = [];
let index = 0;
let lastLayout = null;

for (const file of IMPRINT_FILES) {
  const { imprint, books: rows } = JSON.parse(readFileSync(new URL(`${file}.json`, HERE), 'utf8'));
  const spec = IMPRINTS[imprint];
  if (!spec) throw new Error(`팔레트 없는 출판사: ${imprint}`);

  const shared = sharePalettes(rows, spec.palette);

  for (const [order, row] of rows.entries()) {
    const chapters = row.parts.reduce((n, [, count]) => n + count, 0);
    const ratio = pageRatio(chapters);
    const pages = Math.round(chapters * ratio) + FRONT_BACK;
    // 한 번 나눠 준 색은 책마다 swatch로 적혀 있다 — 그걸 먼저 쓴다. 새 책만 셈해서 받는다.
    const swatch = spec.palette[row.swatch ?? shared[order]];
    if (!swatch) throw new Error(`${row.title}: palette ${shared[order]}`);

    /** 목차 절 — 부 제목과 그 부의 꼭지 수. 꼭지 수를 세면 쪽수 비율을 검산할 수 있다. */
    const contents = row.parts.map(([name, count]) => `${name} (${count}꼭지)`);

    const book = {
      // 한 번 붙은 id는 데이터에 적어 두고 그대로 쓴다. 서재가 이 id로 책을 기억하므로,
      // 앞의 책 하나를 빼도 뒤의 id가 당겨지면 안 된다. 새 책만 순번으로 받는다.
      id: row.id ?? `${file}-${String(index).padStart(3, '0')}`,
      bookId: row.bookId ?? null,
      title: row.title,
      author: row.author,
      price: price(pages),
      coverImage: '',
      sections: [
        { title: '책 소개', paragraphs: row.intro },
        { title: '목차', paragraphs: contents },
        { title: '지은이', paragraphs: [row.bio] },
      ],
      tags: row.tags,
      pages: `${pages}쪽`,
      isbn: isbn(index),
      pubDate: pubDate(index),
    };

    // 학습 가능한 열 권은 표지 값을 lib/coverDesign에서 가져오므로 데이터에 두지 않는다.
    if (!row.bookId) {
      book.coverDesign = {
        paper: swatch.paper,
        ink: swatch.ink,
        ...(swatch.dark ? { dark: true } : {}),
        title: row.title,
        author: row.author.replace(/ (지음|엮음|옮김).*$/, ''),
        imprint,
        mark: spec.mark,
        align: row.align,
        layout: layoutOf(row.title, lastLayout),
        // 패턴은 그 책 목차의 부 제목에서 뽑는다 — 지어낸 무늬가 아니다.
        pattern: row.parts.map(([name]) => name),
      };
    }

    if (book.coverDesign) lastLayout = book.coverDesign.layout;
    books.push(book);
    index += 1;
  }
}

writeFileSync(OUT, `${JSON.stringify({ books }, null, 2)}\n`);

const studies = books.filter((b) => b.bookId).length;
console.log(`${books.length}권 (학습 ${studies}권 · 전시 ${books.length - studies}권)`);
for (const name of Object.keys(IMPRINTS)) {
  const n = books.filter((b) => b.sections && b.id.startsWith(IMPRINT_FILES[Object.keys(IMPRINTS).indexOf(name)])).length;
  console.log(`  ${name.padEnd(6)} ${n}권`);
}
