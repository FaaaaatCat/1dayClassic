import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SplashAlarm, { type SplashAlarmChoice } from '@/components/splash-draft/SplashAlarm';
import SplashBooks from '@/components/splash-draft/SplashBooks';
import SplashChoice from '@/components/splash-draft/SplashChoice';
import SplashFields from '@/components/splash-draft/SplashFields';
import SplashIntro from '@/components/splash-draft/SplashIntro';
import SplashLoading from '@/components/splash-draft/SplashLoading';
import SplashPermissions from '@/components/splash-draft/SplashPermissions';
import { DARK_TINT, StatusBarTint, type StatusTint } from '@/components/StatusBarTint';
import { Ink, Surface } from '@/constants/theme';
import type { BookId } from '@/types';

/*
 * ── 이 폴더(splash-draft)는 첫 실행의 고침본이다 ──
 *
 * 설정의 첫 실행 미리보기(app/splash-preview)만 이쪽을 쓰고, 진짜 첫 실행(app/onboarding)과 홈의
 * 환영 창은 여전히 components/splash를 쓴다. 메인을 건드리지 않고 미리보기에서 먼저 고쳐 보려는
 * 것이다. 다 맞으면 이 폴더로 components/splash를 갈아 끼우고 이 폴더는 지운다.
 *
 * 지금까지 고친 것: 인트로 버튼을 '하루서점 시작하기'로 고정, 퀴즈 그림을 아이콘으로, 질문 1·2의
 * 문구와 분야 목록(시안), 물음 자리를 위로, 아래 버튼 56·둘레 20, 환영 창을 밝게.
 */

/** 독서 빈도 — 피그마 시안 '질문 2 시간'의 다섯 줄. */
const FREQUENCIES = ['거의 읽지 않아요', '한 달에 1~2권', '일주일에 1권', '일주일에 2권 이상', '매일 읽어요'] as const;
/** 독서 목적 — 피그마 시안 '질문 3 목적'의 세 줄. */
const PURPOSES = ['새로운 지식 획득', '여가를 위한 재밌는 이야기 탐독', '마음 수양'] as const;

/**
 * 첫 실행이 묻고 받아 낸 것들.
 *
 * 이 중 저장되는 것은 책과 알람뿐이다. 분야·빈도·목적은 원래 책을 골라 주기 위한 재료라
 * 아직 쓸 데가 없다(추천을 만드는 곳이 생기면 그때 쓴다). 권한은 질문 화면에서 그 자리에서
 * 바로 묻고 끝나므로 여기 담을 것이 없다(SplashPermissions).
 */
export interface SplashAnswers {
  fields: string[];
  frequency: string;
  purpose: string;
  bookId: BookId;
  alarm: SplashAlarmChoice;
}

/**
 * 걸음의 차례 — 인트로, 관심 분야 > 독서 빈도 > 독서 목적, 책 추천 중, 첫 권, 알림, 권한.
 *
 * 로그인은 여기 없다 — 첫 화면 위로 올라오는 시트라서 걸음이 아니라 그 화면이
 * 품는 상태다(SplashIntro).
 */
const STEPS = ['intro', 'fields', 'frequency', 'purpose', 'loading', 'books', 'alarm', 'permissions'] as const;

type Step = (typeof STEPS)[number];

/** 머무르지 않고 스스로 넘어가는 걸음들 — 뒤로 갈 때 그냥 지나친다. */
const PASSING: Step[] = ['loading'];

/** 바탕이 검은 걸음 — 나머지는 질문 화면의 종이색(taupe)이다. */
const DARK_STEPS: Step[] = ['intro'];

/** 질문 화면들이 쓰는 띠 — 그 화면들의 바탕과 같은 색이다. */
const PAPER_TINT: StatusTint = { color: Surface.card, icons: 'dark' };

