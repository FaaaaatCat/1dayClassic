import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import CoverMark from '@/components/book/CoverMark';
import { Type } from '@/constants/theme';
import type { CoverDesign } from '@/types';

/**
 * 표지 비율 — 신국판 152×225. 실제 표지가 들어오더라도 같은 틀에 앉는다.
 * 화면마다 폭만 정하고 높이는 여기서 나온다 — 그래야 열 권이 한 줄에 나란히 선다.
 */
export const COVER_RATIO = 1.45;

/** 안쪽 여백 — 표지 폭의 9%. 인쇄물의 판면 여백에 해당한다. */
const INSET = 0.09;

/**
 * 아래쪽에서 비워 두는 몫 — 표지 높이의 20%.
 *
 * 저자와 출판사 마크가 앉는 자리다. 패턴도 제목도 이 선을 넘지 않는다 —
 * 시안에서 패턴 아래쪽이 저자 줄과 겹쳤던 것이 이 값이 없어서였다.
 */
const FOOTER_ZONE = 0.2;

/** 제목 블록(제목+부제)이 쓰는 몫 — 표지 높이의 42%. 나머지가 패턴 띠의 몫이다. */
const TITLE_ZONE = 0.42;

/** 제목 블록과 패턴 띠 사이에 두는 숨. 어림한 제목 높이가 조금 빗나가도 여기서 받는다. */
const BAND_GAP = 0.035;

/**
 * 어두운 표지가 검은 바탕 위에서 사라지지 않게 세워 두는 한 겹.
 * 입체 표지의 책등도 같은 이유로 이 값을 쓴다(BookCover3D).
 */
export const DARK_EDGE = {
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.16)',
} as const;

/** 이보다 좁으면 패턴도 저자 줄도 뭉개져 보이지 않는다 — 종이색과 제목만 남긴다. */
const COMPACT_WIDTH = 80;

interface BookCoverProps {
  design: CoverDesign;
  /** 표지 폭. 높이는 COVER_RATIO가 정한다. */
  width: number;
  /** 모서리. 기본 2 — 기존 표지 그림들이 쓰던 값이다. */
  radius?: number;
  /** 그림자처럼 바깥에서 얹는 것들. 크기는 여기서 덮지 않는다. */
  style?: StyleProp<ViewStyle>;
}

/**
 * 코드로 그리는 책 표지 — 다섯 층(종이 · 패턴 · 제목 · 저자 · 마크).
 *
 * 사진을 붙이면 책이 아니라 콘텐츠 카드로 읽힌다. 그래서 그림을 가져오지 않고 그린다.
 * SVG를 쓰지 않는 것은 도형이 전부 네모와 반원이라 View로 충분하기 때문이다 —
 * 표지 하나를 그리려고 렌더러를 하나 더 들일 이유가 없다.
 *
 * 모든 치수가 width에 비례한다. 고정 px로 두면 서점 격자(108)에서 넘치고 홈(160)에서 빈다.
 */
