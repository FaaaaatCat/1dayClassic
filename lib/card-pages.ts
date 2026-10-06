import { Dimensions } from 'react-native';

import { getLessonHeading, type BookLesson } from '@/lib/books';
import { getCoverDesign } from '@/lib/coverDesign';
import { speechSentences, splitSentences, splitVerse, toSpeech } from '@/lib/narration';
import type { NarrationStep } from '@/hooks/useCardNarration';
import type { CoverDesign, Illustration } from '@/types';

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
/**
 * 넘김효과 없음·스크롤 보기(책 설정)일 때의 카드 폭 — 좌우 16만 남긴다(피그마 시안).
 * 넘김 효과가 있을 때는 왼쪽에 넘어간 장이 걸칠 자리가 필요하지만, 없으면 그 자리가 빈다.
 */
export const CARD_W_WIDE = SCREEN_W - 16 * 2;

/**
 * 넘김효과 없음일 때 카드 위아래로 비우는 높이. 위는 진행 바(14)와 헤더 줄(48) —
 * CardDeckDetail의 BARS_H·HEADER_H와 같은 값이다. 아래는 화면 끝까지의 여백 16.
 */
export const SIMPLE_CARD_TOP = 14 + 48;
const SIMPLE_CARD_BOTTOM = 16;

/**
 * 넘김효과 없음일 때의 카드 높이 — 위아래 크롬을 뺀 나머지를 다 쓴다(피그마 시안).
 * 세이프에어리어가 기기마다 달라 화면 안에서 재어 넘겨받는다.
 */
export function simpleCardHeight(windowH: number, insetTop: number, insetBottom: number): number {
  return windowH - insetTop - insetBottom - SIMPLE_CARD_TOP - SIMPLE_CARD_BOTTOM;
}
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
export const BODY_PADDING_X = 28;
export const BODY_PADDING_Y = 32;

