import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import SplashQuestion, { BODY_GUTTER, SplashChip } from '@/components/splash/SplashQuestion';
import { Space } from '@/constants/theme';

/**
 * 고를 분야 — 피그마 시안 '첫 실행 — 질문 1 분야'의 열네 가지.
 *
 * 예전엔 서점 필터의 분야(lib/tags의 FIELD_NAMES)를 썼는데, 시안이 일반 서점의 분야로 바뀌었다.
 * 고른 분야는 아직 책을 거르는 데 쓰지 않으므로(SplashBooks 주석) 서점 분류와 맞출 일은 없다.
 */
const FIELDS = [
  '소설·시·희곡',
  '에세이',
  '인문학',
  '역사·문화',
  '사회과학',
  '경제·경영',
  '자기계발',
  '과학',
  '기술·공학',
  '예술·대중문화',
  '종교',
  '건강·취미·실용',
  '어린이·청소년',
  '외국어·학습',
] as const;

/** 다음으로 가려면 이만큼은 골라야 한다. */
const MIN_PICKS = 3;
/** 한 줄에 놓는 수. */
const PER_ROW = 2;
/** 알약 사이의 틈 — 가로세로 같다. */
const GAP = Space[12];

/**
 * 질문 1 — 어떤 분야를 읽고 싶은지.
 *
 * 고를 것은 시안의 열네 가지다(위 FIELDS).
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
      title="관심있는 분야가 무엇인가요?"
      hint={`최소 ${MIN_PICKS}개 이상 선택지를 골라주세요`}
      canGoNext={picked.length >= MIN_PICKS}
      onNext={() => onNext(picked)}
      onBack={onBack}>
      <View style={styles.grid}>
        {FIELDS.map((name) => (
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
