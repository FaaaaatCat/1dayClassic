# 항목 상세 화면 블록 컴포넌트 설계

작성일: 2026-08-04

## 배경

지금 항목 상세 화면(`app/(tabs)/today.tsx`)은 한 파일이 화면 전체를 직접 그린다. 책마다 다른 부분은
표제부 하나뿐이라고 보고 `components/lesson/LessonHeading.tsx`가 `switch (book)`으로 9권을 갈라
따로 그리는 구조다.

새 디자인(Figma)에서는 상세 화면이 7종 블록(`intro`·`img`·`title`·`quote`·`desc`·`note`·`more-functions`)의
조합으로 정리됐고, **책마다 들어가는 블록과 그 순서가 달라진다.** 지금 구조로는 순서를 책마다 바꿀 수
없다 — 순서가 화면 파일에 하드코딩돼 있기 때문이다.

여기에 항목마다 4지선다 퀴즈를 한 문제씩 붙인다. 퀴즈는 콘텐츠(문항)와 동작(채점)을 함께 갖는
첫 블록이라, 블록 설계가 그 조합을 감당할 수 있는지 확인하는 시금석이기도 하다.

## 목표

- 상세 화면을 블록 컴포넌트로 분해한다 — Figma의 7종에 `go to shop`(별도 블록으로 분리)과
  새로 만드는 퀴즈를 더해 **9종**이다.
- 책마다 **어떤 블록을 · 어떤 순서로 · 어떤 데이터로** 그릴지를 한 곳에서 정한다.
- 새 책을 추가할 때 파일 하나 + 등록 한 줄로 끝나게 한다.
- 기존 9권의 화면은 이번 작업으로 바뀌지 않는다(클래식 제외).
- 퀴즈 내용을 비개발자가 직접 적고 고칠 수 있게 하고, 잘못 적었을 때 알려 준다.

## 범위 밖 (non-goals)

- 클래식 외 8권의 이관 — 클래식으로 검증한 뒤 같은 패턴으로 따라간다.
- 테스트 인프라 도입 — 이번엔 타입체크로만 검증한다.
- `ShopBlock`의 링크 목적지·동작 정의 — 조판만 옮기고 동작은 다음 작업에서 정한다.
- 퀴즈의 주관식(입력식) 문항 — 지금은 4지선다만 만든다.
- 퀴즈 풀이 기록의 영속화 — 화면을 나가면 초기화된다. 붙이는 경로는 아래에 적어 둔다.
- 한 항목에 퀴즈 여러 개 — 항목당 한 문제로 고정한다.

## 조사 결과 — 3개 화면 비교

Figma 3개 화면(클래식 `2133:811`, 삼국지 `2136:1115`, 듣기 `2136:1456`)을 읽어 얻은 사실이다.

세 화면 모두 블록 순서는 `intro → img → title → quote → desc → note → more-functions`로 같았다.
다만 사용자가 앞으로 **순서를 책마다 바꾸고 싶다**고 확인해 줬으므로, 순서를 고정하지 않고
표현 가능하게 설계한다.

| 블록 | 클래식 | 삼국지 | 듣기 |
|---|---|---|---|
| intro | 날짜 O · 버튼 2개(오디오, 노래) | 날짜 X · 버튼 1개 | 날짜 X · 버튼 1개 |
| img | O | O | **없음** |
| title | column · subtitle O · meta O | column · subtitle X · meta X | **row** · 장식 이미지 O |
| quote | O | **없음** | O |
| desc | 문단 2 + go to shop | 문단 1 + go to shop | 문단 2 + go to shop |
| note | 동일 (529.96px) | 동일 | 동일 |
| more-functions | 동일 (132px) | 동일 | 동일 |

핵심 관찰 세 가지:

1. **디자이너는 이미 슬롯을 숨기는 방식으로 변형을 만들고 있다.** Figma 인스턴스에 `hidden="true"`로
   나타난다. 삼국지 intro는 다른 컴포넌트가 아니라 날짜 텍스트와 둘째 버튼이 숨겨진 같은 컴포넌트다.
   코드로 옮기면 그대로 optional props다.
2. **`title`만 진짜 레이아웃 변형을 갖는다.** `title_row`와 `title_column`이 배타적으로 켜진다.
   그런데 둘 다 **같은 두 필드(title, subtitle)를 다르게 배치할 뿐**이라, 필드를 나눌 필요 없이
   `layout` prop 하나로 갈린다.
3. **`note`와 `more-functions`는 3화면에서 픽셀 단위로 같다.** props가 필요 없는 고정 블록이다.

