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
  /** 본문 문단들 — 없으면 description 한 문단으로 대체 */
  story?: string[];
  /** 오늘의 이야기 — 300~500자. 나레이션 낭독에도 사용 */
  description: string;
  /** 오늘의 감상 포인트 — 한 문장 */
  listeningPoint: string;
  /** 커버 이미지 URL */
  coverImage: string;
  /** 오늘의 클래식 메인(히어로) 이미지 URL — 없으면 coverImage */
  mainImage?: string;
  /** 샘플 음원 URL (30초까지만 재생) */
  audio: string;
  /** 데모: true면 로테이션 대신 오늘의 곡으로 고정 */
  featured?: boolean;
}

export interface TracksData {
  tracks: Track[];
}
