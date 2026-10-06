import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import SpokenText from '@/components/lesson/SpokenText';
import QuizSolver, { quizModalStyles } from '@/components/preview/QuizSolver';
import StoryBars from '@/components/preview/StoryBars';
import ScaleButton from '@/components/ScaleButton';
import { StatusBarTint } from '@/components/StatusBarTint';
import StudyReport from '@/components/StudyReport';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useCardNarration, type SpokenRange } from '@/hooks/useCardNarration';
import { openBookDetail } from '@/lib/preview-nav';
import { formatPrice } from '@/lib/catalog';
import {
  DESC_PARAGRAPHS,
  NARRATION_STEPS,
  PAGES,
  PREVIEW_BOOK,
  PREVIEW_BOOK_TITLE,
  PREVIEW_DATE,
  PREVIEW_NO,
  PREVIEW_QUIZZES,
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
 * 좌우를 탭하면 곧바로 넘어간다. 시간이 차면 저절로 넘어가던 스토리의 자동 넘김은 없앴다 —
 * 장은 손으로만 넘긴다. 메시지 보내기는 만들지 않았다(보낼 곳이 없다).
 *
 * 퀴즈와 리포트는 카드 슬라이드와 같은 것을 쓴다(components/preview/QuizSolver,
 * components/StudyReport). 두 미리보기가 갈라지면 안 되는 흐름이다.
 */

/** 계정 줄의 동그란 표지 썸네일 지름. */
const AVATAR = 34;
/** 구매 안내 장에 세우는 표지의 폭. */
const BUY_COVER_W = 140;

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

  /**
   * 퀴즈와 리포트 — 카드 슬라이드와 같은 흐름이다.
   * 마지막 장의 '퀴즈 풀러 가기' → 문제를 다 풀면 '오늘의 공부 마치기' → 리포트 →
   * '리포트 보러가기' → 서재 상세.
   */
  const [quizOpen, setQuizOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      {/* 어두운 화면이라 상태바도 검게, 시계는 희게. */}
      <StatusBarTint />

      {/* 위 진행 바 — 몇 장 중 몇 번째인지만 말한다. */}
      <View style={styles.bars}>
        <StoryBars count={PAGES.length} page={page} />
      </View>

      {/* 계정 줄 — 스토리의 프로필·이름·시간 자리에 책 표지·책 이름·날짜를 넣는다. */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {PREVIEW_BOOK ? (
            <BookCoverArt
              bookId={PREVIEW_BOOK.bookId}
              coverImage={PREVIEW_BOOK.coverImage}
              coverDesign={PREVIEW_BOOK.coverDesign}
              width={AVATAR}
            />
          ) : null}
        </View>
        <Text style={styles.account}>{PREVIEW_BOOK_TITLE}</Text>
        {PREVIEW_DATE ? <Text style={styles.when}>{PREVIEW_DATE}</Text> : null}
        <View style={styles.headerSpacer} />
        <ScaleButton
          accessibilityLabel="미리보기 닫기"
          style={styles.headerClose}
          onPress={() => router.replace('/settings')}>
          <Ionicons name="close-outline" color={Colors.white} size={24} />
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
              onPress={() => goByTap(page - 1)}
            />
            <View style={styles.tapZone} />
            <Pressable
              accessibilityLabel="다음 장"
              style={styles.tapZone}
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
            { paddingBottom: insets.bottom + 24 },
          ]}>
          <QuizSolver
            quizzes={PREVIEW_QUIZZES}
            // 가짜 문제라 기록하지 않는다 — 여기서 적으면 없는 항목의 진도가 쌓인다.
            target="preview"
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
          onNext={() => {
            setReportOpen(false);
            openBookDetail(router, PREVIEW_BOOK);
          }}
        />
      </Modal>
    </View>
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
          <Text style={styles.title}>번째 이야기</Text>
        </View>
      </View>
    );
  }

  if (kind === 'quote') {
    return (
      <View style={styles.quoteBlock}>
        <SpokenText text={QUOTE_TEXT} style={styles.quoteText} highlightStyle={styles.spokenWord} spoken={spoken} />
        <Text style={styles.quoteSource}>{QUOTE_SOURCE}</Text>
      </View>
    );
  }

  if (kind === 'desc') {
    return (
      <SpokenText
        text={paragraph ?? ''}
        style={styles.descText}
        highlightStyle={styles.spokenWord}
        spoken={spoken}
      />
    );
  }

  // 구매 안내 — 스토리에서는 표지와 값만 얹고 사는 곳은 링크 스티커처럼 한 줄로 둔다.
  return (
    <View style={styles.buyBlock}>
      <Text style={styles.buyLead}>
        {`뒷 내용이 더 궁금하시다면\n『${PREVIEW_BOOK_TITLE}』에서\n이어 읽어 보세요.`}
      </Text>
      {PREVIEW_BOOK ? (
        <BookCoverArt
          bookId={PREVIEW_BOOK.bookId}
          coverImage={PREVIEW_BOOK.coverImage}
          coverDesign={PREVIEW_BOOK.coverDesign}
          width={BUY_COVER_W}
        />
      ) : null}
      {/* 값은 카탈로그에서 온다 — 예전에는 다른 책의 실제 정가가 박혀 있었다. */}
      {PREVIEW_BOOK?.price ? (
        <View style={styles.buySticker}>
          <Text style={styles.buyStickerText}>{formatPrice(PREVIEW_BOOK.price)}</Text>
        </View>
      ) : null}
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
    paddingHorizontal: 4,
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
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.brown90,
    alignItems: 'center',
    justifyContent: 'center',
    // 표지는 원보다 세로로 길다 — 넘치는 위아래를 원이 잘라 낸다.
    overflow: 'hidden',
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
