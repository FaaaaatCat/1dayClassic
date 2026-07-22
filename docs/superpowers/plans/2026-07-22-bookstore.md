# 하루 서점 메뉴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메뉴에 "하루 서점" 항목을 추가하고, 유유 출판사의 "하루 시리즈" 책 9권을 보여주는 정적 카탈로그 화면을 만든다.

**Architecture:** 새 라우트 `app/(tabs)/bookstore.tsx` 하나, 정적 데이터 모듈 `lib/bookstore.ts` 하나, 로컬 이미지 자산 10개. 기존 `AppHeader`/`Tabs` 라우팅 패턴을 그대로 재사용하고, 새 상태나 컨텍스트는 도입하지 않는다.

**Tech Stack:** Expo SDK 57, expo-router, expo-linear-gradient, expo-symbols, react-native `StyleSheet`.

## Global Constraints

- 이 프로젝트에는 테스트 러너(jest 등)가 설정되어 있지 않다. 각 태스크의 "테스트" 단계는
  `npx tsc --noEmit` (타입 안전성 확인)과, 마지막 태스크에서 Claude Browser 프리뷰의
  DOM/computed-style 검사(이 세션에서 실제로 동작이 검증된 방식 — 스크롤/리사이즈 이벤트
  시뮬레이션은 이 환경에서 신뢰할 수 없으므로 사용하지 않는다)로 대체한다.
- `constants/theme.ts`의 `Colors`/`Fonts`에 지정된 값만 사용한다. 새 색이 필요하면 먼저
  사용자에게 확인한다 (지금 스펙 범위 안에서는 전부 커버된다).
- AGENTS.md: Expo SDK 57 — API 관련 의문이 생기면 `https://docs.expo.dev/versions/v57.0.0/`
  기준으로 확인한다.
- 피그마 asset URL은 발급 후 약 7일간만 유효하다 — Task 1에서 즉시 다운로드하며, 나중으로
  미루지 않는다.
- 스펙 문서: `docs/superpowers/specs/2026-07-22-bookstore-design.md` — 모든 태스크는 이
  스펙과 일치해야 한다.

---

### Task 1: 이미지 자산 다운로드

**Files:**
- Create: `assets/images/bookstore/cover-classic.jpg`
- Create: `assets/images/bookstore/cover-latin.jpg`
- Create: `assets/images/bookstore/cover-quote.jpg`
- Create: `assets/images/bookstore/cover-hanja.jpg`
- Create: `assets/images/bookstore/cover-liberal.jpg`
- Create: `assets/images/bookstore/cover-psychology.jpg`
- Create: `assets/images/bookstore/cover-writing.jpg`
- Create: `assets/images/bookstore/cover-hanmun.jpg`
- Create: `assets/images/bookstore/cover-english.jpg`
- Create: `assets/images/bookstore/ellipse-decoration.png`

**Interfaces:**
- Consumes: 없음
- Produces: `assets/images/bookstore/cover-*.jpg` 9개 + `ellipse-decoration.png` 1개 —
  Task 2에서 `require('@/assets/images/bookstore/<name>')`로 참조한다.

- [ ] **Step 1: 디렉터리 생성**

Run: `mkdir -p assets/images/bookstore`

- [ ] **Step 2: 책표지 9장 다운로드 (교보문고 실제 표지, 사용자 제공 URL)**

Run (git bash / Bash tool):
```bash
cd "D:\github\personal\1dayClassic"
curl -sSL -o assets/images/bookstore/cover-classic.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167700223.jpg"
curl -sSL -o assets/images/bookstore/cover-latin.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167701121.jpg"
curl -sSL -o assets/images/bookstore/cover-quote.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791189683306.jpg"
curl -sSL -o assets/images/bookstore/cover-hanja.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791185152158.jpg"
curl -sSL -o assets/images/bookstore/cover-liberal.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167700506.jpg"
curl -sSL -o assets/images/bookstore/cover-psychology.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167700797.jpg"
curl -sSL -o assets/images/bookstore/cover-writing.jpg "https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/9791189683764.jpg"
curl -sSL -o assets/images/bookstore/cover-hanmun.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167700537.jpg"
curl -sSL -o assets/images/bookstore/cover-english.jpg "https://contents.kyobobook.co.kr/sih/fit-in/225x325/pdt/9791167700216.jpg"
```

