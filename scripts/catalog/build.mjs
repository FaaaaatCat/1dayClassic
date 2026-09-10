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
      { paper: '#F4EEE0', ink: '#5A3B22' },
    ],
  },
  낮은문장: {
    mark: 'lowline',
    palette: [
      { paper: '#E5E9E2', ink: '#25382A' },
      { paper: '#211F1B', ink: '#E6DEC9', dark: true },
      { paper: '#EDEFE8', ink: '#3A4438' },
    ],
  },
  첫자리: {
    mark: 'quadrant',
    palette: [
      { paper: '#ECE7DF', ink: '#77382A' },
      { paper: '#F2EEE1', ink: '#1F3C6A' },
      { paper: '#EAE6DC', ink: '#3E3A55' },
    ],
  },
  한밤서가: {
    mark: 'halfmoon',
    palette: [
      { paper: '#E3E9ED', ink: '#1C3143' },
      { paper: '#F6F4EF', ink: '#17191B' },
      { paper: '#EAE6EE', ink: '#2E2A3F' },
    ],
  },
};

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

for (const file of IMPRINT_FILES) {
  const { imprint, books: rows } = JSON.parse(readFileSync(new URL(`${file}.json`, HERE), 'utf8'));
  const spec = IMPRINTS[imprint];
  if (!spec) throw new Error(`팔레트 없는 출판사: ${imprint}`);

  for (const row of rows) {
    const chapters = row.parts.reduce((n, [, count]) => n + count, 0);
    const ratio = pageRatio(chapters);
    const pages = Math.round(chapters * ratio) + FRONT_BACK;
    const swatch = spec.palette[row.palette];
    if (!swatch) throw new Error(`${row.title}: palette ${row.palette}`);

    /** 목차 절 — 부 제목과 그 부의 꼭지 수. 꼭지 수를 세면 쪽수 비율을 검산할 수 있다. */
    const contents = row.parts.map(([name, count]) => `${name} (${count}꼭지)`);

    const book = {
      id: `${file}-${String(index).padStart(3, '0')}`,
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
        // 패턴은 그 책 목차의 부 제목에서 뽑는다 — 지어낸 무늬가 아니다.
        pattern: row.parts.map(([name]) => name),
      };
    }

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
