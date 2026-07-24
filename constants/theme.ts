import { Platform } from 'react-native';

/**
 * 하루 클래식 디자인 시스템.
 * 단일 라이트 테마 — 차분하고 고급스러운 출판 감성.
 */

/**
 * 지정 팔레트(global.css) 전체 — 화면에서 세부 색이 필요할 때 사용한다.
 * 새 색이 필요하면 global.css에 먼저 등록할 것.
 */
export const Colors = {
  white: '#FFFFFF', // --white
  yellow: '#FEB836', // --yellow
  bg: '#FAF6EE', // --bg
  brown100: '#030303', // --brown-100
  brown50: '#827F7A', // --brown-50
  brown10: '#E0DBD5', // --brown-10
  beige100: '#8B6C42', // --beige-100
  beige50: '#D6C4A7', // --beige-50
  beige10: '#F2E8DA', // --beige-10
  blue100: '#07127E', // --blue-100
  blue50: '#8E96D7', // --blue-50
  blue10: '#EDEDFD', // --blue-10
  red100: '#EB5757', // --red-100
  red50: '#F5ABAB', // --red-50
  red10: '#FEF3F4', // --red-10
} as const;

/** 번들된 서체 — 을유1945(기본), DM Serif Display(인용문 전용·라틴만 지원) */
export const Fonts = {
  regular: 'Eulyoo1945-Regular',
  semiBold: 'Eulyoo1945-SemiBold',
  serifDisplay: 'DMSerifDisplay_400Regular',
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
  background: '#FAF6EE', // --bg
  primary: '#07127E', // --blue-100
  accent: '#8B6C42', // --beige-100
  text: '#030303', // --brown-100
  subText: '#827F7A', // --brown-50
  card: '#FFFFFF', // --white
  divider: '#E0DBD5', // --brown-10
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
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
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
    fontWeight: '600' as const,
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
