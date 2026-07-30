/**
 * '하루 시리즈' 9권의 식별자 — 하루 서점 카탈로그와 책별 데이터 모듈을 잇는 키.
 * 라우트 파라미터(/book/[id])로도 그대로 쓰인다.
 */
export type BookId =
  | 'classic'
  | 'latin'
  | 'quote'
  | 'hanja'
  | 'liberal'
  | 'psychology'
  | 'writing'
  | 'hanmun'
  | 'english';

/**
 * 목차 한 행에 노출되는 표제. 어느 필드에서 뽑는지는 책마다 다르므로
 * (곡명/작곡가 vs 라틴어/뜻 vs 한자/훈음) 책별 getHeading 함수가 이 모양으로 맞춰 준다.
 */
export interface LessonHeading {
  /** 첫 줄 — 그 날을 식별하는 표제 */
  title: string;
  /** 둘째 줄 — 없는 책도 있다(교양·심리). 없으면 행이 한 줄로 그려진다. */
  subtitle?: string;
}

/**
 * '하루 시리즈' 책들이 공유하는 하루치 항목의 공통부.
 *
 * 표제부(곡 제목, 라틴어 원문, 한문 구절, 한자 …)는 책마다 다르므로 여기 두지 않는다.
 * 책별 타입이 이 인터페이스를 확장해서 자기 표제 필드를 더한다 — 클래식(Track)도 마찬가지다.
 */
export interface DailyLesson {
  id: string;
  /** 목차에서 이 항목이 꽂히는 날짜 — "1월 1일" 형태 */
  date?: string;
  /**
   * 출처. 책마다 성격이 조금 다르다 — 한문은 원문이 실린 자리("『대학』 경 1-1ㄱ"),
   * 교양은 글이 기대고 있는 참고 도서("『재즈 잇 업!』, 남무성 지음, 서해문집, 2018").
   */
  source?: string;
  /** 본문 문단들 — 오늘의 이야기 본문이자 나레이션 낭독 대상 */
  story: string[];
  /**
   * 음원. Firebase Storage 경로("latin/foo.mp3") 또는 완성된 http(s) URL.
   *
   * 없을 수 있다 — 아직 음원을 준비하지 않았거나, 유료 회원에게만 음원을 제공하는 경우다.
   * 음원이 없으면 재생 컨트롤 대신 story를 TTS로 읽는 경로로 간다.
   */
  audio?: string;
  /** 커버 이미지 — Storage 경로("latin/foo.jpg") 또는 완성된 http(s) URL */
  coverImage: string;
  /** 데모: true면 로테이션 대신 오늘의 항목으로 고정 */
  featured?: boolean;
}

/** 하루 클래식 공부 — 표제는 곡. */
export interface Track extends DailyLesson {
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
}

export interface TracksData {
  tracks: Track[];
}

/** 하루 라틴어 공부 — 표제는 라틴어 문장. */
export interface LatinLesson extends DailyLesson {
  /** 라틴어 원문 — 화면의 주인공 */
  latin: string;
  /** 한글 발음 표기 (예: "카르페 디엠") */
  pronunciation: string;
  /** 한글 뜻 — 원문 아래 노출 */
  meaning: string;
}

export interface LatinData {
  lessons: LatinLesson[];
}

/** 하루 한문 공부 — 표제는 고전 원문 구절. */
export interface HanmunLesson extends DailyLesson {
  /**
   * 한문 원문 — 화면의 주인공. 책과 마찬가지로 해설 번호를 위첨자 마커로 달아 둔다
   * (예: "大學①之②道③,"). 마커 번호는 story 문단 앞의 ①②③과 짝을 이룬다.
   */
  hanmun: string;
  /** 토를 붙인 독음 (예: "대학지도(는)") — 선조들이 한자음에 우리말 조사를 붙여 읽던 방식 */
  reading: string;
  /** 우리말 번역 */
  meaning: string;
}

export interface HanmunData {
  lessons: HanmunLesson[];
}

/** 하루 교양 공부 — 표제는 글 제목. 원문/독음이 없는 대신 글 한 편이 통째로 본문이다. */
export interface LiberalLesson extends DailyLesson {
  /** 글 제목 (예: "루이 암스트롱의 새해") */
  title: string;
}

export interface LiberalData {
  lessons: LiberalLesson[];
}

/** 하루 영어 교양 — 표제는 영어 관용 표현. 표제 아래에 쓰임을 보여 주는 예문 한 쌍이 붙는다. */
export interface EnglishLesson extends DailyLesson {
  /** 영어 표현 (예: "good wine needs no bush") */
  english: string;
  /** 한글 뜻 — 표제 바로 아래 노출 */
  meaning: string;
  /** 쓰임을 보여 주는 영어 예문 */
  example: string;
  /** 예문의 우리말 번역 */
  exampleMeaning: string;
}

export interface EnglishData {
  lessons: EnglishLesson[];
}

/**
 * 하루 명언 공부 — 표제는 고전 명구.
 * 지면에서는 우리말 뜻이 큰 글씨로 먼저 오고 한자 원문과 독음이 그 아래 놓인다.
 */
export interface QuoteLesson extends DailyLesson {
  /** 한자 원문 (예: "一言九鼎") */
  quote: string;
  /** 독음 (예: "일언구정") */
  reading: string;
  /** 우리말 뜻 — 지면에서 가장 크게 노출되는 줄 */
  meaning: string;
}

export interface QuoteData {
  lessons: QuoteLesson[];
}

/** 하루 한자 공부에서 다루는 낱글자 하나. 지면의 "( 새로울-신 ) 新"에 해당한다. */
export interface HanjaCharacter {
  /** 한자 (예: "新") */
  hanja: string;
  /** 훈 — 새김 (예: "새로울") */
  meaning: string;
  /** 음 (예: "신") */
  sound: string;
}

/**
 * 하루 한자 공부 — 표제는 낱글자.
 * 하루에 두 자를 함께 다루는 날(小·少)이 있어 배열로 담는다.
 * 지면 우측의 갑골문·금문 글꼴 그림은 데이터에 담지 않는다.
 */
export interface HanjaLesson extends DailyLesson {
  characters: HanjaCharacter[];
}

export interface HanjaData {
  lessons: HanjaLesson[];
}

/**
 * 하루 심리 공부 — 표제는 글 제목. 교양과 모양이 같지만 책이 달라 타입을 나눠 둔다.
 * 지면 하단의 상호 참조 주석("5월 12일 자기지각 참고")은 데이터에 담지 않는다.
 */
export interface PsychologyLesson extends DailyLesson {
  /** 글 제목 (예: "성격 5요인 이론: 외향성") */
  title: string;
}

export interface PsychologyData {
  lessons: PsychologyLesson[];
}

/** 하루 쓰기 공부 — 글 제목 아래 인용문(에피그래프)이 놓이고, 지면 하단에 주석이 붙는 날이 있다. */
export interface WritingLesson extends DailyLesson {
  /** 글 제목 (예: "끝이 새로운 시작이 되게 하라") */
  title: string;
  /** 본문 위에 놓이는 인용문 */
  epigraph: string;
  /** 인용문을 말한 사람 (예: "T. S. 엘리엇") */
  epigraphBy: string;
  /**
   * 지면 하단 주석. 본문의 `(*)` 마커와 순서대로 짝을 이루며, 마커를 포함해 담는다.
   * 주석이 없는 날은 생략한다.
   */
  notes?: string[];
}

export interface WritingData {
  lessons: WritingLesson[];
}
