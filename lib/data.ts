import type { ImageSourcePropType } from 'react-native';

import tracksData from '@/data/tracks.json';
import type { Track, TracksData } from '@/types';

/**
 * Wikimedia는 okhttp 등 네이티브 기본 User-Agent를 403으로 차단하므로,
 * 커버 이미지·음원 요청에는 식별 가능한 UA를 명시해야 한다.
 */
export const MEDIA_HEADERS: Record<string, string> = {
  'User-Agent': 'HaruClassicDemo/1.0 (Expo demo app)',
};

/**
 * 로컬 커버 이미지 — assets/images/musicians/ 에 파일을 넣고 여기에 등록한다.
 * Metro의 require는 정적 경로만 허용되어 자동 매핑이 불가능하다.
 */
const LOCAL_COVER_IMAGES: Record<string, ImageSourcePropType> = {
  'beethoven-symphony-5': require('../assets/images/musicians/beethoven.jpg'),
  'mozart-nachtmusik': require('../assets/images/musicians/mozart.jpg'),
  'vivaldi-spring': require('../assets/images/musicians/vivaldi.jpg'),
  'pachelbel-canon': require('../assets/images/musicians/pachelbel.jpg'),
  'satie-gymnopedie-1': require('../assets/images/musicians/satie.jpg'),
};

/** 로컬 커버가 있으면 로컬을, 없으면 원격 URL(+UA 헤더)을 반환한다. */
export function getCoverImageSource(track: Track): ImageSourcePropType {
  return (
    LOCAL_COVER_IMAGES[track.id] ?? { uri: track.coverImage, headers: MEDIA_HEADERS }
  );
}

/** 오늘의 클래식 히어로 이미지 — mainImage가 있으면 우선 사용한다. */
export function getMainImageSource(track: Track): ImageSourcePropType {
  if (track.mainImage) {
    return { uri: track.mainImage, headers: MEDIA_HEADERS };
  }
  return getCoverImageSource(track);
}

/** DJ 나레이션 스크립트 — 곡 소개 후 '오늘의 이야기'를 낭독한다. */
export function buildNarrationScript(track: Track): string {
  return `${track.composer}의 ${track.title}. ${track.description}`;
}

export function getTracks(): Track[] {
  return (tracksData as TracksData).tracks;
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((track) => track.id === id);
}

/** 날짜 기준으로 오늘의 곡을 선정한다. featured 곡이 있으면 데모용으로 고정한다. */
export function getTodayTrack(date: Date = new Date()): Track {
  const tracks = getTracks();
  const featured = tracks.find((track) => track.featured);
  if (featured) return featured;
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return tracks[dayOfYear % tracks.length];
}

/** "7월 10일 목요일" 형태의 오늘 날짜 문자열. */
export function formatTodayDate(date: Date = new Date()): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
}
