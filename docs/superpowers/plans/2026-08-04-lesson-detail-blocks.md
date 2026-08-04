# 항목 상세 화면 블록 컴포넌트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 항목 상세 화면을 9종 블록 컴포넌트로 분해하고, 책마다 블록 구성과 순서를 자유롭게 바꿀 수 있게 만든다. 클래식 한 권을 새 구조로 옮기고 4지선다 퀴즈를 추가한다.

**Architecture:** 3층 구조다. (1) 블록 컴포넌트는 순수 표시로 9권이 공용한다. (2) 동작은 Context로 내려간다. (3) 책마다 한 개의 JSX 조합 파일이 어떤 블록을 어떤 순서로 그릴지 정한다 — 화면 순서 = JSX 줄 순서. 클래식만 새 조합 파일을 갖고, 나머지 8권은 `DefaultDetail`이 현행 화면을 그대로 그려 회귀를 막는다.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, expo-symbols, expo-web-browser, react-native-reanimated 4, AsyncStorage, TypeScript 6

**설계 문서:** `docs/superpowers/specs/2026-08-04-lesson-detail-components-design.md` — 판단 근거가 필요하면 여기를 본다.

## Global Constraints

- **Expo 문서는 반드시 https://docs.expo.dev/versions/v57.0.0/ 를 본다.** 구버전 API를 쓰지 않는다 (`AGENTS.md`).
- **색은 `constants/theme.ts`의 `Colors`만 쓴다.** 팔레트에 없는 색이 필요하면 임의로 만들지 말고 보고한다.
- **자간은 `tracking(fontSize)` 함수를 쓴다.** 숫자만 표시하는 텍스트에는 적용하지 않는다.
- **서체는 `Fonts.regular` / `Fonts.semiBold`만 쓴다.** 인용문의 라틴 전용 `Fonts.serifDisplay`는 기존 사용처에서만 유지한다.
- **새 npm 의존성을 추가하지 않는다.** 필요해 보이면 작업을 멈추고 보고한다.
- **테스트 프레임워크가 없다.** 각 태스크의 검증은 `npx tsc --noEmit`이며, 통과해야 커밋한다.
- **기존 8권(클래식 외)의 화면은 픽셀 하나도 바뀌면 안 된다.**
- 커밋 메시지는 한국어로, 기존 커밋 스타일(`feat(lesson): …`)을 따른다.

## 왜 TDD 단계가 없는가

이 프로젝트에는 jest도 테스트 스크립트도 없고, 사용자가 **타입체크로만 검증**하기로 명시적으로 결정했다
(설계 문서 '검증' 절). 그래서 각 태스크는 "실패하는 테스트 작성" 대신 **`npx tsc --noEmit` 게이트**로
닫는다. 임의로 테스트 프레임워크를 설치하지 않는다.

타입체크가 잡지 못하는 UI 배치는 마지막에 사용자가 dev build에서 직접 확인한다.

## File Structure

**생성:**

| 파일 | 책임 |
|---|---|
| `lib/quiz.ts` | 퀴즈 데이터 읽기 + `__DEV__` 검증 |
| `context/QuizContext.tsx` | 퀴즈 푼 기록의 영속화 (AsyncStorage) |
| `components/lesson/LessonDetailContext.tsx` | 상세 화면 수명 상태 (현재 항목 + 화면 동작) |
| `components/lesson/LessonDetailShell.tsx` | 스크롤·닫기 버튼·오디오 팝업·safe area·Context 제공 |
| `components/lesson/blocks/blockStyles.ts` | 블록들이 공유하는 조판 |
| `components/lesson/blocks/IntroBlock.tsx` | 날짜 문구 + 액션 버튼 |
| `components/lesson/blocks/ImageBlock.tsx` | 히어로 이미지 |
| `components/lesson/blocks/TitleBlock.tsx` | 책 라벨 + 표제 (column/row 두 배치) |
| `components/lesson/blocks/QuoteBlock.tsx` | 인용문 + 출처 |
| `components/lesson/blocks/DescBlock.tsx` | 본문 문단들 |
| `components/lesson/blocks/ShopBlock.tsx` | 책 사러 가기 CTA |
| `components/lesson/blocks/QuizBlock.tsx` | 4지선다 퀴즈 |
| `components/lesson/blocks/NoteBlock.tsx` | 감상 노트 |
| `components/lesson/blocks/MoreFunctionsBlock.tsx` | 북마크 + 공유 |
| `components/lesson/books/ClassicDetail.tsx` | 클래식 조합 |
| `components/lesson/books/DefaultDetail.tsx` | 미이관 8권의 현행 조합 |
| `components/lesson/books/index.tsx` | `BookId` → 조합 컴포넌트 분배 |

