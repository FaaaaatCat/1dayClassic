/** 종결부호 뒤에 따라붙어도 같은 문장으로 묶는 닫는 부호들 */
const CLOSING_MARKS = '"\'”’)]』」〉》';

/** 문장을 끝맺는 부호 */
const SENTENCE_ENDS = '.!?';

/**
 * 문단 하나를 문장들로 나눈다.
 *
 * 종결부호 뒤가 공백이거나 문단의 끝일 때만 경계로 본다 — "1.5", "T. S. 엘리엇"처럼
 * 마침표가 문장 끝이 아닌 자리에서 잘리지 않게 하려는 것이다. 종결부호에 닫는 인용부호가
 * 붙어 있으면(…뭐냐?") 거기까지 한 문장으로 삼는다.
 *
 * 정규식 lookbehind는 쓰지 않는다 — Hermes에서 지원이 보장되지 않는다.
 */
export function splitSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < paragraph.length; i++) {
    if (!SENTENCE_ENDS.includes(paragraph[i])) continue;

    let end = i + 1;
    while (end < paragraph.length && CLOSING_MARKS.includes(paragraph[end])) end++;
    // 뒤에 공백(띄어쓰기·줄바꿈)이 오지 않으면 문장 경계가 아니다(소수점·약어·이니셜).
    // 줄바꿈도 세는 건 카드 한 장에 문단 여럿을 줄을 띄워 담기 때문이다.
    if (end < paragraph.length && !/\s/.test(paragraph[end])) continue;

    const sentence = paragraph.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    i = end - 1;
  }

  const tail = paragraph.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

const OPEN_PARENS = '(（';
const CLOSE_PARENS = ')）';
const HANGUL = /[가-힣]/;
// 호환 한자(U+F900~)는 글자로 적으면 정규화되면서 다른 글자가 되므로 코드로 적는다.
const HANJA = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const ROMAN = /[A-Za-z\u00c0-\u024f]/;
/** 한글이 아닌 글자 — 한글로 옮겨 적은 짝이 있으면 그쪽을 읽는다. */
const isForeign = (ch: string) => HANJA.test(ch) || ROMAN.test(ch);

/** 소리 내어 읽을 말과, 그 글자 하나하나가 원문 어디서 왔는지. */
export interface SpeechText {
  text: string;
  /** text의 i번째 글자가 원문의 몇 번째 글자인지 — 읽는 자리를 화면 위 글자로 되돌릴 때 쓴다. */
  origin: number[];
}

/**
 * 훈음을 늘어놓은 줄인가 — "天 하늘 천 · 地 따 지". 괄호 없이 한자와 그 읽기가 나란하다.
 * 모든 항목이 이 꼴일 때만 그렇게 본다. 한자로 시작하는 보통 문장을 잘못 잡으면 안 된다.
 */
function isGlossList(source: string): boolean {
  const entries = source.split(/\n| · /);
  if (entries.length < 2) return false;
  return entries.every((entry) => {
    const space = entry.indexOf(' ');
    if (space <= 0) return false;
    const head = entry.slice(0, space);
    const rest = entry.slice(space + 1);
    return [...head].every((ch) => HANJA.test(ch)) && HANGUL.test(rest) && ![...rest].some(isForeign);
  });
}

/**
 * 글에서 소리 내어 읽을 말만 남긴다. 같은 말을 두 가지로 적은 자리는 한글 쪽만 읽는다.
 *
 * - 악(惡)한 사람 → "악한 사람". 괄호 안이 한글이 아니면 읽지 않는다.
 * - 天(하늘 천)은 → "하늘 천은", carpo(카르포)는 → "카르포는". 한글이 아닌 말 뒤의 괄호가
 *   한글이면 안쪽이 읽는 말이다. 괄호를 버리면 TTS에 한자·로마자만 남으므로 거꾸로 앞을 버린다.
 *   괄호 안이 여러 낱말이면 앞에서도 그만큼까지 거둔다(perseverare diabolicum(페르세웨라레 디아볼리쿰)).
 * - 天 하늘 천 · 地 따 지 → "하늘 천 · 따 지". 훈음을 늘어놓은 줄의 머리 한자.
 *
 * 짝이 맞지 않는 괄호는 건드리지 않는다.
 */
export function toSpeech(source: string): SpeechText {
  const chars: string[] = [];
  const origin: number[] = [];
  const glossList = isGlossList(source);

  for (let i = 0; i < source.length; i++) {
    if (glossList && (i === 0 || source[i - 1] === '\n' || source.slice(i - 2, i) === '· ')) {
      // 항목 머리의 한자와 그 뒤 빈칸을 건너뛴다.
      i = source.indexOf(' ', i);
      continue;
    }
    if (!OPEN_PARENS.includes(source[i])) {
      chars.push(source[i]);
      origin.push(i);
      continue;
    }

    let depth = 1;
    let close = i + 1;
    for (; close < source.length; close++) {
      if (OPEN_PARENS.includes(source[close])) depth++;
      else if (CLOSE_PARENS.includes(source[close]) && --depth === 0) break;
    }
    if (close >= source.length) {
      chars.push(source[i]);
      origin.push(i);
      continue;
    }

    const inside = source.slice(i + 1, close);
    // 괄호 바로 앞에 붙은, 한글이 아닌 낱말.
    let run = chars.length;
    while (run > 0 && isForeign(chars[run - 1])) run--;

    if (run < chars.length && HANGUL.test(inside)) {
      // 괄호 안이 여러 낱말이면 앞의 낱말도 그 수만큼까지 같은 짝으로 본다.
      let words = inside.split(' ').filter(Boolean).length - 1;
      while (words > 0 && run > 1 && chars[run - 1] === ' ') {
        let head = run - 1;
        while (head > 0 && isForeign(chars[head - 1])) head--;
        if (head === run - 1 || (head > 0 && chars[head - 1] !== ' ')) break;
        run = head;
        words--;
      }
      // 첫 글자의 자리를 앞말이 시작한 곳으로 적어 둔다 — 하이라이트가 앞말까지 덮는다.
      const runStart = origin[run];
      chars.length = run;
      origin.length = run;
      for (let j = i + 1; j < close; j++) {
        chars.push(source[j]);
        origin.push(j === i + 1 ? runStart : j);
      }
    }
    i = close;
  }

  return { text: chars.join(''), origin };
}

