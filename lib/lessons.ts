import { resolveMediaUrl } from '@/lib/firebase';
import type { DailyLesson } from '@/types';

/**
 * Wikimedia는 okhttp 등 네이티브 기본 User-Agent를 403으로 차단하므로,
 * 커버 이미지·음원 요청에는 식별 가능한 UA를 명시해야 한다.
 */
export const MEDIA_HEADERS: Record<string, string> = {
  'User-Agent': 'HaruClassicDemo/1.0 (Expo demo app)',
};

/**
 * 커버 이미지 해석기 — 학습 가능한 책들이 함께 쓴다.
 *
 * 책마다 데이터 파일과 표제 필드는 다르지만 coverImage는 DailyLesson 공통부라 여기
 * 한 곳에서만 해석한다. 실제 변환은 resolveMediaUrl 하나로 모이므로 다운로드 URL
 * 캐시(lib/firebase.ts)도 함께 공유한다.
 *
 * 낭독 배경음악은 항목이 아니라 설정에 딸린 값이라 여기 없다 — lib/bgm.ts를 보라.
 */
export function resolveLessonCoverImageUrl(lesson: DailyLesson): Promise<string | undefined> {
  if (!lesson.coverImage) return Promise.resolve(undefined);
  return resolveMediaUrl(lesson.coverImage);
}

/** featured 항목 — 없으면 첫 항목. 데모에서는 시스템 날짜를 읽지 않는다. */
export function pickTodayLesson<T extends DailyLesson>(lessons: T[]): T | undefined {
  return lessons.find((lesson) => lesson.featured) ?? lessons[0];
}
