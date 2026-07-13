# 하루 클래식 — 출판사 데모 앱 디자인

날짜: 2026-07-10
상태: 사용자 스펙 기반 확정 (스펙이 비워둔 결정사항만 이 문서에 기록)

## 목표

출판사 미팅에서 2분 안에 "이 앱이 우리 책을 디지털 경험으로 확장해준다"는 인상을 주는
고완성도 프로토타입. 기능 수가 아니라 UX/디자인 퀄리티가 기준.

## 기술 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 오디오 | **expo-audio** (~57.0.0) | 당초 expo-av 유지로 결정했으나, SDK 57 Expo Go에 ExponentAV 네이티브 모듈이 빠져 기기에서 크래시 (`Cannot find native module 'ExponentAV'`). 2026-07-10 expo-audio로 마이그레이션 |
| 테마 | **라이트 단일 테마** (스펙 팔레트 고정) | 스펙의 차분한 출판 감성은 단일 톤. 다크모드 분기 제거로 단순화 |
| 애니메이션 | react-native-reanimated 4.5 (설치됨) — entering 애니메이션 + press scale | 스펙: 카드 슬라이드업, 텍스트 페이드인, 버튼 스케일 |
| 좋아요 상태 | React Context, 인메모리, 예시 2곡 시드 | 데모용 — 영속화 불필요, 보관함에 2~3곡 기본 노출 |
| 오늘의 곡 선정 | day-of-year % 곡 수 | 날짜별 자동 로테이션, 백엔드 없음 |
| 미디어 소스 | Wikimedia Commons 퍼블릭 도메인 음원/이미지 URL (구현 시 curl로 검증) | 번들 크기 최소화, 저작권 안전. iOS 호환 위해 가능하면 MP3 우선 |
| 30초 샘플 | 재생 위치 30초 도달 시 자동 정지, Progress Bar는 30초 기준 | 스펙: "30초 정도의 샘플 음원" |

## 앱 구조 (expo-router 탭 4개)

```
app/(tabs)/
  index.tsx      오늘   — 유일하게 완성도를 높이는 화면
  library.tsx    보관함 — 좋아요한 곡 리스트 (심플)
  alarm.tsx      알람   — UI만 (07:00, 요일, 페이드인, 자동재생 토글)
  settings.tsx   설정   — 앱 소개, 버전
```

기존 스타터 잔여물(EditScreenInfo, modal, notifications 탭, Themed 다크모드 분기)은
최종 리팩토링 단계에서 제거.

## 디자인 시스템 (`constants/theme.ts`)

- Colors: background `#F8F6F2`, primary `#2D3A4A`, accent `#B88A44`,
  text `#1E1E1E`, subText `#7A7A7A`, card `#FFFFFF`
- Spacing scale: 4/8/12/16/24/32/48 — 여백을 넉넉하게
- Typography: 세리프 계열 디스플레이(플랫폼 기본 serif) + 시스템 산세리프 본문,
  크기·행간 토큰화
- Radius: 카드 20, 버튼 999(pill)
- Shadow: opacity ≤ 0.06 의 매우 약한 그림자 1종

## 데이터 (`data/tracks.json`)

```ts
interface Track {
  id: string;
  title: string;        // 곡 제목 (한국어)
  composer: string;     // 작곡가
  description: string;  // 오늘의 이야기 300~500자
  listeningPoint: string; // 감상 포인트 한 문장
  coverImage: string;   // 커버 이미지 URL
  audio: string;        // 샘플 음원 URL
}
```

곡 5개 준비 (일자 로테이션용). 기존 tracks.json 스키마는 대체.

## 컴포넌트

- `TodayCard` — 커버 이미지, 곡 제목, 작곡가, 재생 버튼, 재생 중 Progress Bar
- `PlayButton` — 원형, accent 색, 재생/일시정지 토글, press scale
- `ProgressBar` — 30초 기준의 얇은 바
- `Section` — "오늘의 이야기" / "오늘의 감상 포인트" 공용 레이아웃 (라벨 + 본문)
- `LikeButton` — 하트 토글, 좋아요 시 accent
- `ReadMoreButton` — "책으로 더 읽기" (동작 없음, 시각적 CTA)
- `LibraryItem` — 보관함 행 (소형 커버 + 제목 + 작곡가)
- `SettingRow` — 알람/설정 화면 공용 행 (라벨 + 값 또는 스위치)

## 화면 플로우 (오늘)

앱 실행 → 카드가 아래에서 슬라이드업 → 텍스트 순차 페이드인 →
재생 버튼 탭 → 샘플 스트리밍(30초 상한) + Progress Bar →
좋아요 탭 → 보관함에 반영 → "책으로 더 읽기" CTA로 마무리.

## 에러 처리

- 음원 로드 실패: 재생 버튼에 짧은 안내(재시도 가능), 앱은 계속 동작
- 이미지 로드 실패: primary 톤 플레이스홀더 배경
- 데모 특성상 그 이상의 방어 로직은 넣지 않음 (YAGNI)

## 검증

- `tsc --noEmit` 통과
- Expo web 프리뷰에서 4탭 네비게이션·오늘 화면 렌더·재생/일시정지·좋아요→보관함 반영 확인
- 미디어 URL 전수 curl 검증

## 구현 순서 (사용자 스펙 지정)

1. 폴더 구조 → 2. 디자인 시스템 → 3. 컴포넌트 설계 → 4. 데이터 구조 →
5. UI 구현 → 6. 음악 재생 → 7. 애니메이션 → 8. 최종 리팩토링