**수정:**

| 파일 | 무엇을 |
|---|---|
| `types/index.ts` | `Quiz` 추가, `DailyLesson.quiz?`, `Track.youtubeUrl?` |
| `data/tracks.json` | `classic_1_polka`에 `quiz`·`youtubeUrl` 추가 |
| `app/_layout.tsx` | `QuizProvider` 마운트 |
| `app/(tabs)/today.tsx` | 화면 그리기를 Shell + 조합으로 넘기고 얇게 만든다 |

**이번에 건드리지 않는 것:**

- `components/lesson/LessonHeading.tsx` — 8권이 `DefaultDetail`을 통해 계속 쓴다. 클래식 분기를 지우면
  `switch`의 전수성이 깨지므로 **9권을 다 옮긴 뒤에** 정리한다.
- `components/lesson/headingStyles.ts` — 위와 같은 이유로 유지한다. `blockStyles.ts`는 새로 만들되
  기존 파일을 지우지 않는다.
- `components/lesson/AudioListenSheet.tsx` — 그대로 재사용한다.

## Figma 참조

styling(색·간격·글자 크기)이 필요하면 아래 노드에서 직접 읽는다. **`get_design_context` 호출 전에
`figma:figma-design-to-code` 스킬을 먼저 불러야 한다.**

fileKey: `i3NY8GgoNa9LQcxuHNEyvm`

| 대상 | nodeId |
|---|---|
| 클래식 상세화면 전체 | `2133:811` |
| intro | `2136:1019` |
| img | `2136:1001` |
| title (column) | `2136:984` |
| title (row) | `2136:1460` |
| quote | `2136:966` |
| desc | `2136:1376` |
| go to shop | `I2136:1376;0:5` |
| note | `2136:906` |
| more-functions | `2136:894` |

Figma는 변형을 `hidden="true"` 슬롯으로 표현한다. 숨겨진 슬롯 = 그 화면에 없는 요소다.

---

### Task 1: 퀴즈 타입·콘텐츠·검증

**Files:**
- Modify: `types/index.ts`
- Modify: `data/tracks.json`
- Create: `lib/quiz.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `Quiz` 타입, `DailyLesson.quiz?: Quiz`, `Track.youtubeUrl?: string`, `getLessonQuiz(lesson: DailyLesson): Quiz | undefined`

- [ ] **Step 1: `types/index.ts`에 `Quiz` 추가**

`DailyLesson` 인터페이스 **위**에 넣는다:

```ts
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
```

`DailyLesson`에 필드를 추가한다 (`featured` 바로 위):

```ts
  /** 오늘의 퀴즈. 없는 날은 생략하며, 그러면 화면에 퀴즈 영역이 나오지 않는다. */
  quiz?: Quiz;
```

`Track`에 필드를 추가한다 (`quoteBy` 아래):

```ts
  /** '노래 듣기' 버튼이 여는 유튜브 주소. 없으면 버튼이 나오지 않는다. */
  youtubeUrl?: string;
```

> **스펙과 다른 점(의도적):** 설계 문서는 `choices`를 4칸 튜플로 적었다. 그러나 `lib/classic.ts`가
> `tracksData as TracksData`로 **캐스팅**해 JSON을 읽으므로 튜플의 컴파일타임 이점이 실제로는 없고,
> 캐스팅 호환성 문제만 생긴다. `string[]` + 런타임 검증으로 간다.

- [ ] **Step 2: `lib/quiz.ts` 생성**

```ts
import type { DailyLesson, Quiz } from '@/types';

/**
 * 항목의 퀴즈를 꺼낸다. 없으면 undefined.
 *
 * data/*.json은 `as` 캐스팅으로 읽혀서 TypeScript가 내용을 실제로 검사하지 않는다 —
 * 보기를 3개만 적거나 해설을 빠뜨려도 조용히 통과한다. 콘텐츠를 개발자가 아닌 사람이
 * 적으므로, 틀렸을 때 알려 주지 않으면 형식을 정해 둔 의미가 없다. 그래서 개발 중에만
 * 한 번 확인하고 무엇이 잘못됐는지 알린다.
 */
export function getLessonQuiz(lesson: DailyLesson): Quiz | undefined {
  const quiz = lesson.quiz;
  if (!quiz) return undefined;
  if (__DEV__) warnIfMalformed(lesson.id, quiz);
  return quiz;
}

