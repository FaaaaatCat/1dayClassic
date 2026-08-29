import listeningData from '@/data/listening.json';
import { getCatalogBooks } from '@/lib/catalog';
import { splitSentences } from '@/lib/narration';
import type { NarrationStep } from '@/hooks/useCardNarration';

/**
 * 미리보기 화면들이 함께 읽는 내용.
 *
 * 카드 슬라이드와 인스타 스토리, 두 미리보기가 같은 항목을 서로 다른 옷으로 보여 준다.
 * 내용을 각자 들고 있으면 반드시 어긋난다 — 예전에 이 화면의 본문이 데이터보다 한 문단
 * 적었던 적이 있다. 그래서 무엇을 보여 줄지는 여기 한 곳에서만 정한다.
 *
 * 보여 주는 '모양'은 화면마다 다르므로 여기 두지 않는다. 여기 있는 것은 글과 순서뿐이다.
 */

/** 이 미리보기가 소개하는 책 — 카탈로그에서 제목으로 찾는다. */
export const PREVIEW_BOOK_TITLE = '듣기의 말들';

/** 표지에 뜨는 회차. 낭독은 같은 값을 우리말 서수로 읽는다("001" → "첫 번째"). */
export const PREVIEW_NO = 1;
const KOREAN_ORDINALS = ['', '첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

/**
 * 제목이 아니라 id로 찾는 건 미리보기가 항목 하나를 콕 집어 쓰기 때문이다.
 */
export const PREVIEW_LESSON_ID = 'listening_2_admit_first';
const PREVIEW_LESSON = (() => {
  const lesson = listeningData.lessons.find((l) => l.id === PREVIEW_LESSON_ID);
  if (!lesson) console.warn(`[preview] 없는 항목입니다: ${PREVIEW_LESSON_ID}`);
  return lesson;
})();

export const QUOTE_TEXT = PREVIEW_LESSON?.epigraph ?? '';
export const QUOTE_SOURCE = PREVIEW_LESSON?.epigraphBy ?? '';
/** 본문 — 문단마다 장 하나씩 담는다(PAGES 참고). */
export const DESC_PARAGRAPHS = PREVIEW_LESSON?.story ?? [];
/** 오늘의 퀴즈 — 항목 하나가 문제 여러 개를 든다. */
export const PREVIEW_QUIZZES = PREVIEW_LESSON?.quizzes ?? [];
export const PREVIEW_DATE = PREVIEW_LESSON?.date ?? '';

export const PREVIEW_BOOK = (() => {
  const book = getCatalogBooks().find((b) => b.title === PREVIEW_BOOK_TITLE);
  if (!book) console.warn(`[preview] 카탈로그에 없는 제목입니다: ${PREVIEW_BOOK_TITLE}`);
  return book;
})();

export type PageKind = 'intro' | 'quote' | 'desc' | 'buy';

export interface Page {
  kind: PageKind;
  /** desc 장 전용 — 이 장 하나에 담을 문단 하나. */
  paragraph?: string;
}

export const PAGES: Page[] = [
  { kind: 'intro' },
  { kind: 'quote' },
  // 본문은 문단마다 한 장 — 문단이 늘거나 줄면 장 수도 그만큼 자동으로 바뀐다.
  ...DESC_PARAGRAPHS.map((paragraph): Page => ({ kind: 'desc', paragraph })),
  // 본문이 끝나면 구매 안내 한 장으로 맺는다. 퀴즈와 감상 노트는 넘김 흐름이 아니라
  // 버튼으로 여는 전체 화면 팝업이다.
  { kind: 'buy' },
];

/**
 * 문단 하나를 문장 덩이로 쪼개면서, 각 문장이 문단 어디서 시작했는지를 함께 적어 둔다.
 * 그 자리를 알아야 TTS가 알려 주는 단어 위치를 화면 위의 글자로 옮길 수 있다.
 */
function stepsFor(page: number, paragraph: string): NarrationStep[] {
  let cursor = 0;
  return splitSentences(paragraph).map((text) => {
    const offset = paragraph.indexOf(text, cursor);
    cursor = offset + text.length;
    return { page, text, offset };
  });
}

/**
 * 자동으로 읽기가 읽어 줄 대본.
 *
 * 인용문의 출처(epigraphBy)는 읽지 않는다. 구매 안내 장도 읽을 것이 아니다 —
 * 본문이 끝나면 그대로 엔딩으로 간다.
 */
export const NARRATION_STEPS: NarrationStep[] = [
  // 표지는 그린 글("001번째 듣는 법")과 읽는 말이 달라 하이라이트를 걸지 않는다.
  { page: 0, text: PREVIEW_BOOK_TITLE },
  { page: 0, text: `${KOREAN_ORDINALS[PREVIEW_NO] ?? PREVIEW_NO} 번째 듣는 법` },
  ...stepsFor(1, QUOTE_TEXT),
  ...DESC_PARAGRAPHS.flatMap((paragraph, i) => stepsFor(2 + i, paragraph)),
];
