import { Text, type StyleProp, type TextStyle } from 'react-native';

import type { SpokenRange } from '@/hooks/useCardNarration';

/**
 * 낭독이 읽는 자리에 밑칠을 하는 글.
 *
 * 중첩 Text 세 조각으로 그린다 — 그래야 줄바꿈과 자간을 물려받아, 밑칠이 옮겨 다녀도
 * 글이 밀리지 않는다.
 */
export default function SpokenText({
  text,
  style,
  highlightStyle,
  spoken,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  /** 지금 읽는 낱말에 입히는 옷 — 바탕이 화면마다 달라 부르는 쪽이 정한다. */
  highlightStyle: StyleProp<TextStyle>;
  spoken: SpokenRange | null;
}) {
  // 범위가 글 밖으로 나가면(문장 자리 계산이 어긋나면) 그냥 평범한 글로 둔다.
  if (!spoken || spoken.start >= text.length || spoken.end <= spoken.start) {
    return <Text style={style}>{text}</Text>;
  }
  const end = Math.min(spoken.end, text.length);

  return (
    <Text style={style}>
      {text.slice(0, spoken.start)}
      <Text style={highlightStyle}>{text.slice(spoken.start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}