## 채택 방식 — 책마다 JSX 조합 파일

층을 셋으로 나눈다. 1·2층은 9권이 공유하고, **3층만 책마다 다르다.**

| 층 | 역할 | 책마다 다른가 |
|---|---|---|
| 1. 블록 컴포넌트 | 순수 표시 | 아니오 |
| 2. Context | 오디오·노트·북마크·공유 동작 | 아니오 |
| 3. 조합(recipe) | 어떤 블록을, 어떤 순서로, 어떤 데이터로 | **예** |

3층은 JSX로 쓴다. **화면 순서 = JSX 줄 순서**라서 순서를 표현하는 데 별도 장치가 필요 없다.

```tsx
// components/lesson/books/ClassicDetail.tsx
export default function ClassicDetail({ lesson }: { lesson: Track }) {
  return (
    <>
      <IntroBlock
        date={lesson.date}
        tagline="클래식 공부의 시간입니다."
        actions={[{ kind: 'audio' }, youtubeAction(lesson)]}
      />
      <ImageBlock source={lesson.coverImage} />
      <TitleBlock
        label="하루 클래식 공부"
        title={lesson.title}
        subtitle={lesson.composer}
        meta={lesson.titleEn ? [lesson.titleEn, lesson.composerEn] : undefined}
      />
      {lesson.quote && <QuoteBlock text={lesson.quote} by={lesson.quoteBy} />}
      <DescBlock paragraphs={lesson.story} />
      {lesson.quiz && <QuizBlock quiz={lesson.quiz} />}
      <ShopBlock />
      <NoteBlock />
      <MoreFunctionsBlock />
    </>
  );
}
```

퀴즈를 `desc` 바로 뒤에 둔 것은 '읽고 나서 풀어 본다'는 흐름 때문이다. 위치를 바꾸고 싶으면 이 줄을
원하는 자리로 옮기면 된다 — 조합이 JSX라서 순서 변경이 줄 이동으로 끝난다.

### 기각한 대안

**설정 배열(데이터) + 렌더러.** 블록 구성을 `DetailBlock[]` 판별 유니온으로 만들고 렌더러가 순회하는
방식. 구성이 데이터라 조회·검증이 쉽지만, 블록 종류가 늘 때마다 유니온과 렌더러 두 곳을 고쳐야 한다.
특히 퀴즈는 책마다 형식이 갈릴 가능성이 커서(객관식/주관식/듣고 맞히기) 닫힌 유니온이 부담이 된다.
JSX 조합은 **임의의 컴포넌트를 넣을 수 있어 블록 목록이 닫혀 있지 않다.**

**블록마다 `switch (book)` 유지(현행 확장).** 7블록 × 9권이면 분기가 63개가 되고, 책 하나를 추가할 때
파일 7개를 각각 고쳐야 한다. 한 책의 화면이 7개 파일에 흩어져 전체를 한눈에 볼 수 없다. 무엇보다
**순서가 렌더러에 하드코딩돼 책마다 순서를 바꿀 수 없다** — 요구사항과 정면으로 부딪힌다.

## 파일 구조

```
components/lesson/
  blocks/                    1층 — 순수 표시, 9권 공용
    IntroBlock.tsx
    ImageBlock.tsx
    TitleBlock.tsx
    QuoteBlock.tsx
    DescBlock.tsx
    ShopBlock.tsx
    QuizBlock.tsx
    NoteBlock.tsx
    MoreFunctionsBlock.tsx
    blockStyles.ts           공유 조판 — 기존 headingStyles.ts를 흡수한다
  books/                     3층 — 책마다 한 파일
    ClassicDetail.tsx
    DefaultDetail.tsx        아직 안 옮긴 8권이 쓰는 현행 레이아웃
    index.ts                 BookId → 조합 컴포넌트 레지스트리
  LessonDetailShell.tsx      스크롤·닫기·오디오 팝업·safe area + Context 제공
  LessonDetailContext.tsx    2층
```

`LessonDetailContext`를 `context/`에 두지 않는 이유: 기존 `context/*`는 `app/_layout.tsx`에서
마운트돼 앱 전체에 하나씩 떠 있는 싱글턴이다. 이건 상세 화면이 열려 있는 동안만 사는 것이라
수명이 다르고, 상세 화면 기능의 일부라 같은 폴더에 둔다.

## 블록별 props 계약

