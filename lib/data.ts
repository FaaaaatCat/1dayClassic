import tracksData from '@/data/tracks.json';
import type { Track, TracksData } from '@/types';

export function getTracks(): Track[] {
  return (tracksData as TracksData).tracks;
}

export function getTrackById(id: string): Track | undefined {
  return getTracks().find((track) => track.id === id);
}

/** 날짜 기준으로 오늘의 곡을 선정한다 — 매일 자동 로테이션. */
export function getTodayTrack(date: Date = new Date()): Track {
  const tracks = getTracks();
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return tracks[dayOfYear % tracks.length];
}

/** "7월 10일 목요일" 형태의 오늘 날짜 문자열. */
export function formatTodayDate(date: Date = new Date()): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
}
