import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import BookCover, { COVER_RATIO } from '@/components/book/BookCover';
import { ANGLE, PERSPECTIVE, Spine, THICKNESS } from '@/components/book/BookCover3D';
import { Colors } from '@/constants/theme';
import type { CoverDesign } from '@/types';

/**
 * 펼쳐지는 책 — 세워 둔 책(BookCover3D)의 앞표지가 열리고, 안에서 빛이 새어 나오고,
 * 그 빛이 화면 쪽으로 다가와 화면을 가득 채운다. '고양이와 스프'의 시작 화면에서 문이
 * 열리는 장면을 책으로 옮긴 것이다.
 *
 * 진행은 바깥에서 0→1로 넘겨받는다(progress). 이 책은 그 값을 그림으로 바꾸기만 하고,
 * 언제 재생할지·다 밝아진 뒤 무엇을 열지는 부르는 화면이 정한다. 화면을 가득 덮는 빛의
 * 장막은 책 밖(화면 맨 위)에 깔려야 해서 LightVeil로 따로 둔다.
 *
 * ── 축을 접힘선에 둔다 ──
 * BookCover3D는 앞표지를 '제 가운데'를 축으로 26° 돌린다. 그런데 표지를 열려면 접힘선
 * (앞표지 왼쪽 변)을 축으로 돌아야 하고, RN에서 rotateY의 축을 옮기는 방법은 안드로이드에서
 * 정확하지 않다(CardDeckDetail의 hinge 주석). 그래서 같은 꾀를 쓴다 — 표지 두 장 폭의
 * 경첩 뷰를 만들고 오른쪽 절반에만 표지를 담으면, 경첩의 중심선이 곧 접힘선이 된다.
 * 여기에 순수 rotateY만 건다. 책 전체를 이 축으로 다시 계산하므로(책등·속지·앞표지가
 * 모두 접힘선 기준) 세 조각이 서로 어긋나지 않는다. 대신 BookCover3D와는 원근의 중심이
 * 달라 같은 폭에서 4%쯤 작게 보인다 — 홈에 붙일 때 폭을 맞추면 된다.
 *
 * ── 활짝 연다 ──
 * 처음엔 110°(화면에서 26° → -84°)에서 멈췄는데, 열리다 만 것처럼 보였다. 레퍼런스의 문처럼
 * 활짝 열리도록 165°까지 넘긴다 — 화면에서의 각은 26° → -139°다. -90°를 지나면 표지 안쪽이
 * 눈을 향하므로 안쪽 면(면지)을 따로 그려 두고 그때 바꿔 보인다. 경첩 뷰에 순수 rotateY만
 * 거는 한 180°까지 돌려도 안드로이드에서 뒤틀리지 않는다(카드 넘김이 같은 방식으로 180°를 돈다).
 * 180°로 납작하게 눕히지 않는 건, 조금 들려 있어야 펼친 책이 아니라 '열린 문'으로 읽혀서다.
 */

/** 표지가 열리는 각(책 기준). */
export const OPEN_DEG = 165;

/**
 * 타임라인 — progress(0~1) 위의 구간들. 전체 길이는 부르는 화면이 정한다(OPENING_MS).
 *
 * 표지가 반쯤 열렸을 때 빛이 차오르기 시작하고, 다 열리기 조금 전부터 다가온다 — 단계가
 * 겹쳐야 '열리고, 멈추고, 커지는' 세 토막이 아니라 한 동작으로 읽힌다.
 */
export const OPENING_MS = 1800;
const OPEN = [0, 0.55] as const;
const GLOW = [0.1, 0.5] as const;
const ZOOM = [0.42, 1] as const;
const VEIL = [0.65, 1] as const;

/** 다가올 때 커지는 배율 — 속지가 화면 높이를 넘을 만큼. 그 뒤는 장막이 덮는다. */
const ZOOM_TO = 6;

/** 따뜻한 노란빛 — 지정 팔레트의 --yellow(#FEB836)를 흰 바탕에 묽게 푼 것. */
const LIGHT = Colors.yellow;
const lightAlpha = (alpha: number) => `rgba(254,184,54,${alpha})`;

/** 원근 배율 — z가 클수록(눈에 가까울수록) 커진다. BookCover3D와 같은 식. */
function scaleAt(z: number): number {
  return PERSPECTIVE / (PERSPECTIVE - z);
}

