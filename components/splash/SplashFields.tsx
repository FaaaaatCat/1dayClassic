import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import SplashQuestion, { BODY_GUTTER, SplashChip } from '@/components/splash/SplashQuestion';
import { Space } from '@/constants/theme';
import { FIELD_NAMES } from '@/lib/tags';

/** 다음으로 가려면 이만큼은 골라야 한다. */
const MIN_PICKS = 3;
/** 한 줄에 놓는 수. */
const PER_ROW = 2;
/** 알약 사이의 틈 — 가로세로 같다. */
const GAP = Space[12];

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
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<string[]>([]);

  /**
   * 알약 하나의 폭.
   *
   * 글자만큼만 넓어지게 두면 '고전'과 '문학·에세이'가 한 줄에 셋씩 붙었다 둘씩 붙었다 해서
   * 줄마다 격자가 어긋난다. 남는 폭을 둘로 나눠 못 박아 두면 어느 줄이든 둘씩 선다.
   */
  const chipWidth = (width - BODY_GUTTER * 2 - GAP * (PER_ROW - 1)) / PER_ROW;

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
      <View style={styles.grid}>
        {FIELD_NAMES.map((name) => (
          <SplashChip
            key={name}
            label={name}
            width={chipWidth}
            selected={picked.includes(name)}
            onPress={() => toggle(name)}
          />
        ))}
      </View>
    </SplashQuestion>
  );
}

const styles = StyleSheet.create({
  /** 둘씩 흐르는 격자. 폭을 못 박았으므로 줄바꿈은 알아서 둘에서 일어난다. */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: GAP,
  },
});
