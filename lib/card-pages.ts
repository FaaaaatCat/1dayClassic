import { Dimensions } from 'react-native';

import { getLessonHeading, type BookLesson } from '@/lib/books';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import { splitSentences } from '@/lib/narration';
import type { NarrationStep } from '@/hooks/useCardNarration';

/**
 * 항목 하나를 카드 여러 장으로 나누는 규칙.
 *
 * 카드 넘김 상세가 아홉 권 어디에나 돌려면, 책마다 다른 지면을 같은 장 구성으로 옮겨야
 * 한다. 모든 책이 공통으로 갖는 것은 story(본문)뿐이고, 표제와 인용문이 담긴 필드는
 * 책마다 다르다 — 그래서 표제는 getLessonHeading에 맡기고 인용문만 여기서 골라낸다.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * 카드 크기 — 화면을 거의 다 쓴다.
 *
 * 예전에는 320×466으로 못박혀 있었다. 화면이 큰 기기에서 카드만 작게 떠 있어 읽는 자리가
 * 좁았다. 이제 좌우로 여백만 남기고, 세로는 위아래 크롬을 뺀 만큼을 갖는다.
 *
 * 크롬 높이를 상수로 잡는 건 여기가 화면 밖(모듈 최상단)이라 세이프에어리어를 물어볼 수
 * 없어서다. 넉넉하게 빼 둔다 — 모자라면 카드가 크롬을 밀고 올라가지만, 남으면 위아래
 * 여백이 조금 더 생길 뿐이다. 카드는 어차피 자리 한가운데에 놓인다.
 */
const CARD_MARGIN_X = 28;
/** 진행 바·계정 줄·하단 줄과 그 사이 여백, 그리고 기기마다 다른 세이프에어리어까지. */
const CHROME_H = 260;

export const CARD_W = SCREEN_W - CARD_MARGIN_X * 2;
export const CARD_H = SCREEN_H - CHROME_H;

/**
 * 음악 재생기의 높이. 유튜브 약관(필수 최소 기능)이 정한 값이라 더 줄일 수 없다 —
 * "Embedded players must have a viewport that is at least 200px by 200px."
 * 카드 아래에 앉으므로 그만큼 카드가 짧아진다.
 */
export const PLAYER_H = 200;
/** 카드와 재생기 사이 틈. */
export const PLAYER_GAP = 12;
/** 재생기가 열릴 때 카드가 내주는 높이. */
export const PLAYER_BLOCK = PLAYER_H + PLAYER_GAP;

/**
 * 본문 글자 값 — 화면(styles.descText, styles.cardBody)과 같아야 줄 수가 맞는다.
 * 카드가 커지면서 한 번 키웠다가 되돌린 값이다 — 큰 화면에서는 18이 너무 굵어 보였다.
 */
export const BODY_FONT_SIZE = 15;
export const BODY_LINE_HEIGHT = 26;
const BODY_LETTER_SPACING = -0.3; // tracking(15)
export const BODY_PADDING_X = 28;
export const BODY_PADDING_Y = 32;

/**
 * 본문 한 장을 채우기 시작하는 기준(공백 포함).
 *
 * 여기까지 차면 그 장을 맺되, 읽던 문장은 끝까지 보여 준다 — 그래서 한 장은 200자를
 * 조금 넘긴 자리에서 문장 부호로 끝난다. 문장이 중간에 잘리면 읽는 흐름이 끊긴다.
 */
const MIN_CHARS_PER_CARD = 200;

/**
 * 카드가 실제로 담는 줄 수. 이보다 길어질 것 같으면 200자를 못 채웠어도 한 문장 앞에서 끊는다.
 *
 * 재생기가 열린 '짧아진 카드'를 기준으로 센다. 음악을 켜면 카드가 그만큼 줄어드는데
 * 장 수는 그대로여야 하기 때문이다 — 긴 카드에 맞춰 나눠 두면 음악을 켠 순간 글이
 * 잘린다. 실측 아홉 권에서는 어느 쪽으로 세든 결과가 같다(가장 긴 장이 열세 줄).
 *
 * 문장을 온전히 담다 보면 200자를 채운 뒤 붙는 문장이 길어 카드를 넘길 때가 있다
 * (실측 아홉 권에서 다섯 장, 최대 열아홉 줄). 카드 안에 스크롤을 두지 않으므로 — 이 화면은
 * '한 장에 한 덩이'라는 약속 위에 서 있고, 카드 안에서 또 스크롤하면 넘김과 스크롤이 같은
 * 손짓을 두고 다툰다 — 그 경우에는 앞 문장에서 맺는다. 문장은 여전히 온전하다.
 */
