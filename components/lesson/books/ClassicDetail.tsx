import DescBlock from '@/components/lesson/blocks/DescBlock';
import ImageBlock from '@/components/lesson/blocks/ImageBlock';
import IntroBlock from '@/components/lesson/blocks/IntroBlock';
import NoteBlock from '@/components/lesson/blocks/NoteBlock';
import QuizBlock from '@/components/lesson/blocks/QuizBlock';
import QuoteBlock from '@/components/lesson/blocks/QuoteBlock';
import TitleBlock from '@/components/lesson/blocks/TitleBlock';
import { getLessonQuiz } from '@/lib/quiz';
import type { Track } from '@/types';

interface Props {
  lesson: Track;
}

/**
 * 클래식 조합 — 9권 중 이번에 Figma로 이관하는 유일한 책.
 *
 * 화면 순서 = 아래 JSX 줄 순서: 인트로 → 히어로 → 표제부 → 인용문 → 본문 → 퀴즈 →
 * 감상 노트.
 */
export default function ClassicDetail({ lesson }: Props) {
  const quiz = getLessonQuiz(lesson);

  return (
    <>
      <IntroBlock
        date={lesson.date}
        tagline="클래식 공부의 시간입니다."
        actions={[
          { kind: 'audio' },
          ...(lesson.youtubeUrl
            ? [
                {
                  kind: 'link' as const,
                  label: '노래 듣기',
                  icon: 'play-circle' as const,
                  url: lesson.youtubeUrl,
                },
              ]
            : []),
        ]}
      />
      <ImageBlock source={lesson.coverImage} />
      <TitleBlock
        label={lesson.tag ?? '하루 클래식 공부'}
        title={lesson.title}
        subtitle={lesson.composer}
        meta={lesson.titleEn && lesson.composerEn ? [lesson.titleEn, lesson.composerEn] : undefined}
      />
      {lesson.quote && <QuoteBlock text={lesson.quote} by={lesson.quoteBy} />}
      <DescBlock paragraphs={lesson.story} />
      {quiz && <QuizBlock quiz={quiz} />}
      <NoteBlock />
    </>
  );
}
