import { Platform } from 'react-native';

/**
 * 하루 클래식 디자인 시스템.
 * 단일 라이트 테마 — 차분하고 고급스러운 출판 감성.
 */

export const Palette = {
  background: '#F8F6F2',
  primary: '#2D3A4A',
  accent: '#B88A44',
  text: '#1E1E1E',
  subText: '#7A7A7A',
  card: '#FFFFFF',
  divider: 'rgba(45, 58, 74, 0.08)',
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
    color: Palette.text,
  },
  /** 곡 제목 */
  title: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 30,
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
    color: Palette.text,
  },
  /** 보조 텍스트 — 날짜, 작곡가 */
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.subText,
  },
  /** 감상 포인트 — 인용문 느낌의 세리프 (한글 이탤릭은 렌더링이 불안정해 쓰지 않는다) */
  quote: {
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 26,
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
