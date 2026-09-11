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
 * 저자와 출판사 마크가 앉는 자리다. 여섯 짜임이 전부 이 선을 넘지 않는다.
 * 실제로 재 보면 저자 줄 높이(폭의 20%)에 아래 여백(9%)을 더한 값과 같다.
 */
const FOOTER_ZONE = 0.2;

/** 제목 블록(제목+부제)이 쓰는 몫 — 표지 높이의 42%. 나머지가 패턴의 몫이다. */
const TITLE_ZONE = 0.42;

/** 제목 블록과 패턴 사이에 두는 숨. 어림한 제목 높이가 조금 빗나가도 여기서 받는다. */
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

/**
 * 제목 행간 — 표제용이라 바짝 붙인다.
 *
 * 본문 행간(1.6)을 표제에 그대로 쓰면 두 줄짜리 제목이 두 문장처럼 벌어진다. 표지의 제목은
 * 읽는 글이 아니라 보는 덩어리라 붙여야 한 덩이로 읽힌다. 인쇄물이면 1.04까지 가는데,
 * 안드로이드는 행간을 글자 크기보다 작게 잡으면 위아래 획이 잘리는 일이 있어 1.15에서 멈춘다.
 */
const TITLE_LEADING = 1.15;

/** 제목 자간 — 큰 글자는 조금 벌려야 획이 엉키지 않는다. */
const TITLE_TRACKING = 0.02;

/**
 * 줄 수를 셀 때 판면을 이만큼만 쓴 것으로 친다.
 *
 * 전각·반각 어림은 글꼴마다 조금씩 어긋난다. 미리보기(바탕체)에서 '명상록'이 판면보다
 * 0.9px 좁게 계산됐는데 실제로는 넘쳐 두 줄이 됐다. 앱은 을유1945라 또 다르다.
 * 한 글자가 넘치면 낱말 가운데가 끊겨 '명상/록'이 되는데, 글자가 4% 작아지는 쪽이 낫다.
 */
const SAFE_WIDTH = 0.96;

/** 작게 놓이는 글(부제·저자·출판사명)의 자간. 작을수록 많이 벌려야 낱글자가 구분된다. */
const LABEL_TRACKING = 0.1;

/** 패턴 글자 크기 — 표지 폭 기준. 여섯 짜임이 같은 값을 쓴다. */
const PATTERN_SIZE = 0.062;

interface BookCoverProps {
  design: CoverDesign;
  /** 표지 폭. 높이는 COVER_RATIO가 정한다. */
  width: number;
  /** 모서리. 기본 2 — 기존 표지 그림들이 쓰던 값이다. */
  radius?: number;
  /**
   * 테두리 밖으로 넘치는 것을 잘라 낼지. 기본은 자른다.
   *
   * 세워 둔 표지(BookCover3D)는 끈다. 안드로이드는 overflow: hidden을, 자식을 그리기 직전에
   * 배경 드로어블의 bounds로 만든 모서리 경로로 캔버스를 잘라 구현한다
   * (BackgroundStyleApplicator.clipToPaddingBox). 실기기의 홈에서 앞표지와 책등이 배경색만
   * 남고 글자·패턴·마크가 통째로 사라졌는데, 그 자르기가 자식 전부를 잘라 낸 모양과 같다.
   * 안쪽 조각들은 제 상자 안에서 스스로 잘리므로 바깥에서 한 번 더 자를 까닭이 없다.
   */
  clip?: boolean;
  /** 그림자처럼 바깥에서 얹는 것들. 크기는 여기서 덮지 않는다. */
  style?: StyleProp<ViewStyle>;
}

/**
 * 한 장의 치수 — 짜임마다 같은 값을 다시 세지 않도록 한 번 재어 넘긴다.
 * 여기 담긴 것이 전부 width에서 나온다. 고정 px는 어디에도 없다.
 */