function warnIfMalformed(lessonId: string, quiz: Quiz): void {
  const problems: string[] = [];
  if (quiz.choices.length !== 4) {
    problems.push(`보기가 4개여야 하는데 ${quiz.choices.length}개입니다`);
  }
  if (quiz.choices.some((choice) => !choice.trim())) {
    problems.push('비어 있는 보기가 있습니다');
  }
  if (![1, 2, 3, 4].includes(quiz.answer)) {
    problems.push(`answer는 1~4여야 하는데 ${quiz.answer}입니다`);
  }
  if (!quiz.title.trim()) problems.push('title이 비어 있습니다');
  if (!quiz.question.trim()) problems.push('question이 비어 있습니다');
  if (!quiz.explanation.trim()) problems.push('explanation이 비어 있습니다');

  if (problems.length > 0) {
    console.warn(`[퀴즈] ${lessonId}의 퀴즈에 문제가 있습니다:\n- ${problems.join('\n- ')}`);
  }
}
```

- [ ] **Step 3: `data/tracks.json`의 `classic_1_polka`에 콘텐츠 추가**

`"story"` 배열 **뒤**, 같은 객체 안에 두 필드를 넣는다. 다른 항목은 건드리지 않는다.

```json
      "youtubeUrl": "https://www.youtube.com/results?search_query=%ED%94%BC%EC%B9%98%EC%B9%B4%ED%86%A0+%ED%8F%B4%EC%B9%B4+%EC%9A%94%ED%95%9C+%EC%8A%88%ED%8A%B8%EB%9D%BC%EC%9A%B0%EC%8A%A4",
      "quiz": {
        "title": "오늘의 퀴즈",
        "question": "'피치카토'는 어떤 연주법을 뜻할까요?",
        "choices": [
          "활로 현을 켠다",
          "손가락으로 현을 뜯는다",
          "활대로 현을 두드린다",
          "현을 손바닥으로 누른다"
        ],
        "answer": 2,
        "explanation": "피치카토(pizzicato)는 이탈리아어로 '꼬집다, 뜯다'라는 뜻입니다. 활을 내려놓고 손가락으로 현을 직접 뜯어 짧고 통통 튀는 소리를 내지요. 요한 슈트라우스 2세는 이 주법만으로 곡 전체를 채워 「피치카토 폴카」를 만들었습니다."
      }
```

> 유튜브 주소는 특정 영상 id 대신 **검색 결과 페이지**를 쓴다. 영상은 삭제되거나 지역 제한이 걸릴 수 있지만
> 검색 주소는 깨지지 않는다.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료 (출력 없음)

JSON 문법이 깨졌다면 여기서 잡힌다 — `data/tracks.json`을 import하고 있기 때문이다.

- [ ] **Step 5: 커밋**

```bash
git add types/index.ts data/tracks.json lib/quiz.ts
git commit -m "feat(quiz): 퀴즈 타입과 클래식 첫 문항 추가"
```

---

### Task 2: 퀴즈 푼 기록 저장

**Files:**
- Create: `context/QuizContext.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: Task 1의 `Quiz`
- Produces: `useQuiz()` → `{ attemptOf(lessonId: string): QuizAttempt | undefined; record(lessonId: string, attempt: QuizAttempt): void }`, `QuizAttempt`, `QuizProvider`

- [ ] **Step 1: 기존 패턴을 먼저 읽는다**

`context/NotesContext.tsx`를 **전부** 읽는다. 이 태스크는 그 구조를 그대로 따라간다 —
AsyncStorage 키 이름 규칙, 초기 로딩(hydration) 방식, Provider와 훅의 모양, 저장 시점을 똑같이 맞춘다.
새로운 저장 방식을 발명하지 않는다.

- [ ] **Step 2: `context/QuizContext.tsx` 생성**

`NotesContext`의 구조를 따르되, 담는 값은 아래와 같다. 항목 id 하나당 기록 하나다
(보기를 고르면 잠기므로 시도는 한 번뿐이다).

```ts
import type { BookId } from '@/types';

/** 퀴즈를 한 번 푼 기록. 항목 하나당 하나. */
export interface QuizAttempt {
  /** 책별 정답률 집계에 쓴다. 항목 id를 잘라 쓰지 않는 이유는 id 규칙이 바뀌면 깨지기 때문이다. */
  bookId: BookId;
  /** 고른 보기 번호 — 1부터 4까지 */
  choice: 1 | 2 | 3 | 4;
  correct: boolean;
  /** ISO 8601. 기간별 집계에 쓴다. 지나간 시각은 나중에 되살릴 수 없어 지금부터 남긴다. */
  at: string;
}
```