/**
 * 첫 실행에 묻는 것들 — 첫 화면부터 권한까지.
 *
 * 이 컴포넌트는 묻기만 하고 아무것도 저장하지 않는다. 마지막 걸음을 넘기면 받아 낸 답을
 * 통째로 onFinish에 넘기고, 그것으로 무엇을 할지는 부르는 쪽이 정한다 — 그래서 진짜
 * 온보딩(app/onboarding.tsx)은 저장하고 설정의 미리보기(app/splash-preview.tsx)는
 * 저장하지 않는다. 같은 화면을 두 벌 만들지 않아도 되는 이유다.
 */
export default function SplashFlow({
  onFinish,
  askPermissions = true,
}: {
  onFinish: (answers: SplashAnswers) => void;
  /**
   * 권한 질문에서 실제로 기기에 권한을 물을지. 미리보기는 끈다 — 미리 보다가 알림 팝업이나
   * 시스템 설정이 열리면 안 된다(그때는 토글만 켜고 끈다).
   */
  askPermissions?: boolean;
}) {
  const [step, setStep] = useState<Step>('intro');

  /**
   * 지금까지 받아 낸 답.
   *
   * 걸음마다 화면을 갈아 끼우므로 답을 화면 안에 둘 수 없다 — 뒤로 갔다 오면 사라진다.
   * 여기 모아 두면 마지막에 한 번에 넘길 수 있고, 뒤로 갔다 와도 고른 것이 남는다.
   */
  const [fields, setFields] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [bookId, setBookId] = useState<BookId | null>(null);
  const [alarm, setAlarm] = useState<SplashAlarmChoice | null>(null);

  /** 다음 걸음으로. 마지막에서는 더 가지 않는다. */
  const next = () => {
    const index = STEPS.indexOf(step);
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
  };

  /**
   * 한 걸음 되돌아간다. 맨 앞에서는 그대로 있는다.
   *
   * 스스로 넘어가는 걸음(로딩)은 건너뛴다. 거기 내려놓으면 다시 앞으로 밀려나서
   * 뒤로가기가 듣지 않는 것처럼 보인다.
   */
  const back = () => {
    let index = STEPS.indexOf(step) - 1;
    while (index > 0 && PASSING.includes(STEPS[index])) index -= 1;
    if (index >= 0) setStep(STEPS[index]);
  };

  /** 마지막 걸음 — 받아 낸 것을 통째로 넘긴다. */
  const finish = () => {
    if (!bookId || !alarm || !frequency || !purpose) return;
    onFinish({ fields, frequency, purpose, bookId, alarm });
  };

  return (
    <View style={styles.screen}>
      {/*
        화면마다 바탕이 검기도 하고 밝기도 하다. 상태바 띠는 그 아래 화면과 같은 색이어야
        화면 속으로 사라진다 — 걸음마다 갈아 준다.
      */}
      <StatusBarTint tint={DARK_STEPS.includes(step) ? DARK_TINT : PAPER_TINT} />

      {step === 'intro' ? <SplashIntro onDone={next} /> : null}
      {step === 'fields' ? (
        <SplashFields
          onNext={(picked) => {
            setFields(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'frequency' ? (
        <SplashChoice
          step={2}
          title="평소 책을 얼마나 자주 읽으시나요?"
          hint="알맞은 길이의 책을 추천해드릴게요"
          options={FREQUENCIES}
          initial={frequency}
          onNext={(picked) => {
            setFrequency(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'purpose' ? (
        <SplashChoice
          step={3}
          title="책을 읽는 목적이 무엇인가요?"
          hint="얼마나 자주 읽는지 궁금해요"
          options={PURPOSES}
          initial={purpose}
          onNext={(picked) => {
            setPurpose(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'loading' ? <SplashLoading onDone={next} /> : null}
      {step === 'books' ? (
        <SplashBooks
          fields={fields}
          onNext={(picked) => {
            setBookId(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'alarm' ? (
        <SplashAlarm
          onNext={(choice) => {
            setAlarm(choice);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'permissions' ? (
        <SplashPermissions onNext={finish} onBack={back} askPermissions={askPermissions} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
