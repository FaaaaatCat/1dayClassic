import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SplashQuestion, { SplashChip } from '@/components/splash/SplashQuestion';
import { Space } from '@/constants/theme';

/**
 * 하나만 고르는 질문 — 독서 빈도·독서 목적이 쓴다(피그마 시안 '질문 2 시간'·'질문 3 목적').
 *
 * 알약은 줄마다 하나씩, 화면 폭을 다 쓴다. 고르면 검게 채워지고, 하나를 골라야 다음으로
 * 갈 수 있다. 다른 것을 누르면 고른 것이 그리로 옮겨 간다.
 *
 * 답은 저장하지 않는다 — 책 추천을 다듬을 재료로 모으는 자리지만, 아직 그 추천을 만드는
 * 곳이 없다(관심 분야와 같은 사정, SplashBooks 주석 참고).
 */
export default function SplashChoice({
  step,
  title,
  hint,
  options,
  initial,
  onNext,
  onBack,
}: {
  step: number;
  title: string;
  hint: string;
  options: readonly string[];
  /** 뒤로 갔다 돌아왔을 때 남겨 둘 답. */
  initial: string | null;
  onNext: (picked: string) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(initial);

  return (
    <SplashQuestion
      step={step}
      title={title}
      hint={hint}
      canGoNext={picked !== null}
      onNext={() => picked && onNext(picked)}
      onBack={onBack}>
      <View style={styles.list}>
        {options.map((option) => (
          <SplashChip
            key={option}
            label={option}
            selected={picked === option}
            onPress={() => setPicked(option)}
          />
        ))}
      </View>
    </SplashQuestion>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Space[12],
  },
});