Context가 노출하는 것은 두 가지다:

```ts
attemptOf(lessonId: string): QuizAttempt | undefined
record(lessonId: string, attempt: QuizAttempt): void
```

`record`는 이미 기록이 있으면 덮어쓰지 않는다 — 보기는 한 번 고르면 잠기므로 두 번째 호출은
버그 신호다. 조용히 무시한다.

이 기록은 나중에 만들 통계 탭(책별 북마크 수·퀴즈 정답률)이 읽어 갈 재료다. 통계 화면은 이번 범위가 아니다.

- [ ] **Step 3: `app/_layout.tsx`에 Provider 마운트**

`NotesProvider`가 있는 자리를 찾아 그 **옆**에 `QuizProvider`를 같은 깊이로 넣는다.
중첩 순서는 서로 의존하지 않으므로 `NotesProvider` 안쪽이든 바깥쪽이든 무방하다.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료

- [ ] **Step 5: 커밋**

```bash
git add context/QuizContext.tsx app/_layout.tsx
git commit -m "feat(quiz): 퀴즈 푼 기록을 AsyncStorage로 영속화"
```

---

### Task 3: Context와 화면 껍데기

**Files:**
- Create: `components/lesson/LessonDetailContext.tsx`
- Create: `components/lesson/LessonDetailShell.tsx`
- Create: `components/lesson/blocks/blockStyles.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `useLessonDetail()` → `{ bookLesson: BookLesson; bookName: string; openAudio(): void; share(): void }`
  - `<LessonDetailShell bookLesson={BookLesson}>{children}</LessonDetailShell>`
  - `blockStyles` (StyleSheet 객체)

- [ ] **Step 1: `LessonDetailContext.tsx` 생성**

```ts
interface LessonDetailValue {
  bookLesson: BookLesson;
  bookName: string;
  /** 오디오 팝업을 열고 재생을 시작한다 */
  openAudio: () => void;
  share: () => void;
}
```

`createContext` + `useLessonDetail()` 훅을 내보낸다. Provider 밖에서 훅을 부르면 명확한 오류를 던진다:

```ts
export function useLessonDetail(): LessonDetailValue {
  const value = useContext(LessonDetailContext);
  if (!value) throw new Error('useLessonDetail은 LessonDetailShell 안에서만 쓸 수 있습니다');
  return value;
}
```

`context/`가 아니라 여기 두는 이유: 기존 `context/*`는 앱 전체에 하나 떠 있는 싱글턴이지만
이건 상세 화면이 열려 있는 동안만 산다.

- [ ] **Step 2: `LessonDetailShell.tsx` 생성**

현재 `app/(tabs)/today.tsx`에서 **화면 껍데기에 해당하는 것을 전부 옮겨 온다.** 새로 만들지 말고
지금 있는 코드를 그대로 가져온다:

- `useAudioPlayer` 훅과 그 상태
- 알람 자동재생 효과 (`autoplay` 파라미터 처리) — `handledAutoplayRef` 포함
- 항목이 바뀌면 재생을 멈추고 팝업을 닫는 효과 (`shownLessonKey`)
- 우측 상단 고정 닫기 버튼 — **`closeButtonWrap` View가 위치를 잡고 `ScaleButton`은 크기만 갖는
  현재 구조를 반드시 유지한다.** `ScaleButton`에 `position:absolute`를 직접 주면 바깥 `Pressable`이
  0×0이 되어 버튼이 눌리지 않는다 (이미 고친 버그다).
- `ScrollView` (`showsVerticalScrollIndicator={false}`, `paddingBottom: 200`)
- `AudioListenSheet` 팝업과 `closeAudioSheet`
- `shareLesson` 로직

`children`을 `ScrollView` 안에 렌더하고, 위 값들로 `LessonDetailContext`를 채운다.

props는 `{ bookLesson: BookLesson; children: ReactNode }` 하나뿐이다.

- [ ] **Step 3: `blocks/blockStyles.ts` 생성**

`components/lesson/headingStyles.ts`를 먼저 읽고, 거기 있는 값을 그대로 가져와 아래 항목을 만든다.
값을 새로 정하지 말고 기존 것을 옮긴다.

| 이름 | 내용 |
|---|---|
| `block` | 블록 하나의 바깥 여백 — 좌우 `paddingHorizontal: 20` (Figma에서 블록이 x=20, width=320) |
| `tag` / `tagText` | 책 이름 태그 알약 — `headingStyles.tag`·`tagText` 그대로 |
| `title` | 표제 큰 글씨 — `headingStyles.title` 그대로 (36px) |
| `subtitle` | 표제 아래 줄 — `headingStyles.subtitle` 그대로 (20px) |
| `meta` / `metaText` / `metaStar` | 보조행과 ✦ — `headingStyles`의 같은 이름 그대로 |
| `source` | 출처 줄 — `headingStyles.source` 그대로 |
| `paragraph` | 본문 문단 — `today.tsx`의 `styles.paragraph` 그대로 (16px, lineHeight 31) |

기존 `headingStyles.ts`는 **지우지 않는다** — `LessonHeading`이 8권을 위해 계속 쓴다.
값이 두 곳에 중복되지만, 9권 이관이 끝나면 `headingStyles.ts`가 통째로 사라지므로 일시적이다.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료

`LessonDetailShell`이 아직 아무 곳에서도 안 쓰여도 통과해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add components/lesson/LessonDetailContext.tsx components/lesson/LessonDetailShell.tsx components/lesson/blocks/blockStyles.ts
git commit -m "feat(lesson): 상세 화면 껍데기와 Context 분리"
```

---

### Task 4: 콘텐츠 블록 5개

**Files:**
- Create: `components/lesson/blocks/IntroBlock.tsx`
- Create: `components/lesson/blocks/ImageBlock.tsx`
- Create: `components/lesson/blocks/TitleBlock.tsx`
- Create: `components/lesson/blocks/QuoteBlock.tsx`
- Create: `components/lesson/blocks/DescBlock.tsx`

**Interfaces:**
- Consumes: Task 3의 `useLessonDetail`, `blockStyles`
- Produces: 아래 5개 컴포넌트와 `IntroAction` 타입

- [ ] **Step 1: Figma에서 조판을 읽는다**

`figma:figma-design-to-code` 스킬을 먼저 부른 뒤, `get_design_context`로 노드
`2136:1019`(intro), `2136:1001`(img), `2136:984`(title-column), `2136:1460`(title-row),
`2136:966`(quote), `2136:1376`(desc)를 읽는다.

색은 Figma 값 그대로 쓰지 말고 `constants/theme.ts`의 `Colors`에서 대응하는 이름을 찾아 쓴다.

- [ ] **Step 2: `IntroBlock.tsx` 작성**

```ts
type SymbolName = { ios: string; android: string; web: string };

export type IntroAction =
  | { kind: 'audio' }
  | { kind: 'link'; label: string; icon: SymbolName; url: string };

interface Props {
  /** "7월 21일" — 없으면 줄이 통째로 빠진다 */
  date?: string;
  /** "클래식 공부의 시간입니다." */
  tagline: string;
  actions: IntroAction[];
}
```

- **가운데 정렬이다.** 현재 `today.tsx`는 왼쪽 정렬이지만 Figma는 가운데다. Figma를 따른다.
- `kind: 'audio'`는 헤드폰 아이콘 + "오디오 듣기" 라벨이 고정이고, 누르면
  `useLessonDetail().openAudio()`를 부른다.
- `kind: 'link'`는 누르면 `expo-web-browser`의 `openBrowserAsync(url)`을 부른다.
- 버튼은 `ScaleButton`을 쓰고, 현재 `today.tsx`의 `listenButton` 스타일을 가져온다.
- 우측 상단 닫기 버튼과 겹치지 않도록 여백을 준다.

- [ ] **Step 3: `ImageBlock.tsx` 작성**

```ts
interface Props {
  /** Firebase Storage 경로 또는 http(s) URL */
  source: string;
}
```

기존 `components/LessonCoverImage.tsx`를 써서 그린다. 새로 만들지 않는다.

**크기는 320×200이다.** 현재 `today.tsx`는 바깥 320 + 안쪽 패딩 20(=이미지 280)인데 Figma는 다르다.
좌우 20px 여백 안쪽에서 높이 200으로 그린다.

- [ ] **Step 4: `TitleBlock.tsx` 작성**

```ts
import type { ImageSourcePropType } from 'react-native';

