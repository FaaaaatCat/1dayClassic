# 하루 서점 — 신규 메뉴 디자인

날짜: 2026-07-22
상태: 사용자 승인 완료 (브레인스토밍 대화 기반)

## 목표

메뉴에 "하루 서점" 항목을 추가한다. 진입하면 출판사(유유)의 "하루 시리즈" 책 9권을
보여주는 정적 카탈로그 화면이 뜬다. 현재 앱은 그중 "하루 클래식 공부" 한 권에 해당하며,
이 책에는 "현재 선택중" 배지가 붙는다. 나머지 8권은 지금은 탭해도 아무 동작이 없는
순수 디스플레이용이다 (추후 외부 링크 연결 등은 범위 밖).

참고 피그마: `https://www.figma.com/design/i3NY8GgoNa9LQcxuHNEyvm/...?node-id=2076-463`
(node 2076:463, "하루서점")

## 범위

- 피그마에 있는 9권 그대로 구현한다 (사용자 승인: "피그마 그대로").
- 8권(현재 선택중 제외)은 탭해도 동작 없음 (사용자 승인: "아직 동작 없음").
- 책표지 이미지는 피그마 asset URL(7일 후 만료)을 다운로드해 로컬 자산으로 번들한다
  (사용자 승인: "다운로드해서 자산에 번들").

## 메뉴 연결

- `app/menu.tsx`의 `MENU_ITEMS`에 항목 추가, "보관함"과 "설정" 사이에 위치:
  ```ts
  { title: '하루 서점', caption: '유유 하루 시리즈 모아보기', href: '/bookstore' }
  ```
- 새 라우트 파일 `app/(tabs)/bookstore.tsx` 추가.
- `app/(tabs)/_layout.tsx`에 `<Tabs.Screen name="bookstore" options={{ title: '하루 서점' }} />`
  등록 (다른 신규 화면과 동일하게 `headerShown`은 기본값 true — 기존 `AppHeader` 재사용).
  `TITLES` 맵에도 `bookstore: '하루 서점'` 추가.
- 헤더는 피그마의 커스텀 헤더(NanumMyeongjo 17px + 햄버거)를 새로 만들지 않고,
  기존 `AppHeader` 컴포넌트(타이틀 + 햄버거 → `/menu`)를 그대로 재사용한다.
  프로젝트에 NanumMyeongjo 폰트가 번들되어 있지 않고, `library.tsx`/`settings.tsx`도
  이미 같은 방식으로 `AppHeader`를 공유하고 있어 일관성을 따른다.

## 화면 구성 (`app/(tabs)/bookstore.tsx`)

### 피처드 섹션 (현재 선택중 책)

- 배경 `Colors.beige10`, 장식용 타원 이미지(피그마 `imgEllipse8`)를 배경에 흐리게 배치.
- 왼쪽: 현재 책("하루 클래식 공부") 표지 이미지, 68×100, `shadow` 약하게.
- 오른쪽: "현재 선택중" 배지(blue100→blue50 그라디언트 pill, 체크 아이콘 + 흰 텍스트) +
  제목("하루 클래식 공부", Fonts.semiBold 20) + 저자("글릿 [유유]", Fonts.regular 14).
- 체크 아이콘은 피그마 원본 PNG 대신 `expo-symbols`의 `SymbolView`
  (`{ ios: 'checkmark', android: 'check', web: 'check' }`)를 사용 — 코드베이스의
  기존 아이콘 처리 관례(햄버거, X 버튼 등)를 따른다.

### 그리드 섹션 (나머지 8권)

- 2열 그리드, 셀 사이 `Colors.brown10` 1px 헤어라인 구분선.
- 각 셀: 표지 이미지 108×160 (약한 drop shadow), 아래 제목(Fonts.semiBold 16, 중앙정렬),
  저자(Fonts.regular 12, `Colors.brown50`, 중앙정렬). 셀 배경 `Colors.bg`.
- 탭 핸들러 없음 (순수 `View`, `Pressable`/`ScaleButton` 미사용).

### 데이터 (`lib/bookstore.ts`)

```ts
export interface BookstoreBook {
  id: string;
  title: string;
  author: string;
  coverImage: ReturnType<typeof require>;
  isCurrent?: boolean;
}

export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  { id: 'classic', title: '하루 클래식 공부', author: '글릿 [유유]', coverImage: ..., isCurrent: true },
  { id: 'latin', title: '하루 라틴어 공부', author: '김태권 [유유]', coverImage: ... },
  { id: 'quote', title: '하루 명언 공부', author: '김영수 [유유]', coverImage: ... },
  { id: 'hanja', title: '하루 한자 공부', author: '이인호 [유유]', coverImage: ... },
  { id: 'liberal', title: '하루 교양 공부', author: '전성원 [유유]', coverImage: ... },
  { id: 'psychology', title: '하루 심리 공부', author: '신고은 [유유]', coverImage: ... },
  { id: 'writing', title: '하루 쓰기 공부', author: '브라이언 로빈슨 [유유]', coverImage: ... },
  { id: 'hanmun', title: '하루 한문 공부', author: '임자헌 [유유]', coverImage: ... },
  { id: 'english', title: '하루 영어 교양', author: '서미석 [유유]', coverImage: ... },
];
```

`isCurrent: true`인 항목이 피처드 섹션에, 나머지가 그리드에 순서대로 렌더링된다.

### 자산

책표지 9장은 실제 표지 이미지를 쓰기 위해 교보문고 상품 이미지 CDN에서 다운로드해
`assets/images/bookstore/`에 저장한다 (사용자가 직접 URL 제공, 피그마 목업 이미지 대체).
장식용 타원 이미지만 피그마에서 그대로 가져온다.

| 파일명 | 출처 |
|---|---|
| `cover-classic.jpg` | 교보문고 `9791167700223` (하루 클래식 공부) |
| `cover-latin.jpg` | 교보문고 `9791167701121` (하루 라틴어 공부) |
| `cover-quote.jpg` | 교보문고 `9791189683306` (하루 명언 공부) |
| `cover-hanja.jpg` | 교보문고 `9791185152158` (하루 한자 공부) |
| `cover-liberal.jpg` | 교보문고 `9791167700506` (하루 교양 공부) |
| `cover-psychology.jpg` | 교보문고 `9791167700797` (하루 심리 공부) |
| `cover-writing.jpg` | 교보문고 `9791189683764` (하루 쓰기 공부) |
| `cover-hanmun.jpg` | 교보문고 `9791167700537` (하루 한문 공부) |
| `cover-english.jpg` | 교보문고 `9791167700216` (하루 영어 교양) |
| `ellipse-decoration.png` | 피그마 imgEllipse8 (2076:1087) |

## 디자인 토큰 매핑

피그마 색상은 이미 프로젝트 팔레트와 1:1로 대응된다 (`constants/theme.ts`의 `Colors`):

| 피그마 | 프로젝트 |
|---|---|
| BG `#FAF6EE` | `Colors.bg` |
| Beige/10 `#F2E8DA` | `Colors.beige10` |
| Brown/10 `#E0DBD5` | `Colors.brown10` |
| Brown/100 `#030303` | `Colors.brown100` |

폰트는 `Fonts.semiBold`/`Fonts.regular` (Eulyoo1945) 사용 — 헤더 제목의 NanumMyeongjo만
예외적으로 위에서 설명한 대로 기존 `AppHeader` 스타일을 그대로 따른다.

## 비범위 (Out of scope)

- 8권에 대한 외부 링크/딥링크 연결
- "현재 선택중" 배지가 아닌 책 탭 시 안내 토스트 등 피드백
- 책 구매/스토어 연동