interface Sheet {
  design: CoverDesign;
  width: number;
  height: number;
  inset: number;
  /** 좌우 여백을 뺀 판면 폭. */
  usableW: number;
  /** 저자 줄 위까지, 본문이 쓸 수 있는 아래 끝(위에서부터 잰 값). */
  bodyBottom: number;
}

/**
 * 코드로 그리는 책 표지.
 *
 * 사진을 붙이면 책이 아니라 콘텐츠 카드로 읽힌다. 그래서 그림을 가져오지 않고 그린다.
 * SVG를 쓰지 않는 것은 도형이 전부 네모와 반원이라 View로 충분하기 때문이다 —
 * 표지 하나를 그리려고 렌더러를 하나 더 들일 이유가 없다.
 *
 * 짜임이 여섯이다. 처음에는 하나였고 색·마크·정렬만 바꿨는데, 열 권을 나란히 놓고 보니
 * 다 같은 책으로 보였다. 색이 달라도 눈이 먼저 읽는 것은 '무엇이 어디에 있는가'다.
 * 그래서 배치 자체를 나눴다(types의 CoverLayout).
 *
 * 모든 치수가 width에 비례한다. 고정 px로 두면 서점 격자(108)에서 넘치고 홈(160)에서 빈다.
 */
export default function BookCover({ design, width, radius = 2, clip = true, style }: BookCoverProps) {
  const height = width * COVER_RATIO;
  const inset = width * INSET;
  const sheet: Sheet = {
    design,
    width,
    height,
    inset,
    usableW: width - inset * 2,
    bodyBottom: height - height * FOOTER_ZONE,
  };

  return (
    <View
      // 표지는 그림일 뿐이라 손가락을 받지 않는다 — 받으면 그 위 탭이 아래로 못 내려간다.
      pointerEvents="none"
      style={[
        { width, height, borderRadius: radius, backgroundColor: design.paper },
        clip && styles.cover,
        // 어두운 표지는 검은 홈 화면 위에서 경계가 사라진다. 테두리 한 겹으로 세워 둔다.
        design.dark && styles.darkEdge,
        style,
      ]}>
      {width < COMPACT_WIDTH ? <Compact sheet={sheet} /> : <Layout sheet={sheet} />}
    </View>
  );
}

/** 짜임을 고른다. 값이 비면 band로 — 카탈로그 데이터가 늦게 따라와도 표지는 그려진다. */
function Layout({ sheet }: { sheet: Sheet }) {
  switch (sheet.design.layout) {
    case 'plaque':
      return <Plaque sheet={sheet} />;
    case 'rule':
      return <Rule sheet={sheet} />;
    case 'vertical':
      return <Vertical sheet={sheet} />;
    case 'block':
      return <Block sheet={sheet} />;
    case 'margin':
      return <Margin sheet={sheet} />;
    default:
      return <Band sheet={sheet} />;
  }
}

/**
 * 서재 목록의 44·56처럼 좁은 자리 — 종이색과 제목만 남긴다.
 * 이 크기에서는 패턴도 저자 줄도 획이 뭉쳐 얼룩으로만 보인다.
 */
function Compact({ sheet }: { sheet: Sheet }) {
  const { design, inset, height, usableW } = sheet;
  const fit = fitTitleBlock({ ...sheet, subtitle: false }, height * 0.5);

  return (
    <View
      style={[
        styles.zone,
        {
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          justifyContent: verticalOf(design.align),
          alignItems: design.align === 'center' ? 'center' : 'flex-start',
        },
      ]}>
      <Text
        numberOfLines={4}
        style={{
          fontFamily: Type.readingBold,
          fontSize: Math.min(fit.size, usableW * 0.5),
          lineHeight: Math.min(fit.size, usableW * 0.5) * 1.28,
          color: design.ink,
          textAlign: design.align === 'center' ? 'center' : 'left',
        }}>
        {design.title}
      </Text>
    </View>
  );
}

/* ────────────────────────────── 짜임 여섯 ────────────────────────────── */

