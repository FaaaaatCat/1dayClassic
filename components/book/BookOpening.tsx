import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
 * ── 다섯 막 ──
 * 처음엔 '열고 → 다가오는' 두 동작이었는데 담백했다. 길어져도 좋으니 극적이게 — 영화처럼
 * 예고·열림·넘김·폭발·빨려 듦의 다섯 막으로 짰다(시간은 OPENING_MS 아래 표).
 *
 *  1. 예고   — 책이 살짝 떠오르며 숨을 고른다. 빛은 아직 없다 — 앞마구리(표지 오른쪽 변) 틈으로
 *              빛이 새게 해 봤는데, 열리기도 전에 빛이 보이는 게 어색해 걷어냈다.
 *  2. 열림   — 정면으로 펴지고 표지가 손으로 넘기듯 열린다. 카메라가 아주 천천히 다가간다.
 *  3. 넘김   — 표지가 닿으면 속지 몇 장이 촤르르 시간차로 넘어간다.
 *
 * 빛줄기(펼친 자리에서 사방으로 뻗는 빛)와 금빛 먼지(피어오르는 빛 알갱이)도 넣어 봤는데 둘 다
 * 산만해서 걷어냈다. 이 장면의 화려함은 열림·넘김의 움직임과 빛의 세기로 낸다.
 *  4. 폭발   — 다 넘어간 순간 한가운데의 흰 빛이 크게 터진다.
 *  5. 빨려 듦 — 카메라가 확 다가가며 빛이 화면을 덮는다.
 *
 * ── 축을 접힘선에 둔다 ──
 * BookCover3D는 앞표지를 '제 가운데'를 축으로 26° 돌린다. 그런데 표지를 열려면 접힘선
 * (앞표지 왼쪽 변)을 축으로 돌아야 하고, RN에서 rotateY의 축을 옮기는 방법은 안드로이드에서
 * 정확하지 않다(CardDeckDetail의 hinge 주석). 그래서 같은 꾀를 쓴다 — 표지 두 장 폭의
 * 경첩 뷰를 만들고 오른쪽 절반에만 표지를 담으면, 경첩의 중심선이 곧 접힘선이 된다.
 * 여기에 순수 rotateY만 건다. 책 전체를 이 축으로 다시 계산하므로(책등·속지·앞표지가
 * 모두 접힘선 기준) 세 조각이 서로 어긋나지 않는다. 대신 BookCover3D와는 원근의 중심이
 * 달라 같은 폭에서 4%쯤 작게 보인다 — 홈에 붙일 때 폭을 맞추면 된다. 넘어가는 속지들도 같은
 * 경첩을 쓴다.
 *
 * ── 먼저 평평하게 펴고, 활짝 연다 ──
 * 읽기를 누르면 26° 기울어 있던 책이 먼저 정면(0°)으로 돌아온다. 책등은 옆으로 돌아서며
 * 가늘어져 사라지고, 앞표지는 정면을 본다. 그다음 표지가 왼쪽으로 180° 열려 납작하게
 * 눕는다 — 왼쪽엔 면지, 오른쪽엔 빛나는 속지가 있는 활짝 열린 책이다.
 *
 * 기울어진 채로 열면 165°에서 멈춰도 표지가 화면 밖으로 크게 휘어 나가 '열린 문'은 되어도
 * '펼친 책'은 안 됐다. 정면에서 열면 180°가 화면에서도 180°라 그대로 눕는다.
 *
 * 화면에서의 각이 -90°를 지나면 표지 안쪽이 눈을 향하므로 안쪽 면(면지)을 따로 그려 두고
 * 그때 바꿔 보인다. 경첩 뷰에 순수 rotateY만 거는 한 180°까지 돌려도 안드로이드에서
 * 뒤틀리지 않는다(카드 넘김이 같은 방식으로 180°를 돈다).
 */

/** 표지가 열리는 각(책 기준). */
export const OPEN_DEG = 180;

/**
 * 펼 때 남길 기울기. 0이면 완전히 정면이다. 입체감이 사라지는 게 어색하면 여기를 8° 남짓으로
 * 올린다 — 그만큼 기운 채로 열린다.
 */
