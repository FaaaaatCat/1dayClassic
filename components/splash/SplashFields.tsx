import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SplashQuestion, { SplashChip } from '@/components/splash/SplashQuestion';
import { Space } from '@/constants/theme';
import { FIELD_NAMES } from '@/lib/tags';

/** 다음으로 가려면 이만큼은 골라야 한다. */
const MIN_PICKS = 3;

/**
 * 질문 1 — 어떤 분야를 읽고 싶은지.
 *
 * 고를 것은 하루 서점의 분야 필터가 쓰는 것과 같은 목록이다(lib/tags의 FIELD_NAMES).
 * 시안에는 '분야'라는 자리표시가 잔뜩 놓여 있었지만, 실제로 있는 열세 가지를 그대로 쓴다 —
 * 없는 분야를 지어내면 흐름을 보는 데도 도움이 안 된다.
 *
 * 고른 것은 어디에도 저장하지 않는다(SplashPreviewScreen 주석 참고). 다만 다음 질문의 안내
 * 문구가 "골라주신 ○○, ○○을 토대로"라고 되비치므로, 고른 분야만 위로 올려 준다.
 */
export default function SplashFields({
  onNext,
  onBack,
}: {
  onNext: (fields: string[]) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (name: string) =>
    setPicked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  return (
    <SplashQuestion
      step={1}
      title="관심있는 책이 어떤 쪽인가요?"
      hint={`최소 ${MIN_PICKS}개 이상의 분야를 골라주세요`}
      canGoNext={picked.length >= MIN_PICKS}
      onNext={() => onNext(picked)}
      onBack={onBack}>
      {/* 알약들은 폭이 제각각이라 줄을 미리 나누지 않고 흐르게 둔다. */}
      <View style={styles.wrap}>
        {FIELD_NAMES.map((name) => (
          <SplashChip
            key={name}
            label={name}
            selected={picked.includes(name)}
            onPress={() => toggle(name)}
          />
        ))}
      </View>
    </SplashQuestion>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space[8],
  },
});
