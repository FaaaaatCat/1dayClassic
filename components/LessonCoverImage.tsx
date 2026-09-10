import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageStyle,
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import CoverMark from '@/components/book/CoverMark';
import { Ink, Type, TypeScale } from '@/constants/theme';
import { getCoverPlan, type UnsplashPhoto } from '@/lib/cover';
import { MEDIA_HEADERS, resolveLessonCoverImageUrl } from '@/lib/lessons';
import type { BookId, CoverDesign, DailyLesson } from '@/types';

interface LessonCoverImageProps {
  lesson: DailyLesson;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /**
   * 이 항목이 실린 책. 표지를 무엇으로 채울지 정하는 데 쓴다.
   * 안 넘기면 항목 id로 찾는다 — 아는 쪽에서 넘겨 주면 그 조회를 건너뛴다.
   */
  bookId?: BookId;
  /**
   * 사진을 흐리게 — 글을 위에 얹는 자리(마이페이지의 책갈피 카드)가 쓴다.
   * 표식·검은 바탕은 흐릴 그림이 없어 그대로다.
   */
  blurRadius?: number;
  /**
   * Unsplash 크레딧을 어디에 둘지. 기본은 오른쪽 위 — 표지 위 왼쪽에는 쪽 번호가,
   * 아래에는 제목과 버튼이 앉는 자리들이 그렇게 짜여 있다. 글이 가운데를 다 쓰는
   * 자리(책갈피 카드, 카드 덱의 표지 장)는 아래 가운데로 내린다.
   */
  creditPlacement?: 'topRight' | 'bottomCenter';
}

/**
 * 항목 표지.
 *
 * 무엇을 그릴지는 lib/cover가 정하고(우선순위는 그 주석 참고), 여기서는 그리기만 한다.
 * 그림이 없는 자리도 '아직 준비 안 됨'이 아니라 제대로 된 표지여야 한다 — 아홉 권 ×
 * 365일이면 3,285장이고 그 대부분은 오래도록 그림이 없을 것이다.
 *
 * 그림이 없으면 그 책의 종이색을 깔고 출판사 마크를 옅게 앉힌다. 예전에는 검은 바탕에
 * 표식 하나였는데, 검은 면은 어느 책에서나 똑같아서 어느 책을 펴도 같은 자리로 보였다.
 * 종이색은 권마다 달라 펴는 순간 어느 책인지 알아본다.
 */
