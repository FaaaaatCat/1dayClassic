import { StyleSheet, View } from 'react-native';

import type { CoverMark as CoverMarkKind } from '@/types';

interface CoverMarkProps {
  kind: CoverMarkKind;
  /** 글리프가 들어앉는 정사각형의 한 변. 표지 폭에 비례해 부르는 쪽이 정한다. */
  size: number;
  /** 표지의 잉크색. 마크는 제 색을 갖지 않는다 — 표지마다 잉크가 다르기 때문이다. */
  color: string;
}

/**
 * 출판사 마크 — 표지 하단의 작은 글리프.
 *
 * 이 하나가 카드를 책으로 만든다. 종이색과 활자만 있으면 예쁜 카드로 읽히고, 마크가
 * 붙는 순간 어딘가에서 찍어 낸 물건이 된다. 그래서 표지에서 절대 빼지 않는다.
 *
 * 그림 파일이 아니라 View로 그린다. 출판사가 넷이든 마흔이든 에셋이 늘지 않고, 잉크색을
 * 받아 그리므로 어느 표지에 놓아도 색이 어긋나지 않는다. 도형이 이만큼 단순한 것은
 * 이 크기(표지 폭의 7% 남짓)에서 그보다 복잡한 것은 어차피 뭉개져 보이지 않아서다.
 */
export default function CoverMark({ kind, size, color }: CoverMarkProps) {
  const box = { width: size, height: size };

  if (kind === 'underline') {
    // 밑줄사이 — 두 줄, 그리고 그 사이.
    const rule = { height: Math.max(1, size * 0.09), backgroundColor: color };
    return (
      <View style={[box, styles.stack]}>
        <View style={[styles.rule, rule]} />
        <View style={[styles.rule, rule, { marginTop: size * 0.26 }]} />
      </View>
    );
  }

  if (kind === 'lowline') {
    // 낮은문장 — 바닥선 위에 낮게 앉은 점 하나.
    const dot = size * 0.24;
    return (
      <View style={[box, styles.lowline]}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: color,
            marginBottom: size * 0.14,
          }}
        />
        <View style={[styles.rule, { height: Math.max(1, size * 0.09), backgroundColor: color }]} />
      </View>
    );
  }

  if (kind === 'quadrant') {
    // 첫자리 — 넷으로 나뉜 네모에서 첫 칸만 차 있다.
    return (
      <View style={[box, { borderWidth: Math.max(1, size * 0.07), borderColor: color }]}>
        <View style={{ width: '50%', height: '50%', backgroundColor: color }} />
      </View>
    );
  }

  // 한밤서가 — 반달. 위쪽만 둥근 반원이다.
  return (
    <View style={[box, styles.stack, styles.halfmoonBox]}>
      <View
        style={{
          width: size,
          height: size / 2,
          backgroundColor: color,
          borderTopLeftRadius: size / 2,
          borderTopRightRadius: size / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    justifyContent: 'center',
  },
  rule: {
    alignSelf: 'stretch',
  },
  /** 바닥선이 아래에 붙고 점이 그 위에 앉는다. */
  lowline: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  /** 반원은 정사각형 아래쪽에 붙어 지평선 위로 뜬 달이 된다. */
  halfmoonBox: {
    justifyContent: 'flex-end',
  },
});
