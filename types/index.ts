export interface Track {
  id: string;
  /** 곡 제목 */
  title: string;
  /** 작곡가 */
  composer: string;
  /** 영문 곡 제목 — 있으면 제목 아래 영문 표기 행에 노출 */
  titleEn?: string;
  /** 영문 작곡가 표기 */
  composerEn?: string;
  /** 상단 태그 라벨 — 기본값 '하루 클래식 공부' */
  tag?: string;
  /** 인용문 — 본문 위 인용 블록에 노출 */
  quote?: string;
  /** 인용문 출처 */
  quoteBy?: string;
  /** 본문 문단들 — 오늘의 이야기 본문이자 나레이션 낭독 대상 */
  story: string[];
  /** 커버 이미지 URL — 보관함 썸네일과 오늘의 클래식 히어로 이미지에 공용으로 쓰인다 */
  coverImage: string;
  /**
   * 샘플 음원 (30초까지만 재생). Firebase Storage 경로("musics/foo.mp3")
   * 또는 완성된 http(s) URL(예: Wikimedia) 둘 다 허용된다 — resolveTrackAudioUrl로 변환해서 쓸 것.
   */
  audio: string;
  /** 데모: true면 로테이션 대신 오늘의 곡으로 고정 */
  featured?: boolean;
}

export interface TracksData {
  tracks: Track[];
}
