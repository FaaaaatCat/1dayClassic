/**
 * 읽을 수 있는 책 9권의 식별자 — 하루 서점 카탈로그와 책별 데이터 모듈을 잇는 키.
 * 라우트 파라미터(/book/[id])로도 그대로 쓰인다.
 */
export type BookId =
  | 'classic'
  | 'latin'
  | 'quote'
  | 'hanja'
  | 'psychology'
  | 'writing'
  | 'hanmun'
  | 'english'
  | 'listening';

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
 * 항목마다 붙는 4지선다 한 문제.
 *
 * 콘텐츠를 개발자가 아닌 사람이 직접 적으므로 `answer`는 0이 아니라 1부터 센다 —
 * 화면에 보이는 "2번"과 데이터에 적는 2가 같아야 한다. 0부터의 색인 변환은 코드가 한다.
 */
export interface Quiz {
  /** 예: "오늘의 퀴즈" */
  title: string;
  question: string;
  /** 보기 4개. 개수는 lib/quiz.ts가 개발 중에 검사한다. */
  choices: string[];
  /** 정답 번호 — 1부터 4까지 */
  answer: 1 | 2 | 3 | 4;
  /** 보기를 고르면 바로 열리는 해설 */
  explanation: string;
}

/**
 * '하루 시리즈' 책들이 공유하는 하루치 항목의 공통부.
 *
 * 표제부(곡 제목, 라틴어 원문, 한문 구절, 한자 …)는 책마다 다르므로 여기 두지 않는다.
 * 책별 타입이 이 인터페이스를 확장해서 자기 표제 필드를 더한다 — 클래식(Track)도 마찬가지다.
 */
/**
 * Unsplash에서 가져온 사진과, 그 사진을 쓰기 위해 함께 보여 줘야 하는 것들.
 *
 * Unsplash API 가이드라인은 사진을 보여줄 때 사진가 이름과 프로필 링크, 그리고 Unsplash
 * 링크를 함께 보이라고 정한다. 그래서 주소만 저장하면 안 되고 이 셋을 한 덩이로 들고 다닌다
 * — 주소만 남고 이름이 사라지면 그 사진은 쓸 수 없는 사진이 된다.
 */
/**
 * 미술관이 공개 저작물(CC0)로 내놓은 옛 판화 한 점.
 * 누구의 무엇인지를 함께 적어 둔다 — 크레딧이 의무는 아니지만 출처를 잃으면 되찾을 수 없다.
 */
export interface Illustration {
  /** 미술관 서버의 그림 주소. */
  url: string;
  /** 그림의 가로·세로(px). 받아 오기 전에 자리를 잡아 두는 데 쓴다. */
  width: number;
  height: number;
  title: string;
  artist?: string;
  date?: string;
  /** 미술관의 작품 페이지. */
  source: string;
}

export interface UnsplashPhoto {
  /** images.unsplash.com 주소. 가이드라인이 다시 올리는 것을 금하므로 이 주소를 그대로 쓴다. */
  url: string;
  /** 사진가 이름 — 화면에 적는다. */
  photographer: string;
  /** 사진가의 Unsplash 프로필 — 이름을 누르면 여기로 간다. utm은 붙여서 저장한다. */
  profile: string;
}

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
  /** 커버 이미지 — Storage 경로("latin/foo.jpg") 또는 완성된 http(s) URL */
  coverImage: string;
  /**
   * Unsplash에서 가져온 사진. coverImage도 책의 표식도 없을 때만 쓴다(lib/cover의
   * 우선순위 참고). 사진가 이름과 프로필을 함께 들고 다니는 건 화면에 크레딧을 적어야
   * 하기 때문이다 — 주소만 남으면 쓸 수 없는 사진이 된다.
   */
  unsplash?: UnsplashPhoto;
  /**
   * 구절만 따로 세운 장(원문과 한글을 빈 줄로 가른 문단)에 얹는 삽화 — 그런 장이 나오는
   * 순서대로 하나씩 쓴다. scripts/fetch-illustrations가 골라 적는다.
   */
  illustrations?: Illustration[];
  /**
   * 이 항목의 사진을 찾을 때 쓸 검색어(영어). 적어 두면 책의 낱말 묶음보다 앞선다 —
   * 사람이 정한 것이 자동으로 고른 것을 이긴다(lib/unsplash-query 참고).
   */
  imageKeyword?: string;
  /** 오늘의 퀴즈. 없는 날은 생략하며, 그러면 화면에 퀴즈 영역이 나오지 않는다. */
  quiz?: Quiz;
  /**
   * 한 항목이 여러 문제를 드는 책은 이쪽을 쓴다(듣기의 말들은 세 문제다).
   * 상세 화면의 퀴즈 칸은 한 문제만 보여 주므로 첫 문제를 꺼낸다 — lib/quiz.ts 참고.
   */
  quizzes?: Quiz[];
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
  /** '노래 듣기' 버튼이 여는 유튜브 주소. 없으면 버튼이 나오지 않는다. */
  youtubeUrl?: string;
  /**
   * 그 곡의 유튜브 영상 ID — 앱 안 재생기가 이것으로 영상을 띄운다.
   *
   * youtubeUrl(네이버 단축 링크)과 따로 두는 건 IFrame 재생기가 단축 링크를 받지
   * 못해서다. 단축 링크를 따라가 얻은 값을 데이터에 적어 둔다.
   */
  youtubeId?: string;
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

