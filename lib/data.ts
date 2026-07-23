import tracksData from '@/data/tracks.json';
import { getStorageDownloadUrl, isStoragePath } from '@/lib/firebase';
import type { Track, TracksData } from '@/types';

/**
 * Wikimedia는 okhttp 등 네이티브 기본 User-Agent를 403으로 차단하므로,
 * 커버 이미지·음원 요청에는 식별 가능한 UA를 명시해야 한다.
 */
export const MEDIA_HEADERS: Record<string, string> = {
  'User-Agent': 'HaruClassicDemo/1.0 (Expo demo app)',
};

/**
 * 재생 가능한 오디오 URL로 변환한다. 마이그레이션이 트랙별로 진행 중이라
 * track.audio는 Firebase Storage 경로일 수도, 기존 Wikimedia 직결 URL일 수도 있다 —
 * 둘 다 이 함수 하나로 처리한다.
 */
export async function resolveTrackAudioUrl(track: Track): Promise<string> {
  if (!isStoragePath(track.audio)) {
    return track.audio;
  }
  return getStorageDownloadUrl(track.audio);
}

/**
 * 커버 이미지 URL로 변환한다. track.coverImage는 Firebase Storage 경로("musics/foo.jpg")일
 * 수도, 완성된 http(s) URL(Wikimedia 등)일 수도 있다 — resolveTrackAudioUrl과 동일한 패턴.
 * Storage 경로는 UA 차단 문제가 없고, 이미 다운로드 URL 캐시(lib/firebase.ts)도 공유한다.
 */
export async function resolveCoverImageUrl(track: Track): Promise<string> {
  if (!isStoragePath(track.coverImage)) {
    return track.coverImage;
  }
  return getStorageDownloadUrl(track.coverImage);
}

export function getTracks(): Track[] {
  return (tracksData as TracksData).tracks;
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((track) => track.id === id);
}

/**
 * 오늘의 곡 — 데모 범위에서는 실제 시스템 날짜를 읽지 않고 featured 트랙(1월 1일)으로 고정한다.
 * '오늘의 클래식' 화면에 트랙 id가 안 넘어온 경우의 기본값으로 쓰인다.
 */
export function getTodayTrack(): Track {
  const tracks = getTracks();
  return tracks.find((track) => track.featured) ?? tracks[0];
}