const FLAT_DEG = 0;

/**
 * 타임라인 — 밀리초로 적고 progress(0~1)로 바꿔 쓴다(at). 전체 길이는 OPENING_MS다.
 *
 *   예고     0    ~ 600    — 책이 떠오른다
 *   펴기     550  ~ 1010
 *   열림     1010 ~ 2010   — 1초. 카메라가 천천히 다가감(DOLLY)
 *   멈춤     2010 ~ 2210   — 다 열린 책을 잠깐 보여 준다
 *   넘김     2210 ~ 3060   — 속지 넉 장
 *   폭발     2930 ~ 3390
 *   다가옴   2980 ~ 4280   — 아주 천천히 다가오다 끝에서 확 빨라진다(rushEase)
 *   장막     3980 ~ 4280   — 0.3초 만에 화면을 덮는다
 *
 * 열림 뒤의 구간은 모두 열림이 끝나는 때(OPEN_END)에서 잰다 — 열림 길이를 바꾸면 뒤가 함께
 * 밀리고 당겨진다. 막과 막이 조금씩 겹쳐야 다섯 토막이 아니라 한 장면으로 읽힌다. 다 열린 뒤의
 * 멈춤만은 겹치지 않는다 — 펼친 책을 한 번 온전히 보여 주는 숨이다.
 */
/** 표지가 열리는 시간 — 처음엔 1.57초였는데 늘어진다고 해서 1초로 줄였다. */
const OPEN_MS = 1000;
const OPEN_START = 1010;
const OPEN_END = OPEN_START + OPEN_MS;
/** 다 열린 뒤 멈추는 시간. */
const HOLD_MS = 200;
/** 속지 넉 장이 다 넘어가는 데 걸리는 시간(FLUTTER_* 로 셈한 값). */
const FLUTTER_MS = 160 * 3 + 370;
const FLASH_START = OPEN_END + HOLD_MS + FLUTTER_MS - 130;
const ZOOM_START = FLASH_START + 50;
/** 다가오는 시간. */
const ZOOM_MS = 1300;
export const OPENING_MS = ZOOM_START + ZOOM_MS;
/** 밀리초를 progress(0~1)의 자리로. */
const at = (ms: number) => ms / OPENING_MS;
const PRELUDE = [at(0), at(600)] as const;
const TILT = [at(550), at(OPEN_START)] as const;
const OPEN = [at(OPEN_START), at(OPEN_END)] as const;
const DOLLY = OPEN;
const FLASH = [at(FLASH_START), at(FLASH_START + 460)] as const;
const ZOOM = [at(ZOOM_START), at(OPENING_MS)] as const;
/** 빛이 화면을 덮는 시간 — 0.3초. */
const VEIL_MS = 300;
const VEIL = [at(OPENING_MS - VEIL_MS), at(OPENING_MS)] as const;

/**
 * 표지가 열리는 모양 — OPEN 구간 안의 시간(0~1)을 '열린 정도'(0~1)로 바꾸는 네 토막.
 *
 * 처음엔 한 곡선(inOut cubic)으로 열었는데, 처음부터 끝까지 고르게 미끄러져 기계가 여는 문처럼
 * 보였다. 사람이 책을 열 때는 힘이 고르지 않다.
 *
 *  1. 들기   — 엄지가 표지 끝을 걸어 살짝 들어 올린다. 느리고 조금만(7%).
 *  2. 넘기기 — 밀어 올린다. 빠르게 시작해 세로(50%)에 가까울수록 힘이 빠진다.
 *  3. 떨어짐 — 세로를 넘으면 표지 무게로 넘어간다. 느리게 시작해 점점 빨라진다.
 *  4. 닿음   — 바닥에 닿아 아주 조금(2.5%) 튀었다가 눕는다.
 *
 * 2와 3의 이음매에서 속도가 0이 되지 않게 베지에로 잡았다 — 0이 되면 세로에서 멈칫한다.
 */
