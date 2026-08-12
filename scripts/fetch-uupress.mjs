/**
 * `npm run fetch:uupress` — 유유출판사 도서 목록을 받아 data/uupress-catalog.json을 다시 만든다.
 *
 * 출처는 출판사가 공개한 Notion 사이트(https://uupress.notion.site)이고, 화면을 긁는 대신
 * Notion이 그 화면을 그릴 때 쓰는 api/v3를 그대로 호출한다 — 서지 정보가 DB 속성에
 * 정형으로 들어 있어 훨씬 정확하다.
 *
 * 표지는 내려받지 않고 Notion이 서빙하는 URL을 그대로 저장한다. 그 URL이 만료되거나
 * 막히면 표지가 통째로 깨지므로, 그때는 이미지를 assets/로 내려받는 쪽으로 바꿔야 한다.
 *
 * 신간이 나왔거나 표지가 깨지면 이 스크립트를 다시 돌리면 된다.
 */
import { writeFileSync } from 'node:fs';

const ORIGIN = 'https://uupress.notion.site';
const SPACE = 'a116a827-9756-4259-82ad-bdc6b3f1eb99';
/** '모든 도서' 데이터베이스와 그 기본 뷰. */
const COLLECTION = '64e38443-5fea-4933-be34-e1a622c5b525';
const VIEW = '639e909d-c453-4505-98e3-605fd8960297';

const OUT = new URL('../data/uupress-catalog.json', import.meta.url);

/** DB 속성 키 — Notion이 부여한 난독 키라서 무엇인지 함께 적어 둔다. */
const PROP = {
  author: '`zz5', // 저자/역자
  price: ')Y7"', // 정가
  isbn: ';RE]', // ISBN
  pages: '>$Pb', // 면수
  tags: 'qNw_', // 분야/시리즈
  pubDate: '?ex+', // 발행일
};

/**
 * 학습 콘텐츠가 있는 '하루 시리즈' 9권 — 카탈로그 항목과 제목으로 짝지어 BookId를 달아 준다.
 * 이 표에 걸린 책만 서점에서 365일 목차를 열고 '이 책으로 선택하기'가 된다.
 * 출판사 쪽 제목은 띄어쓰기가 다를 때가 있어('하루 한자공부') 공백을 지우고 비교한다.
 */
const STUDYABLE = {
  '하루 클래식 공부': 'classic',
  '하루 라틴어 공부': 'latin',
  '하루 명언 공부': 'quote',
  '하루 한자 공부': 'hanja',
  '하루 교양 공부': 'liberal',
  '하루 심리 공부': 'psychology',
  '하루 쓰기 공부': 'writing',
  '하루 한문 공부': 'hanmun',
  '하루 영어 교양': 'english',
};

/**
 * 절을 여는 소제목 — 2022년 전후 옛 페이지는 header 블록 없이 이 목록에 있는 문구를
 * 그냥 text 블록에 적어 소제목처럼 썼다. 277권 전체를 훑어 실제로 등장한 문구만 담았다
 * (scratchpad의 조사용 스크립트로 빈도를 뽑아 확인함 — 짐작으로 채운 목록이 아니다).
 * header/sub_header/sub_sub_header 블록은 이 목록과 무관하게 항상 소제목으로 본다.
 */
const SECTION_LABELS = new Set([
  '책 소개', '책소개', '책 소개글',
  '목차', '차례',
  '추천의 말', '추천사', '추천하는 말', '추천의 글',
  '저자 소개', '저자 및 역자 소개', '저역자 소개', '역자 소개', '저자/그린이 소개',
  '기획노트', '기획 후기',
  'Review',
  '들어가는 말', '들어가는 글', '들어가며',
  '편집 후기', '편집후기',
  '머리말',
  '옮긴이의 말',
  '역자 후기',
  '나오는 말', '나가는 말',
  '감사의 말',
  '맺음말',
  '서문',
  '주',
  '후기',
  '참고문헌', '참고 문헌',
  '부록',
  '찾아보기',
  '한국의 독자들에게',
  '더 읽을거리',
  '프롤로그',
  '이 책의 특징',
]);

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
};

