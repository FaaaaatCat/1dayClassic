import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useCardNarration, type SpokenRange } from '@/hooks/useCardNarration';
import {
  DESC_PARAGRAPHS,
  NARRATION_STEPS,
  PAGES,
  PREVIEW_BOOK,
  PREVIEW_BOOK_TITLE,
  PREVIEW_DATE,
  PREVIEW_NO,
  QUOTE_SOURCE,
  QUOTE_TEXT,
  type PageKind,
} from '@/lib/preview-content';

/**
 * 인스타 스토리 미리보기 — 카드 슬라이드와 같은 내용을 스토리 옷으로 갈아입힌 화면.
 *
 * 보여 주는 글과 순서는 카드 슬라이드와 한 곳(lib/preview-content)에서 나온다. 여기서
 * 정하는 것은 옷뿐이다 — 위의 칸 진행 바, 계정 줄, 어두운 바닥 위의 밝은 판, 아래 아이콘.
 *
 * 스토리를 흉내 내되 가져오지 않은 것이 둘 있다. 메시지 보내기는 만들지 않는다(보낼 곳이
 * 없다). 시간이 차면 저절로 넘어가는 것도 하지 않는다 — 카드 슬라이드와 '똑같은 형식'이
 * 어야 하고, 그쪽은 손으로 넘긴다. 그래서 진행 바는 시간이 아니라 몇 장째인지를 말한다.
 */
/** 진행 바 칸 사이 틈. 칸 폭을 재려면 이 값이 필요하다. */
const BAR_GAP = 4;
/** 글이 없는 장(표지·구매 안내)에 주는 시간. */
const PLAIN_MS = 5000;
/** 글 한 자에 주는 시간. 한국어를 눈으로 읽는 속도에 맞춘 값이다. */
const MS_PER_CHAR = 110;
const MIN_MS = 5000;
const MAX_MS = 15000;

/**
 * 이 장에 줄 시간.
 *
 * 스토리는 모든 장이 같은 시간이지만 여기는 글의 길이가 제각각이라(87자에서 201자까지)
 * 같은 시간을 주면 짧은 장은 지루하고 긴 장은 다 못 읽고 넘어간다. 그래서 글자 수로
 * 정하되 위아래를 잘라 둔다 — 너무 짧아 놓치거나 너무 길어 늘어지지 않게.
 */
function durationFor(page: (typeof PAGES)[number]): number {
  const text = page.kind === 'quote' ? QUOTE_TEXT : (page.paragraph ?? '');
  if (!text) return PLAIN_MS;
  return Math.min(MAX_MS, Math.max(MIN_MS, 1200 + text.length * MS_PER_CHAR));
}