const MAX_LINES_PER_CARD = Math.floor(
  (CARD_H - PLAYER_BLOCK - BODY_PADDING_Y * 2) / BODY_LINE_HEIGHT,
);

/** 한 줄에 들어가는 글자 폭. 전각 한 자를 1로 센다. */
const LINE_CAPACITY = (CARD_W - BODY_PADDING_X * 2) / (BODY_FONT_SIZE + BODY_LETTER_SPACING);

/** 한글·한자·가나·전각 부호는 한 칸을 다 쓰고, 나머지(로마자·숫자·공백)는 대략 절반이다. */
const FULL_WIDTH =
  /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹏＀-｠]/;

function textWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += FULL_WIDTH.test(ch) ? 1 : 0.5;
  return width;
}

/**
 * 이 글이 카드에서 몇 줄이 될지 센다.
 *
 * 화면이 줄을 어떻게 접을지 어절 단위로 흉내 낸다. 실제로 재지 않는 건, 재려면 한 번 그린
 * 뒤 다시 나눠야 해서 글이 눈앞에서 재배치되기 때문이다.
 */
function lineCount(text: string): number {
  const words = text.split(' ').filter(Boolean);
  let lines = 1;
  let width = 0;

  for (const word of words) {
    const wordWidth = textWidth(word);
    if (width === 0) {
      width = wordWidth;
      continue;
    }
    if (width + 0.5 + wordWidth <= LINE_CAPACITY) {
      width += 0.5 + wordWidth;
      continue;
    }
    lines += 1;
    width = wordWidth;
  }
  return lines;
}

/**
 * 문단을 카드에 담기는 만큼씩 끊는다. 끊는 자리는 언제나 문장의 끝이다.
 *
 * 문장을 차례로 쌓다가 200자에 이르면 그 장을 맺는다. 200자를 못 채웠더라도 다음 문장을
 * 넣으면 카드를 넘칠 것 같으면 거기서 맺는다. 어느 쪽이든 장은 문장 부호로 끝난다.
 *
 * 문장 나누기는 lib/narration의 것을 그대로 쓴다 — 낭독이 쓰는 것과 같은 규칙이라
 * "1.5"나 "T. S. 엘리엇"의 마침표에서 잘리지 않는다.
 */
export function splitParagraphToCards(paragraph: string): string[] {
  const sentences = splitSentences(paragraph);
  if (sentences.length <= 1) return [paragraph];

  const cards: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    cards.push(buffer.join(' '));
    buffer = [];
  };

  for (const sentence of sentences) {
    const joined = buffer.length === 0 ? sentence : `${buffer.join(' ')} ${sentence}`;
    // 넣으면 카드를 넘칠 문장은 다음 장으로 미룬다(이미 담긴 것이 있을 때만).
    if (buffer.length > 0 && lineCount(joined) > MAX_LINES_PER_CARD) {
      flush();
      buffer.push(sentence);
    } else {
      buffer.push(sentence);
    }
    if (buffer.join(' ').length >= MIN_CHARS_PER_CARD) flush();
  }
  flush();

  return cards.length > 0 ? cards : [paragraph];
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
  /** 책의 표식. 없는 책은 그 자리가 빈다(lib/bookstore의 symbol). */
  symbol?: string;
  /**
   * 그 곡을 들을 수 있는 곳. 하루 클래식만 갖는다 — 다른 책은 들을 곡이 없다.
   * 있으면 표지 맨 아래에 '음악 듣기'가 선다.
   */
  listenUrl?: string;
  /**
   * 그 곡의 유튜브 영상 ID. 있으면 '음악 듣기'가 바깥 브라우저 대신 카드 아래 붙박이
   * 재생기를 연다 — 브라우저로 나가면 유튜브가 다른 창에서의 재생을 막아 버린다.
   */
  listenId?: string;
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
  const symbol = BOOKSTORE_BOOKS.find((book) => book.id === bookLesson.book)?.symbol;
  // 곡 링크는 클래식에만 있는 필드라 여기서 갈라 꺼낸다.
  const classic = bookLesson.book === 'classic';
  const listenUrl = classic ? bookLesson.lesson.youtubeUrl : undefined;
  const listenId = classic ? bookLesson.lesson.youtubeId : undefined;
  return { bookName, title: heading.title, subtitle: heading.subtitle, symbol, listenUrl, listenId };
}

/**
 * 장 목록.
 *
 * 표지 → (인용) → 본문 → (맺음). 본문은 한 장에 한 문단이고, 긴 문단은 문장 단위로 나뉜다.
 * 인용문이 없는 책은 인용 장이 빠진다.
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
    // 한 장에는 한 문단. 긴 문단은 문장 끝에서 나뉜다.
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
