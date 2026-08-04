import { StyleSheet } from 'react-native';

import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 블록들이 공유하는 조판. 값은 `headingStyles.ts`(표제부)와 `today.tsx`의 기존 스타일에서
 * 그대로 가져왔다 — 새로 정하지 않는다.
 *
 * `headingStyles.ts`는 지우지 않는다 — `LessonHeading`이 미이관 8권을 위해 계속 쓴다.
 * 값이 두 곳에 중복되지만, 9권 이관이 끝나면 `headingStyles.ts`가 통째로 사라지므로 일시적이다.
 */
export const blockStyles = StyleSheet.create({
  /** 블록 하나의 바깥 여백 — Figma에서 블록이 x=20, width=320 */
  block: {
    paddingHorizontal: 20,
  },
  /** 책 이름 태그 알약 */
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.beige10,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  /** 표제 큰 글씨 */
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 36,
    letterSpacing: tracking(36),
    color: Colors.brown100,
  },
  /** 표제 아래 줄 */
  subtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },
  /** 보조행 — 영문 표기 등 */
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown100,
  },
  metaStar: {
    fontFamily: Fonts.regular,
    fontSize: 8,
    letterSpacing: tracking(8),
    color: Colors.beige100,
  },
  /** 출처 줄 */
  source: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
  },
  /** 본문 문단 */
  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 31,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
});