/**
 * 접힘선을 원점에 둔 책의 화면 치수.
 *
 * 책 좌표에서 앞표지는 z = 0 평면의 x ∈ [0, W], 책등은 x = 0 평면의 z ∈ [-T, 0]이다.
 * θ만큼 돌리면 x' = x·cos θ + z·sin θ, z' = -x·sin θ + z·cos θ (BookCover3D와 같은 규약).
 */
function openingGeometry(width: number) {
  const radians = (ANGLE * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const height = width * COVER_RATIO;
  const thickness = width * THICKNESS;

  const spineW = scaleAt(-cos * thickness) * sin * thickness;
  const rightX = scaleAt(-sin * width) * cos * width;
  /** 속지 한가운데가 화면에 놓이는 자리(접힘선에서 오른쪽으로) — 다가올 때 이 점을 향한다. */
  const pageCenterX = scaleAt((-sin * width) / 2) * ((cos * width) / 2);

  const stageW = spineW + rightX;
  return {
    width,
    height,
    spineW,
    stageW,
    /** 무대 가운데에서 속지 가운데까지 — 확대의 중심을 여기로 옮긴다. */
    focusDX: spineW + pageCenterX - stageW / 2,
  };
}

const ease = Easing.inOut(Easing.cubic);
const veilEase = Easing.in(Easing.quad);
const easeIn = Easing.in(Easing.cubic);

/** progress를 구간 [from, to] 안의 0~1로 바꾼다. */
function phase(progress: number, [from, to]: readonly [number, number]) {
  'worklet';
  return interpolate(progress, [from, to], [0, 1], Extrapolation.CLAMP);
}

interface BookOpeningProps {
  design: CoverDesign;
  width: number;
  /** 0(닫힌 책) ~ 1(화면이 빛으로 가득 참). */
  progress: SharedValue<number>;
}

export default function BookOpening({ design, width, progress }: BookOpeningProps) {
  const geometry = openingGeometry(width);
  const { height, spineW, stageW, focusDX } = geometry;
  const glowSize = width * 2.8;

  /** 표지 — 접힘선을 축으로 26°에서 26°-OPEN_DEG까지. */
  const coverStyle = useAnimatedStyle(() => {
    const open = ease(phase(progress.value, OPEN));
    return {
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${ANGLE - OPEN_DEG * open}deg` }],
    };
  });

  /**
   * 앞면과 안쪽 면 중 지금 보일 쪽. 화면에서의 각이 -90°를 지나면 안쪽(면지)이 눈을 향한다.
   * backfaceVisibility만으로는 안드로이드 일부 버전에서 두 면이 겹쳐 보여 opacity로도 끈다
   * (CardDeckDetail의 cardFace와 같은 이중 안전장치).
   */
  const frontStyle = useAnimatedStyle(() => {
    const angle = ANGLE - OPEN_DEG * ease(phase(progress.value, OPEN));
    return { opacity: angle > -90 ? 1 : 0 };
  });
  const insideStyle = useAnimatedStyle(() => {
    const angle = ANGLE - OPEN_DEG * ease(phase(progress.value, OPEN));
    return { opacity: angle > -90 ? 0 : 1 };
  });

  /** 열리는 표지에 빛이 비친다 — 안쪽 빛을 받아 표지도, 드러난 면지도 노랗게 물든다. */
  const coverWashStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * phase(progress.value, OPEN),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: phase(progress.value, GLOW),
  }));

  /**
   * 다가오기 — 회전이 없는 바깥 뷰에만 건다. 이동과 확대를 섞어도 되는 건 이 뷰에 원근
   * 회전이 없어서다(안드로이드의 행렬 분해 문제는 원근 회전과 이동이 한 뷰에 섞일 때 난다).
   */
  const zoomStyle = useAnimatedStyle(() => {
    const zoom = interpolate(easeIn(phase(progress.value, ZOOM)), [0, 1], [1, ZOOM_TO]);
    return {
      transform: [{ translateX: focusDX }, { scale: zoom }, { translateX: -focusDX }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: stageW, height }, zoomStyle]}>
      {/* 책 뒤로 번지는 빛 — 속지 가운데에서 둥글게 퍼진다. */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            left: stageW / 2 + focusDX - glowSize / 2,
            top: height / 2 - glowSize / 2,
          },
          glowStyle,
        ]}
      />

      <Spine design={design} width={width} geometry={{ spineW, spineH: height }} />

      {/* 속지 — 표지 밑에 늘 있고, 표지가 열리며 드러난다. 빛은 여기서 나온다. */}
      <View style={[styles.hinge, { left: spineW - width, width: width * 2, height }, styles.still]}>
        <View style={[styles.page, { left: width, width, height }]} />
      </View>

      {/* 앞표지 — 접힘선을 축으로 열린다. */}
      <Animated.View
        style={[styles.hinge, { left: spineW - width, width: width * 2, height }, coverStyle]}>
        <View style={{ position: 'absolute', left: width, top: 0, width, height }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.face, frontStyle]}>
            <BookCover design={design} width={width} clip={false} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.wash, coverWashStyle]} />
          </Animated.View>
          {/* 안쪽 면(면지) — 표지가 90°를 넘어가면 이쪽이 보인다. */}
          {/*
            여기엔 backfaceVisibility: 'hidden'을 걸지 않는다. 안드로이드는 뒷면인지를 그 뷰
            '자신의' rotationY만 보고 정하는데(ReactViewGroup.setBackfaceVisibilityDependantOpacity),
            이 면은 미리 180° 뒤집혀 있어 경첩이 어느 각에 있든 늘 뒷면으로 판정돼 숨는다 —
            실제로 표지가 90°를 넘자 통째로 사라졌다. 앞뒤 전환은 insideStyle의 opacity가 맡는다.
          */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.inside, insideStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.wash, coverWashStyle]} />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

interface LightVeilProps {
  /** 0~1 — 화면을 덮는 정도. 들어올 때는 progress를, 걷힐 때는 따로 준 값을 쓴다. */
  opacity: SharedValue<number>;
  /** 0~1 — 노란빛이 흰빛으로 바랜 정도. 화면을 다 덮은 뒤에 올린다. */
  whiten: SharedValue<number>;
}

/**
 * 빛의 장막 — 화면을 가득 덮는 노란빛. 다가온 책이 화면을 다 채우는 마지막 순간을 맡고,
 * 화면을 다 덮은 뒤에는 노란빛이 흰빛으로 바래고, 다음 화면이 그 뒤에서 천천히 드러나도록
 * 걷힌다. 흰빛으로 바래 두면 밝은 종이색 화면으로 넘어갈 때 노란 기가 남지 않는다.
 *
 * 화면 맨 위에 깔아야 하므로 책과 따로 둔다. 손가락은 받지 않는다.
 */
export function LightVeil({ opacity, whiten }: LightVeilProps) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const whiteStyle = useAnimatedStyle(() => ({ opacity: whiten.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.white, whiteStyle]} />
    </Animated.View>
  );
}

/** progress(0~1)에서 장막이 덮는 정도를 꺼낸다 — 다가오기의 끝자락에 차오른다. */
export function veilAt(progress: number) {
  'worklet';
  return veilEase(phase(progress, VEIL));
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    experimental_backgroundImage: `radial-gradient(circle closest-side, ${lightAlpha(0.95)} 0%, ${lightAlpha(0.45)} 40%, ${lightAlpha(0)} 100%)`,
  },
  hinge: {
    position: 'absolute',
    top: 0,
  },
  /** 속지는 열리지 않는다 — 책과 같은 26°에 머문다. */
  still: {
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${ANGLE}deg` }],
  },
  /** 속지 — 한가운데는 흰빛, 가장자리로 갈수록 노랗다(레퍼런스의 열린 문 안쪽). */
  page: {
    position: 'absolute',
    top: 0,
    backgroundColor: Colors.white,
    experimental_backgroundImage: `radial-gradient(ellipse farthest-corner at 50% 45%, ${lightAlpha(0.35)} 0%, ${lightAlpha(0.6)} 55%, ${LIGHT} 100%)`,
  },
  wash: {
    backgroundColor: LIGHT,
  },
  face: {
    backfaceVisibility: 'hidden',
  },
  /**
   * 면지 — 표지 안쪽. 표지 색과 상관없이 종이색이다(어두운 표지도 안은 밝다).
   * 경첩이 -90°를 넘어 돌면 이 면이 거울상이 되므로 미리 180° 뒤집어 둔다.
   */
  inside: {
    backgroundColor: Colors.bg,
    transform: [{ rotateY: '180deg' }],
  },
  /** 화면을 가득 채운 빛 — 가운데가 묽고 가장자리가 짙다. */
  veil: {
    backgroundColor: Colors.white,
    experimental_backgroundImage: `radial-gradient(circle farthest-corner at 50% 50%, ${lightAlpha(0.3)} 0%, ${lightAlpha(0.75)} 100%)`,
  },
  white: {
    backgroundColor: Colors.white,
  },
});