const OPEN_SEGMENTS = [0, 0.2, 0.52, 0.84, 1] as const;
const LIFT_TO = 0.07;
const BOUNCE = 0.025;
// 들기는 천천히 시작해 끝에서 손끝에 힘이 붙는다 — 끝 속도가 0이면 넘기기와의 이음매에서 멈칫한다.
const liftEase = Easing.bezierFn(0.42, 0, 0.58, 0.6);
const pushEase = Easing.bezierFn(0.25, 0.6, 0.55, 0.85);
const fallEase = Easing.bezierFn(0.45, 0.15, 0.75, 0.4);
/**
 * 속지가 켜지는 구간 — 누르기 전엔 꺼 둔다.
 *
 * 속지는 표지와 같은 자리·같은 크기지만, 원근으로 기운 두 면의 가장자리가 안티에일리어싱으로
 * 반 픽셀씩 어긋나 표지 둘레로 노란 테가 비쳤다(실기기 홈에서 확인). 그래서 쉬는 동안엔
 * 투명하게 두고, 펴는 동안 차올라 표지가 열리기 시작할 때(OPEN의 시작) 다 켜진다.
 */
const PAGE_LIT = TILT;

/**
 * 넘어가는 속지 — 표지가 닿은 뒤 넉 장이 시간차로 촤르르 넘어간다.
 * 한 장은 FLUTTER_EACH 동안 넘어가고, 다음 장은 FLUTTER_GAP 뒤에 출발한다.
 * 바닥에 겹쳐 눕도록 조금씩 덜 넘긴다(179° → 176°).
 */
const FLUTTER_COUNT = 4;
/** 다 열리고 HOLD_MS 멈춘 뒤에 첫 장이 출발한다. */
const FLUTTER_FROM = at(OPEN_END + HOLD_MS);
const FLUTTER_EACH = at(370);
const FLUTTER_GAP = at(160);
const flutterEase = Easing.bezierFn(0.45, 0.05, 0.4, 1);

/** 예고에서 책이 떠오르는 높이와 커지는 정도. */
const HOVER_RISE = 8;
const HOVER_GROW = 0.02;
/**
 * 다 펼쳤을 때 펼친 두 쪽이 화면 폭의 몇을 차지할지.
 *
 * 처음엔 열리는 동안 카메라가 1.12배로 다가가게 고정해 두었는데, 펼친 책(두 쪽 = 책 폭의 2배)이
 * 화면 폭을 넘어 양 끝이 잘려 책으로 보이지 않았다. 그래서 배율을 고정하지 않고, 다 펼쳤을 때
 * 두 쪽이 화면 폭의 90%가 되도록 화면 폭에서 거꾸로 셈한다(dollyTo). 화면이 좁으면 다가가는
 * 대신 조금 물러나기도 한다.
 */
const SPREAD_OF_SCREEN = 0.9;
/** 빨려 들 때 커지는 배율 — 화면을 한참 넘을 만큼. 끝의 '확' 빨려 드는 맛이 여기서 난다. */
const ZOOM_TO = 10;
/**
 * 다가옴의 속도감 — 아주 천천히 다가오다 끝에서 확 빨라진다.
 *
 * 처음엔 배율 자체에 ease in(cubic)을 걸었는데 '똑같이 다가온다'는 말을 들었다. 눈은 크기를
 * 비율로 느낀다 — 1→2배와 3→6배가 같은 만큼 커진 것으로 보인다. 그래서 배율에 곧장 곡선을 걸면
 * 앞에서 이미 빠르게 커진 것처럼 보이고 끝의 가속이 묻힌다. 배율의 로그(비율)에 곡선을 걸고,
 * 곡선도 4제곱으로 세게 눌러 앞 절반은 거의 기어 오고 마지막에 한꺼번에 몰아친다.
 */
const rushEase = Easing.in(Easing.poly(4));

/** 폭발 때 한가운데 흰 빛이 커지는 배율. */
const FLASH_GROW = 1.4;

/** 따뜻한 노란빛 — 지정 팔레트의 --yellow(#FEB836, Colors.yellow)를 투명도로 묽게 푼 것. */
const lightAlpha = (alpha: number) => `rgba(254,184,54,${alpha})`;

