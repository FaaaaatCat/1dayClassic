import type { BookId, CoverDesign } from '@/types';

/**
 * 권마다 하나씩 있는 표지 값 — 표지를 그리는 데 필요한 전부.
 *
 * 표지 색은 여기서만 산다. 앱의 지정 팔레트(global.css·constants/theme)에는 넣지 않는다 —
 * 표지는 화면 UI가 아니라 인쇄물이고, 종이색과 잉크색은 권마다 달라야 하는 값이라
 * '토큰'이 되는 순간 스무 개가 팔레트에 얹힌다. UI에 쓰이는 색은 여전히 팔레트가 정한다.
 *
 * 값을 고를 때 지킨 것(부록 B):
 * - 종이색은 노랑이 살짝 섞인 미색. 순백도 찬 회색도 쓰지 않는다.
 * - 잉크색은 권마다 하나. 제목·패턴·저자·마크가 투명도만 달리해 나눠 쓴다.
 * - 정렬은 권마다 달리한다. 여덟 권이 같은 자리에 같은 크기면 템플릿 티가 난다.
 *
 * 표지의 title은 화면의 책 이름과 다를 수 있다. 논어 표지에는 論語가, 천자문에는 千字文이,
 * 라틴어에는 Latin이 찍힌다 — 원전이 쓰던 글자다. 목록과 알람은 lib/bookstore의 우리말
 * 이름을 쓰므로 검색이나 읽기에는 영향이 없다.
 *
 * 패턴은 지어낸 무늬가 아니라 그 책의 목차에서 뽑은 것이다. 지금은 씨앗값이고,
 * 실제 목차 데이터가 생기면 그것으로 갈아끼운다.
 */