/**
 * band — 패턴 띠가 위아래에 눕고 그 사이에 제목이 앉는다.
 *
 * 띠의 높이는 제목이 남긴 만큼으로 정한다. 상수로 못박았더니 가운데 정렬에서 위아래 띠가
 * 48%를 가져가 제목이 앉을 자리가 없었다. 제목이 주인공이니 제목이 먼저 자리를 잡는다.
 */
function Band({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset, bodyBottom } = sheet;
  const gap = height * BAND_GAP;
  const fit = fitTitleBlock(sheet, height * TITLE_ZONE);

  const top = design.align !== 'top';
  const bottom = design.align !== 'bottom';
  const count = (top ? 1 : 0) + (bottom ? 1 : 0);
  const zoneBottom = bodyBottom - gap;
  const bandH = (zoneBottom - inset - fit.height - gap * count) / Math.max(1, count);
  /** 패턴 글자 한 줄이 앉을 자리도 안 되면 띠를 그리지 않는다. */
  const banded = bandH >= width * PATTERN_SIZE * 1.2;

  return (
    <>
      {banded && top && <PatternBox sheet={sheet} top={inset} boxH={bandH} />}
      {banded && bottom && (
        <PatternBox sheet={sheet} top={zoneBottom - bandH} boxH={bandH} />
      )}

      <View
        style={[
          styles.zone,
          {
            top: inset,
            left: inset,
            right: inset,
            bottom: height - zoneBottom,
            justifyContent: verticalOf(design.align),
            alignItems: design.align === 'center' ? 'center' : 'flex-start',
          },
        ]}>
        <TitleText sheet={sheet} fit={fit} color={design.ink} centered={design.align === 'center'} />
      </View>

      <Footer sheet={sheet} color={design.ink} centered={design.align === 'center'} />
    </>
  );
}

/**
 * plaque — 패턴이 표지를 가득 덮고, 그 위에 제목이 든 라벨 한 장이 놓인다.
 *
 * 라벨은 종이색으로 꽉 채워 뒤의 패턴을 가린다. 반투명하게 두면 글자 뒤로 무늬가 비쳐
 * 제목이 읽히지 않는다. 저자는 라벨 안 가는 선 아래에 들어가고, 마크와 출판사명만
 * 표지 바닥에 남는다.
 */
function Plaque({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset } = sheet;
  const side = inset * 1.6;
  const pad = width * 0.06;
  const border = Math.max(1, width * 0.004);
  const plaqueW = width - side * 2 - pad * 2 - border * 2;
  const fit = fitTitleBlock({ ...sheet, usableW: plaqueW }, height * 0.26);
  const ruleGap = width * 0.045;

  return (
    <>
      <PatternBox sheet={sheet} top={inset} boxH={height - inset * 2} />

      <View
        style={[
          styles.plaque,
          {
            top: height * 0.24,
            left: side,
            right: side,
            padding: pad,
            backgroundColor: design.paper,
            borderColor: design.ink,
            borderWidth: border,
          },
        ]}>
        <TitleText
          sheet={{ ...sheet, usableW: plaqueW }}
          fit={fit}
          color={design.ink}
          centered
        />
        <View
          style={{
            marginTop: ruleGap,
            marginBottom: ruleGap,
            height: Math.max(1, width * 0.003),
            alignSelf: 'stretch',
            backgroundColor: design.ink,
            opacity: 0.5,
          }}
        />
        <Text
          numberOfLines={1}
          style={{ fontFamily: Type.ui, fontSize: width * 0.052, color: design.ink, opacity: 0.68 }}>
          {design.author}
        </Text>
      </View>

      <View
        style={[
          styles.footer,
          styles.imprintRow,
          { left: inset, right: inset, bottom: inset, gap: width * 0.035 },
        ]}>
        <CoverMark kind={design.mark} size={width * 0.075} color={design.ink} />
        <Text
          numberOfLines={1}
          style={{ fontFamily: Type.ui, fontSize: width * 0.05, color: design.ink, opacity: 0.68 }}>
          {design.imprint}
        </Text>
      </View>
    </>
  );
}

