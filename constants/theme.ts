import { Platform } from "react-native";

/**
 * 하루 클래식 디자인 시스템 — DESIGN.md(ElevenLabs 스타일 레퍼런스)를 옮긴 것.
 *
 * 따뜻한 흰색 위의 검정 활자. 순백(#FFFFFF)도 찬 회색도 쓰지 않는다 — 표면은
 * eggshell → taupe → stone 세 단으로만 쌓고, 종이처럼 보이는 따뜻함이 이 시스템의
 * 성격이다. 색은 97%가 무채색이고, 남은 둘(violet·orange)은 그림 안에서만 쓴다.
 *
 * 아래는 새 토큰 층이다. 그 밑의 Colors·Palette·Typography는 화면들이 아직 쓰고
 * 있는 예전 이름이라 남겨 뒀고, 화면을 하나씩 옮기면서 지운다.
 */

// ── 표면 ──────────────────────────────────────────────────────────────────
/** 세 단으로만 쌓는다. 순백도 찬 회색도 없다. */
export const Surface = {
  /** 바탕 — 화면 전체. 화면이 아니라 종이로 읽히게 하는 따뜻한 흰색. */
  canvas: "#FDFCFC",
  /** 카드·구역 띠 — 테두리 없이 한 단 올라온 자리. */
  card: "#F5F3F1",
  /** 아이콘 판·작은 요소 — taupe보다 한 단 더 깊다. */
  plate: "#EBE8E4",
  /**
   * 오늘의 공부 뷰어 — 이 시스템에서 유일하게 어두운 표면이다.
   * 스토리 형식의 몰입 화면이라 의도적으로 남긴 예외이고, 다른 화면에는 쓰지 않는다.
   */
  viewer: "#000000",
} as const;

// ── 글자 ──────────────────────────────────────────────────────────────────
/** 잉크에서 재까지 네 단. 이 시스템의 유일한 강한 대비는 ink 하나다. */
export const Ink = {
  /** 본문 표제·버튼 채움·링크. */
  primary: "#000000",
  /** 힘이 필요하지만 새까맣지는 않아야 할 글 — 구역 라벨, 강한 보조 문구. */
  strong: "#44403B",
  /** 본문과 설명 — 읽히되 조용한, 가장 많이 쓰는 목소리. */
  body: "#777169",
  /** 각주처럼 물러나야 할 글. */
  muted: "#A59F97",
  /** 어두운 표면(뷰어) 위의 글. */
  onDark: "#FDFCFC",
} as const;

/**
 * 그림 안에서만 쓰는 두 색.
 *
 * 버튼·링크·배지·테두리에는 쓰지 않는다. 이 둘이 UI 곳곳에 나오는 순간 97% 무채색이라는
 * 시스템의 전제가 무너지고, 드물게 나타나기 때문에 특별해 보이는 것이다.
 *
 * 예외가 하나 있다 — 홈의 완독바가 차오르는 자리에 ember를 쓴다(app/(tabs)/index의
 * progressFill). 완독까지 얼마나 왔는지가 그 화면에서 가장 먼저 눈에 들어와야 하는데
 * 무채색으로는 '얼마나 찼는지'가 읽히지 않아서다. UI에서 이 색을 쓰는 곳은 거기 하나뿐이고,
 * 늘리려면 먼저 의논한다.
 */
export const Spark = {
  violet: "#0447FF",
  ember: "#FF4704",
} as const;

/**
 * 맞고 틀림을 알리는 색 — DESIGN.md에서 의도적으로 벗어난 자리다.
 *
 * 문서는 새 강조색을 들이지 말라고 하지만, 퀴즈의 정답·오답은 장식이 아니라 기능이다.
 * 무채색으로만 알리면 색맹이 아닌 사람에게도 구분이 느려진다. 그래서 이 둘만 남기고,
 * 쓰는 자리는 퀴즈 보기와 해설로 한정한다.
 */
export const Feedback = {
  right: "#2E7D4F",
  rightSurface: "#EDF6F0",
  wrong: "#EB5757",
  wrongSurface: "#FEF3F4",
} as const;

