import tracksData from '@/data/tracks.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { Track, TracksData } from '@/types';

export function getTracks(): Track[] {
  return (tracksData as TracksData).tracks;
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((track) => track.id === id);
}

/**
 * 오늘의 곡 — 데모 범위에서는 실제 시스템 날짜를 읽지 않고 featured 트랙(1월 1일)으로 고정한다.
 * 고르는 규칙도 반환 타입도 다른 책의 getTodayXLesson과 동일하다.
 */
export function getTodayTrack(): Track | undefined {
  return pickTodayLesson(getTracks());
}
