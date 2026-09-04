import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import SplashAlarm from '@/components/splash/SplashAlarm';
import SplashBooks from '@/components/splash/SplashBooks';
import SplashFields from '@/components/splash/SplashFields';
import SplashHome from '@/components/splash/SplashHome';
import SplashIntro from '@/components/splash/SplashIntro';
import SplashLoading from '@/components/splash/SplashLoading';
import SplashLogin from '@/components/splash/SplashLogin';
import SplashPermissions from '@/components/splash/SplashPermissions';
import { DARK_TINT, StatusBarTint, type StatusTint } from '@/components/StatusBarTint';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 첫 실행 흐름 미리보기 — 설정에서 연다.
 *
 * 실제 앱에는 아직 붙이지 않았다. 스플래시부터 홈까지 이어지는 길을 눈으로 먼저 확인하려고
 * 만든 자리고, 여기서 정해진 뒤에 붙인다.
 *
 * 그래서 이 안의 화면들은 **아무것도 저장하지 않는다.** 책을 고르든 알람을 켜든 그 선택은
 * 이 화면을 닫는 순간 사라진다 — 흐름을 보는 것이 목적이지 설정을 하는 자리가 아니다.
 *
 * 걸음은 아래 STEPS 하나로 정해진다. 질문 화면들은 한 걸음씩 앞뒤로 오가고, 어느 걸음에서든
 * 우측 위 ✕로 미리보기를 닫고 설정으로 돌아간다.
 */
const STEPS = [
  'intro',
  'login',
  'q1',
  'q1loading',
  'q2',
  'q3',
  'q4',
  'home',
] as const;

type Step = (typeof STEPS)[number];

/** 질문 화면의 머리띠 높이(SplashQuestion) — 닫기 버튼을 그 아래로 내리는 데 쓴다. */
const HEADER_BAND = 60;

export default function SplashPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('intro');
  /**
   * 질문 1에서 고른 분야. 저장하지 않고 이 화면이 열려 있는 동안만 들고 있다 —
   * 질문 2의 안내 문구가 "골라주신 ○○, ○○을 토대로"라고 되비쳐야 하기 때문이다.
   */
  const [fields, setFields] = useState<string[]>([]);

  /** 다음 걸음으로. 마지막에서는 더 가지 않는다. */
  const next = () => {
    const index = STEPS.indexOf(step);
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
  };

  /**
   * 한 걸음 되돌아간다 — 질문 화면들의 뒤로가기가 쓴다. 맨 앞에서는 그대로 있는다.
   *
   * 스스로 넘어가는 걸음(로딩)은 건너뛴다. 거기 내려놓으면 다시 앞으로 밀려나서
   * 뒤로가기가 듣지 않는 것처럼 보인다.
   */
  const back = () => {
    let index = STEPS.indexOf(step) - 1;
    while (index > 0 && PASSING.includes(STEPS[index])) index -= 1;
    if (index >= 0) setStep(STEPS[index]);
  };

  /** 미리보기를 닫고 설정으로 — 우측 위 ✕와 마지막 화면의 버튼이 함께 쓴다. */
  const close = () => router.replace('/settings');

  return (
    <View style={styles.screen}>
      {/*
        화면마다 바탕이 검기도 하고 밝기도 하다. 상태바 띠는 그 아래 화면과 같은 색이어야
        화면 속으로 사라진다 — 걸음마다 갈아 준다.
      */}
      <StatusBarTint tint={DARK_STEPS.includes(step) ? DARK_TINT : PAPER_TINT} />

      {step === 'intro' ? <SplashIntro onStart={next} /> : null}
      {step === 'login' ? <SplashLogin onDone={next} /> : null}
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
      {step === 'q2' ? <SplashBooks fields={fields} onNext={next} onBack={back} /> : null}
      {step === 'q3' ? <SplashAlarm onNext={next} onBack={back} /> : null}
      {step === 'q4' ? <SplashPermissions onNext={next} onBack={back} /> : null}
      {/* 마지막이라 '다음'이 없다 — 여기서 확인하기를 누르면 미리보기가 끝난다. */}
      {step === 'home' ? <SplashHome onDone={close} /> : null}

      {/*
        나가는 문 — 미리보기라 어느 걸음에서든 바로 설정으로 되돌아간다.

        머리띠 아래 오른쪽에 둔다. 질문 화면의 뒤로가기가 왼쪽 위를 이미 쓰고 있고,
        머리띠 안에 두면 진행 줄 끝을 덮는다.
      */}
      <ScaleButton
        accessibilityLabel="미리보기 닫기"
        style={[styles.close, { top: insets.top + HEADER_BAND + Space[8] }]}
        onPress={close}>
        <Text style={styles.closeText}>✕</Text>
      </ScaleButton>
    </View>
  );
}

/** 머무르지 않고 스스로 넘어가는 걸음들 — 뒤로 갈 때 그냥 지나친다. */
const PASSING: Step[] = ['q1loading'];

/** 바탕이 검은 걸음들 — 나머지는 질문 화면의 종이색(taupe)이다. */
const DARK_STEPS: Step[] = ['intro', 'login', 'home'];

/** 질문 화면들이 쓰는 띠 — 그 화면들의 바탕과 같은 색이다. */
const PAPER_TINT: StatusTint = { color: Surface.card, icons: 'dark' };

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /** 닫기 — 어느 화면 위에든 뜬다. 밝은 화면에서도 보이게 어두운 알약을 깐다. */
  close: {
    position: 'absolute',
    right: Space[16],
    width: 36,
    height: 36,
    borderRadius: Corner.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
});