/** 본문 글자의 크기 한 벌 — 화면이 그리는 값이자 장을 나누는 셈이 쓰는 값이다. */
export interface BodyMetrics {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/** 글자 크기 설정의 세 단계. */
export type BodyFontSize = 'small' | 'medium' | 'large';

/** 자간은 글자 크기의 -2%(theme의 tracking과 같은 셈). */
const metrics = (fontSize: number, lineHeight: number): BodyMetrics => ({
  fontSize,
  lineHeight,
  letterSpacing: Math.round(fontSize * -2) / 100,
});

/**
 * 글자 크기 설정(책 보기 설정)의 세 단계 — 작게 15, 중간 17, 크게 22. 처음 값은 중간이다.
 * 줄 간격은 글자에 맞춰 함께 늘고 준다 — 글자만 키우면 줄이 빽빽해져 오히려 읽기 어렵다.
 */
export const BODY_METRICS: Record<BodyFontSize, BodyMetrics> = {
  small: metrics(15, 26),
  medium: metrics(17, 29),
  large: metrics(22, 36),
};

/**
 * 본문 한 장을 어디까지 채우는가 — 카드가 담는 줄 수의 3분의 2.
 *
 * 여기까지 차면 그 장을 맺는다. 다음 문단(또는 문장)을 넣어도 카드를 넘치지 않으면
 * 3분의 2에 못 미쳤을 때 더 담는다. 문단·문장은 중간에 자르지 않는다 — 끊긴 글은
 * 읽는 흐름을 끊는다.
 */
const FILL_RATIO = 2 / 3;

/**
 * 한 장에 문단 여럿을 담을 때 그 사이에 넣는 것 — 빈 줄 하나로 보인다.
 * '\n\n'이 아닌 건 그 꼴이 구절 장(원문과 한글을 빈 줄로 가른 문단, splitVerse)의 표시라서다.
 * 가운데 띄어쓰기 하나가 있어 구절로 잘못 읽히지 않는다.
 */
export const PARAGRAPH_BREAK = '\n \n';

/**
 * 카드가 실제로 담는 줄 수. 이보다 길어질 것 같으면 3분의 2를 못 채웠어도 한 문장 앞에서 끊는다.
 *
 * 유튜브가 딸린 항목은 재생기가 카드 아래를 늘 차지하므로 '짧아진 카드'를 기준으로
 * 센다. 딸리지 않은 항목은 카드가 줄어들 일이 없으니 온전한 높이로 센다.
 *
 * 문장을 온전히 담다 보면 마지막에 붙는 문장이 길어 카드를 넘길 때가 있다. 카드 안에 스크롤을 두지 않으므로 — 이 화면은
 * '한 장에 한 덩이'라는 약속 위에 서 있고, 카드 안에서 또 스크롤하면 넘김과 스크롤이 같은
 * 손짓을 두고 다툰다 — 그 경우에는 앞 문장에서 맺는다. 문장은 여전히 온전하다.
 */
function maxLinesPerCard(hasMusic: boolean, body: BodyMetrics, cardH: number = CARD_H): number {
  const height = hasMusic ? cardH - PLAYER_BLOCK : cardH;
  return Math.floor((height - BODY_PADDING_Y * 2) / body.lineHeight);
}

/** 한 줄에 들어가는 글자 폭. 전각 한 자를 1로 센다. */
function lineCapacity(body: BodyMetrics, cardW: number): number {
  return (cardW - BODY_PADDING_X * 2) / (body.fontSize + body.letterSpacing);
}

/** 한 장을 맺는 줄 수 — 카드가 담는 줄 수의 3분의 2(FILL_RATIO). */
function targetLines(maxLines: number): number {
  return Math.ceil(maxLines * FILL_RATIO);
}

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
function lineCount(text: string, capacity: number): number {
  const words = text.split(' ').filter(Boolean);
  let lines = 1;
  let width = 0;

  for (const word of words) {
    const wordWidth = textWidth(word);
    if (width === 0) {
      width = wordWidth;
      continue;
    }
    if (width + 0.5 + wordWidth <= capacity) {
      width += 0.5 + wordWidth;
      continue;
    }
    lines += 1;
    width = wordWidth;
  }
  return lines;
}

/** 문단 여럿을 빈 줄로 이은 글이 카드에서 몇 줄이 될지 — 문단마다 세고 사이의 빈 줄을 더한다. */
function blockLineCount(paragraphs: string[], capacity: number): number {
  return (
    paragraphs.reduce((lines, paragraph) => lines + lineCount(paragraph, capacity), 0) +
    (paragraphs.length - 1)
  );
}

/**
 * 문장 하나가 카드 한 장보다 길 때의 마지막 수단 — 어절 사이에서 끊는다.
 *
 * 문장은 끊지 않는 것이 원칙이지만, 글자가 크고 카드가 짧으면(재생기가 딸린 항목을 크게로
 * 읽을 때) 한 문장이 카드를 넘친다. 카드 안에서는 스크롤하지 않으므로 넘치는 글은 잘려
 * 보이지 않는다 — 그보다는 어절에서 넘기는 편이 낫다.
 */
function splitByWords(text: string, capacity: number, maxLines: number): string[] {
  if (lineCount(text, capacity) <= maxLines) return [text];
  const chunks: string[] = [];
  let words: string[] = [];
  for (const word of text.split(' ').filter(Boolean)) {
    if (words.length > 0 && lineCount([...words, word].join(' '), capacity) > maxLines) {
      chunks.push(words.join(' '));
      words = [];
    }
    words.push(word);
  }
  if (words.length > 0) chunks.push(words.join(' '));
  return chunks;
}

/**
 * 문단을 카드에 담기는 만큼씩 끊는다. 끊는 자리는 언제나 문장의 끝이다.
 *
 * 문장을 차례로 쌓다가 카드의 3분의 2에 이르면 그 장을 맺는다. 못 채웠더라도 다음 문장을
 * 넣으면 카드를 넘칠 것 같으면 거기서 맺는다. 어느 쪽이든 장은 문장 부호로 끝난다.
 *
 * 문장 나누기는 lib/narration의 것을 그대로 쓴다 — 낭독이 쓰는 것과 같은 규칙이라
 * "1.5"나 "T. S. 엘리엇"의 마침표에서 잘리지 않는다.
 */
export function splitParagraphToCards(
  paragraph: string,
  hasMusic = false,
  body: BodyMetrics = BODY_METRICS.medium,
  cardW: number = CARD_W,
  cardH: number = CARD_H,
): string[] {
  const maxLines = maxLinesPerCard(hasMusic, body, cardH);
  const capacity = lineCapacity(body, cardW);
  const target = targetLines(maxLines);
  // 한 장을 넘는 문장은 미리 어절에서 나눠 둔다(splitByWords) — 그 조각들이 문장처럼 쌓인다.
  const sentences = splitSentences(paragraph).flatMap((sentence) =>
    splitByWords(sentence, capacity, maxLines),
  );
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
    if (buffer.length > 0 && lineCount(joined, capacity) > maxLines) {
      flush();
      buffer.push(sentence);
    } else {
      buffer.push(sentence);
    }
    if (lineCount(buffer.join(' '), capacity) >= target) flush();
  }
  flush();

