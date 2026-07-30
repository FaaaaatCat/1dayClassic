import tracksData from '@/data/tracks.json';
import { pickTodayLesson } from '@/lib/lessons';
import type { LessonHeading, Track, TracksData } from '@/types';

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

/** 목차 표제 — 곡명과 작곡가. */
export function getTrackHeading(track: Track): LessonHeading {
  return { title: track.title, subtitle: track.composer };
}

/**
 * 실제 트랙이 아직 없는 날짜를 채우는 자리표시 곡 목록. 재생되지 않으며 순환 사용된다.
 * 실제 곡 3개와 겹치지 않도록 따로 골라 두었다.
 */
export const TRACK_PLACEHOLDER_HEADINGS: LessonHeading[] = [
  { title: '사계 중 「봄」 1악장', subtitle: '안토니오 비발디' },
  { title: '녹턴 Op.9 No.2', subtitle: '프레데리크 쇼팽' },
  { title: '골드베르크 변주곡 BWV 988', subtitle: '요한 제바스티안 바흐' },
  { title: "피아노 소나타 14번 '월광'", subtitle: '루트비히 판 베토벤' },
  { title: '아이네 클라이네 나흐트무지크', subtitle: '볼프강 아마데우스 모차르트' },
  { title: "현악 4중주 '죽음과 소녀'", subtitle: '프란츠 슈베르트' },
  { title: "교향곡 '신세계로부터'", subtitle: '안토닌 드보르자크' },
  { title: '발라드 1번 G단조', subtitle: '프레데리크 쇼팽' },
  { title: '수상 음악 모음곡', subtitle: '게오르크 프리드리히 헨델' },
  { title: '헝가리 무곡 5번', subtitle: '요하네스 브람스' },
  { title: '교향시 「핀란디아」', subtitle: '장 시벨리우스' },
  { title: '피아노 협주곡 21번 K.467', subtitle: '볼프강 아마데우스 모차르트' },
];
