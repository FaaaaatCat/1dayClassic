import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import BookCover, { COVER_RATIO, DARK_EDGE } from '@/components/book/BookCover';
import CoverMark from '@/components/book/CoverMark';
import { Type } from '@/constants/theme';
import type { CoverDesign } from '@/types';

/**
 * 세워 둔 책 — 앞표지를 26° 돌리고 그 왼쪽에 책등을 세운다.
 *
 * 홈과 알람에서만 쓴다. 서점 격자에서 백 권이 다 기울면 어지럽고 렌더 비용도 크다.
 *
 * RN에는 transform-style: preserve-3d가 없어 진짜 3D 상자를 만들 수 없다. 그런데 필요가
 * 없다 — 각도가 26°로 고정이라, 3D 엔진 대신 '그 각도에서 그렇게 보이는 납작한 도형 둘'을
 * 나란히 그리면 된다. 앞표지는 RN의 rotateY가 원근까지 알아서 넣어 주고, 책등은 그 결과에
 * 맞춰 자리와 크기를 계산해 붙인 사각형이다.
 */

/** 책을 돌린 각도. 10°는 차이가 안 느껴지고 42°는 제목이 눌린다. */
const ANGLE = 26;

/**
 * 책 두께 — 표지 폭의 22%.
 *
 * 실제 책은 10% 남짓이지만 그 비율로는 화면에서 책등이 거의 안 보인다. 과장하는 게 맞다.
 * 26°로 돌리면 이 두께가 화면에서는 폭의 8% 남짓으로 줄어든다(sin 26° = 0.44에 원근까지).
 */
const THICKNESS = 0.22;

/** 원근 거리. 더 멀면 각도 차이가 안 보이고, 더 가까우면 왜곡이 과해진다. */
const PERSPECTIVE = 850;

/** 책등에 글자를 넣을 수 있는 최소 폭. 이보다 좁으면 획이 뭉쳐 얼룩으로만 보인다. */
const SPINE_TEXT_MIN = 8;

