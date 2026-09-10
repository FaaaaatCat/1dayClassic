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

/** 패턴 띠 하나의 높이 — 표지 높이 기준. */
const BAND = 0.24;

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

  /** 제목이 차지할 수 있는 높이 — 표지의 40%를 넘겨 잡는다. 작으면 즉시 카드처럼 보인다. */
  const titleSize = fitTitleSize(design.title, usableW, height * 0.42);
  const centered = design.align === 'center';

  /**
   * 패턴 띠는 제목의 반대편에 둔다.
   *
   * 세로로 고르게 펼치면 가운데 정렬된 제목 위로 글자가 지나간다. 띠를 위아래로 밀어붙이고
   * 제목이 앉는 쪽을 비우면 겹칠 자리가 아예 없어진다 — 눈으로 맞추는 대신 구조로 막는다.
   */
  const bandTop = design.align !== 'top';
  const bandBottom = design.align !== 'bottom';

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
      {!compact && bandTop && (
        <PatternBand design={design} width={width} height={height} inset={inset} place="top" />
      )}
      {!compact && bandBottom && (
        <PatternBand design={design} width={width} height={height} inset={inset} place="bottom" />
      )}

      {/* 제목 — 표지의 주인공. 아래쪽 20%는 저자 줄의 몫이라 넘어가지 않는다. */}
      <View
        style={[
          styles.titleZone,
          {
            top: inset,
            left: inset,
            right: inset,
            bottom: compact ? inset : height * FOOTER_ZONE,
            justifyContent: verticalOf(design.align),
            alignItems: centered ? 'center' : 'flex-start',
          },
        ]}>
        <Text
          numberOfLines={4}
          style={{
            fontFamily: Type.readingBold,
            fontSize: titleSize,
            lineHeight: titleSize * 1.28,
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
              fontSize: titleSize * 0.42,
              lineHeight: titleSize * 0.58,
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
  inset,
  place,
}: {
  design: CoverDesign;
  width: number;
  height: number;
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
      bandH: height * BAND,
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
          height: height * BAND,
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
 * 주어진 자리에 들어가는 가장 큰 제목 크기.
 *
 * 고정 px로 두면 짧은 제목은 초라하고 긴 제목은 넘친다. 그래서 크기를 정해 두지 않고,
 * 큰 쪽에서 내려오며 처음으로 자리에 들어맞는 값을 고른다. 짧은 제목은 커지고 긴 제목은
 * 줄어들되, 어느 쪽도 아래 저자 줄을 침범하지 않는다.
 *
 * 폭을 실제로 재지 않고 전각·반각으로 어림하는 것은, 재려면 한 번 그린 뒤 다시 나눠야
 * 해서 표지가 눈앞에서 재배치되기 때문이다.
 */
function fitTitleSize(title: string, usableW: number, maxH: number): number {
  const em = Math.max(1, emWidth(title.replace(/\s+/g, '')));
  const floor = usableW / 12;

  for (let size = usableW / 2; size > floor; size -= 0.5) {
    /** 한 줄에 들어가는 글자 수(전각 기준). */
    const perLine = usableW / size;
    const lines = Math.ceil(em / perLine);
    if (lines * size * 1.28 <= maxH) return size;
  }
  return floor;
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
  darkEdge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
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
