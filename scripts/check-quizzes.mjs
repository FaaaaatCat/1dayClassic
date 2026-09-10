/**
 * `npm run check:quizzes` — data/*.json의 퀴즈와 본문을 검사한다.
 *
 * 타입 검사는 JSON 내용을 보지 않는다(`as` 캐스팅으로 읽기 때문). 콘텐츠를 손으로
 * 적는 이상 형식이 어긋나는 일은 반드시 생기므로, 여기서 한 번에 훑는다.
 *
 * 자유이용 저작물로 갈아 끼운 책에는 검사가 하나 더 붙는다(REPLACED 참고). 정답이
 * 본문에 근거를 두고 있는지 보는 검사인데, 이게 없으면 본문을 읽지 않아도 바깥 지식으로
 * 풀리는 문제가 조용히 섞여 든다. 아직 갈아 끼우지 않은 책에는 적용하지 않는다 —
 * 어차피 통째로 교체될 원고라, 지금 붉게 물들여 봐야 신호가 아니라 소음이다.
 */
import fs from 'node:fs';

const DIR = 'data';
/** 한 책 안에서 정답 번호가 이 비율을 넘게 몰리면 찍어서 맞힐 수 있다. */
const MAX_ANSWER_SHARE = 0.5;
/** 정답 쏠림 검사를 적용할 최소 문항 수 — 문항이 적으면 쏠림이 당연하다. */
const SKEW_CHECK_MIN = 5;
/** 한 문단이 이보다 길면 카드 한 장이 비정상적으로 길어진다(lib/card-pages 참고). 공백은 뺀다. */
const MAX_PARAGRAPH_CHARS = 230;
/** 정답의 낱말이 본문·해설에 이만큼은 남아 있어야 '본문에 근거가 있다'고 본다. */
const MIN_GROUNDED_SHARE = 0.5;

/** 자유이용 저작물로 이미 갈아 끼운 책 — 여기 적힌 파일에만 본문 근거 검사를 건다. */
const REPLACED = new Set([
  'quote.json',
  'hanja.json',
  'hanmun.json',
  'latin.json',
  'english.json',
  'listening.json',
  'psychology.json',
  'writing.json',
  'tracks.json',
]);

/** 책마다 표제부 필드가 달라, 있는 것을 순서대로 찾아 표제로 삼는다. */
const HEADWORD_FIELDS = ['quote', 'hanmun', 'latin', 'english', 'title'];

/**
 * 그 항목의 표제 — 겹치는지 보려면 한 줄로 뽑아 둘 필요가 있다.
 * 한자 책만 표제가 낱글자 배열이라(characters) 따로 이어 붙인다.
 */
function headwordOf(lesson) {
  if (Array.isArray(lesson.characters)) {
    return lesson.characters.map((character) => character.hanja).join('');
  }
  const field = HEADWORD_FIELDS.find((name) => typeof lesson[name] === 'string' && lesson[name]);
  return field ? lesson[field] : undefined;
}