/**
 * 빛나는 면 — 속지와 면지가 같은 빛을 쓴다. edge는 빛의 중심이 놓일 가로 자리로, 늘 접힘선 쪽 변이다
 * (속지는 0%, 면지는 180° 뒤집혀 있어 100%가 접힘선 쪽이다).
 */
// 처음엔 가운데 35%·가장자리 100% 노랑이었는데, 펼쳤을 때 빛이 탁했다. 가운데를 거의 흰빛(15%)으로,
// 가장자리도 85%로 묽혀 면 전체가 더 밝게 빛난다.
const pageLight = (edge: string) =>
  `radial-gradient(ellipse farthest-corner at ${edge} 45%, ${lightAlpha(0.15)} 0%, ${lightAlpha(0.45)} 55%, ${lightAlpha(0.85)} 100%)`;

/** 원근 배율 — z가 클수록(눈에 가까울수록) 커진다. BookCover3D와 같은 식. */
function scaleAt(z: number): number {
  'worklet';
  return PERSPECTIVE / (PERSPECTIVE - z);
}

/**
 * 접힘선을 원점에 두고 tilt°만큼 돌린 책의 화면 치수(접힘선에서 잰 거리).
 *
 * 책 좌표에서 앞표지는 z = 0 평면의 x ∈ [0, W], 책등은 x = 0 평면의 z ∈ [-T, 0]이다.
 * θ만큼 돌리면 x' = x·cos θ + z·sin θ, z' = -x·sin θ + z·cos θ (BookCover3D와 같은 규약).
 * 펴는 동안 매 프레임 다시 재므로 워클릿이다.
 */
