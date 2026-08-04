import { StyleSheet, View } from 'react-native';

import DescBlock from '@/components/lesson/blocks/DescBlock';
import ImageBlock from '@/components/lesson/blocks/ImageBlock';
import IntroBlock from '@/components/lesson/blocks/IntroBlock';
import MoreFunctionsBlock from '@/components/lesson/blocks/MoreFunctionsBlock';
import NoteBlock from '@/components/lesson/blocks/NoteBlock';
import QuoteBlock from '@/components/lesson/blocks/QuoteBlock';
import LessonHeading from '@/components/lesson/LessonHeading';
import { getBookName, type BookLesson } from '@/lib/books';

interface Props {
  bookLesson: BookLesson;
}

/**
 * 클래식 외 8권(라틴어·명언·한자·교양·심리·쓰기·한문·영어)의 현행 화면.
 *
 * 목표는 지금과 똑같은 화면이다. 기존 LessonHeading을 그대로 호출해서 표제부를 그린다 —
 * 새 TitleBlock을 쓰지 않는다(9권을 다 옮기기 전까지 LessonHeading·headingStyles.ts는
 * 손대지 않기로 했다).
 *
 * 순서는 기존 today.tsx와 같다: 인트로 → 히어로 → 표제부 → 인용문(클래식 전용 조건은
 * 유지, 8권에서는 항상 렌더되지 않는다) → 본문 → 감상 노트 → 북마크·공유.
 *
 * 인트로·히어로·본문·감상 노트·북마크는 새 블록을 쓰되, 현재와 같은 모양이 나오도록
 * props를 맞춘다. ImageBlock의 크기 변경(320×200)과 IntroBlock의 가운데 정렬 · 날짜/문구
 * 두 줄 분리는 새 디자인이므로 8권에도 함께 적용된다 — 의도된 변화다(구 formatIntroText가
 * 합치던 한 줄을 IntroBlock이 date/tagline 두 줄로 나눠 받는다).
 *
 * 표제부 여백은 이 파일이 직접 갖는다 — LessonHeading은 blockStyles.block을 쓰지 않으므로
 * 다른 블록과 같은 간격이 나오도록 여기서 맞춘다.
 */
export default function DefaultDetail({ bookLesson }: Props) {
  const lesson = bookLesson.lesson;
  const bookName = getBookName(bookLesson.book);

  return (
    <>
      <IntroBlock
        date={lesson.date}
        tagline={lesson.date ? '공부입니다.' : '오늘의 공부입니다.'}
        actions={[{ kind: 'audio' }]}
      />
      <ImageBlock source={lesson.coverImage} />

      <View style={styles.heading}>
        <LessonHeading bookLesson={bookLesson} bookName={bookName} />
      </View>

      {bookLesson.book === 'classic' && bookLesson.lesson.quote && (
        <QuoteBlock text={bookLesson.lesson.quote} by={bookLesson.lesson.quoteBy} />
      )}

      <DescBlock paragraphs={lesson.story} />
      <NoteBlock />
      <MoreFunctionsBlock />
    </>
  );
}

const styles = StyleSheet.create({
  // 표제부는 LessonHeading이 그리므로 blockStyles.block을 쓸 수 없다 —
  // 다른 블록과 같은 여백(네 방향 20)을 여기서 직접 맞춘다.
  heading: {
    padding: 20,
  },
});
