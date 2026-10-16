import { Easing } from 'react-native';

/**
 * 오른쪽에서 덮으며 들어오는 전환 — 앱의 모든 '오른쪽에서 나타나는' 화면이 같은 모양으로 들어온다.
 *
 * 새 화면만 제 폭만큼 오른쪽에서 밀려 들어오고, 덮이는 화면은 제자리에 가만히 있는다. 닫을 때는
 * 거꾸로 오른쪽으로 걷힌다. 쓰는 곳은 셋이다.
 *  - 홈 위의 화면들(목차·알림·마이페이지·서점에서 연 책 상세) — app/(tabs)/_layout의 SLIDE_IN
 *  - 마이페이지 안의 화면들 — app/(tabs)/library/_layout의 스택
 *  - 서점 안의 페이지들 — app/(tabs)/bookstore
 * 한 곳만 고치면 어긋나므로 시간과 곡선은 여기서만 정한다.
 */
export const SLIDE_MS = 300;
/** 빠르게 나와 끝에서 느려지며 멎는 곡선. 서점은 Reanimated의 같은 곡선(Easing.out(Easing.cubic))을 쓴다. */
export const SLIDE_EASING = Easing.out(Easing.cubic);