async function api(path, body) {
  const res = await fetch(`${ORIGIN}/api/v3/${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

/** Notion 리치텍스트 → 평문. */
const plain = (prop) => (prop ?? []).map((run) => run[0]).join('');

/** recordMap.block은 응답에 따라 {value:{value}} / {value} 두 모양이 섞여 온다. */
const unwrap = (record) => record?.value?.value ?? record?.value;

const squash = (text) => text.replace(/\s+/g, '');

/** DB의 모든 행 — 서지 정보는 여기서 다 나온다(표지와 책 소개만 상세 페이지에 있다). */
async function fetchRows() {
  const json = await api('queryCollection?src=initial_load', {
    source: { type: 'collection', id: COLLECTION, spaceId: SPACE },
    collectionView: { id: VIEW, spaceId: SPACE },
    loader: {
      type: 'reducer',
      reducers: { collection_group_results: { type: 'results', limit: 500 } },
      searchQuery: '',
      userTimeZone: 'Asia/Seoul',
    },
  });

  const result = json.result?.reducerResults?.collection_group_results ?? json.result;
  return result.blockIds.map((pageId) => {
    const props = unwrap(json.recordMap.block[pageId])?.properties ?? {};
    return {
      pageId,
      // 제목 앞에 붙은 📚 같은 이모지를 떼어 낸다.
      title: plain(props.title).replace(/^\p{Extended_Pictographic}+\s*/u, '').trim(),
      author: plain(props[PROP.author]).replace(/,\s*/g, ', ').trim(),
      price: plain(props[PROP.price]),
      isbn: plain(props[PROP.isbn]),
      pages: plain(props[PROP.pages]),
      tags: plain(props[PROP.tags]),
      pubDate: props[PROP.pubDate]?.[0]?.[1]?.[0]?.[1]?.start_date ?? '',
    };
  });
}

const isHeadingBlock = (block) =>
  block.type === 'header' || block.type === 'sub_header' || block.type === 'sub_sub_header';

/**
 * 소제목인가? header/sub_header/sub_sub_header 블록은 텍스트와 무관하게 항상 소제목이다.
 * 2022년 전후 옛 페이지는 그냥 text 블록에 '책 소개'라고만 적어 소제목처럼 썼으므로,
 * SECTION_LABELS에 있는 문구와 정확히 일치할 때만 소제목으로 인정한다.
 *
 * '목차 @'는 「선물」 한 권에서만 나오는 오타로 보인다 — 다른 276권은 전부 '목차'다.
 *
 * current: 지금 채우고 있는 절. text 기반 판정을 꺼야(=새 절로 승격시키면 안 되는) 하는
 * 경우가 세 가지 있다 — 셋 다 실제로 카탈로그에서 확인된 증상이다.
 *
 * 1) current가 header 계열 블록으로 열린 절인 경우. 최신 페이지는 실제 절 제목을 항상
 *    header로 적어 놓는다. header로 연 절은 다음 header 계열 블록만 닫을 수 있다고 봐야
 *    아래 2)의 장식용 text 오탐을 막을 수 있다.
 *
 * 2) current에 아직 문단이 하나도 안 쌓인 경우(방금 열렸다는 뜻). 절을 연 라벨 바로
 *    아래에 같은 제목을 공백만 다르게 한 번 더 장식삼아 적어 놓은 페이지가 있다(예:
 *    「관찰력 기르는 법」 — sub_sub_header '책 소개' 바로 다음 줄에 공백 없는 text
 *    '책소개'가 또 나온다. 「사회과학책 만드는 법」은 같은 패턴을 text로 연 절에서도
 *    반복한다). 이 장식용 text가 SECTION_LABELS와 우연히 겹치면 진짜 절은 빈 채로 닫히고
 *    그 장식용 문구를 제목으로 한 가짜 절이 내용을 통째로 가져가 버린다. 진짜 다른 절이
 *    이어졌다면 그사이에 최소 한 문단(설명 문구)은 있기 마련이라, 문단이 아직 없다는
 *    조건만으로 이 오탐을 안전하게 걸러낼 수 있다.
 *
 * 3) current가 '목차'/'차례' 절인 경우(여는 방식과 무관하게). 그 절이 나열하는 장 제목들
 *    중에 '들어가는 말', '참고 문헌', '찾아보기'처럼 SECTION_LABELS와 우연히 일치하는
 *    항목이 흔히 섞여 있다. 「글로벌리즘의 종언」처럼 앞부분은 text로 소제목을 적고 맨 끝
 *    '기획노트'만 header를 쓰는 혼합형 페이지에서, 이걸 막지 않으면 목차 절이 비고 그
 *    항목 이름을 딴 가짜 절이 목차 내용을 통째로 삼킨다. 2)와 달리 이건 목차 절 전체에서
 *    계속 필요하다 — 목록 뒷부분 항목도 앞쪽에 이미 문단이 쌓인 뒤에 나오기 때문이다.
 *
 * (예전에는 페이지 전체에 header 블록이 하나라도 있으면 text 판정을 통째로 껐는데, 위
 * 혼합형 페이지에서는 그 방식이 저자 소개·책 소개·목차까지 전부 무시해 버렸다. 그래서
 * 판정 범위를 '지금 열려 있는 절'의 상태로 좁혔다.)
 */
function headingLabel(block, text, current) {
  if (isHeadingBlock(block)) {
    return text === '목차 @' ? '목차' : text;
  }
  if (
    current &&
    (current.openedByHeading ||
      current.paragraphs.length === 0 ||
      current.title === '목차' ||
      current.title === '차례')
  ) {
    return null;
  }
  // 짧고 줄바꿈 없는 text 블록이 알려진 절 이름과 정확히 일치할 때만 소제목으로 본다.
  if (block.type === 'text' && !text.includes('\n') && SECTION_LABELS.has(text)) {
    return text;
  }
  return null;
}

/**
 * 페이지 하나의 모든 블록을 loadPageChunk로 끌어온다. 큰 페이지는 limit: 300 한 번으로
 * 안 끝나서 응답에 cursor.stack이 남는데, 그걸 무시하면 content에 나열된 블록 id 중 일부가
 * byId에 없는 채로 남아 그 절 내용이 통째로 사라진다(예: 「글로벌리즘의 종언」 '목차' 절).
 *
 * 방법 A(cursor 이어받기)와 방법 B(누락 id를 syncRecordValues로 개별 보충)를 둘 다 시험해
 * 봤는데, 방법 A만으로 카탈로그 277권 전부에서 누락이 0건이 됐다(실측 최대 4청크). 방법
 * B는 애초에 필요가 없어서 굳이 얹지 않았다 — 코드 경로가 하나 줄어야 유지보수가 쉽다.
 * MAX_CHUNKS는 실측치(4)에 여유를 크게 둔 안전장치일 뿐, 정상 동작에서는 걸릴 일이 없다.
 */
async function fetchAllBlocks(pageId) {
  const byId = {};
  let cursor = { stack: [] };
  const MAX_CHUNKS = 20;
  for (let chunkNumber = 0; chunkNumber < MAX_CHUNKS; chunkNumber++) {
    const json = await api('loadPageChunk', {
      page: { id: pageId },
      limit: 300,
      cursor,
      chunkNumber,
      verticalColumns: false,
    });
    for (const [key, record] of Object.entries(json.recordMap?.block ?? {})) {
      const value = unwrap(record);
      if (value) byId[value.id ?? key] = value;
    }
    // 다음 청크가 없으면(cursor.stack이 빔) 다 받은 것 — 더 요청할 필요 없다.
    if (!json.cursor?.stack || json.cursor.stack.length === 0) break;
    cursor = json.cursor;
  }
  return byId;
}

/** 상세 페이지에서 표지 이미지 URL과, 순서대로 나열된 절(제목+문단) 목록을 꺼낸다. */
async function fetchDetail(pageId) {
  const byId = await fetchAllBlocks(pageId);

  const content = byId[pageId]?.content ?? [];

  let coverImage = null;
  const sections = [];
  let current = null; // 지금 채우고 있는 절. 첫 소제목을 만나기 전까지는 null.
  let missing = 0; // fetchAllBlocks로도 못 받아온 블록 수 — 있으면 안 되지만, 조용히 넘기지 않고 세어서 요약에 경고로 낸다.

  for (const id of content) {
    const block = byId[id];
    if (!block) {
      missing++;
      continue;
    }

    // 페이지 맨 위 이미지가 표지다. 절 본문에 섞이지 않도록 여기서 처리하고 넘어간다.
    if (!coverImage && block.type === 'image') {
      const source = block.properties?.source?.[0]?.[0];
      if (source) {
        coverImage =
          `${ORIGIN}/image/${encodeURIComponent(source)}` +
          `?table=block&id=${id}&spaceId=${SPACE}&width=800&cache=v2`;
      }
      continue;
    }

    // divider는 절 구분자일 뿐 — 다음 소제목이 알아서 새 절을 열어 준다.
    if (block.type === 'divider') continue;

    const text = plain(block.properties?.title).trim();
    const label = headingLabel(block, text, current);
    if (label !== null) {
      if (current) sections.push(current);
      // openedByHeading: 이 절이 header 계열 블록으로 열렸는지 — headingLabel이 다음에
      // 같은 절 안에서 장식용 text 오탐을 걸러낼 때 참고한다(위 headingLabel 주석 참고).
      current = { title: label, paragraphs: [], openedByHeading: isHeadingBlock(block) };
      continue;
    }

    // 아직 첫 소제목을 못 만났으면(표지 아래 홍보 문구 등) 어느 절에도 속하지 않으니 버린다.
    if (current && text) current.paragraphs.push(text);
  }
  if (current) sections.push(current);

  // openedByHeading은 headingLabel 판정에만 쓰는 내부 상태라 결과 JSON에는 남기지 않는다.
  return { coverImage, sections: sections.map(({ title, paragraphs }) => ({ title, paragraphs })), missing };
}

/** 동시 요청 수를 제한한 map — Notion에 한꺼번에 300개를 던지지 않기 위해. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        out[index] = await fn(items[index]);
      }
    }),
  );
  return out;
}

const studyableByKey = Object.fromEntries(
  Object.entries(STUDYABLE).map(([title, id]) => [squash(title), id]),
);

const rows = await fetchRows();
console.log(`도서 ${rows.length}권 — 상세 페이지를 읽는 중...`);

let done = 0;
const details = await mapLimit(rows, 6, async (row) => {
  const detail = await fetchDetail(row.pageId);
  if (++done % 50 === 0) console.log(`  ${done}/${rows.length}`);
  return detail;
});

const books = rows.map((row, index) => ({
  id: row.pageId,
  bookId: studyableByKey[squash(row.title)] ?? null,
  title: row.title,
  author: row.author,
  price: row.price ? Number(row.price.replace(/\D/g, '')) : null,
  coverImage: details[index].coverImage,
  sections: details[index].sections,
  tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  pages: row.pages,
  isbn: row.isbn,
  pubDate: row.pubDate,
}));

// 발행일 최신순. 발행일이 없는 책은 뒤로 민다.
books.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));

writeFileSync(OUT, JSON.stringify({ books }, null, 2), 'utf8');

const linked = books.filter((b) => b.bookId).length;
const expected = Object.keys(STUDYABLE).length;
console.log(`\n✓ ${books.length}권 → data/uupress-catalog.json`);
console.log(`  표지 없음: ${books.filter((b) => !b.coverImage).length}`);
console.log(`  절 없음: ${books.filter((b) => b.sections.length === 0).length}`);
console.log(`  가격 없음: ${books.filter((b) => b.price === null).length}`);
console.log(`  하루 시리즈 연결: ${linked}/${expected}`);

if (linked < expected) {
  // 제목이 바뀌면 조용히 어긋나서, 서점에 같은 책이 두 번 뜨고 목차가 사라진다.
  console.log('\n⚠  STUDYABLE 표의 제목이 출판사 쪽 제목과 어긋났습니다. 표를 갱신해 주세요.');
  for (const [title, id] of Object.entries(STUDYABLE)) {
    if (!books.some((b) => b.bookId === id)) console.log(`   ✗ ${title} (${id})`);
  }
  process.exitCode = 1;
}

// fetchAllBlocks로 cursor를 끝까지 따라가도 못 받은 블록이 남으면(정상 동작에서는 없어야
// 함) 조용히 넘기지 않고 여기서 권수·제목을 밝힌다 — 지금까지는 이게 소리 없이 사라져서
// 절 내용이 유실되는 줄도 몰랐다.
const withMissingBlocks = rows
  .map((row, index) => ({ title: row.title, missing: details[index].missing }))
  .filter((r) => r.missing > 0);
if (withMissingBlocks.length > 0) {
  console.log(`\n⚠  블록을 끝내 못 받아온 책 ${withMissingBlocks.length}권 — 아래 책은 절 내용이 일부 빠졌을 수 있습니다:`);
  for (const r of withMissingBlocks) console.log(`   ✗ ${r.title}: 블록 ${r.missing}개 누락`);
  process.exitCode = 1;
}
