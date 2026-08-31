import { getLessonHeading, type BookLesson } from '@/lib/books';
import { splitSentences } from '@/lib/narration';
import type { NarrationStep } from '@/hooks/useCardNarration';

/**
 * 항목 하나를 카드 여러 장으로 나누는 규칙.
 *
 * 카드 넘김 상세가 아홉 권 어디에나 돌려면, 책마다 다른 지면을 같은 장 구성으로 옮겨야
 * 한다. 모든 책이 공통으로 갖는 것은 story(본문)뿐이고, 표제와 인용문이 담긴 필드는
 * 책마다 다르다 — 그래서 표제는 getLessonHeading에 맡기고 인용문만 여기서 골라낸다.
 */

/**
 * 본문 한 장에 담는 최대 글자 수(공백 포함).
 *
 * 카드 안에 스크롤을 두지 않으므로, 한 장에 들어갈 만큼에서 끊어 다음 장으로 넘긴다.
 * 이 화면은 '한 장에 한 덩이'라는 약속 위에 서 있고, 카드 안에서 또 스크롤하면 넘김과
 * 스크롤이 같은 손짓을 두고 다툰다.
 */
const MAX_CHARS_PER_CARD = 220;

/**
 * 문단을 카드에 담기는 만큼씩 끊는다.
 *
 * 220자 이하면 그대로 한 장. 넘으면 220자까지를 첫 장에 두고 나머지를 다음 장으로 넘기며,
 * 남은 것도 같은 규칙으로 계속 나눈다.
 *
 * 끊는 자리는 220자 안쪽의 마지막 공백이다 — 정확히 220번째 글자에서 자르면 낱말 가운데가
 * 갈라진다. 그래서 한 장은 220자를 넘지 않되 조금 못 미칠 수 있다. 공백이 아예 없는 긴
 * 덩이(주소 같은 것)만 220자에서 그대로 자른다.
 */
export function splitParagraphToCards(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHARS_PER_CARD) return [paragraph];

  const cards: string[] = [];
  let rest = paragraph;

  while (rest.length > MAX_CHARS_PER_CARD) {
    const window = rest.slice(0, MAX_CHARS_PER_CARD + 1);
    const space = window.lastIndexOf(' ');
    const at = space > 0 ? space : MAX_CHARS_PER_CARD;
    cards.push(rest.slice(0, at).trimEnd());
    rest = rest.slice(at).trimStart();
  }
  if (rest) cards.push(rest);

  return cards;
}

export type CardPageKind = 'cover' | 'quote' | 'desc' | 'outro';

export interface CardPage {
  kind: CardPageKind;
  /** desc 장 전용 — 이 장 하나에 담을 문단 하나. */
  paragraph?: string;
}

/** 표지 장에 쓰는 표제. */
export interface CardCover {
  bookName: string;
  title: string;
  subtitle?: string;
}

/** 인용 장에 쓰는 글. 인용문이 없는 책(한자·심리·교양)은 이 장을 두지 않는다. */
export interface CardEpigraph {
  text: string;
  by?: string;
}

/**
 * 그 책의 인용문 자리.
 *
 * 어느 필드가 인용문인지는 책마다 다르다 — 클래식은 quote, 라틴어는 원문(latin)과 뜻,
 * 문장 시리즈는 epigraph다. 한자·심리·교양은 지면에 인용문이 없어 undefined를 준다.
 *
 * LessonHeading이 이미 책마다 다른 표제부를 그리지만 그것은 통짜 한 덩이라, 표지와 인용을
 * 두 장으로 나누려면 여기서 따로 골라야 한다.
 */
export function getLessonEpigraph(bookLesson: BookLesson): CardEpigraph | undefined {
  switch (bookLesson.book) {
    case 'classic': {
      const { quote, quoteBy } = bookLesson.lesson;
      return quote ? { text: quote, by: quoteBy } : undefined;
    }
    case 'latin':
      return { text: bookLesson.lesson.latin, by: bookLesson.lesson.meaning };
    case 'quote':
      return { text: bookLesson.lesson.quote, by: bookLesson.lesson.meaning };
    case 'hanmun':
      return { text: bookLesson.lesson.hanmun, by: bookLesson.lesson.meaning };
    case 'english':
      return { text: bookLesson.lesson.english, by: bookLesson.lesson.meaning };
    case 'writing':
    case 'listening':
      return { text: bookLesson.lesson.epigraph, by: bookLesson.lesson.epigraphBy };
    // 한자·심리·교양은 지면에 인용문이 없다.
    case 'hanja':
    case 'psychology':
    case 'liberal':
      return undefined;
  }
}

export function getCardCover(bookLesson: BookLesson, bookName: string): CardCover {
  const heading = getLessonHeading(bookLesson);
  return { bookName, title: heading.title, subtitle: heading.subtitle };
}

/**
 * 장 목록.
 *
 * 표지 → (인용) → 본문 → (맺음). 본문은 한 장에 한 문단이고, 220자를 넘는 문단만 여러
 * 장으로 나뉜다. 인용문이 없는 책은 인용 장이 빠진다.
 *
 * 맺음 장은 본문을 다 읽고 나서 갈 곳을 주는 자리다. 오늘의 공부를 맺는 흐름
 * (퀴즈 → 마치기 → 리포트)이 전부 여기서 시작하므로, 퀴즈가 있는 한 이 장을 빼면 안 된다.
 * 예전에 다른 조건으로 이 장을 뺐다가 그 흐름이 통째로 사라진 적이 있다.
 */
export function buildCardPages(
  bookLesson: BookLesson,
  { hasQuiz }: { hasQuiz: boolean },
): CardPage[] {
  const pages: CardPage[] = [{ kind: 'cover' }];
  if (getLessonEpigraph(bookLesson)) pages.push({ kind: 'quote' });
  for (const paragraph of bookLesson.lesson.story) {
    // 한 장에는 한 문단. 220자가 넘는 문단만 여러 장으로 나뉜다.
    for (const part of splitParagraphToCards(paragraph)) pages.push({ kind: 'desc', paragraph: part });
  }
  if (hasQuiz) pages.push({ kind: 'outro' });
  return pages;
}

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
 * 표지는 책 이름과 표제를 읽되 하이라이트는 걸지 않는다 — 그린 글과 읽는 말이 꼭 같지
 * 않기 때문이다(한자의 표제는 글자, 라틴어의 표제는 원문이다). 맺음 장은 읽지 않고,
 * 본문이 끝나면 그대로 엔딩으로 간다.
 */
export function buildCardNarration(
  pages: CardPage[],
  { cover, epigraph }: { cover: CardCover; epigraph?: CardEpigraph },
): NarrationStep[] {
  const steps: NarrationStep[] = [];

  pages.forEach((page, index) => {
    if (page.kind === 'cover') {
      steps.push({ page: index, text: cover.bookName });
      steps.push({ page: index, text: cover.title });
      return;
    }
    if (page.kind === 'quote' && epigraph) {
      // 출처(by)는 읽지 않는다 — 글이 아니라 꼬리표다.
      steps.push(...stepsFor(index, epigraph.text));
      return;
    }
    if (page.kind === 'desc' && page.paragraph) {
      steps.push(...stepsFor(index, page.paragraph));
    }
  });

  return steps;
}