interface BookCover3DProps {
  design: CoverDesign;
  /** 앞표지 폭. 무대 전체 크기는 여기서 나온다(폭보다 조금 좁고 높이는 조금 높다). */
  width: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** 원근 배율 — z가 클수록(눈에 가까울수록) 커진다. */
function scaleAt(z: number): number {
  return PERSPECTIVE / (PERSPECTIVE - z);
}

/**
 * 26°로 돌린 책의 화면상 치수.
 *
 * 책 좌표에서 앞표지는 z = 0 평면의 x ∈ [-W/2, W/2], 책등은 x = -W/2 평면의 z ∈ [-T, 0]이다.
 * y축으로 θ만큼 돌리면 x' = x·cos θ + z·sin θ, z' = -x·sin θ + z·cos θ (CSS와 같은 규약,
 * z'이 클수록 눈에 가깝다). 여기에 원근 배율을 곱한 것이 화면 위치다.
 *
 * 세 모서리만 알면 된다 — 앞표지의 왼쪽(책등이 붙는 접힘선)·오른쪽, 그리고 책등의 바깥쪽.
 *
 * 계산 결과 무대 상자가 실제로 칠해지는 범위와 정확히 같아진다(앞표지 상자는 오른쪽으로
 * 넘치지만 그 부분은 투명하다). 그래서 넘침이 잘려도 잃는 것이 없고, 가운데를 따로 밀어
 * 줄 필요도 없다.
 */
export function cover3dGeometry(width: number) {
  const radians = (ANGLE * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const half = width / 2;
  const height = width * COVER_RATIO;
  const thickness = width * THICKNESS;

  /** 접힘선(앞표지 왼쪽)은 눈 쪽으로 나오고, 앞표지 오른쪽은 그만큼 뒤로 물러난다. */
  const zFold = sin * half;
  const zBack = zFold - cos * thickness;

  const foldX = scaleAt(zFold) * -(cos * half);
  const rightX = scaleAt(-zFold) * (cos * half);
  const backX = scaleAt(zBack) * -(cos * half + sin * thickness);

  /**
   * 책등 높이는 접힘선 쪽에 맞춘다.
   *
   * 원근을 넣으면 책등은 정확히는 사다리꼴이다 — 접힘선 쪽이 높고 바깥쪽이 낮다. 사각형
   * 하나로는 사다리꼴이 안 나오고 skewY로도 평행사변형까지다(두 변이 같은 쪽으로 기운다).
   * 그래서 눈에 보이는 이음선인 접힘선 쪽을 정확히 맞추고, 바깥 실루엣이 위아래로 폭의
   * 3%쯤 높아지는 것은 둔다 — 배경과 맞닿는 변이라 그 차이는 드러나지 않는다.
   */
  const spineH = height * scaleAt(zFold);

  return {
    height,
    /** 무대(칠해지는 범위) 크기. */
    stageW: rightX - backX,
    stageH: spineH,
    /** 책등 — 무대 왼쪽 끝에 붙는다. */
    spineW: foldX - backX,
    spineH,
    /** 앞표지 상자를 놓을 자리. 상자 왼쪽 변과 칠해지는 왼쪽 변은 다르다. */
    coverLeft: -backX - half,
    coverTop: (spineH - height) / 2,
  };
}

export default function BookCover3D({ design, width, radius = 2, style }: BookCover3DProps) {
  const geometry = cover3dGeometry(width);

  return (
    // 그림일 뿐이라 손가락을 받지 않는다 — 받으면 그 위 탭이 아래로 못 내려간다.
    <View
      pointerEvents="none"
      style={[{ width: geometry.stageW, height: geometry.stageH }, style]}>
      <Spine design={design} width={width} geometry={geometry} />

      <BookCover
        design={design}
        width={width}
        radius={radius}
        // 무대 안에서는 자르지 않는다 — BookCover의 clip 주석 참고.
        clip={false}
        style={{
          position: 'absolute',
          left: geometry.coverLeft,
          top: geometry.coverTop,
          transform: [{ perspective: PERSPECTIVE }, { rotateY: `${ANGLE}deg` }],
        }}
      />
    </View>
  );
}

/**
 * 책등 — 앞표지와 같은 종이색에 rgba(0,0,0,.2) 그늘 한 겹.
 *
 * 색을 따로 정하지 않는 것이 규칙이다. 같은 색에 그늘만 지면 접힘선이 저절로 생기고,
 * 어두운 표지(채근담)는 이 그늘 덕분에 평면일 때보다 오히려 낫다 — 검은 배경과의 경계가
 * 그늘로 살아난다.
 */
function Spine({
  design,
  width,
  geometry,
}: {
  design: CoverDesign;
  width: number;
  geometry: ReturnType<typeof cover3dGeometry>;
}) {
  const { spineW, spineH } = geometry;
  const size = spineW * 0.72;
  const padding = width * 0.05;

  /**
   * 책등 제목은 한 글자씩 내려 쓴다. 공백은 뺀다 — 세로쓰기에서 빈 칸은 글자가 끊긴 것으로
   * 보인다. 마크 자리를 남기고 들어가는 만큼만 쓰고 나머지는 자른다.
   */
  const marks = spineW * 0.6;
  const room = spineH - padding * 2 - marks - width * 0.04;
  const letters = [...design.title.replace(/\s+/g, '')].slice(
    0,
    Math.max(0, Math.floor(room / (size * 1.16))),
  );
  const legible = spineW >= SPINE_TEXT_MIN;

  return (
    <View
      style={[
        styles.spine,
        {
          width: spineW,
          height: spineH,
          backgroundColor: design.paper,
          paddingVertical: padding,
        },
        // 앞표지와 같은 이유로 어두운 책등에도 테두리 한 겹(BookCover의 darkEdge).
        design.dark && DARK_EDGE,
      ]}>
      {/* 그늘은 글자 아래에 깔린다 — 책등 글자까지 함께 어두워지면 그냥 안 보인다. */}
      <View style={[StyleSheet.absoluteFill, styles.shade]} />

      {legible ? (
        <>
          <View>
            {letters.map((letter, index) => (
              <Text
                key={`${letter}-${index}`}
                style={{
                  // 작은 글씨라 굵은 획은 뭉친다 — 앞표지 제목과 달리 여기는 보통 굵기다.
                  fontFamily: Type.readingRegular,
                  fontSize: size,
                  lineHeight: size * 1.16,
                  color: design.ink,
                  textAlign: 'center',
                }}>
                {letter}
              </Text>
            ))}
          </View>
          <CoverMark kind={design.mark} size={marks} color={design.ink} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 자르지도 둥글리지도 않는다. 글자는 들어갈 만큼만 미리 뽑아 두었고, 모서리를 둥글리면
   * 안드로이드가 모서리 경로로 자식을 자르는데 그 경로가 비어 그늘까지 사라졌다
   * (BookCover의 clip 주석 참고). 2px 모서리는 이 크기에서 보이지 않는다.
   */
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shade: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});
