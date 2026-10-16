/**
 * `node scripts/check-quotes.mjs [원문을 둘 폴더]`
 *
 * 독서 완료 화면의 인용문(data/reading-quotes.json)이 정말 그 책에 있는 문장인지 확인한다.
 *
 * 인용문마다 적어 둔 Project Gutenberg 번호의 원문을 받아(이미 받아 둔 것은 다시 받지 않는다),
 * 따옴표 모양·줄바꿈·이탤릭 표시(_)·대소문자를 걷어 낸 뒤 원문(original)이 글자 그대로 들어
 * 있는지 본다. 하나라도 없으면 그 줄을 찍고 실패로 끝난다 — 인터넷에서 그 책의 말로 떠도는
 * 문장이 실제로는 없는 경우가 있어서다(『비밀의 화원』의 '온 세상이 정원'이 그랬다).
 *
 * 인용문을 새로 넣거나 고치면 이것을 돌린다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = process.argv[2] ?? join(tmpdir(), 'haru-gutenberg');
mkdirSync(dir, { recursive: true });

const data = JSON.parse(readFileSync(new URL('../data/reading-quotes.json', import.meta.url), 'utf8'));

/** 비교를 위해 걷어 낼 것들 — 따옴표 모양, 대시, 이탤릭 표시, 줄바꿈, 대소문자, 큰따옴표. */
const normalize = (text) =>
  text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”"]/g, '')
    .replace(/[—–]/g, '-')
    .replace(/--/g, '-')
    .replace(/_/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

async function source(id) {
  const file = join(dir, `pg${id}.txt`);
  if (!existsSync(file)) {
    const response = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
    if (!response.ok) throw new Error(`원문을 받지 못했습니다: ${id} (${response.status})`);
    writeFileSync(file, await response.text());
  }
  return normalize(readFileSync(file, 'utf8'));
}

const texts = {};
const failed = [];
for (const quote of data.quotes) {
  const id = quote.gutenbergId;
  if (!data.books[id]) failed.push(`${quote.id}: 책 정보(books.${id})가 없습니다`);
  texts[id] ??= await source(id);
  if (!texts[id].includes(normalize(quote.original))) failed.push(`${quote.id}: ${quote.original}`);
}

const ids = new Set(data.quotes.map((quote) => quote.id));
if (ids.size !== data.quotes.length) failed.push('id가 겹칩니다');

if (failed.length > 0) {
  console.log('원문에서 찾지 못한 인용문:');
  failed.forEach((line) => console.log(`  ✗ ${line}`));
  process.exit(1);
}
console.log(`문제 없음 ✓ (인용문 ${data.quotes.length}개, 책 ${Object.keys(texts).length}권)`);