/** 듣기의 말들 — 쓰기와 같은 문장 시리즈라 지면 구성이 같다(제목 + 인용문 + 본문). */
export interface ListeningLesson extends DailyLesson {
  /** 글 제목 (예: "내가 잘 듣는 사람이 아니라는 것") */
  title: string;
  /** 본문 위에 놓이는 인용문 */
  epigraph: string;
  /** 인용문의 출처 */
  epigraphBy: string;
}

export interface ListeningData {
  lessons: ListeningLesson[];
}

/**
 * 출판사 마크 — 표지 하단에 놓이는 작은 글리프.
 *
 * 그림 파일이 아니라 코드로 그리는 단순 도형이다. 표지가 열 권이든 백 권이든 에셋이
 * 늘지 않고, 잉크색 하나만 받아 그리므로 어느 표지에 놓아도 색이 어긋나지 않는다.
 */
export type CoverMark =
  /** 밑줄사이 — 두 줄 사이. */
  | 'underline'
  /** 낮은문장 — 점 하나와 그 밑의 바닥선. */
  | 'lowline'
  /** 첫자리 — 사분면 중 첫 칸만 채운 네모. */
  | 'quadrant'
  /** 한밤서가 — 반달. */
  | 'halfmoon';

/**
 * 표지를 코드로 그리기 위한 값 한 벌.
 *
 * 표지를 사진으로 채우면 책이 아니라 콘텐츠 카드로 읽힌다. 그래서 그림을 가져오는 대신
 * 여기 적힌 값으로 그린다 — 이건 데모용 임시방편이 아니라 실서비스의 자산이다. 출판사가
 * 표지를 안 주거나 해상도가 낮을 때의 폴백이고, 코스 상품에는 애초에 실제 표지가 없다.
 *
 * 색이 둘(paper·ink)뿐인 것이 규칙이다. 잉크색 하나를 투명도만 달리해 제목·패턴·저자·마크가
 * 나눠 쓴다 — 색이 셋이 되는 순간 표지가 아니라 포스터가 된다.
 */
/**
 * 표지의 짜임 — 무엇을 어디에 놓는지.
 *
 * 색과 마크만 바꾸면 한 판에서 찍어 낸 티가 난다. 실제로 열 권을 나란히 놓고 보니
 * 다 같은 책으로 보였다. 그래서 배치 자체를 여섯으로 나눈다.
 *
 * - band     패턴 띠가 위아래에 눕고 그 사이에 제목이 앉는다.
 * - plaque   패턴이 표지를 가득 덮고, 그 위에 제목이 든 라벨 한 장이 놓인다.
 * - rule     굵은 괘선 두 줄 사이에 제목. 패턴은 아래 한 줄만 흐른다.
 * - vertical 제목을 오른쪽에 세로로 쓰고 패턴이 왼쪽에 기둥으로 선다.
 * - block    위쪽을 잉크로 덮고 제목을 종이색으로 뒤집어 얹는다.
 * - margin   여백이 주인공. 제목은 작게 아래에, 패턴은 위에 한 줄.
 */
export type CoverLayout = 'band' | 'plaque' | 'rule' | 'vertical' | 'block' | 'margin';

export interface CoverDesign {
  /** 종이색. 노랑이 살짝 섞인 미색이다 — 순백은 화면으로 읽히고 미색은 종이로 읽힌다. */
  paper: string;
  /** 잉크색 하나. 제목·패턴·저자·마크가 이 색을 투명도만 달리해 함께 쓴다. */
  ink: string;
  /** 표지에 인쇄되는 제목 — 화면의 책 제목과 다를 수 있다(줄바꿈·부제 분리). */
  title: string;
  subtitle?: string;
  author: string;
  /** 출판사명 — 마크 옆에 적힌다. */
  imprint: string;
  mark: CoverMark;
  /**
   * 표지에 깔리는 반복 텍스트 — 지어낸 무늬가 아니라 그 책의 목차에서 뽑는다.
   * 이게 표지에 밀도를 준다(사진 없이도 허전하지 않은 이유). 나중에 실제 목차 데이터로
   * 갈아끼울 수 있도록 문자열 배열로 받는다.
   */
  pattern: string[];
  /**
   * 패턴을 무엇으로 그릴지. 기본은 글자다.
   *
   * 'staff'는 오선을 긋는다 — 음악책에 'BWV 846'이나 'Op. 27' 같은 작품 번호를 깔면
   * 무늬가 아니라 주석처럼 읽힌다. 악보는 그 책이 무엇에 관한 것인지를 글자 없이 말한다.
   * 이때 pattern 배열은 쓰이지 않지만, 출처를 잃지 않도록 데이터에는 남겨 둔다.
   */
  patternKind?: 'text' | 'staff';
  /**
   * 제목이 앉는 자리. 권마다 달리한다 — 여덟 권이 다 같은 자리에 같은 크기면 템플릿 티가 난다.
   * 패턴 띠는 이 값의 반대편에 놓여, 제목 위로 글자가 지나가는 일이 구조적으로 없다.
   */
  align: 'top' | 'center' | 'bottom';
  /** 표지의 짜임. band 계열만 align을 쓰고 나머지는 제 자리를 스스로 정한다. */
  layout: CoverLayout;
  /**
   * 어두운 표지. 검은 홈 화면 위에서 경계가 사라지므로 테두리를 한 겹 세우고,
   * 그 위에 얹히는 글자를 밝은 쪽으로 뒤집는다.
   */
  dark?: boolean;
}