/** 한글 첫소리(초성 19자)마다, 같은 소리로 볼 수 있는 로마자 첫 글자. */
const INITIAL_SOUNDS = [
  'gkcq', 'gkcq', 'n', 'dt', 'dt', 'rl', 'm', 'bpv', 'bpv', 'scxz',
  'scxz', 'aeiouyhwvj', 'jzg', 'jzg', 'ct', 'ckq', 't', 'pf', 'h',
];

/** 원문과 한글이 같은 소리인가 — 한글이 뜻을 옮긴 번역이 아니라 읽는 법을 적은 것인가. */
function isSameSound(original: string, korean: string): boolean {
  const hanja = [...original].filter((ch) => HANJA.test(ch)).length;
  const syllables = [...korean].filter((ch) => HANGUL.test(ch));
  // 한자는 한 자가 한 음절이다.
  if (hanja > 0) return ![...original].some((ch) => ROMAN.test(ch)) && hanja === syllables.length;

  // 로마자는 낱말 수가 같고, 낱말마다 첫소리가 맞아야 발음을 적은 것이다.
  const wordsOf = (text: string, letter: RegExp) =>
    text
      .split(/\s+/)
      .map((word) => [...word].filter((ch) => letter.test(ch)).join(''))
      .filter(Boolean);
  const romanWords = wordsOf(original, ROMAN);
  const koreanWords = wordsOf(korean, HANGUL);
  if (romanWords.length === 0 || romanWords.length !== koreanWords.length) return false;
  return romanWords.every((word, index) => {
    const initial = Math.floor((koreanWords[index].charCodeAt(0) - 0xac00) / 588);
    return INITIAL_SOUNDS[initial]?.includes(word[0].toLowerCase()) ?? false;
  });
}

/**
 * 문단에서 읽을 부분과, 그것이 문단 어디서 시작하는지.
 *
 * 본문에는 원문과 한글을 빈 줄로 갈라 적은 문단이 있다. 한글이 원문을 읽는 법이면
 * (一日不念善 / 일일불념선, Carpe diem / 카르페 디엠) 같은 소리를 두 번 듣게 되므로 한글만 읽는다.
 * 한글이 번역이면(Practice makes perfect. / 되풀이가 완벽을 만든다.) 둘은 다른 말이라 다 읽는다.
 */
export function spokenPart(paragraph: string): { text: string; offset: number } {
  const verse = splitVerse(paragraph);
  if (verse && isSameSound(verse.original, verse.korean)) {
    return { text: verse.korean, offset: paragraph.length - verse.korean.length };
  }
  return { text: paragraph, offset: 0 };
}

/**
 * 원문과 한글을 빈 줄로 갈라 적은 문단이면 그 둘. 아니면 undefined.
 * 격언·구절만 따로 세운 문단이 이 꼴이다 — 카드 한 장을 짧게 차지한다.
 */
export function splitVerse(paragraph: string): { original: string; korean: string } | undefined {
  const parts = paragraph.split('\n\n');
  if (parts.length !== 2) return undefined;
  const [original, korean] = parts;
  if (HANGUL.test(original) || !HANGUL.test(korean)) return undefined;
  return { original, korean };
}

/** 문단 하나에서 읽을 문장들. 통째로 괄호인 문장은 읽을 말이 남지 않아 빠진다. */
export function speechSentences(paragraph: string): (SpeechText & { offset: number })[] {
  const part = spokenPart(paragraph);
  const sentences: (SpeechText & { offset: number })[] = [];
  let cursor = 0;
  for (const sentence of splitSentences(part.text)) {
    const at = part.text.indexOf(sentence, cursor);
    cursor = at + sentence.length;
    const speech = toSpeech(sentence);
    if (speech.text.trim()) sentences.push({ ...speech, offset: part.offset + at });
  }
  return sentences;
}

/** 낭독이 한 번에 읽는 한 덩이 */
export interface NarrationUnit {
  text: string;
  /** 이 덩이를 읽고 나서 두는 정적(ms). 문단 끝에서만 쉬고 문장 사이는 바로 잇는다. */
  gapAfterMs: number;
}

/**
 * story 문단들을 문장 단위 낭독 덩이로 펼친다.
 *
 * 문장으로 쪼개는 이유는 '이전 문장 / 다음 문장' 이동을 위해서다. 문단을 통째로 읽으면
 * 되감을 지점이 문단 경계뿐이라 한 번에 너무 많이 건너뛴다. 듣는 느낌은 그대로 두려고
 * 문장 사이에는 정적을 두지 않고 문단이 끝날 때만 쉰다.
 */
export function buildNarrationUnits(story: string[], paragraphGapMs: number): NarrationUnit[] {
  const units: NarrationUnit[] = [];

  for (const paragraph of story) {
    const sentences = speechSentences(paragraph);
    sentences.forEach(({ text }, index) => {
      const isParagraphEnd = index === sentences.length - 1;
      units.push({ text, gapAfterMs: isParagraphEnd ? paragraphGapMs : 0 });
    });
  }

  return units;
}