  return cards.length > 0 ? cards : [paragraph];
}

export type CardPageKind = 'cover' | 'quote' | 'desc' | 'outro';

export interface CardPage {
  kind: CardPageKind;
  /** desc 장 전용 — 이 장에 담을 글. 문단이 여럿이면 PARAGRAPH_BREAK로 이어져 있다. */
  paragraph?: string;
  /** 구절만 세운 장의 삽화 — 글 위에 작게 얹는다. */
  illustration?: Illustration;
}

/** 표지 장에 쓰는 표제. */
export interface CardCover {
  bookName: string;
  title: string;
  subtitle?: string;
  /**
   * 그 책의 표지 값 — 표지 장이 종이색·잉크색·출판사 마크를 여기서 가져온다.
   *
   * 예전에는 표식(symbol) 하나만 들고 왔다. 표식만으로는 검은 바탕 위의 글리프 하나였고
   * 그 책의 표지와 아무 관계가 없었다. 이제 표지와 같은 종이 위에 같은 잉크로 그린다.
   */
  design: CoverDesign;
  /**
   * 이 항목에 딸린 유튜브 영상 ID. 있으면 카드 아래에 재생기가 늘 앉아 있다.
   *
   * 지금은 하루 클래식만 갖지만 책을 가리지 않는다 — 데이터에 youtubeId를 적어 두면
   * 어느 책이든 그 자리가 생긴다.
   */
  listenId?: string;
}

/** 인용 장에 쓰는 글. 인용문이 없는 책(한자·심리·교양)은 이 장을 두지 않는다. */
export interface CardEpigraph {
  text: string;
  by?: string;
  /** text를 한글로 적은 읽기(독음·발음). 있으면 낭독이 원문 대신 이것을 읽는다. */
  reading?: string;
  /** by가 출처가 아니라 인용문의 뜻풀이인 책 — 낭독이 이 줄까지 읽는다. */
  byIsMeaning?: boolean;
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
    case 'latin': {
      const { latin, pronunciation, meaning } = bookLesson.lesson;
      return { text: latin, reading: pronunciation, by: meaning, byIsMeaning: true };
    }
    case 'quote': {
      const { quote, reading, meaning } = bookLesson.lesson;
      return { text: quote, reading, by: meaning, byIsMeaning: true };
    }
    case 'hanmun': {
      const { hanmun, reading, meaning } = bookLesson.lesson;
      return { text: hanmun, reading, by: meaning, byIsMeaning: true };
    }
    case 'english':
      return { text: bookLesson.lesson.english, by: bookLesson.lesson.meaning, byIsMeaning: true };
    case 'writing':
    case 'listening':
      return { text: bookLesson.lesson.epigraph, by: bookLesson.lesson.epigraphBy };
    // 천자문·명상록은 지면에 인용문이 없다.
    case 'hanja':
    case 'psychology':
      return undefined;
  }
}

/**
 * 이 항목에 딸린 유튜브 영상 ID.
 *
 * 책마다 항목의 생김새가 달라(Track·LatinLesson·…) 필드가 있는 책과 없는 책이 섞여
 * 있다. 있으면 꺼내고 없으면 없는 대로 둔다 — 나중에 다른 책이 youtubeId를 갖게 되면
 * 여기를 고치지 않아도 그대로 걸린다.
 */
function lessonVideoId(lesson: BookLesson['lesson']): string | undefined {
  return 'youtubeId' in lesson ? lesson.youtubeId : undefined;
}

