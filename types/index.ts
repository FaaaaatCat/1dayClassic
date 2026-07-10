export interface Track {
  id: string;
  /** 곡 제목 */
  title: string;
  /** 작곡가 */
  composer: string;
  /** 오늘의 이야기 — 300~500자 */
  description: string;
  /** 오늘의 감상 포인트 — 한 문장 */
  listeningPoint: string;
  /** 커버 이미지 URL */
  coverImage: string;
  /** 샘플 음원 URL (30초까지만 재생) */
  audio: string;
}

export interface TracksData {
  tracks: Track[];
}