/**
 * rule — 굵은 괘선과 가는 괘선 사이에 제목. 패턴은 아래 한 줄만 흐른다.
 *
 * 굵은 선 하나와 가는 선 하나를 짝지어 쓰는 건 활판 시절의 흔한 조판이다. 두 선의
 * 두께가 같으면 상자가 되어 제목을 가둔다.
 */
function Rule({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset } = sheet;
  const heavy = Math.max(1.5, width * 0.018);
  const hair = Math.max(1, width * 0.005);
  const gap = height * 0.045;
  const fit = fitTitleBlock(sheet, height * 0.3);

  const topY = height * 0.2;
  const titleY = topY + heavy + gap;
  const hairY = titleY + fit.height + gap;
  const patternY = hairY + hair + height * 0.03;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: topY,
          left: inset,
          right: inset,
          height: heavy,
          backgroundColor: design.ink,
        }}
      />

      <View style={[styles.zone, { top: titleY, left: inset, right: inset }]}>
        <TitleText sheet={sheet} fit={fit} color={design.ink} centered={false} />
      </View>

      <View
        style={{
          position: 'absolute',
          top: hairY,
          left: inset,
          right: inset,
          height: hair,
          backgroundColor: design.ink,
          opacity: 0.55,
        }}
      />

      <PatternBox sheet={sheet} top={patternY} boxH={sheet.bodyBottom - patternY - gap} />

      <Footer sheet={sheet} color={design.ink} centered={false} />
    </>
  );
}

/**
 * vertical — 제목을 오른쪽에 세로로 쓰고 패턴이 왼쪽에 기둥으로 선다.
 *
 * 한문책의 본래 판식이다. 제목이 한 글자씩 내려오고 부제가 그 왼쪽에 작게 붙는다.
 * 가로쓰기 다섯 권 사이에 이 한 권이 섞이면 서가가 단숨에 달라 보인다.
 */
function Vertical({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset, bodyBottom } = sheet;
  const room = bodyBottom - inset;

  const letters = [...design.title.replace(/\s+/g, '')];
  /** 글자 수가 적으면 크게, 많으면 자리에 맞춰 줄인다. */
  const size = Math.min(width * 0.2, room / (letters.length * 1.14));
  const subSize = size * 0.34;
  const subLetters = design.subtitle
    ? [...design.subtitle.replace(/\s+/g, '')].slice(0, Math.floor(room / (subSize * 1.2)))
    : [];

  return (
    <>
      <PatternColumn sheet={sheet} top={inset} boxH={room} left={inset} />

      {/* 부제 — 제목 왼쪽에 한 단 작게. 세로쓰기에서 부제는 늘 제목 왼쪽이다. */}
      {subLetters.length > 0 && (
        <View style={{ position: 'absolute', top: inset, right: inset + size * 1.5, width: subSize }}>
          {subLetters.map((letter, index) => (
            <Text
              key={`${letter}-${index}`}
              style={{
                fontFamily: Type.readingRegular,
                fontSize: subSize,
                lineHeight: subSize * 1.2,
                color: design.ink,
                opacity: 0.66,
                textAlign: 'center',
              }}>
              {letter}
            </Text>
          ))}
        </View>
      )}

      <View style={{ position: 'absolute', top: inset, right: inset, width: size }}>
        {letters.map((letter, index) => (
          <Text
            key={`${letter}-${index}`}
            style={{
              fontFamily: Type.readingBold,
              fontSize: size,
              lineHeight: size * 1.14,
              color: design.ink,
              textAlign: 'center',
            }}>
            {letter}
          </Text>
        ))}
      </View>

      <Footer sheet={sheet} color={design.ink} centered={false} />
    </>
  );
}

