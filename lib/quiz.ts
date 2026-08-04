import type { DailyLesson, Quiz } from '@/types';

/**
 * 항목의 퀴즈를 꺼낸다. 없으면 undefined.
 *
 * data/*.json은 `as` 캐스팅으로 읽혀서 TypeScript가 내용을 실제로 검사하지 않는다 —
 * 보기를 3개만 적거나 해설을 빠뜨려도 조용히 통과한다. 콘텐츠를 개발자가 아닌 사람이
 * 적으므로, 틀렸을 때 알려 주지 않으면 형식을 정해 둔 의미가 없다. 그래서 개발 중에만
 * 한 번 확인하고 무엇이 잘못됐는지 알린다.
 */
export function getLessonQuiz(lesson: DailyLesson): Quiz | undefined {
  const quiz = lesson.quiz;
  if (!quiz) return undefined;
  if (__DEV__) warnIfMalformed(lesson.id, quiz);
  return quiz;
}

function warnIfMalformed(lessonId: string, quiz: Quiz): void {
  const problems: string[] = [];
  if (quiz.choices.length !== 4) {
    problems.push(`보기가 4개여야 하는데 ${quiz.choices.length}개입니다`);
  }
  if (quiz.choices.some((choice) => !choice.trim())) {
    problems.push('비어 있는 보기가 있습니다');
  }
  if (![1, 2, 3, 4].includes(quiz.answer)) {
    problems.push(`answer는 1~4여야 하는데 ${quiz.answer}입니다`);
  }
  if (!quiz.title.trim()) problems.push('title이 비어 있습니다');
  if (!quiz.question.trim()) problems.push('question이 비어 있습니다');
  if (!quiz.explanation.trim()) problems.push('explanation이 비어 있습니다');

  if (problems.length > 0) {
    console.warn(`[퀴즈] ${lessonId}의 퀴즈에 문제가 있습니다:\n- ${problems.join('\n- ')}`);
  }
}