export default function BookCover({ design, width, radius = 2, style }: BookCoverProps) {
  const height = width * COVER_RATIO;
  const inset = width * INSET;
  const usableW = width - inset * 2;
  const compact = width < COMPACT_WIDTH;

  const centered = design.align === 'center';

  /** 제목이 차지할 수 있는 높이 — 표지의 42%. 작으면 즉시 카드처럼 보인다. */
  const title = fitTitleBlock(design, usableW, height * TITLE_ZONE, width * 0.03);

  /**
   * 패턴 띠는 제목의 반대편에 두고, 높이는 제목이 남긴 만큼으로 정한다.
   *
   * 세로로 고르게 펼치면 가운데 정렬된 제목 위로 글자가 지나간다. 그래서 띠를 위아래로
   * 밀어붙이는데, 높이를 상수로 못박으면 그것만으로는 안 막힌다 — 가운데 정렬은 위아래
   * 띠가 각각 24%씩 가져가 한가운데에 제목이 들어갈 자리가 남지 않았다(160폭에서 66밖에
   * 안 남는 자리에 150짜리 제목이 앉았다). 제목이 주인공이니 제목이 먼저 자리를 잡고,
   * 띠는 남은 만큼만 차지한다. 한 줄도 못 앉을 만큼 얇아지면 아예 걷는다.
   */
  const bandTop = design.align !== 'top';
  const bandBottom = design.align !== 'bottom';
  const bandCount = (bandTop ? 1 : 0) + (bandBottom ? 1 : 0);
  const gap = height * BAND_GAP;
  /**
   * 제목이 앉는 자리의 아래 끝. 저자 몫에 숨 한 칸을 더해 띄운다 —
   * 딱 붙여 두면 아래 정렬된 제목의 마지막 줄이 저자 이름에 닿는다.
   */
  const zoneBottom = compact ? inset : height * FOOTER_ZONE + gap;
  const zoneH = height - inset - zoneBottom;
  const bandH = (zoneH - title.height - gap * bandCount) / Math.max(1, bandCount);
  /** 패턴 글자 한 줄이 앉을 자리도 안 되면 띠를 그리지 않는다. */
  const banded = !compact && bandH >= width * 0.062 * 1.2;

  return (
    <View
      // 표지는 그림일 뿐이라 손가락을 받지 않는다 — 받으면 그 위 탭이 아래로 못 내려간다.
      pointerEvents="none"
      style={[
        { width, height, borderRadius: radius, backgroundColor: design.paper },
        styles.cover,
        // 어두운 표지는 검은 홈 화면 위에서 경계가 사라진다. 테두리 한 겹으로 세워 둔다.
        design.dark && styles.darkEdge,
        style,
      ]}>
      {banded && bandTop && (
        <PatternBand design={design} width={width} height={height} bandH={bandH} inset={inset} place="top" />
      )}
      {banded && bandBottom && (
        <PatternBand design={design} width={width} height={height} bandH={bandH} inset={inset} place="bottom" />
      )}

      {/* 제목 — 표지의 주인공. 아래쪽 20%는 저자 줄의 몫이라 넘어가지 않는다. */}
      <View
        style={[
          styles.titleZone,
          {
            top: inset,
            left: inset,
            right: inset,
            bottom: zoneBottom,
            justifyContent: verticalOf(design.align),
            alignItems: centered ? 'center' : 'flex-start',
          },
        ]}>
        <Text
          numberOfLines={4}
          style={{
            fontFamily: Type.readingBold,
            fontSize: title.size,
            lineHeight: title.size * 1.28,
            color: design.ink,
            textAlign: centered ? 'center' : 'left',
          }}>
          {design.title}
        </Text>
        {design.subtitle && !compact ? (
          <Text
            numberOfLines={2}
            style={{
              fontFamily: Type.readingRegular,
              fontSize: title.size * 0.42,
              lineHeight: title.size * 0.58,
              marginTop: width * 0.03,
              color: design.ink,
              opacity: 0.72,
              textAlign: centered ? 'center' : 'left',
            }}>
            {design.subtitle}
          </Text>
        ) : null}
      </View>

      {/* 저자와 출판사 마크. 마크는 절대 빼지 않는다 — 이 하나가 카드를 책으로 만든다. */}
      {!compact && (
        <View
          style={[
            styles.footer,
            { left: inset, right: inset, bottom: inset, alignItems: centered ? 'center' : 'flex-start' },
          ]}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: Type.ui,
              fontSize: width * 0.058,
              color: design.ink,
              opacity: 0.68,
            }}>
            {design.author}
          </Text>
          <View style={[styles.imprint, { marginTop: width * 0.05, gap: width * 0.035 }]}>
            <CoverMark kind={design.mark} size={width * 0.075} color={design.ink} />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: Type.ui,
                fontSize: width * 0.05,
                color: design.ink,
                opacity: 0.68,
              }}>
              {design.imprint}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * 패턴 한 띠 — 목차에서 뽑은 글자를 반복해 깐다.
 *
 * 이게 표지에 밀도를 준다. 사진 한 장 없이도 허전하지 않은 이유가 여기 있다.
 * 불투명도를 22%로 두는 건 읽히자고 놓은 글이 아니기 때문이다 — 더 진하면 제목과
 * 다투고, 더 옅으면 종이가 그냥 비어 보인다.
 */
function PatternBand({
  design,
  width,
  height,
  bandH,
  inset,
  place,
}: {
  design: CoverDesign;
  width: number;
  height: number;
  /** 띠 높이 — 제목이 남긴 만큼. 부르는 쪽이 정한다. */
  bandH: number;
  inset: number;
  place: 'top' | 'bottom';
}) {
  const size = width * 0.062;
  const columnGap = width * 0.05;
  const rowGap = width * 0.042;
  const items = repeatToFill(
    design.pattern,
    bandCapacity({
      bandW: width - inset * 2,
      bandH,
      size,
      columnGap,
      rowGap,
      pattern: design.pattern,
    }),
  );

  return (
    <View
      // 띠 밖으로 넘치는 글자는 잘라 낸다 — 넘친 줄이 제목 자리로 흘러들면 안 된다.
      pointerEvents="none"
      style={[
        styles.band,
        {
          left: inset,
          right: inset,
          height: bandH,
          ...(place === 'top' ? { top: inset } : { bottom: height * FOOTER_ZONE }),
          columnGap,
          rowGap,
        },
      ]}>
      {items.map((text, index) => (
        <Text
          key={`${text}-${index}`}
          style={{
            fontFamily: Type.readingRegular,
            fontSize: size,
            lineHeight: size * 1.2,
            color: design.ink,
            opacity: 0.22,
          }}>
          {text}
        </Text>
      ))}
    </View>
  );
}