| 블록 | props | 비고 |
|---|---|---|
| `IntroBlock` | `date?: string`<br>`tagline: string`<br>`actions: IntroAction[]` | 날짜는 클래식만 노출 |
| `ImageBlock` | `source: string` | 기존 `LessonCoverImage`로 그린다 |
| `TitleBlock` | `label: string`<br>`layout?: 'column' \| 'row'`<br>`title: string`<br>`subtitle?: string`<br>`meta?: string[]`<br>`decoration?: ImageSourcePropType` | `layout` 기본값 `'column'`.<br>`decoration`은 `row`에서만 쓴다 |
| `QuoteBlock` | `text: string`<br>`by?: string` | 3화면 구조 동일, 길이만 다름 |
| `DescBlock` | `paragraphs: string[]` | |
| `ShopBlock` | 없음 | 3화면 동일 |
| `QuizBlock` | `quiz: Quiz` | 콘텐츠는 props, 풀이 상태는 내부 `useState` |
| `NoteBlock` | 없음 | Context에서 항목·핸들러를 꺼낸다 |
| `MoreFunctionsBlock` | 없음 | Context에서 항목·핸들러를 꺼낸다 |

`TitleBlock`의 `layout`:

- `'column'` (클래식·삼국지) — `title` 위, `subtitle` 아래
- `'row'` (듣기) — `title`(`001`) 옆에 `subtitle`(`번째 듣는 법`)이 인라인. `decoration`은 우측 장식 이미지.

`meta`는 클래식의 영문 표기행(`Pizzicato Polka ✦ Johann Strauss II`)이다. 배열로 받아 `✦`로 잇는다.

`IntroAction`은 닫힌 문자열로 두지 않는다 — '노래 듣기'는 URL이 필요하고 앞으로 다른 버튼이 붙을 수 있다:

```ts
type IntroAction =
  | { kind: 'audio' }                                             // Context가 재생을 담당
  | { kind: 'link'; label: string; icon: string; url: string };   // '노래 듣기'(YouTube) 등
```

링크는 이미 설치된 `expo-web-browser`로 연다. 새 의존성이 없다.

### 블록이 데이터를 받는 규칙

> 블록은 **콘텐츠를 props로**, **동작을 Context/훅으로** 받는다. 둘 다 받아도 되고, 하나만 받아도 된다.

`NoteBlock`과 `MoreFunctionsBlock`에 props가 없는 것은 *그 블록들이 표시할 콘텐츠가 없어서*지,
기능 블록이라서가 아니다. `QuizBlock`은 콘텐츠(문항)와 동작(채점)을 둘 다 가지므로
`<QuizBlock quiz={lesson.quiz} />`처럼 props를 받으면서 채점 상태는 스스로 관리한다 — 이 규칙이
성립한다는 것을 보여 주는 첫 블록이다.

## Context 범위

새로 만드는 것은 작은 것 하나뿐이다.

```ts
interface LessonDetailValue {
  bookLesson: BookLesson;   // 지금 보고 있는 항목
  bookName: string;
  openAudio: () => void;    // 오디오 팝업 열기 + 재생
  share: () => void;
}
```

북마크와 감상 노트는 **이미 있는 `LikesContext`·`NotesContext`를 그대로 쓴다.** 새로 만들지 않는다.

Context를 한 덩어리로 만들지 않는다는 원칙이 여기서 지켜진다:

- **화면 수명 상태** → `LessonDetailContext` (지금 어떤 항목을 보고 있나 + 화면 수준 동작)
- **영속 기능 상태** → 기능별 앱 Context (`LikesContext`, `NotesContext`)
- **블록 안에서 끝나는 상태** → 그 블록의 `useState` (퀴즈 풀이 상태가 여기 해당한다)

퀴즈는 이번에 저장을 하지 않으므로 Context를 만들지 않는다. 나중에 풀이 기록을 저장하기로 하면
`QuizContext`가 **추가만** 되고 위의 것들은 수정되지 않는다.

## 데이터 흐름과 점진 이관

```
app/(tabs)/today.tsx        bookId/lessonId → BookLesson 해석만 한다
  └ <LessonDetailShell>     스크롤·닫기·오디오 팝업·Context 제공
       └ registry[book]     클래식 → ClassicDetail, 나머지 8권 → DefaultDetail
            └ 블록들         JSX 순서 = 화면 순서
```

레지스트리는 객체 표가 아니라 **`switch` 한 개**로 만든다:

```ts
// components/lesson/books/index.ts
export function renderBookDetail(bookLesson: BookLesson) {
  switch (bookLesson.book) {
    case 'classic':
      return <ClassicDetail lesson={bookLesson.lesson} />;  // Track으로 좁혀진다
    default:
      return <DefaultDetail bookLesson={bookLesson} />;     // 아직 안 옮긴 8권
  }
}
```