function tiltGeometry(tilt: number, width: number) {
  'worklet';
  const radians = (tilt * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const thickness = width * THICKNESS;
  return {
    /** 책등이 접힘선 왼쪽으로 차지하는 폭. */
    spineW: scaleAt(-cos * thickness) * sin * thickness,
    /** 앞표지 오른쪽 변까지. */
    rightX: scaleAt(-sin * width) * cos * width,
  };
}

const ease = Easing.inOut(Easing.cubic);
const veilEase = Easing.in(Easing.quad);
const easeOut = Easing.out(Easing.cubic);

/** progress를 구간 [from, to] 안의 0~1로 바꾼다. */
function phase(progress: number, [from, to]: readonly [number, number]) {
  'worklet';
  return interpolate(progress, [from, to], [0, 1], Extrapolation.CLAMP);
}

/** 지금의 기울기(26° → FLAT_DEG). */
function tiltAt(progress: number) {
  'worklet';
  return interpolate(ease(phase(progress, TILT)), [0, 1], [ANGLE, FLAT_DEG]);
}

/** 지금 표지가 열린 정도(0~1) — OPEN_SEGMENTS 주석의 네 토막. */
function openAt(progress: number) {
  'worklet';
  const t = phase(progress, OPEN);
  const [, a, b, c] = OPEN_SEGMENTS;
  if (t <= a) return LIFT_TO * liftEase(t / a);
  if (t <= b) return LIFT_TO + (0.5 - LIFT_TO) * pushEase((t - a) / (b - a));
  if (t <= c) return 0.5 + 0.5 * fallEase((t - b) / (c - b));
  return 1 - BOUNCE * Math.sin(Math.PI * ((t - c) / (1 - c)));
}

/** 지금 표지가 화면에서 이루는 각 — 기울기에서 열린 만큼을 뺀다. */
function coverAngleAt(progress: number) {
  'worklet';
  return tiltAt(progress) - OPEN_DEG * openAt(progress);
}

/** 폭발의 세기(0~1) — 한 번 터져 오른 뒤 내려오지 않는다. 그 뒤는 장막이 이어받는다. */
function flashAt(progress: number) {
  'worklet';
  return easeOut(phase(progress, FLASH));
}

interface BookOpeningProps {
  design: CoverDesign;
  width: number;
  /** 0(닫힌 책) ~ 1(화면이 빛으로 가득 참). */
  progress: SharedValue<number>;
}

export default function BookOpening({ design, width, progress }: BookOpeningProps) {
  const height = width * COVER_RATIO;
  /** 처음(26°)의 치수 — 무대 크기와 접힘선 자리는 여기서 정하고 움직이지 않는다. */
  const rest = tiltGeometry(ANGLE, width);
  const foldX = rest.spineW;
  const stageW = rest.spineW + rest.rightX;
  /** 칠해지는 범위의 한가운데(무대 왼쪽에서). 펴는 동안 이 점을 제자리에 둔다. */
  const restCenter = foldX + (rest.rightX - rest.spineW) / 2;
  const glowSize = width * 3.4;
  /** 펼친 책 한가운데의 흰 빛망울 — 책 폭의 1.6배. */
  const bloomSize = width * 1.6;
  const hinge = { left: foldX - width, width: width * 2, height };
  const { width: screenW } = useWindowDimensions();
  /** 다 펼쳤을 때의 배율 — 두 쪽(책 폭 × 2, 예고에서 커진 만큼 포함)이 화면 폭의 90%가 되게. */
  const dollyTo = (SPREAD_OF_SCREEN * screenW) / (2 * width * (1 + HOVER_GROW));

  /** 속지 — 책과 함께 펴지고, 열리지는 않는다. */
  const pageStyle = useAnimatedStyle(() => ({
    opacity: phase(progress.value, PAGE_LIT),
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${tiltAt(progress.value)}deg` }],
  }));

  /** 표지 — 접힘선을 축으로, 펴지는 기울기에 열리는 각을 더해 돈다. */
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${coverAngleAt(progress.value)}deg` }],
  }));

  /**
   * 책등 — 펴지면서 옆으로 돌아 가늘어진다. 원근 회전 대신 접힘선 쪽 변을 붙박고 가로로만
   * 줄인다(회전이 없는 뷰라 이동과 확대를 섞어도 된다). 글자도 함께 눌리는데, 옆으로 돌아서는
   * 책등이 실제로 그렇게 보인다.
   */
  const spineStyle = useAnimatedStyle(() => {
    const now = tiltGeometry(tiltAt(progress.value), width).spineW;
    const ratio = Math.max(0.001, now / rest.spineW);
    const half = rest.spineW / 2;
    return {
      opacity: now < 0.5 ? 0 : 1,
      transform: [{ translateX: half }, { scaleX: ratio }, { translateX: -half }],
    };
  });

  /**
   * 앞면과 안쪽 면 중 지금 보일 쪽. 화면에서의 각이 -90°를 지나면 안쪽(면지)이 눈을 향한다.
   * backfaceVisibility만으로는 안드로이드 일부 버전에서 두 면이 겹쳐 보여 opacity로도 끈다
   * (CardDeckDetail의 cardFace와 같은 이중 안전장치).
   */
  const frontStyle = useAnimatedStyle(() => ({
    opacity: coverAngleAt(progress.value) > -90 ? 1 : 0,
  }));
  const insideStyle = useAnimatedStyle(() => ({
    opacity: coverAngleAt(progress.value) > -90 ? 0 : 1,
  }));

  /**
   * 표지 바깥 면의 그늘 — 세워질수록 어두워진다. 빛은 책 안(속지)에서 나오므로 바깥 면은 빛을
   * 등진다. 예전엔 바깥 면도 노랗게 물들였는데, 그러면 표지가 돌아도 밝기가 그대로라 종이가 아니라
   * 판자가 도는 것 같았다.
   */
  const frontShadeStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * Math.min(1, openAt(progress.value) / 0.5),
  }));
  /** 안쪽 면(면지)의 그늘 — 세로를 막 넘었을 땐 어둡고, 누우며 속지의 빛을 받아 밝아진다. */
  const insideShadeStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * Math.max(0, 1 - (openAt(progress.value) - 0.5) / 0.5),
  }));

  /**
   * 책 뒤로 번지는 빛 — 표지가 다 넘어가 누울 즈음(75%)부터 퍼진다. 폭발 때 한 번 더 부푼다.
   *
   * 처음엔 표지가 들리는 순간부터 켰는데, 덜 열린 책 뒤로 빛이 둘러 보여 어색했다. 빛은 펼쳐진
   * 책에서 나오는 것이라 펼쳐질 때까지 기다린다. 그전까지는 드러나는 속지 자체가 빛이다.
   */
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(openAt(progress.value), [0.75, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: 1 + 0.3 * flashAt(progress.value) }],
  }));
  /**
   * 흰 빛망울 — 책이 다 펼쳐질 즈음 접힘선 위에서 흰빛이 피어나고, 폭발 때 크게 터진다.
   * 노란 빛(glow)은 책 뒤에 깔려 가장자리로만 비쳐서, 펼친 면 위가 밝아지는 느낌은 이것이 맡는다.
   */
  const bloomStyle = useAnimatedStyle(() => {
    const flash = flashAt(progress.value);
    const open = interpolate(openAt(progress.value), [0.8, 1], [0, 0.75], Extrapolation.CLAMP);
    return {
      opacity: Math.min(1, open + flash),
      transform: [{ scale: 1 + FLASH_GROW * flash }],
    };
  });

  /**
   * 1막의 떠오름 + 2막의 천천히 다가감 + 5막의 빨려 듦, 그리고 펴는 동안 제자리 지키기 —
   * 회전이 없는 바깥 뷰에만 건다. 이동과 확대를 섞어도 되는 건 이 뷰에 원근 회전이 없어서다
   * (안드로이드의 행렬 분해 문제는 원근 회전과 이동이 한 뷰에 섞일 때 난다).
   *
   * 펴지면 앞표지가 오른쪽으로 넓어지고 책등이 사라져 책이 오른쪽으로 쏠려 보인다. 그만큼을
   * shift로 되돌려 칠해지는 범위의 한가운데를 제자리에 둔다. 그다음 펼친 책의 가운데(접힘선)를
   * 향해 커진다 — 양쪽 면이 똑같이 빛나므로 화면을 채우는 빛도 가운데에서 퍼진다.
   */
  const zoomStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const now = tiltGeometry(tiltAt(t), width);
    /**
     * 표지가 열리는 만큼 오른쪽으로 표지 반 폭을 민다 — 다 열리면 접힘선이 한가운데 오는
     * 펼친 두 쪽이 된다. 밀지 않으면 왼쪽으로 눕는 표지가 화면 밖으로 나간다.
     */
    const spread = (Math.min(1, openAt(t)) * width) / 2;
    const shift = restCenter - (foldX + (now.rightX - now.spineW) / 2) + spread;
    const focus = foldX + shift - stageW / 2;
    const hover = ease(phase(t, PRELUDE));
    const dolly = 1 + (dollyTo - 1) * ease(phase(t, DOLLY));
    const rush = Math.exp(Math.log(ZOOM_TO / dollyTo) * rushEase(phase(t, ZOOM)));
    /**
     * 표지가 바닥에 닿는 순간 책이 아주 살짝(1.2%) 눌렸다 돌아온다 — 툭 하고 닿는 무게.
     * 닿음 토막(OPEN_SEGMENTS의 마지막)에서만 일어난다.
     */
    const open = phase(t, OPEN);
    const land = OPEN_SEGMENTS[3];
    const thud = open > land ? 0.012 * Math.sin(Math.PI * ((open - land) / (1 - land))) : 0;
    const scale = (1 + HOVER_GROW * hover) * dolly * rush * (1 - thud);
    return {
      transform: [
        { translateY: -HOVER_RISE * hover },
        { translateX: focus },
        { scale },
        { translateX: shift - focus },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: stageW, height }, zoomStyle]}>
      {/* 책 뒤로 번지는 빛 — 펼친 책의 가운데(접힘선)에서 둥글게 퍼진다. */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            left: foldX - glowSize / 2,
            top: height / 2 - glowSize / 2,
          },
          glowStyle,
        ]}
      />

      <Animated.View style={[styles.spine, { width: rest.spineW, height }, spineStyle]}>
        <Spine design={design} width={width} geometry={{ spineW: rest.spineW, spineH: height }} />
      </Animated.View>

      {/* 속지 — 표지 밑에 늘 있고, 표지가 열리며 드러난다. 빛은 여기서 나온다. */}
      <Animated.View style={[styles.hinge, hinge, pageStyle]}>
        <View style={[styles.page, { left: width, width, height }]} />
      </Animated.View>

      {/* 앞표지 — 접힘선을 축으로 열린다. */}
      <Animated.View style={[styles.hinge, hinge, coverStyle]}>
        <View style={{ position: 'absolute', left: width, top: 0, width, height }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.face, frontStyle]}>
            <BookCover design={design} width={width} clip={false} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.shade, frontShadeStyle]} />
          </Animated.View>
          {/* 안쪽 면(면지) — 표지가 90°를 넘어가면 이쪽이 보인다. */}
          {/*
            여기엔 backfaceVisibility: 'hidden'을 걸지 않는다. 안드로이드는 뒷면인지를 그 뷰
            '자신의' rotationY만 보고 정하는데(ReactViewGroup.setBackfaceVisibilityDependantOpacity),
            이 면은 미리 180° 뒤집혀 있어 경첩이 어느 각에 있든 늘 뒷면으로 판정돼 숨는다 —
            실제로 표지가 90°를 넘자 통째로 사라졌다. 앞뒤 전환은 insideStyle의 opacity가 맡는다.
          */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.inside, insideStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.shade, insideShadeStyle]} />
          </Animated.View>
        </View>
      </Animated.View>

      {/* 3막 — 넘어가는 속지들. 나중에 넘어가는 장이 위에 눕도록 순서대로 그린다. */}
      {Array.from({ length: FLUTTER_COUNT }, (_, index) => (
        <FlutterPage
          key={index}
          index={index}
          progress={progress}
          width={width}
          height={height}
          hinge={hinge}
        />
      ))}

      {/* 펼친 책 한가운데의 흰 빛망울 — 표지와 속지 위에 얹힌다. 4막에 크게 터진다. */}
      <Animated.View
        style={[
          styles.bloom,
          {
            width: bloomSize,
            height: bloomSize,
            left: foldX - bloomSize / 2,
            top: height / 2 - bloomSize / 2,
          },
          bloomStyle,
        ]}
      />
    </Animated.View>
  );
}