// ── 서체 ──────────────────────────────────────────────────────────────────
/**
 * 서체는 둘로 나뉜다.
 *
 * 을유1945는 '읽는 글'(본문·인용)에 남긴다 — 이 앱은 읽는 물건이고, 세리프가 주는 책의
 * 감촉이 자산이다. Pretendard는 그 바깥 전부(버튼·라벨·입력칸·표제)를 맡는다.
 * DESIGN.md의 Inter 자리인데, Inter에는 한글 글리프가 없어 한글로 옮긴 격인 이 서체를 쓴다.
 *
 * light(300)는 큰 표제 전용이다. 문서가 말하는 '속삭임'이 이 시스템의 서명이라, 32px
 * 이상에서는 굵게 쓰지 않는다.
 */
export const Type = {
  /** 읽는 글 — 본문·인용. */
  readingRegular: "Eulyoo1945-Regular",
  readingBold: "Eulyoo1945-SemiBold",
  /** 큰 표제 전용(300). 24px 미만에는 쓰지 않는다. */
  displayLight: "Pretendard-Light",
  /** UI 기본. */
  ui: "Pretendard-Regular",
  /** 버튼과 강조된 링크에만. */
  uiMedium: "Pretendard-Medium",
  /** 인용 블록의 라틴 문자 전용(한글은 폴백). */
  serifDisplay: "DMSerifDisplay_400Regular",
} as const;

/**
 * 큰 글자의 자간 — 크기의 -2%.
 *
 * 24px 이상 표제에만 쓴다. 큰 활자는 글자 사이가 벌어져 보여서 당겨 줘야 한 덩어리로
 * 읽힌다.
 */
export function trackDisplay(fontSize: number): number {
  return Math.round(fontSize * -2) / 100;
}

/**
 * 작은 글자의 자간 — 크기의 +1%.
 *
 * 13~16px 본문에 쓴다. 표제와 반대 방향인 것이 이 시스템의 의도다 — 큰 글자는 당기고
 * 작은 글자는 벌려, 표제와 본문이 서로 다른 결로 읽힌다.
 */
export function trackBody(fontSize: number): number {
  return Math.round(fontSize) / 100;
}

/**
 * 활자 계단 — DESIGN.md의 웹 계단(48/36/32)을 폰으로 줄인 것.
 *
 * 이름이 TypeScale인 건 화면마다 react-native의 Text를 쓰고 있어서다. Text로 두면
 * 가져오는 순간 컴포넌트를 가린다.
 *
 * 폭이 360dp인 화면에서 48px 표제는 서너 글자면 줄이 넘어간다. 비율과 자간 방향은 그대로
 * 두고 크기만 한 단씩 내렸다.
 */
export const TypeScale = {
  /** 화면 하나를 여는 가장 큰 표제. */
  display: { fontSize: 32, lineHeight: 35, letterSpacing: trackDisplay(32) },
  heading: { fontSize: 26, lineHeight: 30, letterSpacing: trackDisplay(26) },
  headingSm: { fontSize: 22, lineHeight: 26, letterSpacing: trackDisplay(22) },
  /** 표제와 본문 사이 — 카드 제목, 목록 항목. */
  bodyLg: { fontSize: 18, lineHeight: 25 },
  subheading: { fontSize: 16, lineHeight: 24 },
  body: { fontSize: 15, lineHeight: 24, letterSpacing: trackBody(15) },
  bodySm: { fontSize: 13, lineHeight: 20, letterSpacing: trackBody(13) },
  caption: { fontSize: 11, lineHeight: 17 },
} as const;

// ── 간격·모양 ─────────────────────────────────────────────────────────────
/** 4의 배수. 이 계단 밖의 숫자를 여백으로 쓰지 않는다. */
export const Space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  36: 36,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
  72: 72,
  96: 96,
} as const;

/** 알약과 20px 카드가 이 시스템의 서명이다. 8px 미만의 모서리는 카드에 쓰지 않는다. */
export const Corner = {
  input: 4,
  small: 10,
  card: 20,
  largeCard: 24,
  pill: 9999,
} as const;

/**
 * 그림자는 거의 없다. 구역을 나눌 때는 그림자가 아니라 hairline 선을 쓴다 —
 * 이 시스템은 떠 있는 것이 아니라 종이 위에 인쇄된 것처럼 보여야 한다.
 */