`Record<BookId, ComponentType<…>>` 같은 객체 표를 쓰지 않는 이유가 있다. 책마다 `lesson` 타입이 다르므로
(`Track` vs `LatinLesson` vs …) 하나의 `ComponentType`으로 묶으면 prop 타입이 `never`나 `any`로 뭉개져
**타입 안전성이 사라진다.** `switch`는 분기 안에서 `bookLesson.lesson`이 그 책 타입으로 좁혀져 캐스팅이
필요 없다. 이미 `lib/books.ts`가 같은 이유로 표 대신 `switch`를 쓰고 있고(파일 주석에 근거가 적혀 있다),
같은 판단을 따른다.

분기가 늘어나는 것을 걱정할 필요는 없다. 기각한 '블록마다 switch' 안은 **7개 파일에 각각 9분기**(63개)를
두지만, 이건 **한 파일에 9분기**뿐이고 책 하나당 정확히 한 줄이다.

**껍데기(Shell)는 9권이 처음부터 다 같이 쓴다.** 클래식만 새 조합 파일을 갖고, 나머지 8권은
`DefaultDetail`이 지금과 똑같은 화면을 그린다 — 내부에서 기존 `LessonHeading`을 그대로 호출한다.

이 구조의 효과:

- 잘 되던 8권은 화면이 바뀌지 않는다. 타입체크만으로 검증하기로 했으므로 이 안전장치가 중요하다.
- 책 하나를 이관 = 조합 파일 추가 + 레지스트리 한 줄 + `LessonHeading`에서 그 분기 삭제.
- 9권을 다 옮기면 `LessonHeading`과 `DefaultDetail`이 비어서 자연스럽게 사라진다.

## Figma와 현재 코드의 차이

클래식을 이관하면서 Figma 쪽으로 맞춘다.

| 항목 | 현재 코드 | Figma |
|---|---|---|
| intro 정렬 | 왼쪽 | 가운데 |
| 히어로 이미지 | 320×280 (바깥 320 + 안쪽 패딩 20) | 320×200, 안쪽 패딩 없음 |
| '노래 듣기' 버튼 | 없음 | 있음 (클래식만) |
| `go to shop` | 없음 | 3화면 전부 있음 |

**의도적으로 Figma와 다르게 가는 곳:** Figma는 `go to shop`을 `desc` 인스턴스 **안에** 중첩해 뒀지만,
코드에서는 `desc`의 **형제 블록**으로 뺀다. 보이는 결과는 같고, 독립 블록이어야 책마다 순서를 바꿀 수 있다.

`ShopBlock`의 조판(320×240)은 구현 시 Figma에서 읽어 옮긴다. props가 없다는 계약은 3화면이 동일하므로
이미 확정됐고, 내부 조판만 남았다.

## 검증

새 의존성 없이 타입체크로 검증한다.

```
npx tsc --noEmit
```

`Partial<Record<BookId, …>>` 레지스트리와 책별로 좁혀진 `lesson` 타입 덕분에, 조합 파일에서 없는 필드를
쓰거나 필수 prop을 빠뜨리면 컴파일에서 잡힌다.

타입체크가 잡지 못하는 것은 **UI 배치**다. 이건 자동 검증하지 않기로 했으므로, 위험을 8권을 건드리지
않는 것(`DefaultDetail`)으로 줄인다. 클래식 화면의 실제 배치는 사용자가 dev build에서 눈으로 확인한다.

## 퀴즈 블록

4지선다 한 문제를 항목마다 붙인다. 보기를 고르면 곧바로 해설이 열린다.

### 콘텐츠를 어디에 두는가

**기존 항목 JSON 안, 그 항목의 `quiz` 필드에 둔다.** 클래식이면 `data/tracks.json`이다.

이 프로젝트는 이미 콘텐츠와 코드를 분리해 두고 있다 — `data/<책>.json`이 내용을 갖고
`lib/<책>.ts`는 그것을 읽는 얇은 접근자다(`lib/classic.ts`는 43줄뿐이다). 그래서 퀴즈를 컴포넌트
파일 상단에 두는 안은 이 규칙을 깨므로 채택하지 않는다.

