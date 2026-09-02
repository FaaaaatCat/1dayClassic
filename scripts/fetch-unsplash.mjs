/**
 * `npm run fetch:unsplash -- <책>` — 표지 사진을 Unsplash에서 골라 데이터에 적는다.
 *
 * 앱은 이 스크립트를 부르지 않는다. 여기서 고른 결과가 data/*.json에 박히고, 앱은 그것을
 * 보여 줄 뿐이다. 그래서 키가 제 컴퓨터 밖으로 나가지 않는다.
 *
 * 지키는 것들(Unsplash API 가이드라인):
 * - 사진가 이름과 프로필을 함께 저장한다. 크레딧을 화면에 적어야 하는데, 주소만 남으면
 *   쓸 수 없는 사진이 된다.
 * - 프로필 주소에 utm을 붙인다.
 * - 쓰기로 정한 사진마다 download_location에 한 번 알린다.
 * - 사진을 우리 서버에 다시 올리지 않고 images.unsplash.com 주소를 그대로 쓴다.
 *
 * 이미 사진이 있는 항목은 건드리지 않는다 — 다시 돌려도 고른 것이 바뀌지 않아야 한다.
 * 처음부터 다시 고르려면 --force.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { BOOK_FILES, CANDIDATES, buildQuery } from './query-rule.mjs';

const UTM = '?utm_source=1dayClassic&utm_medium=referral';
/** 데모 등급은 시간당 50건이다. 너무 빨리 두드리면 막히므로 사이를 둔다. */
const GAP_MS = 1200;

function loadKey() {
  // .env.local은 .gitignore에 걸려 저장소에 올라가지 않는다.
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const found = text.match(/^UNSPLASH_ACCESS_KEY=(.+)$/m)?.[1]?.trim();
    if (found) return found;
  } catch {
    // 파일이 없으면 환경 변수를 본다.
  }
  return process.env.UNSPLASH_ACCESS_KEY?.trim();
}

const ACCESS_KEY = loadKey();
if (!ACCESS_KEY) {
  console.error('UNSPLASH_ACCESS_KEY가 없습니다. .env.local에 적거나 환경 변수로 넘기세요.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const books = args.filter((a) => !a.startsWith('--'));
const targets = books.length > 0 ? books : Object.keys(BOOK_FILES);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unsplash(path) {
  const response = await fetch(`https://api.unsplash.com${path}`, {
    headers: {
      Authorization: `Client-ID ${ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  });
  if (!response.ok) {
    const limit = response.headers.get('x-ratelimit-remaining');
    throw new Error(`${response.status} ${response.statusText} (남은 요청 ${limit ?? '?'})`);
  }
  return response.json();
}

/** 표지로 쓸 주소. 표지는 가로로 넓게 쓰므로 크기를 지정해 받는다(원본은 무겁다). */
function photoUrl(photo) {
  return `${photo.urls.raw}&w=1200&q=80&fm=jpg&fit=crop`;
}

/** 쓰기로 정했다고 Unsplash에 알린다. 가이드라인이 요구하는 것이라 빠뜨리면 안 된다. */
async function pingDownload(photo) {
  const location = photo.links?.download_location;
  if (!location) return;
  const url = new URL(location);
  url.searchParams.set('client_id', ACCESS_KEY);
  await fetch(url).catch(() => {});
}

async function fillBook(bookId) {
  const file = BOOK_FILES[bookId];
  if (!file) {
    console.log(`[${bookId}] 사진을 쓰지 않는 책이거나 모르는 책입니다 — 건너뜁니다.`);
    return { filled: 0, skipped: 0, failed: 0 };
  }

  const path = new URL(`../data/${file}`, import.meta.url);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  // 반드시 방금 읽은 json 안의 객체를 고쳐야 한다. 파일을 또 읽으면 다른 객체가 와서,
  // 거기에 사진을 적어 놓고 손대지 않은 json을 저장하게 된다(그렇게 한 번 날렸다).
  const lessons = (Array.isArray(json) ? json : Object.values(json).flat()).filter(
    (item) => item && item.story,
  );

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  /**
   * 이 책이 이미 쓰고 있는 사진들.
   *
   * 낱말과 후보 자리만으로 고르면 조합 수가 정해져 있어(낱말 수 × 30) 365일을 채울 때
   * 같은 사진이 여러 날에 걸린다. 이미 쓴 것을 알고 있다가 건너뛰면 그 겹침이 사라진다.
   * 이미 채워 둔 항목의 사진도 넣어 둬야, 나중에 이어서 돌릴 때도 겹치지 않는다.
   */
  const used = new Set(
    lessons.map((item) => item.unsplash?.url).filter((url) => typeof url === 'string'),
  );

  console.log(`\n[${bookId}] 항목 ${lessons.length}개`);
  for (const lesson of lessons) {
    if (lesson.coverImage?.trim()) {
      skipped += 1;
      continue;
    }
    if (lesson.unsplash?.url && !force) {
      skipped += 1;
      continue;
    }

    const plan = buildQuery(bookId, lesson);
    if (!plan) {
      skipped += 1;
      continue;
    }

    const params = new URLSearchParams({
      query: plan.query,
      orientation: plan.orientation,
      content_filter: plan.contentFilter,
      per_page: String(CANDIDATES),
    });

    try {
      const result = await unsplash(`/search/photos?${params}`);
      const found = result.results ?? [];
      // 정한 자리에서 시작해 한 바퀴 돌며 아직 안 쓴 사진을 찾는다. 다 쓴 낱말이면
      // 정한 자리로 되돌아가 겹침을 받아들인다 — 사진이 없는 것보다는 낫다.
      let photo;
      for (let step = 0; step < found.length; step += 1) {
        const candidate = found[(plan.pick + step) % found.length];
        if (candidate && !used.has(photoUrl(candidate))) {
          photo = candidate;
          break;
        }
      }
      photo = photo ?? found[plan.pick] ?? found[0];
      if (!photo) {
        console.log(`  ${lesson.date ?? lesson.id}  "${plan.query}" → 결과 없음`);
        failed += 1;
      } else {
        lesson.unsplash = {
          url: photoUrl(photo),
          photographer: photo.user.name,
          profile: `${photo.user.links.html}${UTM}`,
        };
        used.add(lesson.unsplash.url);
        await pingDownload(photo);
        filled += 1;
        console.log(`  ${lesson.date ?? lesson.id}  "${plan.query}" → ${photo.user.name}`);
      }
    } catch (error) {
      console.log(`  ${lesson.date ?? lesson.id}  "${plan.query}" → 실패: ${error.message}`);
      failed += 1;
    }

    await sleep(GAP_MS);
  }

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`  → 채움 ${filled} · 건너뜀 ${skipped} · 실패 ${failed}`);
  return { filled, skipped, failed };
}

const totals = { filled: 0, skipped: 0, failed: 0 };
for (const bookId of targets) {
  const result = await fillBook(bookId);
  totals.filled += result.filled;
  totals.skipped += result.skipped;
  totals.failed += result.failed;
}
console.log(`\n합계 — 채움 ${totals.filled} · 건너뜀 ${totals.skipped} · 실패 ${totals.failed}`);