/** 조사·어미를 떼어 낸 낱말들. 두 글자 미만은 아무 데나 걸려서 세지 않는다. */
function keywords(text) {
  return text
    .split(/[\s,·。、'"()（）「」『』]+/)
    .map((word) => word.replace(/[을를이가은는의에서와과로으로도만]$/u, ''))
    .filter((word) => word.length >= 2);
}

/** 정답 문구가 본문이나 해설에 실제로 남아 있는가 — 바깥 지식으로만 풀리는 문제를 막는다. */
function groundedShare(answerText, haystack) {
  const words = keywords(answerText);
  if (words.length === 0) return 1;
  const found = words.filter((word) => haystack.includes(word)).length;
  return found / words.length;
}

let problems = 0;
const note = (message) => {
  console.log(`  ✗ ${message}`);
  problems += 1;
};

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(`${DIR}/${file}`, 'utf8'));
  const lessons = data.tracks ?? data.lessons ?? [];
  const answers = {};
  let withQuiz = 0;

  console.log(`\n${file} (${lessons.length}개 항목)`);

  /** 갈아 끼운 책에만 거는 검사가 있다 — REPLACED 주석 참고. */
  const strict = REPLACED.has(file);
  const headwords = new Map();

  for (const lesson of lessons) {
    if (strict) {
      // 본문 문단이 너무 길면 카드 한 장이 혼자 길어진다.
      for (const [i, paragraph] of (lesson.story ?? []).entries()) {
        const length = String(paragraph).replace(/\s/g, '').length;
        if (length > MAX_PARAGRAPH_CHARS) {
          note(`${lesson.id}: ${i + 1}번째 문단이 ${length}자 — ${MAX_PARAGRAPH_CHARS}자를 넘는다`);
        }
      }

      // 표제가 겹치면 목차에서 같은 줄이 두 번 나온다.
      const headword = headwordOf(lesson);
      if (headword) {
        const seen = headwords.get(headword);
        if (seen) note(`${lesson.id}: 표제 "${headword}"가 ${seen}와 겹친다`);
        else headwords.set(headword, lesson.id);
      }
    }

    // 한 항목이 문제 여러 개를 든다. 예전 모양(quiz 하나)도 그대로 읽는다.
    const quizzes = lesson.quizzes ?? (lesson.quiz ? [lesson.quiz] : []);
    if (quizzes.length === 0) {
      note(`${lesson.id}: 퀴즈 없음`);
      continue;
    }

    for (const [i, quiz] of quizzes.entries()) {
      withQuiz += 1;

      // 한 항목에 여러 문제가 있으면 몇 번째인지 함께 짚어 준다.
      const where = quizzes.length > 1 ? `${lesson.id}[${i + 1}]` : `${lesson.id}`;
      if (!Array.isArray(quiz.choices) || quiz.choices.length !== 4) {
        note(`${where}: 보기가 4개여야 하는데 ${quiz.choices?.length ?? 0}개`);
      } else {
        if (quiz.choices.some((c) => typeof c !== 'string' || !c.trim())) {
          note(`${where}: 비어 있는 보기가 있다`);
        }
        if (new Set(quiz.choices).size !== 4) {
          note(`${where}: 같은 보기가 두 번 들어 있다`);
        }
      }

      if (![1, 2, 3, 4].includes(quiz.answer)) {
        note(`${where}: answer는 1~4여야 하는데 ${quiz.answer}`);
      } else {
        answers[quiz.answer] = (answers[quiz.answer] ?? 0) + 1;
      }

      for (const field of ['title', 'question', 'explanation']) {
        if (typeof quiz[field] !== 'string' || !quiz[field].trim()) {
          note(`${where}: ${field}가 비어 있다`);
        }
      }

      // 정답이 본문 밖 지식으로만 풀리면 학습이 아니라 상식 시험이 된다.
      if (strict && Array.isArray(quiz.choices) && [1, 2, 3, 4].includes(quiz.answer)) {
        const haystack = [...(lesson.story ?? []), quiz.explanation ?? ''].join(' ');
        const share = groundedShare(quiz.choices[quiz.answer - 1], haystack);
        if (share < MIN_GROUNDED_SHARE) {
          note(`${where}: 정답의 근거가 본문에 없다 (낱말 ${Math.round(share * 100)}%만 등장)`);
        }
      }
    }
  }

  if (withQuiz >= SKEW_CHECK_MIN) {
    const [top, count] = Object.entries(answers).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (count / withQuiz > MAX_ANSWER_SHARE) {
      note(
        `정답이 ${top}번에 몰려 있다 (${count}/${withQuiz}) — 본문을 안 읽고 찍어도 맞는다`,
      );
    }
  }

  const spread = [1, 2, 3, 4].map((n) => `${n}번 ${answers[n] ?? 0}`).join(' · ');
  console.log(`  문항 ${withQuiz}개 / 항목 ${lessons.length}개   정답 분포: ${spread}`);
}

console.log(problems === 0 ? '\n문제 없음 ✓' : `\n문제 ${problems}건`);
process.exit(problems === 0 ? 0 : 1);