Note: `cover-writing.jpg`만 소스 URL이 `458x0`(다른 종횡비)이다 — 사용자가 제공한 그대로 쓴다.
Task 3의 `resizeMode="cover"`가 어차피 종횡비를 셀 크기에 맞춰 크롭하므로 레이아웃에는
영향이 없다.

- [ ] **Step 3: 장식용 타원 이미지 1장 다운로드 (피그마)**

```bash
curl -sSL -o assets/images/bookstore/ellipse-decoration.png "https://www.figma.com/api/mcp/asset/08b5a07d-27a7-4ace-894d-546fa32914f3"
```

이 URL이 HTML 에러 페이지를 반환하면(2026-07-22 기준 약 7일 후 만료), Figma MCP
`get_design_context` 도구를 파일 `i3NY8GgoNa9LQcxuHNEyvm`, 노드 `2076:463`으로 다시 호출해
새 URL을 받아 재다운로드한다.

- [ ] **Step 4: 파일 검증**

Run: `ls -la assets/images/bookstore/`
Expected: 파일 10개(`cover-*.jpg` 9개 + `ellipse-decoration.png` 1개) 모두 존재하고 각각
크기가 0바이트보다 커야 한다. 0바이트거나 HTML 내용이 담겨 있으면 해당 URL을 다시 확인한다
(`file assets/images/bookstore/cover-classic.jpg`로 실제 JPEG인지 확인 가능).

- [ ] **Step 5: Commit**

```bash
git add assets/images/bookstore/
git commit -m "하루 서점 이미지 자산 추가"
```

---

### Task 2: 데이터 모듈 (`lib/bookstore.ts`)

**Files:**
- Create: `lib/bookstore.ts`

**Interfaces:**
- Consumes: `assets/images/bookstore/cover-*.jpg` (Task 1의 산출물)
- Produces: `export interface BookstoreBook { id: string; title: string; author: string; coverImage: ImageSourcePropType; isCurrent?: boolean }`
  및 `export const BOOKSTORE_BOOKS: BookstoreBook[]` (9개 항목, 순서대로 하루 클래식 공부
  [isCurrent: true] → 라틴어 → 명언 → 한자 → 교양 → 심리 → 쓰기 → 한문 → 영어교양) —
  Task 3에서 `import { BOOKSTORE_BOOKS } from '@/lib/bookstore'`로 사용한다.

- [ ] **Step 1: 파일 작성**

