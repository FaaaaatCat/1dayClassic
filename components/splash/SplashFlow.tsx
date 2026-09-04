import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SplashAlarm, { type SplashAlarmChoice } from '@/components/splash/SplashAlarm';
import SplashBooks from '@/components/splash/SplashBooks';
import SplashFields from '@/components/splash/SplashFields';
import SplashIntro from '@/components/splash/SplashIntro';
import SplashLoading from '@/components/splash/SplashLoading';
import SplashPermissions from '@/components/splash/SplashPermissions';
import { DARK_TINT, StatusBarTint, type StatusTint } from '@/components/StatusBarTint';
import { Ink, Surface } from '@/constants/theme';
import type { AlarmPermissionKind } from '@/modules/alarm-clock';
import type { BookId } from '@/types';

/**
 * 첫 실행이 묻고 받아 낸 것들.
 *
 * 이 중 저장되는 것은 책과 알람뿐이다. 분야는 원래 책을 골라 주기 위한 재료라 답이 나온
 * 뒤에는 쓸 데가 없고, 권한은 값이 아니라 '물어봐 달라'는 부탁이다.
 */
export interface SplashAnswers {
  /** 고른 분야 — 저장하지 않는다. 질문 2의 안내 문구에만 쓰였다. */
  fields: string[];
  bookId: BookId;
  alarm: SplashAlarmChoice;
  /** 켜 달라고 한 권한들. 실제로 묻는 일은 이 흐름 밖에서 한다. */
  permissions: AlarmPermissionKind[];
}

/**
 * 걸음의 차례.
 *
 * 로그인은 여기 없다 — 첫 화면 마지막 장 위로 올라오는 시트라서 걸음이 아니라 그 화면이
 * 품는 상태다(SplashIntro).
 */
const STEPS = ['intro', 'q1', 'q1loading', 'q2', 'q3', 'q4'] as const;

type Step = (typeof STEPS)[number];

/** 머무르지 않고 스스로 넘어가는 걸음들 — 뒤로 갈 때 그냥 지나친다. */
const PASSING: Step[] = ['q1loading'];

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
  withLogin = false,
}: {
  onFinish: (answers: SplashAnswers) => void;
  /** 로그인 시트를 띄울지. 아직 붙일 것이 없어 미리보기에서만 켠다(SplashIntro 주석 참고). */
  withLogin?: boolean;
}) {
  const [step, setStep] = useState<Step>('intro');

  /**
   * 지금까지 받아 낸 답.
   *
   * 걸음마다 화면을 갈아 끼우므로 답을 화면 안에 둘 수 없다 — 뒤로 갔다 오면 사라진다.
   * 여기 모아 두면 마지막에 한 번에 넘길 수 있고, 뒤로 갔다 와도 고른 것이 남는다.
   */
  const [fields, setFields] = useState<string[]>([]);
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
  const finish = (permissions: AlarmPermissionKind[]) => {
    if (!bookId || !alarm) return;
    onFinish({ fields, bookId, alarm, permissions });
  };

  return (
    <View style={styles.screen}>
      {/*
        화면마다 바탕이 검기도 하고 밝기도 하다. 상태바 띠는 그 아래 화면과 같은 색이어야
        화면 속으로 사라진다 — 걸음마다 갈아 준다.
      */}
      <StatusBarTint tint={DARK_STEPS.includes(step) ? DARK_TINT : PAPER_TINT} />

      {step === 'intro' ? <SplashIntro onDone={next} withLogin={withLogin} /> : null}
      {step === 'q1' ? (
        <SplashFields
          onNext={(picked) => {
            setFields(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'q1loading' ? <SplashLoading onDone={next} /> : null}
      {step === 'q2' ? (
        <SplashBooks
          fields={fields}
          onNext={(picked) => {
            setBookId(picked);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'q3' ? (
        <SplashAlarm
          onNext={(choice) => {
            setAlarm(choice);
            next();
          }}
          onBack={back}
        />
      ) : null}
      {step === 'q4' ? <SplashPermissions onNext={finish} onBack={back} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
