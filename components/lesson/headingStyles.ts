import { StyleSheet } from 'react-native';

import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 9권 표제부가 공유하는 조판. 값은 클래식 표제부(피그마 시안)에서 그대로 가져왔다 —
 * 책이 달라도 제목·부제·보조행의 크기와 색은 같아야 한 앱처럼 읽힌다.
 *
 * 책마다 다른 것은 '어떤 필드를 어느 자리에 놓는지'뿐이고, 그 판단은 각 표제부 컴포넌트가 한다.
 */
export const headingStyles = StyleSheet.create({
  /** 표제부 전체 묶음 */
  section: {
    gap: 16,
    paddingBottom: 20,
  },
  /** 책 이름 태그 */
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
  /** 제목 + 부제 묶음 */
  titles: {
    gap: 8,
  },
  /** 그 날의 표제 — 곡명, 라틴어 원문, 한문 구절, 글 제목 */
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 36,
    letterSpacing: tracking(36),
    color: Colors.brown100,
  },
  /** 표제 바로 아래 — 작곡가, 우리말 뜻, 독음 */
  subtitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },
  /** 보조행 — 영문 표기, 발음, 출처처럼 작게 붙는 줄 */
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
  /** 출처 — 책·편명처럼 표제부 맨 아래에 조용히 놓이는 줄 */
  source: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
  },
  /** 예문처럼 표제부 안에 한 덩이로 들어가는 블록 */
  block: {
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.beige50,
    paddingLeft: 14,
  },
  blockText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 26,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  blockSubText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 24,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
});