```ts
import type { ImageSourcePropType } from 'react-native';

export interface BookstoreBook {
  id: string;
  title: string;
  author: string;
  coverImage: ImageSourcePropType;
  /** 현재 이 앱이 대응하는 책이면 true — 피처드 섹션에 노출된다 */
  isCurrent?: boolean;
}

/** 유유 출판사 "하루 시리즈" 카탈로그 — 하루 서점 화면 전용 정적 데이터. */
export const BOOKSTORE_BOOKS: BookstoreBook[] = [
  {
    id: 'classic',
    title: '하루 클래식 공부',
    author: '글릿 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-classic.jpg'),
    isCurrent: true,
  },
  {
    id: 'latin',
    title: '하루 라틴어 공부',
    author: '김태권 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-latin.jpg'),
  },
  {
    id: 'quote',
    title: '하루 명언 공부',
    author: '김영수 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-quote.jpg'),
  },
  {
    id: 'hanja',
    title: '하루 한자 공부',
    author: '이인호 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanja.jpg'),
  },
  {
    id: 'liberal',
    title: '하루 교양 공부',
    author: '전성원 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-liberal.jpg'),
  },
  {
    id: 'psychology',
    title: '하루 심리 공부',
    author: '신고은 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-psychology.jpg'),
  },
  {
    id: 'writing',
    title: '하루 쓰기 공부',
    author: '브라이언 로빈슨 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-writing.jpg'),
  },
  {
    id: 'hanmun',
    title: '하루 한문 공부',
    author: '임자헌 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-hanmun.jpg'),
  },
  {
    id: 'english',
    title: '하루 영어 교양',
    author: '서미석 [유유]',
    coverImage: require('@/assets/images/bookstore/cover-english.jpg'),
  },
];
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (`lib/bookstore.ts` 관련 에러가 없어야 한다 — 다른 미완성 파일이 아직
없으므로 전체 프로젝트가 깨끗해야 한다).

- [ ] **Step 3: Commit**

```bash
git add lib/bookstore.ts
git commit -m "하루 서점 데이터 모듈 추가"
```

---

### Task 3: 화면 컴포넌트 (`app/(tabs)/bookstore.tsx`)

**Files:**
- Create: `app/(tabs)/bookstore.tsx`

**Interfaces:**
- Consumes: `BOOKSTORE_BOOKS`, `BookstoreBook` from `@/lib/bookstore` (Task 2); `Colors`, `Fonts`
  from `@/constants/theme`
- Produces: `export default function BookstoreScreen()` — Task 4에서
  `app/(tabs)/_layout.tsx`가 `name="bookstore"` 라우트로 이 파일을 등록한다 (expo-router는
  파일 경로 기반 라우팅이라 별도 import는 필요 없다).

- [ ] **Step 1: 파일 작성**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

const ellipseDecoration = require('@/assets/images/bookstore/ellipse-decoration.png');

/** 하루 서점 — 유유 출판사 "하루 시리즈" 카탈로그. 순수 디스플레이용, 탭 동작 없음. */
export default function BookstoreScreen() {
  const currentBook = BOOKSTORE_BOOKS.find((book) => book.isCurrent);
  const otherBooks = BOOKSTORE_BOOKS.filter((book) => !book.isCurrent);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {currentBook && (
        <View style={styles.featured}>
          <Image source={ellipseDecoration} style={styles.featuredEllipse} resizeMode="cover" />
          <Image source={currentBook.coverImage} style={styles.featuredCover} resizeMode="cover" />
          <View style={styles.featuredInfo}>
            <LinearGradient
              colors={[Colors.blue100, Colors.blue50]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featuredBadge}>
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                tintColor={Colors.white}
                size={14}
              />
              <Text style={styles.featuredBadgeText}>현재 선택중</Text>
            </LinearGradient>
            <Text style={styles.featuredTitle}>{currentBook.title}</Text>
            <Text style={styles.featuredAuthor}>{currentBook.author}</Text>
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {otherBooks.map((book) => (
          <View key={book.id} style={styles.gridCell}>
            <Image source={book.coverImage} style={styles.gridCover} resizeMode="cover" />
            <Text style={styles.gridTitle}>{book.title}</Text>
            <Text style={styles.gridAuthor}>{book.author}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingBottom: 40,
  },
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.beige10,
    overflow: 'hidden',
  },
  featuredEllipse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 160,
    opacity: 0.5,
  },
  featuredCover: {
    width: 68,
    height: 100,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  featuredInfo: {
    flex: 1,
    gap: 8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    height: 24,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.white,
  },
  featuredTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    color: Colors.brown100,
  },
  featuredAuthor: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.brown100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '50%',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  gridCover: {
    width: 108,
    height: 160,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gridTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.brown100,
    textAlign: 'center',
  },
  gridAuthor: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.brown50,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/bookstore.tsx"
git commit -m "하루 서점 화면 컴포넌트 추가"
```

---