export const Elevation = {
  /** 다른 것 위에 올라앉아야 하는 카드에만. 눈에 겨우 보일 만큼이다. */
  whisper: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;

/** 구역을 나누는 선 — 이 시스템에서 가장 자주 쓰는 경계다. */
export const Hairline = {
  borderWidth: 1,
  borderColor: Surface.plate,
} as const;

/**
 * 지정 팔레트(global.css) 전체 — 화면에서 세부 색이 필요할 때 사용한다.
 * 새 색이 필요하면 global.css에 먼저 등록할 것.
 */
export const Colors = {
  white: "#FFFFFF", // --white
  yellow: "#FEB836", // --yellow
  bg: "#FAF6EE", // --bg
  brown100: "#030303", // --brown-100
  brown90: "#272323", // --brown-100
  brown50: "#827F7A", // --brown-50
  brown10: "#E0DBD5", // --brown-10
  beige100: "#8B6C42", // --beige-100
  beige50: "#c9ae83", // --beige-50
  beige10: "#F2E8DA", // --beige-10
  blue100: "#07127E", // --blue-100
  blue50: "#8E96D7", // --blue-50
  blue10: "#EDEDFD", // --blue-10
  red100: "#EB5757", // --red-100
  red50: "#F5ABAB", // --red-50
  red10: "#FEF3F4", // --red-10
  green100: "#2E7D4F", // --green-100
  green50: "#97C7AC", // --green-50
  green10: "#EDF6F0", // --green-10
  // 잠금화면 알람 전용 — 어두운 사진 위에서만 쓴다. 앱 본문에는 쓰지 않는다.
  violet100: "#7C4DFF", // --violet-100
  violet50: "#9C6BFF", // --violet-50
  violet10: "#C8BEFF", // --violet-10
  violet5: "#F0ECFF", // --violet-5
  night: "#111114", // --night
} as const;

/** 번들된 서체 — 을유1945(기본), DM Serif Display(인용문 전용·라틴만 지원) */
export const Fonts = {
  regular: "Eulyoo1945-Regular",
  semiBold: "Eulyoo1945-SemiBold",
  serifDisplay: "DMSerifDisplay_400Regular",
} as const;

/**
 * 자간(letterSpacing) 공통 규칙 — fontSize의 -2%.
 * 숫자만 표시하는 텍스트(시계, 날짜, 진행률 등)에는 적용하지 않는다.
 */
export function tracking(fontSize: number): number {
  return Math.round(fontSize * -2) / 100;
}

/**
 * 지정 팔레트(global.css)의 색만 사용한다. 새 색이 필요하면 global.css에
 * 먼저 등록된 것인지 확인할 것. 주석은 global.css의 변수 이름.
 */
export const Palette = {
  background: "#FAF6EE", // --bg
  primary: "#07127E", // --blue-100
  accent: "#8B6C42", // --beige-100
  text: "#030303", // --brown-100
  subText: "#827F7A", // --brown-50
  card: "#FFFFFF", // --white
  divider: "#E0DBD5", // --brown-10
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, serif",
});

export const Typography = {
  /** 화면 상단 타이틀 — "오늘의 클래식" */
  display: {
    fontFamily: serif,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: tracking(28),
    color: Palette.text,
  },
  /** 곡 제목 */
  title: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: tracking(22),
    color: Palette.text,
  },
  /** 섹션 라벨 — "오늘의 이야기" */
  label: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.2,
    color: Palette.accent,
    fontWeight: "600" as const,
  },
  /** 본문 — 읽고 싶게 만드는 행간 */
  body: {
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: tracking(15),
    color: Palette.text,
  },
  /** 보조 텍스트 — 날짜, 작곡가 */
  caption: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: tracking(14),
    color: Palette.subText,
  },
  /** 감상 포인트 — 인용문 느낌의 세리프 (한글 이탤릭은 렌더링이 불안정해 쓰지 않는다) */
  quote: {
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Palette.primary,
  },
} as const;

export const Radius = {
  card: 20,
  image: 14,
  pill: 999,
} as const;

/** 매우 약한 그림자 — 카드가 배경에서 살짝만 떠 보이게 */
export const Shadow = {
  card: {
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;