interface Props {
  /** 책 이름 태그 — "하루 클래식 공부", "듣기의 말들" */
  label: string;
  /** 기본값 'column' */
  layout?: 'column' | 'row';
  title: string;
  subtitle?: string;
  /** 보조행. 여러 개면 ✦로 잇는다. 예: ["Pizzicato Polka", "Johann Strauss II"] */
  meta?: string[];
  /** row 배치에서만 쓰는 우측 장식 이미지 */
  decoration?: ImageSourcePropType;
}
```

두 배치는 **같은 두 필드를 다르게 놓는 것**이다:

- `column` — `title`(큰 글씨) 위, `subtitle` 아래로 쌓는다.
- `row` — `title`과 `subtitle`을 가로로 나란히 놓는다. `subtitle`이 작고 아래쪽에 맞춰진다.
  `decoration`이 있으면 오른쪽 끝에 놓는다.

`meta`는 배열을 `✦`로 이어 한 줄로 그린다. 배열이 비었거나 없으면 줄 자체가 없다.

- [ ] **Step 5: `QuoteBlock.tsx` 작성**

```ts
interface Props {
  text: string;
  by?: string;
}
```

현재 `today.tsx`의 `quoteOuter`/`quoteInner`/`quoteText` 스타일을 가져온다.
`Fonts.serifDisplay`를 쓰는 현재 조판을 유지한다 (라틴 전용이라 한글은 시스템 폴백으로 그려진다).

- [ ] **Step 6: `DescBlock.tsx` 작성**

```ts
interface Props {
  paragraphs: string[];
}
```

현재 `today.tsx`의 `paragraph` 스타일을 가져온다.

- [ ] **Step 7: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료

- [ ] **Step 8: 커밋**

```bash
git add components/lesson/blocks/
git commit -m "feat(lesson): 콘텐츠 블록 5종 추가"
```

---

### Task 5: 기능 블록 4개

**Files:**
- Create: `components/lesson/blocks/ShopBlock.tsx`
- Create: `components/lesson/blocks/QuizBlock.tsx`
- Create: `components/lesson/blocks/NoteBlock.tsx`
- Create: `components/lesson/blocks/MoreFunctionsBlock.tsx`

**Interfaces:**
- Consumes: Task 1의 `Quiz`, Task 2의 `useQuiz`/`QuizAttempt`, Task 3의 `useLessonDetail`/`blockStyles`
- Produces: 위 4개 컴포넌트

- [ ] **Step 1: Figma에서 조판을 읽는다**

노드 `I2136:1376;0:5`(go to shop), `2136:906`(note), `2136:894`(more-functions)를 읽는다.
퀴즈는 Figma에 없으므로 기존 블록들의 조판 규칙(여백 20px, `Colors`, `tracking`)에 맞춰 새로 만든다.

- [ ] **Step 2: `ShopBlock.tsx` 작성**

props 없음. Figma `I2136:1376;0:5`의 조판을 그대로 옮긴다 (320×240).

**링크 목적지와 누를 때의 동작은 이번 범위가 아니다.** 보이는 모양만 만들고, 누르는 동작은 넣지 않는다.
`onPress`가 필요해 보이면 비워 두고 주석으로 "목적지 미정 — 다음 작업"이라고 남긴다.

- [ ] **Step 3: `QuizBlock.tsx` 작성**

```ts
import type { Quiz } from '@/types';

