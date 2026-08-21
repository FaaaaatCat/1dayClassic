import { useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';

import { renderBookDetail } from '@/components/lesson/books';
import LessonDetailShell from '@/components/lesson/LessonDetailShell';
import { useBookSelection } from '@/context/BookSelectionContext';
import { getBookLesson } from '@/lib/books';
import type { BookId } from '@/types';

/**
 * 하루 시리즈 9권이 공유하는 항목 상세 화면.
 *
 * 이 파일은 항목을 해석해서 껍데기(`LessonDetailShell`)에 넘기는 일만 한다 — 스크롤·닫기
 * 버튼·오디오 팝업은 Shell이, 화면 내용(인트로·히어로·표제부·본문·감상 노트 등)은 책별
 * 조합 컴포넌트(`renderBookDetail`)가 그린다.
 *
 * bookId를 안 주면 하루 서점에서 선택해 둔 책의 오늘 항목을 보여 준다 — 네이티브 알람이
 * 항목을 지정하지 않고 `1dayclassic://today?autoplay=…`로 열기 때문에 이 기본값이 필요하고,
 * 그래서 알람이 여는 책도 선택된 책을 그대로 따라간다.
 */
export default function TodayScreen() {
  const params = useLocalSearchParams<{ bookId?: string; lessonId?: string }>();
  const { selectedBookId } = useBookSelection();
  const bookId = (params.bookId as BookId | undefined) ?? selectedBookId;
  const bookLesson = getBookLesson(bookId, params.lessonId);

  if (!bookLesson) return null;

  return (
    <LessonDetailShell bookLesson={bookLesson}>
      {/* 항목이 바뀌면 블록 상태(입력 중인 감상 노트 등)가 남지 않도록 항목 키로 다시 마운트한다. */}
      <Fragment key={`${bookLesson.book}:${bookLesson.lesson.id}`}>
        {renderBookDetail(bookLesson)}
      </Fragment>
    </LessonDetailShell>
  );
}
