import DescBlock, { type DescVariant } from '@/components/lesson/blocks/DescBlock';
import ImageBlock from '@/components/lesson/blocks/ImageBlock';
import IntroBlock from '@/components/lesson/blocks/IntroBlock';
import MoreFunctionsBlock from '@/components/lesson/blocks/MoreFunctionsBlock';
import NoteBlock from '@/components/lesson/blocks/NoteBlock';
import QuizBlock from '@/components/lesson/blocks/QuizBlock';
import QuoteBlock from '@/components/lesson/blocks/QuoteBlock';
import ShopBlock from '@/components/lesson/blocks/ShopBlock';
import TitleBlock from '@/components/lesson/blocks/TitleBlock';
import { getLessonQuiz } from '@/lib/quiz';
import type { Track } from '@/types';

interface Props {
  lesson: Track;
}

/**
 * 클래식 조합 — 9권 중 이번에 Figma로 이관하는 유일한 책.
 *
 * 화면 순서 = 아래 JSX 줄 순서: 인트로 → 히어로 → 표제부 → 인용문 → 본문 →
 * (사러 가기) → 퀴즈 → 감상 노트 → 북마크·공유.
 *
 * 본문이 80%에서 잘리므로 그 뒤에 구매 안내가 붙는데, 그 모양을 두 가지로 만들어 두고
 * 아래 DESC_VARIANT 한 줄로 바꿔 가며 비교한다.
 *
 * - 'ellipsis' 말줄임표 + '계속 읽어보세요' 버튼이 본문 안에 이어진다. ShopBlock은 꺼진다.
 * - 'fade'     본문이 그라데이션에 묻히고, 별도 ShopBlock이 뒤에 붙는다.
 */
const DESC_VARIANT: DescVariant = 'ellipsis';

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
                  icon: { ios: 'play.rectangle.fill', android: 'smart_display', web: 'smart_display' } as const,
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
      <DescBlock paragraphs={lesson.story} variant={DESC_VARIANT} />
      {DESC_VARIANT === 'fade' && <ShopBlock />}
      {quiz && <QuizBlock quiz={quiz} />}
      <NoteBlock />
      <MoreFunctionsBlock />
    </>
  );
}