/**
 * 넘어가는 속지 한 장 — 표지와 같은 경첩에서 0°에서 왼쪽으로 넘어가 눕는다.
 *
 * 넘어가기 전에는 숨겨 둔다. 오른쪽에 쌓인 채로 보이면 그리는 순서가 늦은 장(위)이 먼저
 * 넘어가는 장을 덮어, 들리는 장이 보이지 않는다. 밑의 속지와 똑같이 빛나므로 출발하는 순간
 * 나타나도 티가 나지 않는다. 세로에 가까울수록 그늘이 져 종이가 돌아가는 것이 보인다.
 */
function FlutterPage({
  index,
  progress,
  width,
  height,
  hinge,
}: {
  index: number;
  progress: SharedValue<number>;
  width: number;
  height: number;
  hinge: { left: number; width: number; height: number };
}) {
  const start = FLUTTER_FROM + FLUTTER_GAP * index;
  const span = [start, start + FLUTTER_EACH] as const;
  /** 바닥에 겹쳐 눕도록 장마다 조금씩 덜 넘긴다. */
  const restDeg = 179 - index;

  const turnStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const turn = flutterEase(phase(t, span));
    return {
      opacity: t >= start ? 1 : 0,
      transform: [{ perspective: PERSPECTIVE }, { rotateY: `${tiltAt(t) - restDeg * turn}deg` }],
    };
  });
  const angleOf = (t: number) => {
    'worklet';
    return tiltAt(t) - restDeg * flutterEase(phase(t, span));
  };
  const frontStyle = useAnimatedStyle(() => ({
    opacity: angleOf(progress.value) > -90 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: angleOf(progress.value) > -90 ? 0 : 1,
  }));
  /** 세로(90°)에서 가장 짙고 누우면 걷히는 그늘. */
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: 0.3 * Math.abs(Math.sin((angleOf(progress.value) * Math.PI) / 180)),
  }));

  return (
    <Animated.View style={[styles.hinge, hinge, turnStyle]}>
      <View style={{ position: 'absolute', left: width, top: 0, width, height }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.page, frontStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />
        </Animated.View>
        {/* 뒷면 — 면지와 같은 까닭으로 미리 뒤집어 두고 backfaceVisibility는 걸지 않는다. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.inside, backStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />
        </Animated.View>
      </View>
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
 * 빛의 장막 — 화면을 가득 덮는 흰빛. 다가온 책이 화면을 다 채우는 마지막 순간을 맡고,
 * 다음 화면이 그 뒤에서 천천히 드러나도록 걷힌다.
 *
 * 처음엔 노란 장막이 덮은 뒤 흰빛으로 바랬다. 그런데 그 앞에 한가운데 흰 빛이 터지는 장면이
 * 생기면서 빛이 노랑 → 하양(섬광) → 노랑(장막) → 하양(바램) 으로 두 번 오락가락했다. 장막을
 * 처음부터 흰빛으로 두어 노랑(펼친 책) → 하양(섬광·장막) → 본문 한 번으로 흐르게 했다.
 * whiten은 남겨 두었다 — 장막 위에 흰빛을 한 겹 더 얹는 값이라 지금은 보이는 차이가 없다.
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

/** progress(0~1)에서 장막이 덮는 정도를 꺼낸다 — 빨려 듦의 끝자락에 차오른다. */
export function veilAt(progress: number) {
  'worklet';
  return veilEase(phase(progress, VEIL));
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    experimental_backgroundImage: `radial-gradient(circle closest-side, ${lightAlpha(1)} 0%, ${lightAlpha(0.7)} 45%, ${lightAlpha(0)} 100%)`,
  },
  /** 흰 빛망울 — 가운데가 거의 흰빛이고 바깥으로 사라진다. */
  bloom: {
    position: 'absolute',
    experimental_backgroundImage:
      'radial-gradient(circle closest-side, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0) 100%)',
  },
  hinge: {
    position: 'absolute',
    top: 0,
  },
  /** 책등이 놓이는 자리 — 무대 왼쪽 끝에서 접힘선까지. */
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  /**
   * 속지 — 접힘선 쪽이 흰빛이고 바깥 변으로 갈수록 노랗다(레퍼런스의 열린 문 안쪽).
   *
   * 빛의 중심을 속지 가운데가 아니라 접힘선 쪽 변(0%)에 둔다. 면지도 같은 빛을 거울로
   * 받으므로(inside) 활짝 열리면 두 면이 이어져, 펼친 책 한가운데에서 빛이 퍼지는 한 장이 된다.
   */
  page: {
    position: 'absolute',
    top: 0,
    backgroundColor: Colors.white,
    experimental_backgroundImage: pageLight('0%'),
  },
  /** 면에 지는 그늘 — 각도에 따라 opacity만 바뀐다. */
  shade: {
    backgroundColor: Colors.brown100,
  },
  face: {
    backfaceVisibility: 'hidden',
  },
  /**
   * 면지 — 표지 안쪽. 표지 색과 상관없이 속지와 똑같이 빛난다(어두운 표지도 안은 밝다).
   * 경첩이 -90°를 넘어 돌면 이 면이 거울상이 되므로 미리 180° 뒤집어 둔다. 그래서 이 면의
   * 오른쪽 변(100%)이 화면에서는 접힘선에 붙는다 — 빛의 중심을 거기 둔다.
   */
  inside: {
    backgroundColor: Colors.white,
    experimental_backgroundImage: pageLight('100%'),
    transform: [{ rotateY: '180deg' }],
  },
  /** 화면을 가득 채운 빛 — 흰빛 한 가지(LightVeil 주석). */
  veil: {
    backgroundColor: Colors.white,
  },
  white: {
    backgroundColor: Colors.white,
  },
});