/**
 * block — 위쪽을 잉크로 덮고 제목을 종이색으로 뒤집어 얹는다.
 *
 * 여섯 중 가장 세다. 어두운 표지(채근담)에서는 잉크가 밝은 색이라 저절로 반대로 뒤집히는데,
 * 그 편이 오히려 낫다 — 검은 종이 위에 밝은 색면 하나가 떠오른다.
 */
function Block({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset, bodyBottom } = sheet;
  const blockH = height * 0.46;
  const fit = fitTitleBlock(sheet, blockH - inset * 2);
  const gap = height * BAND_GAP;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: blockH,
          backgroundColor: design.ink,
        }}
      />

      <View
        style={[
          styles.zone,
          { top: inset, left: inset, right: inset, height: blockH - inset * 2, justifyContent: 'flex-end' },
        ]}>
        <TitleText sheet={sheet} fit={fit} color={design.paper} centered={false} />
      </View>

      <PatternBox sheet={sheet} top={blockH + gap} boxH={bodyBottom - blockH - gap * 2} />

      <Footer sheet={sheet} color={design.ink} centered={false} />
    </>
  );
}

/**
 * margin — 여백이 주인공. 제목은 작게 아래에, 패턴은 위에 한 줄.
 *
 * 가는 테두리 한 겹만 두르고 가운데를 비운다. 비어 있는 것이 실수로 보이지 않으려면
 * 테두리가 있어야 한다 — 선이 없으면 덜 그린 표지가 되고, 있으면 비워 둔 표지가 된다.
 */
function Margin({ sheet }: { sheet: Sheet }) {
  const { design, width, height, inset, bodyBottom } = sheet;
  const frame = inset * 0.55;
  const fit = fitTitleBlock(sheet, height * 0.22);
  const rowH = width * PATTERN_SIZE * 1.35;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          top: frame,
          left: frame,
          right: frame,
          bottom: frame,
          borderWidth: Math.max(1, width * 0.003),
          borderColor: design.ink,
          opacity: 0.45,
        }}
      />

      <PatternBox sheet={sheet} top={inset * 1.5} boxH={rowH} />

      <View
        style={[
          styles.zone,
          {
            top: bodyBottom - height * 0.24,
            left: inset,
            right: inset,
            height: height * 0.22,
            justifyContent: 'flex-end',
          },
        ]}>
        <TitleText sheet={sheet} fit={fit} color={design.ink} centered={false} />
      </View>

      <Footer sheet={sheet} color={design.ink} centered={false} />
    </>
  );
}

/* ────────────────────────────── 함께 쓰는 조각들 ────────────────────────────── */

/** 제목과 부제 한 벌. 크기는 이미 정해져 들어온다(fitTitleBlock). */
function TitleText({
  sheet,
  fit,
  color,
  centered,
}: {
  sheet: Sheet;
  fit: { size: number };
  color: string;
  centered: boolean;
}) {
  const { design, width } = sheet;
  const sub = subtitleMetrics(fit.size, width);
  return (
    <>
      <Text
        numberOfLines={4}
        style={{
          fontFamily: Type.readingBold,
          fontSize: fit.size,
          lineHeight: fit.size * TITLE_LEADING,
          letterSpacing: fit.size * TITLE_TRACKING,
          color,
          textAlign: centered ? 'center' : 'left',
        }}>
        {design.title}
      </Text>
      {design.subtitle ? (
        // 부제는 제목과 같은 명조로 두면 제목의 셋째 줄처럼 붙어 보인다. 작은 고딕에
        // 자간을 넓게 줘서 '라벨'로 읽히게 한다 — 시안에서 좋아 보였던 것이 이 대비다.
        <Text
          numberOfLines={2}
          style={{
            fontFamily: Type.uiMedium,
            fontSize: sub.size,
            lineHeight: sub.lineHeight,
            letterSpacing: sub.size * LABEL_TRACKING,
            marginTop: sub.gap,
            color,
            opacity: 0.8,
            textAlign: centered ? 'center' : 'left',
          }}>
          {design.subtitle}
        </Text>
      ) : null}
    </>
  );
}

