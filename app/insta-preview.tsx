import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import QuizSolver, { quizModalStyles } from '@/components/preview/QuizSolver';
import ScaleButton from '@/components/ScaleButton';
import StudyReport from '@/components/StudyReport';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useCardNarration, type SpokenRange } from '@/hooks/useCardNarration';
import { openBookDetail } from '@/lib/preview-nav';
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
 * 넘기는 방법은 스토리 그대로 셋이다 — 시간이 차면 저절로, 좌우를 탭하면 곧바로,
 * 붙잡고 있으면 멈춘다. 메시지 보내기만 만들지 않았다(보낼 곳이 없다).
 *
 * 퀴즈와 리포트는 카드 슬라이드와 같은 것을 쓴다(components/preview/QuizSolver,
 * components/StudyReport). 두 미리보기가 갈라지면 안 되는 흐름이다.
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

  /**
   * 들어오자마자 읽기 시작한다 — 스토리는 열면 소리가 나는 물건이라 누르게 하지 않는다.
   * (카드 슬라이드는 헤드폰을 눌러야 시작한다. 거기는 읽는 화면이고 여기는 보는 화면이다.)
   *
   * ref로 한 번만 걸리게 막는다. restart는 매 렌더 새로 만들어지므로 의존성만 믿으면
   * 렌더마다 처음부터 다시 읽는다.
   */
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    narration.restart();
  }, [narration]);

  /**
   * 손으로 넘기면 낭독은 물러난다.
   *
   * 낭독도 장을 끌고 가므로 그대로 두면 둘이 싸운다 — 손으로 넘긴 자리를 낭독이 다음
   * 문장에서 도로 끌어온다. 카드 슬라이드에서는 낭독이 눌러야 시작하는 것이라 부딪힐
   * 일이 드물지만, 여기서는 열자마자 돌기 때문에 탭할 때마다 부딪힌다.
   */
  const goByTap = (next: number) => {
    narration.stop();
    goTo(next);
  };

  const current = PAGES[page];
  const last = page === PAGES.length - 1;
  /** 손가락을 대고 있는 동안. 스토리처럼 글을 더 보려고 붙잡는 자리다. */
  const [held, setHeld] = useState(false);
  /** 시간이 흐를 자리가 아닌 경우 — 낭독이 장을 끌고 가는 중이거나, 갈 곳이 없는 마지막 장. */
  const filled = narration.playing || last;
  const advance = useCallback(() => {
    setPage((p) => (p + 1 < PAGES.length ? p + 1 : p));
  }, []);

  /**
   * 퀴즈와 리포트 — 카드 슬라이드와 같은 흐름이다.
   * 마지막 장의 '퀴즈 풀러 가기' → 문제를 다 풀면 '오늘의 공부 마치기' → 리포트 →
   * '리포트 보러가기' → 서재 상세.
   */
  const [quizOpen, setQuizOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <StatusBar style="light" />

      {/* 위 진행 바 — 지나온 칸은 채우고, 지금 칸은 시간에 맞춰 차오른다. */}
      <ProgressBars
        page={page}
        duration={durationFor(current)}
        held={held}
        filled={filled}
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
        {/* 스토리는 장을 갈아 끼울 뿐 아무 효과도 주지 않는다 — 그래서 여기도 없다. */}
        <View style={styles.panel}>
          <ScrollView
            contentContainerStyle={styles.panelBody}
            showsVerticalScrollIndicator={false}>
            <PageContent
              kind={current.kind}
              paragraph={current.paragraph}
              spoken={narration.spoken?.page === page ? narration.spoken : null}
              onOpenQuiz={() => setQuizOpen(true)}
            />
          </ScrollView>
        </View>

        {/*
          좌우 탭 — 스토리와 같은 자리, 같은 뜻이다.
          가운데까지 손가락을 받는 건 길게 누르기 때문이다. 탭으로는 아무 일도 하지 않되
          붙잡으면 멈춘다 — 스토리도 화면 어디를 붙잡든 멈춘다.
          onPressIn/Out으로 붙잡는 걸 보는 건 onLongPress가 500ms 뒤에야 오기 때문이다.
          글을 더 보려고 누르는 사람은 그 전에 이미 멈췄기를 바란다.
        */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.tapRow} pointerEvents="box-none">
            <Pressable
              accessibilityLabel="이전 장"
              style={styles.tapZone}
              onPressIn={() => setHeld(true)}
              onPressOut={() => setHeld(false)}
              onPress={() => goByTap(page - 1)}
            />
            <Pressable
              accessibilityLabel="잠시 멈춤"
              style={styles.tapZone}
              onPressIn={() => setHeld(true)}
              onPressOut={() => setHeld(false)}
            />
            <Pressable
              accessibilityLabel="다음 장"
              style={styles.tapZone}
              onPressIn={() => setHeld(true)}
              onPressOut={() => setHeld(false)}
              onPress={() => goByTap(page + 1)}
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

      {/* 오늘의 퀴즈 — 카드 슬라이드와 같은 것을 쓴다(components/preview/QuizSolver). */}
      <Modal visible={quizOpen} animationType="fade" onRequestClose={() => setQuizOpen(false)}>
        <View
          style={[
            quizModalStyles.screen,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}>
          <QuizSolver
            onClose={() => setQuizOpen(false)}
            onFinish={() => {
              setQuizOpen(false);
              setReportOpen(true);
            }}
          />
        </View>
      </Modal>

      {/* 오늘의 공부 리포트 — statusBarTranslucent가 없으면 검은 화면 위쪽에 밝은 띠가 남는다. */}
      <Modal
        visible={reportOpen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setReportOpen(false)}>
        <StudyReport
          date={PREVIEW_DATE}
          bookTitle={PREVIEW_BOOK_TITLE}
          onOpenReport={() => {
            setReportOpen(false);
            openBookDetail(router, PREVIEW_BOOK);
          }}
        />
      </Modal>
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
  held,
  filled,
  onDone,
}: {
  page: number;
  duration: number;
  /** 손가락을 대고 있다. 차오르던 자리에 그대로 세운다. */
  held: boolean;
  /** 시간이 흐를 자리가 아니다(낭독 중·마지막 장). 지금 칸을 채운 채로 둔다. */
  filled: boolean;
  onDone: () => void;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const progress = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  /** 지금 타이머가 걸려 있는 장. 장이 바뀐 것과 붙잡았다 놓은 것을 가른다. */
  const timedPage = useRef(-1);

  const fire = useCallback(() => onDoneRef.current(), []);

  useEffect(() => {
    // 장이 바뀌었으면 무조건 처음부터.
    if (timedPage.current !== page) {
      timedPage.current = page;
      cancelAnimation(progress);
      progress.value = 0;
    }

    if (filled) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }
    if (held) {
      // 차오르던 그 자리에서 멈춘다. 채워 버리면 손을 떼기도 전에 다 본 것처럼 보이고,
      // 0으로 되돌리면 붙잡을 때마다 처음부터 다시 읽어야 한다.
      cancelAnimation(progress);
      return;
    }

    // 남은 만큼만 마저 채운다 — 붙잡았다 놓으면 이어서 간다.
    const remaining = duration * (1 - progress.value);
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(fire)();
    });
  }, [page, duration, held, filled, progress, fire]);

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
  onOpenQuiz,
}: {
  kind: PageKind;
  paragraph?: string;
  spoken: SpokenRange | null;
  onOpenQuiz: () => void;
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
      {/* 스토리의 '더 보기'처럼 아래로 붙는 한 줄 — 여기서 퀴즈로 들어간다. */}
      <ScaleButton
        accessibilityLabel="퀴즈 풀러 가기"
        style={styles.quizEntry}
        onPress={onOpenQuiz}>
        <Text style={styles.quizEntryText}>퀴즈 풀러 가기</Text>
      </ScaleButton>
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
  /** 스토리의 '더 보기'처럼 아래에 붙는 줄. 값표와 성격이 달라 테두리만 두른다. */
  quizEntry: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown100,
  },
  quizEntryText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  buyStickerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.white,
  },
});