export default function InstaPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  const goTo = (next: number) => setPage(Math.max(0, Math.min(PAGES.length - 1, next)));
  const narration = useCardNarration({ steps: NARRATION_STEPS, onPage: goTo });

  const current = PAGES[page];
  const last = page === PAGES.length - 1;
  /**
   * 시간이 차면 저절로 넘어간다. 다만 두 자리에서는 멈춘다 —
   * 낭독 중에는 낭독이 장을 끌고 가므로 둘이 싸우면 안 되고, 마지막 장에서는 갈 곳이 없다.
   */
  const paused = narration.playing || last;
  const advance = useCallback(() => {
    setPage((p) => (p + 1 < PAGES.length ? p + 1 : p));
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <StatusBar style="light" />

      {/* 위 진행 바 — 지나온 칸은 채우고, 지금 칸은 시간에 맞춰 차오른다. */}
      <ProgressBars
        page={page}
        duration={durationFor(current)}
        paused={paused}
        onDone={advance}
      />

      {/* 계정 줄 — 스토리의 프로필·이름·시간 자리에 책 표지·책 이름·날짜를 넣는다. */}
      <View style={styles.header}>
        {PREVIEW_BOOK ? (
          <Image
            source={{ uri: PREVIEW_BOOK.coverImage }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.avatar} />
        )}
        <Text style={styles.account}>{PREVIEW_BOOK_TITLE}</Text>
        {PREVIEW_DATE ? <Text style={styles.when}>{PREVIEW_DATE}</Text> : null}
        <View style={styles.headerSpacer} />
        <ScaleButton
          accessibilityLabel="미리보기 닫기"
          style={styles.headerClose}
          onPress={() => router.replace('/settings')}>
          <Ionicons name="close" color={Colors.white} size={24} />
        </ScaleButton>
      </View>

      {/* 스토리의 사진 자리 — 어두운 바닥 위에 종이색 판을 얹는다. */}
      <View style={styles.stage}>
        <Animated.View
          // 장이 바뀔 때마다 새로 그려져 스며든다. 스토리는 종이를 넘기지 않고 갈아 끼운다.
          key={page}
          entering={FadeIn.duration(260)}
          style={styles.panel}>
          <ScrollView
            contentContainerStyle={styles.panelBody}
            showsVerticalScrollIndicator={false}>
            <PageContent
              kind={current.kind}
              paragraph={current.paragraph}
              spoken={narration.spoken?.page === page ? narration.spoken : null}
            />
          </ScrollView>
        </Animated.View>

        {/* 좌우 탭 — 스토리와 같은 자리, 같은 뜻이다. 가운데는 일부러 비워 둔다. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.tapRow} pointerEvents="box-none">
            <Pressable
              accessibilityLabel="이전 장"
              style={styles.tapZone}
              onPress={() => goTo(page - 1)}
            />
            <View style={styles.tapGap} pointerEvents="none" />
            <Pressable
              accessibilityLabel="다음 장"
              style={styles.tapZone}
              onPress={() => goTo(page + 1)}
            />
          </View>
        </View>
      </View>

      {/* 아래 줄 — 스토리의 하트·공유·메뉴 자리에 이 앱의 것을 놓는다. */}
      <View style={styles.footer}>
        <Text style={styles.footerHint}>{`${page + 1} / ${PAGES.length}`}</Text>
        <View style={styles.footerIcons}>
          <ScaleButton
            accessibilityLabel={narration.playing ? '읽기 멈추기' : '자동으로 읽기'}
            style={styles.footerHit}
            onPress={narration.toggle}>
            <Ionicons
              name={narration.playing ? 'pause' : 'headset'}
              color={Colors.white}
              size={26}
            />
          </ScaleButton>
          <ScaleButton accessibilityLabel="감상 노트" style={styles.footerHit} onPress={() => {}}>
            <Ionicons name="create-outline" color={Colors.white} size={26} />
          </ScaleButton>
          <ScaleButton accessibilityLabel="책갈피" style={styles.footerHit} onPress={() => {}}>
            <Ionicons name="bookmark-outline" color={Colors.white} size={26} />
          </ScaleButton>
        </View>
      </View>
    </View>
  );
}

/**
 * 위의 칸 진행 바 — 지나온 칸은 채워 두고, 지금 칸만 시간에 맞춰 차오른다.
 *
 * 차오르는 폭은 퍼센트가 아니라 픽셀로 준다. 칸이 flex로 나뉘어 있어 폭을 미리 알 수
 * 없으므로 onLayout으로 한 번 재 둔다. transformOrigin으로 왼쪽에서 늘리는 방법도 있지만
 * 안드로이드에서 행렬 분해 오차가 있어 쓰지 않는다.
 *
 * 다 차면 onDone으로 다음 장을 부른다. 그 콜백을 ref에 담아 두는 건, 매 렌더 새로 만들어진
 * 함수가 의존성으로 들어오면 타이머가 계속 다시 걸려 영영 차지 않기 때문이다.
 */