/** 저자와 출판사 마크. 마크는 절대 빼지 않는다 — 이 하나가 카드를 책으로 만든다. */
function Footer({ sheet, color, centered }: { sheet: Sheet; color: string; centered: boolean }) {
  const { design, width, inset } = sheet;
  return (
    <View
      style={[
        styles.footer,
        { left: inset, right: inset, bottom: inset, alignItems: centered ? 'center' : 'flex-start' },
      ]}>
      <Text
        numberOfLines={1}
        style={{ fontFamily: Type.ui, fontSize: width * 0.058, color, opacity: 0.68 }}>
        {design.author}
      </Text>
      <View style={[styles.imprintRow, { marginTop: width * 0.05, gap: width * 0.035 }]}>
        <CoverMark kind={design.mark} size={width * 0.075} color={color} />
        <Text
          numberOfLines={1}
          style={{ fontFamily: Type.ui, fontSize: width * 0.05, color, opacity: 0.68 }}>
          {design.imprint}
        </Text>
      </View>
    </View>
  );
}

/**
 * 패턴 한 상자 — 목차에서 뽑은 글자를 채워 깐다.
 *
 * 이게 표지에 밀도를 준다. 사진 한 장 없이도 허전하지 않은 이유가 여기 있다.
 * 불투명도를 22%로 두는 건 읽히자고 놓은 글이 아니기 때문이다 — 더 진하면 제목과
 * 다투고, 더 옅으면 종이가 그냥 비어 보인다.
 *
 * 넘치는 글자는 잘라 낸다. 넉넉히 잡아 잘리게 두는 편이, 모자라 비는 것보다 낫다.
 */