const COVER_DESIGNS: Record<BookId, CoverDesign> = {
  quote: {
    paper: '#B23820',
    ink: '#F7EFE0',
    title: '명심보감',
    subtitle: '거울 스무 이야기',
    author: '밑줄사이 편집부',
    imprint: '밑줄사이',
    mark: 'underline',
    align: 'center',
    layout: 'plaque',
    // 편명 격자.
    pattern: ['繼善', '天命', '順命', '孝行', '正己', '安分', '存心', '戒性', '勤學', '訓子'],
  },
  hanja: {
    paper: '#E8B84B',
    ink: '#2A2113',
    title: '千字文',
    subtitle: '네 글자씩 읽는 첫 열 구',
    author: '밑줄사이 편집부',
    imprint: '밑줄사이',
    mark: 'underline',
    align: 'top',
    layout: 'vertical',
    // 목차의 첫 구절들을 깐다. '日月盈昃'만 뺐다 — 昃(U+6603)이 을유1945에 없어
    // 표지에서 두부(□)로 뜬다. 패턴은 목차의 일부만 쓰므로 아홉으로도 채워진다.
    pattern: [
      '天地玄黃',
      '宇宙洪荒',
      '辰宿列張',
      '寒來暑往',
      '秋收冬藏',
      '閏餘成歲',
      '律呂調陽',
      '雲騰致雨',
      '露結爲霜',
    ],
  },
  hanmun: {
    paper: '#2E6B4F',
    ink: '#F2EFE4',
    title: '論語',
    subtitle: '두 장씩 읽는 여섯 편',
    author: '낮은문장 편집부',
    imprint: '낮은문장',
    mark: 'lowline',
    align: 'center',
    layout: 'rule',
    // 이 열 화가 지나가는 편들.
    pattern: ['學而', '爲政', '里仁', '述而', '子罕', '衛靈公'],
  },
  listening: {
    paper: '#211F1B',
    ink: '#E6DEC9',
    dark: true,
    title: '菜根譚',
    subtitle: '나물 뿌리 열 이야기',
    author: '낮은문장 편집부',
    imprint: '낮은문장',
    mark: 'lowline',
    align: 'bottom',
    layout: 'block',
    // 목차 열 화의 조 번호.
    pattern: [
      '前 001',
      '前 002',
      '前 003',
      '前 005',
      '前 006',
      '前 011',
      '前 012',
      '前 016',
      '前 024',
      '前 026',
    ],
  },
  psychology: {
    paper: '#231A2E',
    ink: '#E4D9EF',
    dark: true,
    title: '명상록',
    subtitle: '고른 열 단상',
    author: '첫자리 편집부',
    imprint: '첫자리',
    mark: 'quadrant',
    align: 'top',
    layout: 'band',
    /*
     * 목차 열 화의 권·절 번호.
     *
     * 로마 숫자를 유니코드 전용 글자(Ⅱ, Ⅲ …)로 두지 않고 로마자로 적는다. 번들된
     * 서체(을유1945·Pretendard)에 그 글자들이 없으면 두부(□)로 나오는데, 표지는
     * 글꼴을 고를 수 없는 자리라 안전한 쪽을 쓴다. 읽히는 모양은 똑같다.
     */
    pattern: [
      'II·1',
      'III·4',
      'IV·3',
      'V·1',
      'VI·6',
      'VII·59',
      'VIII·47',
      'IX·4',
      'X·16',
      'XI·18',
    ],
  },
  latin: {
    paper: '#2D5FB4',
    ink: '#F4F1E6',
    title: 'Latin',
    subtitle: '고전에서 온 스무 격언',
    author: '첫자리 편집부',
    imprint: '첫자리',
    mark: 'quadrant',
    align: 'center',
    layout: 'margin',
    // 목차 열 화의 첫 낱말.
    pattern: [
      'CARPE',
      'MEMENTO',
      'COGITO',
      'ALEA',
      'DUM',
      'FESTINA',
      'ERRARE',
      'AMOR',
      'FORTUNA',
      'DIVIDE',
    ],
  },
  english: {
    paper: '#E3E9ED',
    ink: '#1C3143',
    title: '영어 속담',
    subtitle: '스무 편의 속담',
    author: '한밤서가 편집부',
    imprint: '한밤서가',
    mark: 'halfmoon',
    align: 'top',
    layout: 'plaque',
    // 목차 열 화의 첫 낱말.
    pattern: [
      'ACTIONS',
      'JUDGE',
      'BETTER',
      'TWO',
      'COUNT',
      'ROME',
      'PICTURE',
      'NECESSITY',
      'EARLY',
      'CLOUD',
    ],
  },
  writing: {
    paper: '#F6F4EF',
    ink: '#17191B',
    title: '글쓰기',
    subtitle: '문장을 세우는 열 규칙',
    author: '한밤서가 편집부',
    imprint: '한밤서가',
    mark: 'halfmoon',
    align: 'center',
    layout: 'rule',
    // 목차 열 화의 규칙 번호.
    pattern: ['8.', '9.', '10.', '11.', '12.', '13.', '14.', '15.', '16.', '18.'],
  },
  classic: {
    paper: '#141A2B',
    ink: '#D9DEEC',
    dark: true,
    title: '클래식',
    subtitle: '시대순으로 듣는 열한 곡',
    author: '한밤서가 편집부',
    imprint: '한밤서가',
    mark: 'halfmoon',
    align: 'center',
    layout: 'block',
    patternKind: 'staff',
    // 목차 열한 곡의 작품 번호 — 번호가 없는 두 곡(Sognai·피치카토 폴카)은 뺀다.
    pattern: [
      'BWV 846',
      'K. 550',
      'Op. 27',
      'Op. 92',
      'D. 810',
      'Op. 9',
      'Op. 20',
      'CNW 42',
      'Op. 37',
    ],
  },
};

/** 그 책의 표지 값. 모든 책이 하나씩 갖는다 — 표지가 비는 책은 없다. */
export function getCoverDesign(bookId: BookId): CoverDesign {
  return COVER_DESIGNS[bookId];
}