function ProgressBars({
  page,
  duration,
  paused,
  onDone,
}: {
  page: number;
  duration: number;
  paused: boolean;
  onDone: () => void;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const fire = useCallback(() => onDoneRef.current(), []);

  useEffect(() => {
    // 멈춘 자리(낭독 중·마지막 장)에서는 지금 칸을 채운 채로 세워 둔다.
    if (paused) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(fire)();
    });
  }, [page, duration, paused, progress, fire]);

  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * barWidth }));

  return (
    <View
      style={styles.bars}
      onLayout={(event) => {
        const total = event.nativeEvent.layout.width;
        setBarWidth((total - BAR_GAP * (PAGES.length - 1)) / PAGES.length);
      }}>
      {PAGES.map((_, i) => (
        <View key={i} style={[styles.bar, i < page && styles.barFilled]}>
          {i === page ? <Animated.View style={[styles.barFill, fillStyle]} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * 낭독이 읽는 자리에 밑칠을 하는 글. 카드 슬라이드의 것과 같은 방식이다 —
 * 중첩 Text 세 조각이라야 줄바꿈과 자간을 물려받아 글이 밀리지 않는다.
 */
function SpokenText({
  text,
  style,
  spoken,
}: {
  text: string;
  style: object;
  spoken: SpokenRange | null;
}) {
  if (!spoken || spoken.start >= text.length || spoken.end <= spoken.start) {
    return <Text style={style}>{text}</Text>;
  }
  const end = Math.min(spoken.end, text.length);
  return (
    <Text style={style}>
      {text.slice(0, spoken.start)}
      <Text style={styles.spokenWord}>{text.slice(spoken.start, end)}</Text>
      {text.slice(end)}
    </Text>
  );
}

function PageContent({
  kind,
  paragraph,
  spoken,
}: {
  kind: PageKind;
  paragraph?: string;
  spoken: SpokenRange | null;
}) {
  if (kind === 'intro') {
    return (
      <View style={styles.introBlock}>
        <Text style={styles.introMark}>{') ) )'}</Text>
        <View style={styles.labelChip}>
          <Text style={styles.labelText}>{PREVIEW_BOOK_TITLE}</Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.no}>{String(PREVIEW_NO).padStart(3, '0')}</Text>
          <Text style={styles.title}>번째 듣는 법</Text>
        </View>
      </View>
    );
  }

  if (kind === 'quote') {
    return (
      <View style={styles.quoteBlock}>
        <SpokenText text={QUOTE_TEXT} style={styles.quoteText} spoken={spoken} />
        <Text style={styles.quoteSource}>{QUOTE_SOURCE}</Text>
      </View>
    );
  }

  if (kind === 'desc') {
    return <SpokenText text={paragraph ?? ''} style={styles.descText} spoken={spoken} />;
  }

  // 구매 안내 — 스토리에서는 표지와 값만 얹고 사는 곳은 링크 스티커처럼 한 줄로 둔다.
  return (
    <View style={styles.buyBlock}>
      <Text style={styles.buyLead}>
        {'뒷 내용이 더 궁금하시다면\n‘잘 듣는’ 사람이 되기 위한 필독도서\n『듣기의 말들』 을 구매해보세요.'}
      </Text>
      {PREVIEW_BOOK ? (
        <Image
          source={{ uri: PREVIEW_BOOK.coverImage }}
          style={styles.buyCover}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.buySticker}>
        <Text style={styles.buyStickerText}>￦8,820</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: Colors.brown100,
  },

  // 위 진행 바
  bars: {
    flexDirection: 'row',
    gap: BAR_GAP,
    paddingHorizontal: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.brown50,
    overflow: 'hidden',
  },
  barFilled: {
    backgroundColor: Colors.white,
  },
  /** 지금 칸에서 차오르는 부분. 왼쪽에 붙어 폭만 늘어난다. */
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1.5,
    backgroundColor: Colors.white,
  },

  // 계정 줄
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.brown90,
  },
  account: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.white,
  },
  when: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  headerSpacer: {
    flex: 1,
  },
  headerClose: {
    width: 32,
    height: 32,
  },

  // 스토리의 사진 자리
  stage: {
    flex: 1,
  },
  panel: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    overflow: 'hidden',
  },
  panelBody: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  /** 좌우 탭 — 가운데는 비워 둬야 읽는 중 실수로 넘어가지 않는다. */
  tapRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },
  tapGap: {
    flex: 1,
  },

  // 아래 줄
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  footerHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  footerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  footerHit: {
    width: 32,
    height: 32,
  },

  // 판 안의 글 — 카드 슬라이드와 같은 종이 위 글이라 값도 같게 맞춘다.
  spokenWord: {
    backgroundColor: Colors.beige50,
    color: Colors.brown100,
  },
  introBlock: {
    alignItems: 'center',
    gap: 16,
  },
  introMark: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: 6,
    color: Colors.brown50,
  },
  labelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.beige10,
  },
  labelText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.beige100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  no: {
    fontFamily: Fonts.semiBold,
    fontSize: 36,
    letterSpacing: tracking(36),
    color: Colors.brown100,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },
  quoteBlock: {
    alignSelf: 'stretch',
    gap: 16,
    paddingLeft: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brown100,
  },
  quoteText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  quoteSource: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: tracking(12),
    color: Colors.brown50,
  },
  descText: {
    alignSelf: 'stretch',
    fontFamily: Fonts.regular,
    fontSize: 17,
    lineHeight: 30,
    letterSpacing: tracking(17),
    color: Colors.brown100,
  },

  // 구매 안내
  buyBlock: {
    alignItems: 'center',
    gap: 20,
  },
  buyLead: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: tracking(15),
    textAlign: 'center',
    color: Colors.brown100,
  },
  buyCover: {
    width: 140,
    height: 200,
  },
  /** 스토리의 링크 스티커를 흉내 낸 값표 — 검은 판에 흰 글씨. */
  buySticker: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.brown100,
  },
  buyStickerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.white,
  },
});