interface Props {
  quiz: Quiz;
}
```

항목과 책은 Context에서 이렇게 꺼낸다:

```ts
const { bookLesson } = useLessonDetail();
const lessonId = bookLesson.lesson.id;
const bookId = bookLesson.book;      // QuizAttempt.bookId에 그대로 넣는다
const { attemptOf, record } = useQuiz();
```

동작:

1. 위와 같이 현재 항목과 기록을 가져온다.
2. `attemptOf(lessonId)`에 기록이 있으면 **그 상태를 복원한다** — 고른 보기와 해설이 보이고 잠겨 있다.
3. 기록이 없으면 보기 4개만 보이고 해설은 숨긴다.
4. 보기를 누르면 **즉시**:
   - `record(lessonId, { bookId, choice, correct: choice === quiz.answer, at: new Date().toISOString() })`
   - 해설이 열리고 보기가 잠긴다
   - 고른 보기가 정답인지 오답인지 표시된다
5. **제출 버튼은 없다.**

보기 번호는 화면에도 1~4로 보여 준다. `quiz.answer`가 1부터 세므로 배열 색인과 비교할 때
`index + 1 === quiz.answer`로 맞춘다 — **여기서 어긋나면 정답 판정이 통째로 틀린다.**

보기는 `ScaleButton`으로 만들고, 잠긴 뒤에는 `onPress`를 넘기지 않아 눌리지 않게 한다.

정답/오답 색은 `Colors`에서 고른다 (`blue100`/`red100` 계열이 팔레트에 있다).

- [ ] **Step 4: `NoteBlock.tsx` 작성**

props 없음. 현재 `today.tsx`의 감상 노트 부분(`notesSection`부터 `noteList`까지)을 통째로 옮긴다.
항목은 `useLessonDetail()`에서, 노트는 기존 `useNotes()`에서 가져온다.

입력 중인 글(`draft`)의 `useState`도 이 블록 안으로 옮긴다. 항목이 바뀌면 비워야 하므로,
Task 6에서 조합 파일이 `key`로 다시 마운트시킨다 — 이 블록은 그것을 전제한다.

- [ ] **Step 5: `MoreFunctionsBlock.tsx` 작성**

props 없음. 현재 `today.tsx`의 `actionRow`(북마크 + 공유) 부분을 옮긴다.
북마크는 기존 `useLikes()`, 공유는 `useLessonDetail().share()`를 쓴다.

- [ ] **Step 6: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료

- [ ] **Step 7: 커밋**

```bash
git add components/lesson/blocks/
git commit -m "feat(lesson): 퀴즈·감상노트 등 기능 블록 4종 추가"
```

---

### Task 6: 책별 조합과 화면 교체

**Files:**
- Create: `components/lesson/books/ClassicDetail.tsx`
- Create: `components/lesson/books/DefaultDetail.tsx`
- Create: `components/lesson/books/index.tsx`
- Modify: `app/(tabs)/today.tsx`

**Interfaces:**
- Consumes: Task 1~5의 모든 것
- Produces: `renderBookDetail(bookLesson: BookLesson): ReactNode`

- [ ] **Step 1: `DefaultDetail.tsx` 작성 — 8권의 현행 화면**

```ts
interface Props {
  bookLesson: BookLesson;
}
```

**목표는 지금과 똑같은 화면이다.** 기존 `LessonHeading`을 그대로 호출해서 표제부를 그린다.
새 `TitleBlock`을 쓰지 않는다 — 8권의 화면이 바뀌면 안 된다.

현재 `today.tsx`의 순서를 그대로 따른다:
인트로 → 히어로 → 표제부(`LessonHeading`) → 인용문(클래식 전용 조건은 유지) → 본문 → 감상 노트 → 북마크·공유

인트로·본문·감상 노트·북마크는 새 블록(`IntroBlock` 등)을 쓰되, **현재와 같은 모양이 나오도록**
props를 맞춘다. `ImageBlock`의 크기 변경(320×200)과 `IntroBlock`의 가운데 정렬은 새 디자인이므로
8권에도 함께 적용된다 — 이건 의도된 변화다.

- [ ] **Step 2: `ClassicDetail.tsx` 작성**

```tsx
import { getLessonQuiz } from '@/lib/quiz';
import type { Track } from '@/types';

