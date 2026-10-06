/**
 * `npm run fetch:illustrations -- <책>` — 구절만 세운 장에 얹을 삽화를 골라 데이터에 적는다.
 *
 * 메트로폴리탄 미술관의 Open Access에서 공개 저작물(CC0)인 옛 판화만 고른다. 키가 필요
 * 없고 크레딧도 의무가 아니지만, 누구의 무엇인지는 함께 적어 둔다.
 *
 * 앱은 이 스크립트를 부르지 않는다 — fetch-unsplash와 같은 방식으로, 여기서 고른 결과가
 * data/*.json에 박히고 앱은 그것을 보여 줄 뿐이다.
 *
 * 이미 삽화가 있는 항목은 건드리지 않는다. 처음부터 다시 고르려면 --force.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { BOOK_FILES as PHOTO_BOOK_FILES, hash } from './query-rule.mjs';

/** 삽화는 사진을 쓰지 않는 책에도 넣는다 — 사진용 목록에 클래식을 더한다. */
const BOOK_FILES = { ...PHOTO_BOOK_FILES, classic: 'tracks.json' };

const API = 'https://collectionapi.metmuseum.org/public/collection';
/** 검색어 하나에서 살펴볼 작품 수. */
const CANDIDATES = 40;
const GAP_MS = 400;
/** 너무 빨리 두드리면 미술관 서버가 403으로 막는다. 그때 쉬었다가 다시 묻는 시간과 횟수. */
const BACKOFF_MS = 20000;
const RETRIES = 3;
/** 글 위에 가로로 얹는 그림이라 가로로 긴 것만 쓴다(가로 ÷ 세로). */
const MIN_RATIO = 1.25;
const MAX_RATIO = 2.2;

const KEYWORDS = JSON.parse(
  readFileSync(new URL('../data/illustration-keywords.json', import.meta.url), 'utf8'),
);

const args = process.argv.slice(2);
const force = args.includes('--force');
const books = args.filter((a) => !a.startsWith('--'));
const targets = books.length > 0 ? books : Object.keys(KEYWORDS);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response.json();
    // 지워진 작품(404)은 없는 것으로 넘긴다 — 검색 결과에 남아 있을 때가 있다.
    if (response.status === 404) return undefined;
    if (response.status === 403 && attempt < RETRIES) {
      await sleep(BACKOFF_MS);
      continue;
    }
    throw new Error(`${response.status} ${response.statusText}`);
  }
}

/** 원문과 한글을 빈 줄로 가른 문단인가 — lib/narration의 splitVerse와 같은 규칙. */
function isVerse(paragraph) {
  const parts = paragraph.split('\n\n');
  return parts.length === 2 && !/[가-힣]/.test(parts[0]) && /[가-힣]/.test(parts[1]);
}

/** JPEG의 가로·세로. SOF 마커에 적혀 있다. */
function jpegSize(bytes) {
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  return undefined;
}

/** 같은 검색어를 여러 항목이 쓰므로 검색 결과는 한 번만 받는다. */
const searches = new Map();
async function search(query) {
  if (!searches.has(query)) {
    const params = new URLSearchParams({ q: query, hasImages: 'true', limit: String(CANDIDATES) });
    const result = await getJson(`${API}/v1.1/search?${params}`);
    searches.set(query, result?.objectIDs ?? []);
    await sleep(GAP_MS);
  }
  return searches.get(query);
}

/** 쓸 수 있는 작품이면 삽화 값으로, 아니면 undefined. */
async function toIllustration(objectId, rule) {
  const object = await getJson(`${API}/v1/objects/${objectId}`);
  await sleep(GAP_MS);
  if (!object) return undefined;
  if (!object.isPublicDomain || object.classification !== 'Prints') return undefined;
  // 검색은 낱말이 설명 어디에든 걸리면 내놓는다 — 제목으로 한 번 더 거른다.
  if (rule.must && !rule.must.test(object.title)) return undefined;
  if (rule.reject?.test(object.title)) return undefined;
  const url = object.primaryImageSmall;
  if (!url) return undefined;

  const image = await fetch(url);
  if (!image.ok) return undefined;
  const size = jpegSize(Buffer.from(await image.arrayBuffer()));
  if (!size) return undefined;
  const ratio = size.width / size.height;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) return undefined;

  return {
    url,
    width: size.width,
    height: size.height,
    title: object.title,
    ...(object.artistDisplayName ? { artist: object.artistDisplayName } : {}),
    ...(object.objectDate ? { date: object.objectDate } : {}),
    source: object.objectURL,
  };
}

async function fillBook(bookId) {
  const file = BOOK_FILES[bookId];
  const pool = KEYWORDS[bookId]?.queries;
  if (!file || !pool?.length) {
    console.log(`[${bookId}] 검색어 묶음이 없는 책입니다 — 건너뜁니다.`);
    return;
  }

  const path = new URL(`../data/${file}`, import.meta.url);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  const lessons = (Array.isArray(json) ? json : Object.values(json).flat()).filter(
    (item) => item && item.story,
  );
  const { must, reject } = KEYWORDS[bookId];
  const rule = {
    must: must ? new RegExp(must, 'i') : undefined,
    reject: reject ? new RegExp(reject, 'i') : undefined,
  };
  // 한 책 안에서 같은 그림이 두 번 나오지 않게 한다. 같은 판화의 다른 쇄는 주소가 달라
  // 제목으로도 본다. 다시 고르는 중이면 지울 것들이라 세지 않는다.
  const kept = force ? [] : lessons.flatMap((l) => l.illustrations ?? []);
  const used = new Set(kept.flatMap((i) => [i.url, i.title]));

  console.log(`\n[${bookId}] 항목 ${lessons.length}개`);
  for (const lesson of lessons) {
    const slots = lesson.story.filter(isVerse).length;
    if (slots === 0) continue;
    if (lesson.illustrations?.length === slots && !force) continue;

    const picked = [];
    for (let slot = 0; slot < slots; slot += 1) {
      // 항목 id와 자리로 낱말을 고른다 — 언제 돌려도 같은 자리는 같은 낱말에서 찾는다.
      const seed = hash(`${lesson.id}:${slot}`);
      const query = pool[seed % pool.length];
      let found;
      try {
        const ids = await search(query);
        for (let step = 0; step < ids.length && !found; step += 1) {
          const candidate = await toIllustration(ids[(seed + step) % ids.length], rule);
          if (candidate && !used.has(candidate.url) && !used.has(candidate.title)) found = candidate;
        }
      } catch (error) {
        console.log(`  ${lesson.id} #${slot + 1}  "${query}" → 실패: ${error.message}`);
      }
      if (!found) {
        console.log(`  ${lesson.id} #${slot + 1}  "${query}" → 쓸 그림 없음`);
        break;
      }
      used.add(found.url);
      used.add(found.title);
      picked.push(found);
      console.log(`  ${lesson.id} #${slot + 1}  "${query}" → ${found.title} (${found.artist ?? '작자 미상'})`);
    }
    // 자리 수만큼 다 골랐을 때만 적는다 — 반만 적으면 그림이 엉뚱한 장에 붙는다.
    if (picked.length === slots) lesson.illustrations = picked;
  }

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

for (const bookId of targets) await fillBook(bookId);