/**
 * 이 띠에 몇 개가 들어가는지 어림한다.
 *
 * 개수를 상수로 못박으면 항목 길이에 따라 띠가 비거나 남는다 — 영어의 'A'는 한 행에 열
 * 개가 들어가고 천자문의 '天地玄黃'은 두 개가 들어간다. 한 번은 16개로 두었더니 영어
 * 표지의 띠 아래가 반쯤 비었다. 그래서 개수를 세지 않고 자리를 잰다.
 */
function bandCapacity({
  bandW,
  bandH,
  size,
  columnGap,
  rowGap,
  pattern,
}: {
  bandW: number;
  bandH: number;
  size: number;
  columnGap: number;
  rowGap: number;
  pattern: string[];
}): number {
  /** 항목 길이가 제각각이면 평균으로 잡는다 — 한 행에 몇 개가 앉을지의 어림값이다. */
  const averageEm =
    pattern.reduce((sum, text) => sum + emWidth(text), 0) / Math.max(1, pattern.length);
  const perRow = Math.floor((bandW + columnGap) / Math.max(1, averageEm * size + columnGap));
  const rows = Math.floor((bandH + rowGap) / (size * 1.2 + rowGap));
  // 넉넉히 잡아 잘리게 두는 편이, 모자라 비는 것보다 낫다.
  return Math.max(1, perRow * rows + perRow);
}

/**
 * 목차 항목이 모자라면 되풀이해서 띠를 채운다. 띠가 반쯤 비면 패턴이 아니라
 * 흘리다 만 글자로 보인다.
 */
function repeatToFill(pattern: string[], want: number): string[] {
  if (pattern.length === 0) return [];
  const filled: string[] = [];
  while (filled.length < want) filled.push(...pattern);
  return filled.slice(0, want);
}

/** 한글·한자는 한 칸을 다 쓰고 로마자·숫자·공백은 대략 절반이다(lib/card-pages와 같은 셈). */
const FULL_WIDTH = /[ᄀ-ᇿ⺀-꓏가-힣豈-﫿︰-﹏＀-｠]/;

function emWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += FULL_WIDTH.test(ch) ? 1 : 0.5;
  return width;
}

/**
 * 주어진 자리에 들어가는 가장 큰 제목 크기와, 그때 제목 블록이 차지하는 높이.
 *
 * 고정 px로 두면 짧은 제목은 초라하고 긴 제목은 넘친다. 그래서 크기를 정해 두지 않고,
 * 큰 쪽에서 내려오며 처음으로 자리에 들어맞는 값을 고른다.
 *
 * 부제까지 함께 잰다. 예전에는 제목만 재고 부제를 그 아래 얹었는데, 그러면 블록이 예산을
 * 훌쩍 넘어(160폭에서 97 예산에 150이 들어찼다) 아래 패턴 띠를 파고들었다. 재는 것과
 * 놓는 것이 어긋나면 어디선가 겹친다.
 *
 * 폭을 실제로 재지 않고 전각·반각으로 어림하는 것은, 재려면 한 번 그린 뒤 다시 나눠야
 * 해서 표지가 눈앞에서 재배치되기 때문이다. 어림값이라 위아래로 조금 빗나가는데,
 * 그 몫은 BAND_GAP이 받는다.
 */
function fitTitleBlock(
  design: CoverDesign,
  usableW: number,
  maxH: number,
  subtitleGap: number,
): { size: number; height: number } {
  // 띄어쓰기까지 센다. 빼고 재면 '하루 논어'가 한 줄로 계산되는데 실제로는 두 줄로
  // 흘러(공백도 폭을 차지한다) 블록이 예산을 넘고 아래 패턴 띠를 파고들었다.
  const em = Math.max(1, emWidth(design.title));
  const subEm = design.subtitle ? emWidth(design.subtitle) : 0;
  const floor = usableW / 12;

  for (let size = usableW / 2; size > floor; size -= 0.5) {
    /** 한 줄에 들어가는 글자 수(전각 기준). */
    const lines = Math.ceil(em / (usableW / size));
    let block = lines * size * 1.28;

    if (design.subtitle) {
      const subSize = size * 0.42;
      // 부제는 두 줄까지만 찍는다(numberOfLines) — 셈도 거기서 멈춰야 맞는다.
      const subLines = Math.min(2, Math.ceil(subEm / (usableW / subSize)));
      block += subtitleGap + subLines * size * 0.58;
    }

    if (block <= maxH) return { size, height: block };
  }
  return { size: floor, height: maxH };
}

function verticalOf(align: CoverDesign['align']): ViewStyle['justifyContent'] {
  if (align === 'top') return 'flex-start';
  if (align === 'bottom') return 'flex-end';
  return 'center';
}

const styles = StyleSheet.create({
  cover: {
    overflow: 'hidden',
  },
  /** 어두운 표지의 테두리 — 검은 바탕과 표지가 붙어 버리는 것을 막는 한 겹. */
  darkEdge: DARK_EDGE,
  titleZone: {
    position: 'absolute',
  },
  band: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
  },
  imprint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