### Task 4: 라우팅/메뉴 연결 + 최종 검증

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/menu.tsx`

**Interfaces:**
- Consumes: `app/(tabs)/bookstore.tsx` (Task 3의 `BookstoreScreen`, 파일 경로 기반이라
  import 없이 expo-router가 자동 연결)
- Produces: 메뉴 → `/bookstore` 진입 가능한 완결된 사용자 플로우 (이후 태스크 없음)

- [ ] **Step 1: `app/(tabs)/_layout.tsx`에 라우트 등록**

`app/(tabs)/_layout.tsx:22` (`<Tabs.Screen name="library" .../>` 다음 줄)에 추가:

```tsx
      <Tabs.Screen name="library" options={{ title: '보관함' }} />
      <Tabs.Screen name="bookstore" options={{ title: '하루 서점' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
```

같은 파일의 `TITLES` 맵(파일 하단)에 추가:

```tsx
const TITLES: Record<string, string> = {
  index: '홈',
  today: '오늘의 클래식',
  library: '보관함',
  bookstore: '하루 서점',
  settings: '설정',
};
```

- [ ] **Step 2: `app/menu.tsx`의 `MENU_ITEMS`에 항목 추가**

`app/menu.tsx:10-14`의 배열을 다음으로 교체:

```tsx
const MENU_ITEMS = [
  { title: '홈', caption: '매일 한 곡, 연간 캘린더', href: '/' },
  { title: '보관함', caption: '좋아요를 누른 곡들', href: '/library' },
  { title: '하루 서점', caption: '유유 하루 시리즈 모아보기', href: '/bookstore' },
  { title: '설정', caption: '앱 소개와 정보', href: '/settings' },
] as const;
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 브라우저 프리뷰로 시각 검증**

1. `preview_start`로 `expo-web` 서버를 켜고 (이미 떠 있으면 재사용), 새 탭을 열어
   `http://localhost:8085/menu`로 이동한다.
2. `get_page_text`로 메뉴에 "하루 서점" 항목이 "보관함"과 "설정" 사이에 보이는지 확인한다.
3. 해당 항목을 클릭(또는 `navigate`로 `http://localhost:8085/bookstore`로 직접 이동)해
   `/bookstore` 화면으로 진입한다.
4. `get_page_text`로 다음이 모두 보이는지 확인한다: "현재 선택중", "하루 클래식 공부",
   "글릿 [유유]", 그리고 나머지 8권의 제목("하루 라틴어 공부" ~ "하루 영어 교양") 전부.
5. `javascript_tool`로 그리드 셀 하나(예: "하루 라틴어 공부"가 속한 셀)의
   `getBoundingClientRect().width`를 확인해 뷰포트 폭의 약 50%인지 확인한다 (2열 그리드
   검증). 아래와 같은 스크립트를 사용한다 (이 세션에서 이미 검증된 텍스트 노드 탐색 방식):

```js
(function() {
  function findLeafByText(root, text) {
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.children.length === 0 && el.textContent.trim() === text) return el;
    }
    return null;
  }
  const el = findLeafByText(document.body, '하루 라틴어 공부');
  if (!el) return JSON.stringify({ found: false });
  let cell = el.parentElement;
  const cellWidth = cell.getBoundingClientRect().width;
  const viewportWidth = window.innerWidth;
  return JSON.stringify({ found: true, cellWidth, viewportWidth, ratio: cellWidth / viewportWidth });
})();
```

   Expected: `ratio`가 약 0.5 (2열 그리드 확인). `found`가 true (텍스트가 실제로 렌더링됨).
6. 이미지가 깨지지 않고 로드됐는지 `read_network_requests`로 `bookstore` 관련 이미지 요청이
   200으로 응답했는지 확인한다.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx" app/menu.tsx
git commit -m "하루 서점 메뉴/라우트 연결"
```

---

## Self-Review Notes

- **스펙 커버리지:** 메뉴 연결(Task 4) · 피처드 섹션(Task 3) · 그리드 섹션(Task 3) ·
  데이터/자산(Task 1, 2) · 디자인 토큰 매핑(Task 3에서 `Colors`/`Fonts`만 사용) · 비범위
  항목(탭 핸들러 없음 — Task 3에 `Pressable`/`onPress` 전혀 없음) 모두 스펙과 1:1 대응된다.
- **그리드 구현 방식의 의도적 단순화:** 스펙은 "1px 헤어라인 구분선"을 언급하지만, 피그마의
  `gap-px` 기법(컨테이너를 헤어라인 색으로 채우고 셀 사이 1px 틈을 주는 방식) 대신 각 셀에
  `StyleSheet.hairlineWidth` 테두리를 직접 주는 방식을 택했다. 시각적으로 동일한 격자선
  효과를 내면서 별도 wrapper 없이 `flexWrap`만으로 구현 가능해 더 단순하다.
