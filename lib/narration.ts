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
    // 뒤에 공백이 오지 않으면 문장 경계가 아니다(소수점·약어·이니셜).
    if (end < paragraph.length && paragraph[end] !== ' ') continue;

    const sentence = paragraph.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    i = end - 1;
  }

  const tail = paragraph.slice(start).trim();
  if (tail) sentences.push(tail);
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
    const sentences = splitSentences(paragraph);
    sentences.forEach((text, index) => {
      const isParagraphEnd = index === sentences.length - 1;
      units.push({ text, gapAfterMs: isParagraphEnd ? paragraphGapMs : 0 });
    });
  }

  return units;
}