interface Props {
  lesson: Track;
}

export default function ClassicDetail({ lesson }: Props) {
  const quiz = getLessonQuiz(lesson);

  return (
    <>
      <IntroBlock
        date={lesson.date}
        tagline="클래식 공부의 시간입니다."
        actions={[
          { kind: 'audio' },
          ...(lesson.youtubeUrl
            ? [{
                kind: 'link' as const,
                label: '노래 듣기',
                icon: { ios: 'play.rectangle.fill', android: 'smart_display', web: 'smart_display' },
                url: lesson.youtubeUrl,
              }]
            : []),
        ]}
      />
      <ImageBlock source={lesson.coverImage} />
      <TitleBlock
        label={lesson.tag ?? '하루 클래식 공부'}
        title={lesson.title}
        subtitle={lesson.composer}
        meta={lesson.titleEn && lesson.composerEn ? [lesson.titleEn, lesson.composerEn] : undefined}
      />
      {lesson.quote && <QuoteBlock text={lesson.quote} by={lesson.quoteBy} />}
      <DescBlock paragraphs={lesson.story} />
      {quiz && <QuizBlock quiz={quiz} />}
      <ShopBlock />
      <NoteBlock />
      <MoreFunctionsBlock />
    </>
  );
}
```

`getLessonQuiz`(Task 1)가 퀴즈를 꺼내면서 개발 중에 형식 검증 경고를 띄운다.

인트로의 두 줄은 Figma에서 **서로 다른 텍스트 노드**다 — 날짜(`7월 21일`)와 문구
(`클래식 공부의 시간입니다.`). 그래서 `lesson.date`를 그대로 `date`에 넘기고 문구는 문자열로 적는다.

- [ ] **Step 3: `books/index.tsx` 작성**

```tsx
import type { BookLesson } from '@/lib/books';

