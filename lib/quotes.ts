import quotesData from '@/data/reading-quotes.json';

/** 독서 완료 화면에 띄우는 인용문 한 줄. */
export interface ReadingQuote {
  id: string;
  /** 화면에 그대로 쓰는 한국어 문장(자체 번역). */
  ko: string;
  /** 영어 원문 — 화면에는 쓰지 않고, 검증(scripts/check-quotes.mjs)에 쓴다. */
  original: string;
  /** 작품명(낫표 없이). */
  work: string;
  author: string;
}

interface RawQuote {
  id: string;
  ko: string;
  original: string;
  gutenbergId: number;
}

const books = quotesData.books as Record<string, { work: string; author: string }>;

/**
 * 인용문 전체 — 원문은 Project Gutenberg 공개본과 대조해 두었다(docs/독서완료-인용문.md).
 * 책 정보는 Gutenberg 번호로 이어 붙인다. 데이터에 없는 값은 지어내지 않는다.
 */
const QUOTES: ReadingQuote[] = (quotesData.quotes as RawQuote[]).map((quote) => ({
  id: quote.id,
  ko: quote.ko,
  original: quote.original,
  work: books[String(quote.gutenbergId)].work,
  author: books[String(quote.gutenbergId)].author,
}));

/** 무작위로 한 줄 — 독서를 마칠 때마다 다른 문장을 만난다. */
export function pickReadingQuote(): ReadingQuote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
