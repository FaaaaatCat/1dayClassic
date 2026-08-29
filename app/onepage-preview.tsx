import { useRouter } from 'expo-router';
import { Fragment } from 'react';

import { renderBookDetail } from '@/components/lesson/books';
import LessonDetailShell from '@/components/lesson/LessonDetailShell';
import { getBookLesson } from '@/lib/books';
import { PREVIEW_LESSON_ID } from '@/lib/preview-content';

/**
 * 원페이지 미리보기 — 지금 오늘의 공부 상세가 쓰는 형식을 그대로 띄운다.
 *
 * 카드 슬라이드·인스타 스토리와 같은 항목을 같은 자리에서 견주어 보려고 만든 화면이다.
 * 설정에 세 버튼이 나란히 서고, 셋 다 『듣기의 말들』의 같은 글을 서로 다른 옷으로 보여 준다.
 *
 * 화면을 베끼지 않고 진짜 상세가 쓰는 것을 그대로 빌려 쓴다(LessonDetailShell +
 * renderBookDetail). 그래서 이 미리보기는 언제나 '지금 상세가 어떻게 생겼는지'를 보여
 * 준다 — 상세를 고치면 여기도 함께 바뀐다. 어느 시점의 모습을 얼려 두고 싶다면 그건
 * 화면이 아니라 git이 할 일이다.
 *
 * 항목을 today 라우트로 열지 않고 이 화면을 따로 둔 건 닫기 때문이다. 상세의 닫기는
 * 홈으로 가는데, 설정에서 연 미리보기는 설정으로 돌아가야 한다.
 */
export default function OnePagePreviewScreen() {
  const router = useRouter();
  const bookLesson = getBookLesson('listening', PREVIEW_LESSON_ID);

  if (!bookLesson) return null;

  return (
    <LessonDetailShell bookLesson={bookLesson} onClose={() => router.replace('/settings')}>
      {/* 항목이 바뀌면 블록 상태가 남지 않도록 항목 키로 다시 마운트한다(today와 같다). */}
      <Fragment key={`${bookLesson.book}:${bookLesson.lesson.id}`}>
        {renderBookDetail(bookLesson)}
      </Fragment>
    </LessonDetailShell>
  );
}