/**
 * 책 → 상세 화면 조합.
 *
 * 객체 표(Record<BookId, ComponentType>) 대신 switch를 쓰는 이유는 책마다 lesson 타입이 달라서다 —
 * 하나의 ComponentType으로 묶으면 prop 타입이 뭉개져 타입 안전성이 사라진다. switch는 분기 안에서
 * lesson이 그 책 타입으로 좁혀진다. lib/books.ts가 같은 이유로 같은 선택을 했다.
 */
export function renderBookDetail(bookLesson: BookLesson) {
  switch (bookLesson.book) {
    case 'classic':
      return <ClassicDetail lesson={bookLesson.lesson} />;
    default:
      return <DefaultDetail bookLesson={bookLesson} />;
  }
}
```

- [ ] **Step 4: `app/(tabs)/today.tsx` 교체**

화면은 **항목을 해석하고 껍데기에 넘기는 일만** 한다. 나머지는 전부 Task 3~5로 옮겨 갔다.

남는 것:
- `useLocalSearchParams`로 `bookId`/`lessonId`/`trackId`/`autoplay` 읽기
- `useBookSelection()`으로 기본 책 정하기
- `getBookLesson(...)`으로 `BookLesson` 얻기
- 없으면 `null` 반환
- `<LessonDetailShell bookLesson={...}>{renderBookDetail(bookLesson)}</LessonDetailShell>`

**항목이 바뀌면 블록 상태(입력 중인 감상 노트 등)가 남지 않도록** `renderBookDetail`의 결과를
항목 키로 다시 마운트시킨다:

```tsx
<LessonDetailShell bookLesson={bookLesson}>
  <Fragment key={`${bookId}:${bookLesson.lesson.id}`}>
    {renderBookDetail(bookLesson)}
  </Fragment>
</LessonDetailShell>
```

파일 상단의 화면 설명 주석은 새 구조에 맞게 다시 쓴다.

**`formatIntroText` 함수는 삭제한다.** 이 함수는 날짜를 `"1월 1일 공부입니다."` 한 줄로 합치는데,
Figma의 인트로는 날짜와 문구가 **서로 다른 두 줄**이다. `IntroBlock`이 `date`와 `tagline`을 따로 받으므로
합치는 함수가 필요 없다.

`StyleSheet` 정의는 각 블록과 Shell로 흩어졌으므로 이 파일에는 거의 남지 않아야 한다.

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 오류 없이 종료

- [ ] **Step 6: 남은 참조 확인**

Run: `npx tsc --noEmit && git status`
Expected: 타입 오류 없음. `today.tsx`가 크게 줄었는지 확인한다 (563줄 → 60줄 안팎).

- [ ] **Step 7: 커밋**

```bash
git add components/lesson/books/ "app/(tabs)/today.tsx"
git commit -m "feat(lesson): 상세 화면을 책별 블록 조합으로 교체"
```

---

## 완료 후 사용자 확인

타입체크는 UI 배치를 검증하지 못한다. 마지막에 사용자에게 dev build로 아래를 확인해 달라고 요청한다.
(Expo Go로는 안 된다 — 네이티브 모듈이 있어 `expo run:android` + USB `adb reverse`가 필요하다.)

1. 클래식 항목: 인트로가 **가운데 정렬**인가, '노래 듣기' 버튼이 유튜브 검색을 여는가
2. 클래식 항목: 퀴즈에서 보기를 고르면 **즉시** 해설이 뜨고 보기가 잠기는가, 정답/오답이 맞게 나오는가
3. 화면을 나갔다 다시 들어와도 **푼 기록이 남아 있는가**
4. 우측 상단 **닫기(X)가 눌리는가**
5. 나머지 8권(라틴어·명언·한자·교양·심리·쓰기·한문·영어) 화면이 이전과 같은가

## 이 계획에 없는 것 (다음 작업)

- 클래식 외 8권을 각자의 조합 파일로 이관
- 9권 이관이 끝난 뒤 `LessonHeading.tsx`·`headingStyles.ts`·`DefaultDetail.tsx` 제거
- `ShopBlock`의 링크 목적지와 동작
- 통계 탭 (책별 북마크 수·퀴즈 정답률·학습 완주율)
- 학습 완주율 기록 — '완주'의 정의부터 필요하다