function PatternBox({ sheet, top, boxH }: { sheet: Sheet; top: number; boxH: number }) {
  const { design, width, inset, usableW } = sheet;
  if (boxH <= 0) return null;
  if (design.patternKind === 'staff') {
    return <PatternStaff sheet={sheet} top={top} boxH={boxH} />;
  }

  const size = width * PATTERN_SIZE;
  const columnGap = width * 0.05;
  const rowGap = width * 0.042;
  const items = repeatToFill(
    design.pattern,
    boxCapacity({ boxW: usableW, boxH, size, columnGap, rowGap, pattern: design.pattern }),
  );

  return (
    <View
      pointerEvents="none"
      style={[styles.band, { left: inset, right: inset, top, height: boxH, columnGap, rowGap }]}>
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
 * 오선 — 음악책의 패턴.
 *
 * 다섯 줄을 한 벌로 긋고, 자리가 되는 만큼 벌을 쌓는다. 음표는 각 벌에 몇 개만 얹는데
 * 자리를 난수로 고르면 다시 그릴 때마다 달라지므로, 줄 번호와 음표 번호로 셈해서
 * 정한다 — 같은 책은 언제 그려도 같은 악보가 된다.
 *
 * 음이 무엇인지는 뜻이 없다. 읽으라고 놓은 게 아니라 '음악'이라고 말하는 무늬다.
 */
function PatternStaff({ sheet, top, boxH }: { sheet: Sheet; top: number; boxH: number }) {
  const { design, width, inset, usableW } = sheet;

  const rule = Math.max(1, width * 0.004);
  /** 줄 사이. 다섯 줄 한 벌의 높이가 여기서 나온다. */
  const step = width * 0.022;
  const staffH = step * 4 + rule;
  const staffGap = width * 0.055;
  const count = Math.max(1, Math.floor((boxH + staffGap) / (staffH + staffGap)));
  const head = step * 1.15;

  return (
    <View
      pointerEvents="none"
      style={[styles.staff, { left: inset, right: inset, top, height: boxH }]}>
      {Array.from({ length: count }, (_, staff) => (
        <View
          key={staff}
          style={{ height: staffH, marginTop: staff === 0 ? 0 : staffGap }}>
          {[0, 1, 2, 3, 4].map((line) => (
            <View
              key={line}
              style={{
                position: 'absolute',
                top: line * step,
                left: 0,
                right: 0,
                height: rule,
                backgroundColor: design.ink,
                opacity: 0.22,
              }}
            />
          ))}
          {[0, 1, 2, 3].map((note) => (
            <View
              key={note}
              style={{
                position: 'absolute',
                // 줄 번호와 음표 번호로 자리를 정한다 — 언제 그려도 같은 악보가 되도록.
                left: usableW * (0.1 + ((staff * 3 + note * 2) % 7) * 0.12),
                top: ((staff + note * 3) % 8) * (step / 2) - head / 2 + rule / 2,
                width: head * 1.25,
                height: head,
                borderRadius: head,
                backgroundColor: design.ink,
                opacity: 0.3,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * 패턴 한 기둥 — 세로쓰기 표지의 왼쪽에 선다.
 *
 * 상자와 달리 항목을 한 덩이로 잇고 글자 단위로 끊어 내린다. '天地玄黃'을 통째로
 * 좁은 기둥에 넣으면 네 글자가 가로로 뻗어 기둥 밖으로 나간다.
 */
function PatternColumn({
  sheet,
  top,
  boxH,
  left,
}: {
  sheet: Sheet;
  top: number;
  boxH: number;
  left: number;
}) {
  const { design, width } = sheet;
  const size = width * 0.048;
  const letters = [...design.pattern.join('').replace(/\s+/g, '')].slice(
    0,
    Math.max(0, Math.floor(boxH / (size * 1.18))),
  );

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top, left, width: size }}>
      {letters.map((letter, index) => (
        <Text
          key={`${letter}-${index}`}
          style={{
            fontFamily: Type.readingRegular,
            fontSize: size,
            lineHeight: size * 1.18,
            color: design.ink,
            opacity: 0.22,
            textAlign: 'center',
          }}>
          {letter}
        </Text>
      ))}
    </View>
  );
}

/* ────────────────────────────── 재는 일 ────────────────────────────── */

/**
 * 이 상자에 몇 개가 들어가는지 어림한다.
 *
 * 개수를 상수로 못박으면 항목 길이에 따라 상자가 비거나 남는다 — 영어의 'A'는 한 행에 열
 * 개가 들어가고 천자문의 '天地玄黃'은 두 개가 들어간다. 한 번은 16개로 두었더니 영어
 * 표지의 띠 아래가 반쯤 비었다. 그래서 개수를 세지 않고 자리를 잰다.
 */
function boxCapacity({
  boxW,
  boxH,
  size,
  columnGap,
  rowGap,
  pattern,
}: {
  boxW: number;
  boxH: number;
  size: number;
  columnGap: number;
  rowGap: number;
  pattern: string[];
}): number {
  /** 항목 길이가 제각각이면 평균으로 잡는다 — 한 행에 몇 개가 앉을지의 어림값이다. */
  const averageEm =
    pattern.reduce((sum, text) => sum + emWidth(text), 0) / Math.max(1, pattern.length);
  const perRow = Math.floor((boxW + columnGap) / Math.max(1, averageEm * size + columnGap));
  const rows = Math.floor((boxH + rowGap) / (size * 1.2 + rowGap));
  return Math.max(1, perRow * rows + perRow);
}

/**
 * 목차 항목이 모자라면 되풀이해서 상자를 채운다. 반쯤 비면 패턴이 아니라
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

/**
 * 이 폭에서 몇 줄로 흐르는지, 그리고 낱말 가운데가 끊기지 않는지.
 *
 * 전체 폭을 한 줄 폭으로 나누면 실제보다 적게 나온다. 글자는 채우다 남으면 그 자리를
 * 비우고 다음 줄로 가기 때문이다. '쓰지 않는 글자들'은 나눗셈으로 두 줄이지만 실제로는
 * 줄 끝마다 자리가 남아 세 줄이 됐고, 그 한 줄이 아래 패턴을 파고들었다.
 *
 * 한글·한자는 어디서나 끊기므로 낱말 단위가 아니라 글자 단위로 센다. 줄 맨 앞으로
 * 넘어간 공백은 사라지는 것도 그대로 따른다.
 *
 * clean은 넘어간 자리가 전부 띄어쓰기였는지다. 두 낱말짜리 제목이 둘째 낱말 가운데서 끊기면
 * 제목이 아니라 사고로 보인다 — 이 값을 보고 한 치수 작더라도 성한 쪽을 고른다.
 */
function wrapTitle(text: string, capacity: number): { lines: number; clean: boolean } {
  const chars = [...text];
  let lines = 1;
  let used = 0;
  let clean = true;

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const w = FULL_WIDTH.test(ch) ? 1 : 0.5;
    if (used + w > capacity && used > 0) {
      const atSpace = /s/.test(ch) || (i > 0 && /s/.test(chars[i - 1]));
      if (!atSpace) clean = false;
      lines += 1;
      used = 0;
      if (/s/.test(ch)) continue;
    }
    used += w;
  }
  return { lines, clean };
}

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
 * 훌쩍 넘어(160폭에서 97 예산에 150이 들어찼다) 아래 패턴을 파고들었다. 재는 것과
 * 놓는 것이 어긋나면 어디선가 겹친다.
 *
 * 띄어쓰기도 센다. 빼고 재면 '하루 논어'가 한 줄로 계산되는데 실제로는 공백까지 흘러
 * 두 줄이 된다.
 *
 * 폭을 실제로 재지 않고 전각·반각으로 어림하는 것은, 재려면 한 번 그린 뒤 다시 나눠야
 * 해서 표지가 눈앞에서 재배치되기 때문이다. 어림값이라 조금 빗나가는데 그 몫은 숨이 받는다.
 */
/**
 * 부제의 치수. 재는 쪽(fitTitleBlock)과 그리는 쪽(TitleText)이 같은 값을 봐야 한다.
 *
 * 제목에 딸린 크기라 제목이 작아지면 함께 작아지는데, 여백 짜임처럼 제목이 아주 작은
 * 표지에서는 6px까지 내려가 읽히지 않는다. 그래서 표지 폭 기준의 바닥을 둔다.
 */
function subtitleMetrics(titleSize: number, width: number) {
  const size = Math.max(width * 0.05, titleSize * 0.3);
  return { size, lineHeight: size * 1.5, gap: width * 0.04 };
}

function fitTitleBlock(
  sheet: Sheet & { subtitle?: boolean },
  maxH: number,
): { size: number; height: number } {
  const { design, usableW, width } = sheet;
  const withSubtitle = sheet.subtitle !== false && Boolean(design.subtitle);

  const floor = usableW / 12;

  /** 낱말이 끊기는 치수라도 자리에는 들어가는 것 — 성한 치수가 하나도 없을 때 쓴다. */
  let fallback: { size: number; height: number } | null = null;

  for (let size = usableW / 2; size > floor; size -= 0.5) {
    const wrapped = wrapTitle(design.title, (usableW * SAFE_WIDTH) / (size * (1 + TITLE_TRACKING)));
    let block = wrapped.lines * size * TITLE_LEADING;

    if (withSubtitle) {
      const sub = subtitleMetrics(size, width);
      // 부제는 두 줄까지만 찍는다(numberOfLines) — 셈도 거기서 멈춰야 맞는다.
      const subLines = Math.min(
        2,
        wrapTitle(design.subtitle ?? '', (usableW * SAFE_WIDTH) / (sub.size * (1 + LABEL_TRACKING))).lines,
      );
      block += sub.gap + subLines * sub.lineHeight;
    }

    if (block > maxH) continue;
    if (wrapped.clean) return { size, height: block };
    if (!fallback) fallback = { size, height: block };
  }

  if (fallback) return fallback;
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
  zone: {
    position: 'absolute',
  },
  staff: {
    position: 'absolute',
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  plaque: {
    position: 'absolute',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
  },
  imprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
