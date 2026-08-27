/**
 * `npm run check:quizzes` — data/*.json의 퀴즈를 검사한다.
 *
 * 타입 검사는 JSON 내용을 보지 않는다(`as` 캐스팅으로 읽기 때문). 콘텐츠를 손으로
 * 적는 이상 형식이 어긋나는 일은 반드시 생기므로, 여기서 한 번에 훑는다.
 */
import fs from 'node:fs';

const DIR = 'data';
/** 한 책 안에서 정답 번호가 이 비율을 넘게 몰리면 찍어서 맞힐 수 있다. */
const MAX_ANSWER_SHARE = 0.5;
/** 정답 쏠림 검사를 적용할 최소 문항 수 — 문항이 적으면 쏠림이 당연하다. */
const SKEW_CHECK_MIN = 5;

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

  for (const lesson of lessons) {
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
