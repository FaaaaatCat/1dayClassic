import { StyleSheet, View } from 'react-native';

/**
 * 꺾쇠 — 손으로 그린다.
 *
 * Ionicons의 chevron을 쓰지 않는 건 그것이 이 앱에서 유독 두껍기 때문이다. 글리프를
 * 픽셀로 재 보면 획이 아이콘 크기의 9.19%인데, 같은 화면에 있는 얇은 아이콘들
 * (notifications-outline 6.33%, lock-closed 6.16%)의 1.5배다. outline·sharp 변형도 재 봤지만
 * 셋 다 9.19%로 완전히 같아서, Ionicons 안에서는 고를 것이 없었다.
 *
 * 그래서 여기서 직접 그린다. react-native-svg를 새로 들이지 않으려고 SVG 대신 View 둘로
 * 만든다 — 끝이 둥근 막대 하나씩을 45도로 세워 맞대면 그것이 꺾쇠다.
 *
 * 치수는 눈대중이 아니라 재서 맞춘 값이다. 획은 6.3%로 얇은 아이콘들과 같은 굵기이고,
 * 차지하는 자리(size 24에서 8.5×15.4)는 Ionicons의 것(9.0×15.7)과 거의 같다 — 얇아지되
 * 화살표가 앉던 자리는 그대로여야 하기 때문이다.
 *
 * 헤더의 뒤로가기(‹)와 목록 줄 끝의 더 보기(›)가 같은 것을 쓴다. 둘은 방향만 다르고
 * 굵기와 크기가 같아야 한다 — 한 화면에서 서로 마주 보는 자리라 조금만 어긋나도 보인다.
 */
export default function Chevron({
  size = 24,
  color,
  direction = 'back',
}: {
  size?: number;
  color: string;
  /** back은 ‹, forward는 ›. 그리는 것은 하나고 좌우를 뒤집는다. */
  direction?: 'back' | 'forward';
}) {
  const stroke = size * STROKE;
  /** 꼭짓점에서 잰 세로 폭(획 굵기는 빼고). 가로는 그 절반이다. */
  const h = size * HEIGHT;
  const w = h / 2;
  /** 팔 하나의 길이 — 꼭짓점에서 끝까지. 45도라 빗변이다. */
  const arm = h / Math.SQRT2;
  /**
   * 막대는 팔보다 획 하나만큼 길다.
   *
   * 양 끝에서 stroke/2씩 더 나가야 둥근 끝의 중심이 꼭짓점과 팔 끝에 정확히 놓인다.
   * 그래야 꼭짓점에서 두 막대의 둥근 끝이 겹쳐 하나의 둥근 이음매가 된다 — 짧게 두면
   * 이음매 바깥쪽이 파여 뾰족하게 보인다.
   */
  const bar = arm + stroke;

  const barStyle = {
    width: stroke,
    height: bar,
    borderRadius: stroke / 2,
    backgroundColor: color,
    left: (w + stroke) / 2 - stroke / 2,
  };

  return (
    <View
      style={[
        { width: w + stroke, height: h + stroke },
        // ›는 ‹를 좌우로 뒤집은 것이다. 방향마다 따로 그리면 둘이 어긋날 여지가 생긴다.
        direction === 'forward' && styles.flipped,
      ]}>
      {/* 위 팔과 아래 팔. top은 막대의 중심이 팔의 한가운데 오도록 잡는다
          (RN의 rotate는 요소의 한가운데를 축으로 돈다). */}
      <View
        style={[
          styles.bar,
          barStyle,
          { top: (h / 2 + stroke) / 2 - bar / 2, transform: [{ rotate: '45deg' }] },
        ]}
      />
      <View
        style={[
          styles.bar,
          barStyle,
          { top: (3 * h) / 4 + stroke / 2 - bar / 2, transform: [{ rotate: '-45deg' }] },
        ]}
      />
    </View>
  );
}

/**
 * 획 두께 — 아이콘 크기에 대한 비율.
 *
 * Ionicons의 얇은 아웃라인 아이콘들이 6.16~6.33%라, 그 사이 값을 골랐다. 화살표만 혼자
 * 두꺼워 보이지 않게 하는 것이 이 값의 전부다.
 */
const STROKE = 0.063;

/** 세로 폭 — Ionicons chevron의 글리프 높이(size의 65.5%)에서 획 굵기를 뺀 값이다. */
const HEIGHT = 0.58;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