export default function LessonCoverImage({
  lesson,
  style,
  resizeMode = 'cover',
  bookId,
  blurRadius,
  creditPlacement = 'topRight',
}: LessonCoverImageProps) {
  const plan = useMemo(() => getCoverPlan(lesson, bookId), [lesson, bookId]);

  /** coverImage는 Storage 경로일 수 있어 주소로 바꿔야 한다. Unsplash는 이미 주소다. */
  const [resolved, setResolved] = useState<string | null>(null);
  /** 사진을 못 불러온 경우 — 검은 바탕으로 되돌아간다. */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (plan.kind !== 'image') return;
    let cancelled = false;
    setResolved(null);
    setFailed(false);
    resolveLessonCoverImageUrl(lesson).then((url) => {
      if (!cancelled) setResolved(url ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [plan.kind, lesson.id, lesson.coverImage]);

  if (plan.kind === 'image' && resolved && !failed) {
    return (
      // 그림일 뿐이라 손가락을 받지 않는다 — 받으면 그 위 탭이 아래로 못 내려간다.
      // Image는 pointerEvents를 프로퍼티로 받지 않아 View로 감싼다.
      <View style={style} pointerEvents="none">
        <Image
          source={{ uri: resolved, headers: MEDIA_HEADERS }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          blurRadius={blurRadius}
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  if (plan.kind === 'unsplash' && !failed) {
    return (
      /*
       * 손가락은 사진가 링크만 받는다(box-none).
       *
       * 이 View는 표지를 덮는 크기라, auto로 두면 핸들러가 없는데도 제 영역의 터치를
       * 통째로 가져간다(RN의 기본 동작). 공부 페이지의 표지 장에서 탭으로 다음 장이
       * 안 넘어가던 원인이 이것이었다 — 아래 제스처 층까지 터치가 내려가지 못했다.
       */
      <View style={style} pointerEvents="box-none">
        {/*
          사진도 손가락을 받지 않는다.

          바깥을 box-none으로 두는 것만으로는 모자라다 — box-none은 '자기 자신은 대상이
          되지 않지만 자식은 된다'는 뜻이라, 표지를 가득 덮은 이 Image가 auto인 채로
          남아 있으면 결국 여기서 탭이 멈춘다.
        */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={{ uri: plan.photo.url }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            blurRadius={blurRadius}
            onError={() => setFailed(true)}
            accessibilityIgnoresInvertColors
          />
        </View>
        <UnsplashCredit photo={plan.photo} placement={creditPlacement} />
      </View>
    );
  }

  // 그림이 없으면(또는 못 불러왔으면) 그 책의 종이 위에 마크 하나.
  return <DesignCover style={style} design={plan.kind === 'design' ? plan.design : undefined} />;
}

/**
 * 그 책의 종이색 바탕에 출판사 마크 하나. 표지 값이 없으면 검은 바탕만 남는다
 * (책을 못 찾은 경우인데, 목록 한 칸이 검게 비는 것이 앱이 멈추는 것보다 낫다).
 */
function DesignCover({
  style,
  design,
}: {
  style?: StyleProp<ImageStyle>;
  design?: CoverDesign;
}) {
  /** 마크 크기는 상자에 맞춘다 — 히어로든 목록의 작은 칸이든 같은 비율로 보이게. */
  const [box, setBox] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox(Math.min(width, height));
  };

  /**
   * 마크를 가운데보다 조금 위에 앉힌다.
   *
   * 표지 아래쪽에는 제목과 버튼이 얹히므로, 한가운데에 두면 마크가 그 글자와 겹친다.
   * 가운데 정렬을 유지한 채 아래 여백만 주면, 마크는 그 여백의 절반만큼 위로 올라간다.
   */
  const lift = { marginBottom: box * 0.4 };

  return (
    // 이 표지에는 누를 것이 없다 — 그 위 탭은 그대로 아래로 내려가야 한다.
    <View
      style={[style, styles.designCover, design ? { backgroundColor: design.paper } : null]}
      onLayout={onLayout}
      pointerEvents="none">
      {box > 0 && design ? (
        // 표지 위에 다시 표제가 얹히므로, 마크는 바탕처럼 물러나 있는다.
        <View style={[lift, styles.markFade]}>
          <CoverMark kind={design.mark} size={box * 0.16} color={design.ink} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * 사진가 크레딧.
 *
 * Unsplash API 가이드라인이 정한 의무다 — 사진을 보여줄 때 사진가와 Unsplash를 밝히고
 * 사진가 프로필로 가는 길을 둬야 한다. 그래서 이 줄은 꾸밈이 아니라 사진을 쓸 자격이고,
 * 지울 수 없다.
 *
 * 기본은 사진 위 오른쪽 위다 — 왼쪽 위에는 쪽 번호가, 아래에는 제목과 버튼이 있다.
 * 그 자리가 이미 차 있는 화면은 placement로 아래 가운데를 고른다.
 */
function UnsplashCredit({
  photo,
  placement,
}: {
  photo: UnsplashPhoto;
  placement: 'topRight' | 'bottomCenter';
}) {
  /*
   * 자리를 잡는 층과 손가락을 받는 층을 나눈다.
   *
   * 예전에는 Pressable 하나가 자리까지 맡았는데, 아래 가운데 배치는 좌우로 벌려 놓는
   * 모양이라 그 Pressable이 표지 폭을 가로지르는 띠가 됐다. 그 띠가 탭 넘김을 삼켰다.
   * 이제 바깥은 자리만 잡고 손가락을 안 받으며(box-none), 링크는 글자 크기만큼만 받는다.
   */
  return (
    <View
      style={placement === 'bottomCenter' ? styles.creditBottomCenter : styles.credit}
      pointerEvents="box-none">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`사진 ${photo.photographer}, Unsplash. 사진가 페이지 열기`}
        hitSlop={8}
        onPress={() => Linking.openURL(photo.profile).catch(() => {})}>
        <Text style={styles.creditText} numberOfLines={1}>
          {`Photo ${photo.photographer} / Unsplash`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 마크 하나만 놓인 종이 면. 표지 값이 없을 때만 검게 남는다. */
  designCover: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Ink.primary,
  },
  markFade: {
    opacity: 0.32,
  },
  /** 오른쪽 위 — 오른쪽 끝에 붙이고 그 안에서 오른쪽으로 모은다. */
  credit: {
    position: 'absolute',
    top: 16,
    right: 16,
    maxWidth: '60%',
    alignItems: 'flex-end',
  },
  /** 아래 가운데 — 좌우로 벌려 두고 그 안에서 가운데로 모은다. */
  creditBottomCenter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  creditText: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    /*
     * eggshell을 반쯤 지워 둔다.
     *
     * 이 줄은 사진을 쓸 자격이지 읽히자고 놓은 글이 아니다 — 표제와 같은 밝기로 서 있으면
     * 표지에서 눈이 먼저 여기로 간다. 지우되 없애지는 않는다. 70%면 사진 위에서 또렷이
     * 읽히고 손가락도 그대로 받는다(사진가 페이지로 가는 길이 살아 있어야 한다).
     *
     * 표지 위에 어둠을 한 겹 더 까는 화면(책갈피 카드, 표지 장)에서는 그 어둠까지 얹혀
     * 한 단 더 어두워진다.
     */
    opacity: 0.7,
    textAlign: 'center',
    color: Ink.onDark,
  },
});