export function getCardCover(bookLesson: BookLesson, bookName: string): CardCover {
  const heading = getLessonHeading(bookLesson);
  const design = getCoverDesign(bookLesson.book);
  // 곡 링크는 클래식에만 있는 필드라 여기서 갈라 꺼낸다.
  return {
    bookName,
    title: heading.title,
    subtitle: heading.subtitle,
    design,
    listenId: lessonVideoId(bookLesson.lesson),
  };
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
  {
    hasQuiz,
    body = BODY_METRICS.medium,
    cardW = CARD_W,
    cardH = CARD_H,
    split = true,
  }: {
    hasQuiz: boolean;
    body?: BodyMetrics;
    cardW?: number;
    /** 카드 높이(재생기 몫을 빼기 전). 넘김효과 없음이면 화면을 더 써서 커진다. */
    cardH?: number;
    /**
     * 긴 문단을 카드에 맞춰 나눌지. 스크롤 보기는 장 크기가 없으니 나누지 않는다 —
     * 한 문단이 한 덩이로 이어진다.
     */
    split?: boolean;
  },
): CardPage[] {
  const pages: CardPage[] = [{ kind: 'cover' }];
  if (getLessonEpigraph(bookLesson)) pages.push({ kind: 'quote' });
  // 이 항목에 음악이 있는가 — 있으면 재생기가 카드 아래를 늘 차지하므로 더 짧게 나눈다.
  const hasMusic = !!lessonVideoId(bookLesson.lesson);
  // 구절만 세운 장은 글이 짧아 위가 빈다 — 골라 둔 삽화가 있으면 나오는 순서대로 얹는다.
  const illustrations = bookLesson.lesson.illustrations ?? [];
  let verses = 0;
  const maxLines = maxLinesPerCard(hasMusic, body, cardH);
  const capacity = lineCapacity(body, cardW);
  const target = targetLines(maxLines);
  /** 지금 장에 담고 있는 문단들. */
  let pack: string[] = [];
  const flushPack = () => {
    if (pack.length === 0) return;
    pages.push({ kind: 'desc', paragraph: pack.join(PARAGRAPH_BREAK) });
    pack = [];
  };
  for (const paragraph of bookLesson.lesson.story) {
    if (splitVerse(paragraph)) {
      // 구절 장은 혼자 선다 — 담던 문단들을 먼저 맺는다.
      flushPack();
      pages.push({ kind: 'desc', paragraph, illustration: illustrations[verses] });
      verses += 1;
      continue;
    }
    if (!split) {
      pages.push({ kind: 'desc', paragraph });
      continue;
    }
    // 카드의 3분의 2가 찰 때까지 문단을 이어 담는다(PARAGRAPH_BREAK로 띄워서).
    // 긴 문단은 먼저 문장 끝에서 나뉜다.
    for (const part of splitParagraphToCards(paragraph, hasMusic, body, cardW, cardH)) {
      if (pack.length > 0 && blockLineCount([...pack, part], capacity) > maxLines) flushPack();
      pack.push(part);
      if (blockLineCount(pack, capacity) >= target) flushPack();
    }
  }
  flushPack();
  if (hasQuiz) pages.push({ kind: 'outro' });
  return pages;
}

/**
 * 문단 하나를 문장 덩이로 쪼개면서, 각 문장이 문단 어디서 시작했는지를 함께 적어 둔다.
 * 그 자리를 알아야 TTS가 알려 주는 단어 위치를 화면 위의 글자로 옮길 수 있다.
 */
export function stepsFor(page: number, paragraph: string): NarrationStep[] {
  return speechSentences(paragraph).map(({ text, origin, offset }) => ({ page, text, offset, origin }));
}

/** 카드에 그린 글과 읽는 말이 달라 하이라이트를 걸 수 없는 덩이들. */
function unanchoredSteps(page: number, text: string): NarrationStep[] {
  return speechSentences(text).map((speech) => ({ page, text: speech.text }));
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
      steps.push({ page: index, text: toSpeech(cover.title).text });
      return;
    }
    if (page.kind === 'quote' && epigraph) {
      // 원문이 한자·라틴어면 한글로 적은 읽기를 대신 읽는다.
      if (epigraph.reading) steps.push(...unanchoredSteps(index, epigraph.reading));
      else steps.push(...stepsFor(index, epigraph.text));
      // 뜻풀이는 읽는다. 출처는 읽지 않는다 — 글이 아니라 꼬리표다.
      if (epigraph.by && epigraph.byIsMeaning) steps.push(...unanchoredSteps(index, epigraph.by));
      return;
    }
    if (page.kind === 'desc' && page.paragraph) {
      steps.push(...stepsFor(index, page.paragraph));
    }
  });

  return steps;
}