**퀴즈만 모은 별도 JSON도 채택하지 않는다.** 별도 파일로 빼면 퀴즈와 항목을 `id` 문자열로 이어야 하는데,
id에 오타가 나면 **아무 에러 없이 퀴즈가 조용히 사라진다.** 콘텐츠를 비개발자가 직접 적는 상황에서
이건 가장 나쁜 실패 방식이다 — 무엇이 잘못됐는지 알 방법이 없다. 항목 안에 두면 물리적으로 붙어 있어
연결이 끊길 수 없다. `quote`·`story`가 이미 같은 방식으로 항목 안에 들어 있다.

퀴즈가 없는 날은 `quiz` 필드를 쓰지 않는다. 그러면 조합 파일에서 블록 자체가 렌더되지 않는다.

### 데이터 모델

```ts
// types/index.ts
export interface Quiz {
  title: string;                                // 예: "오늘의 퀴즈"
  question: string;
  choices: [string, string, string, string];    // 정확히 4개
  answer: 1 | 2 | 3 | 4;                        // 1부터 센다
  explanation: string;
}
```

`DailyLesson`에 `quiz?: Quiz`를 더한다. optional이라 기존 9권의 데이터는 손대지 않아도 된다.

**`answer`를 1부터 세는 이유:** 콘텐츠를 비개발자가 직접 적는다. 화면에 보이는 "2번"과 JSON에 적는 `2`가
같아야 한다. 코드에서 쓰는 0부터의 색인은 접근자가 변환한다. 흔히 쓰는 `answerIndex: 1`(= 2번)은
적는 사람에게 혼란만 준다.

**`choices`를 배열이 아니라 4칸 튜플로 두는 이유:** 3개나 5개를 적으면 타입에서 걸린다.

### 콘텐츠 검증

타입만으로는 부족하다. `lib/classic.ts`가 `tracksData as TracksData`로 **캐스팅**하고 있어서, TypeScript는
JSON 내용이 타입과 맞는지 실제로 확인하지 않는다. 보기를 3개만 적거나 `explanation`을 빠뜨려도 조용히 통과한다.

그래서 퀴즈를 읽을 때 `__DEV__`에서만 도는 검증을 함께 둔다:

- `choices`가 정확히 4개인가
- `answer`가 1~4인가
- `title`·`question`·`explanation`이 비어 있지 않은가

어긋나면 어느 항목의 퀴즈가 왜 잘못됐는지 `console.warn`으로 알린다. 형식을 정해 두고 틀렸을 때
알려주지 않으면 반쪽짜리다.

JSON **문법** 오류(끝 쉼표 등)는 이 검증이 아니라 `npx tsc --noEmit`이 잡는다 — JSON을 import하고 있어서
파일이 깨지면 타입체크가 실패한다.

### 동작

- 보기를 고르기 전에는 해설이 보이지 않는다.
- 보기 하나를 고르면 **즉시** 해설이 열리고, 고른 보기가 정답인지 오답인지 표시된다. 제출 버튼은 없다.
- 고른 뒤에는 **보기가 잠긴다.** 잠그지 않으면 4개를 차례로 눌러 정답을 찾을 수 있어 퀴즈가 무의미해진다.
- 항목이 바뀌면 초기화된다(`key={lesson.id}`).
- 푼 기록은 저장하지 않는다. 화면을 나갔다 오면 처음 상태다.

### 상태를 Context에 두지 않는 이유

저장을 하지 않으므로 풀이 상태는 `QuizBlock` 내부 `useState`면 충분하다. 지금 `QuizContext`를 만들면
쓰지도 않을 Provider가 하나 늘 뿐이다.

나중에 기록을 저장하기로 하면 그때 `QuizContext`를 **추가**한다. `NotesContext`가 이미 쓰고 있는
'항목 id로 갈라 AsyncStorage에 영속화' 패턴을 그대로 따르면 되고, 이 설계의 원칙대로 기존 Context와
블록은 수정되지 않는다.

### 나중에 책마다 퀴즈 형식이 달라지면

`QuizBlock`은 4지선다 전용이다. 어떤 책이 다른 형식(주관식, 듣고 맞히기)을 요구하면 그 책 조합 파일에서
다른 컴포넌트(`<HanjaQuizBlock />`)를 쓰면 된다. 블록 목록이 닫힌 유니온이 아니라서 기존 블록이나 다른
책을 건드리지 않는다.

**해결되지 않은 것 하나:** 퀴즈가 다른 블록의 표시를 좌우하는 경우(예: "퀴즈를 풀어야 해설이 열린다")는
블록끼리 상태를 주고받아야 해서 이 설계로 부족하다. 그런 게이팅이 필요해지면 Context 설계를 다시 잡아야
한다. 현재 요구사항에는 없다.
