import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookCoverArt from '@/components/book/BookCoverArt';
import LessonCoverImage from '@/components/LessonCoverImage';
import MusicPlayer from '@/components/lesson/MusicPlayer';
import SpokenText from '@/components/lesson/SpokenText';
import StoryBars from '@/components/preview/StoryBars';
import ScaleButton from '@/components/ScaleButton';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Colors, Fonts, Ink, Surface, tracking } from '@/constants/theme';
import { useCardNarration } from '@/hooks/useCardNarration';
import { getBookName, type BookLesson } from '@/lib/books';
import {
  buildCardNarration,
  getCardCover,
  getLessonEpigraph,
  type CardPage,
} from '@/lib/card-pages';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getCoverPlan } from '@/lib/cover';
import { splitSentences, splitVerse } from '@/lib/narration';

/**
 * 그림 전체 배경 형식 — 항목의 사진을 화면 가득 깔고 그 위에 글을 큰 글씨로 얹는다.
 *
 * 인스타 스토리 형식과 뼈대(칸 진행 바·계정 줄·좌우 탭)는 같고, 다른 것은 셋이다.
 * - 종이 판이 없다. 글이 사진 위에 바로 앉는다.
 * - 책갈피가 아래 줄 왼쪽으로 내려왔다.
 * - 유튜브 재생기가 아래 줄 '아래'에 붙는다(카드 덱에서는 카드 아랫변에 겹쳐 앉는다).
 *
 * 피그마에 그려진 것은 본문 장뿐이다. 표지 장과 인용 장은 같은 글자 값으로 임시로 세웠고,
 * 맺음 장(퀴즈)은 두지 않았다.
 */

const { width: SCREEN_W } = Dimensions.get('window');

/** 본문 좌우 여백 — 재생기도 이 안쪽 폭을 쓴다. */
const BODY_PADDING_X = 16;
/** 계정 줄의 동그란 표지 썸네일 지름. */
const AVATAR = 34;
/** 사진이 없는 항목에 까는 그림 — 피그마 시안의 것. */
const FALLBACK_BACKDROP = require('@/assets/images/preview/backdrop-piano.jpg');

/**
 * 한 장에 담을 글자 수의 기준.
 *
 * 글씨가 커서(22px) 카드 덱의 기준(200자)으로는 화면을 넘친다. 문장을 차례로 쌓다가
 * 이 값을 넘기 전에 맺는다 — 끊는 자리는 언제나 문장의 끝이고, 한 문장은 쪼개지 않는다.
 */
const MAX_CHARS_PER_PAGE = 110;

function splitParagraph(paragraph: string): string[] {
  // 구절만 세운 문단은 원문과 한글이 한 장에 함께 있어야 한다.
  if (splitVerse(paragraph)) return [paragraph];

  const parts: string[] = [];
  let buffer = '';
  for (const sentence of splitSentences(paragraph)) {
    const joined = buffer ? `${buffer} ${sentence}` : sentence;
    if (buffer && joined.length > MAX_CHARS_PER_PAGE) {
      parts.push(buffer);
      buffer = sentence;
    } else {
      buffer = joined;
    }
  }
  if (buffer) parts.push(buffer);
  return parts;
}

export default function BackdropDetail({
  bookLesson,
  onClose,
}: {
  bookLesson: BookLesson;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { lesson, book } = bookLesson;
  const bookName = getBookName(book);
  const catalogBook = useMemo(() => getCatalogBookByBookId(book), [book]);

  const { pages, cover, epigraph, steps } = useMemo(() => {
    const coverInfo = getCardCover(bookLesson, bookName);
    const epi = getLessonEpigraph(bookLesson);
    const built: CardPage[] = [{ kind: 'cover' }];
    if (epi) built.push({ kind: 'quote' });
    for (const paragraph of lesson.story) {
      for (const part of splitParagraph(paragraph)) built.push({ kind: 'desc', paragraph: part });
    }
    return {
      pages: built,
      cover: coverInfo,
      epigraph: epi,
      steps: buildCardNarration(built, { cover: coverInfo, epigraph: epi }),
    };
  }, [bookLesson, bookName, lesson.story]);

  const [page, setPage] = useState(0);
  const goTo = useCallback(
    (next: number) => setPage(Math.max(0, Math.min(pages.length - 1, next))),
    [pages.length],
  );
  const narration = useCardNarration({ steps, onPage: goTo });

  /** 손으로 넘기면 낭독은 물러난다 — 둘 다 장을 끌면 서로 싸운다(인스타 형식과 같다). */
  const goByTap = (next: number) => {
    narration.stop();
    goTo(next);
  };


  /** 미리보기라 책갈피는 이 화면 안에서만 켜고 끈다 — 실제 책갈피에 적지 않는다. */
  const [marked, setMarked] = useState<Record<number, boolean>>({});

  const current = pages[page];
  const hasMusic = !!cover.listenId;
  /** 그 항목에 골라 둔 사진이 있는가. 없으면 시안의 그림을 깐다. */
  const hasPhoto = useMemo(() => {
    const plan = getCoverPlan(lesson, book);
    return plan.kind === 'image' || plan.kind === 'unsplash';
  }, [lesson, book]);

  const textStyle = [styles.text, hasMusic && styles.textWithMusic];
  const spoken = narration.spoken?.page === page ? narration.spoken : null;

  return (
    <View style={styles.screen}>
      <StatusBarTint />

      {/* 배경 — 사진을 흐리고 검정 50%를 덮어 흰 글이 설 자리를 만든다. */}
      {hasPhoto ? (
        <LessonCoverImage
          lesson={lesson}
          bookId={book}
          style={StyleSheet.absoluteFill}
          blurRadius={5}
          creditPlacement="bottomCenter"
        />
      ) : (
        <Image
          source={FALLBACK_BACKDROP}
          style={styles.backdrop}
          resizeMode="cover"
          blurRadius={5}
          accessibilityIgnoresInvertColors
        />
      )}
      <View style={styles.scrim} pointerEvents="none" />

      <View
        style={[styles.frame, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}
        pointerEvents="box-none">
        <View style={styles.bars}>
          <StoryBars count={pages.length} page={page} />
        </View>

        {/* 계정 줄 — 표지·책 이름, 그리고 닫기. */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <BookCoverArt
              bookId={book}
              coverImage={catalogBook?.coverImage}
              coverDesign={catalogBook?.coverDesign}
              width={AVATAR}
            />
          </View>
          <Text style={styles.account}>{bookName}</Text>
          <View style={styles.headerSpacer} />
          <ScaleButton accessibilityLabel="닫기" style={styles.close} onPress={onClose}>
            <Ionicons name="close-outline" color={Colors.white} size={24} />
          </ScaleButton>
        </View>

        <View style={styles.body} pointerEvents="box-none">
          <View style={styles.stage}>
            <View style={styles.card}>
              {current.kind === 'cover' ? (
                <>
                  <Text style={[textStyle, styles.centered]}>{cover.title}</Text>
                  {cover.subtitle ? <Text style={styles.sub}>{cover.subtitle}</Text> : null}
                </>
              ) : current.kind === 'quote' ? (
                <>
                  <SpokenText
                    text={epigraph?.text ?? ''}
                    style={textStyle}
                    highlightStyle={styles.spokenWord}
                    spoken={spoken}
                  />
                  {epigraph?.by ? <Text style={[styles.sub, styles.subLeft]}>{epigraph.by}</Text> : null}
                </>
              ) : (
                <SpokenText
                  text={current.paragraph ?? ''}
                  style={textStyle}
                  highlightStyle={styles.spokenWord}
                  spoken={spoken}
                />
              )}
            </View>

            {/* 좌우 탭으로 넘긴다. 가운데는 아무 일도 하지 않는다. */}
            <View style={styles.tapRow}>
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

          {/* 아래 줄 — 책갈피는 왼쪽, 낭독과 감상 노트는 오른쪽. */}
          <View style={styles.footer} pointerEvents="box-none">
            <ScaleButton
              accessibilityLabel={marked[page] ? '책갈피 빼기' : '책갈피 꽂기'}
              style={styles.bookmark}
              onPress={() => setMarked((prev) => ({ ...prev, [page]: !prev[page] }))}>
              <Ionicons
                name={marked[page] ? 'bookmark' : 'bookmark-outline'}
                color={Colors.white}
                size={18}
              />
            </ScaleButton>
            <View style={styles.footerButtons}>
              <ScaleButton
                accessibilityLabel={narration.playing ? '읽기 멈추기' : '자동으로 읽기'}
                style={styles.footerHit}
                onPress={narration.toggle}>
                <Ionicons
                  name={narration.playing ? 'pause' : 'headset'}
                  color={Colors.white}
                  size={18}
                />
              </ScaleButton>
              {/* 미리보기라 감상 노트는 열지 않는다(인스타 형식과 같다). */}
              <ScaleButton accessibilityLabel="감상 노트" style={styles.footerHit} onPress={() => {}}>
                <Ionicons name="create" color={Colors.white} size={18} />
              </ScaleButton>
            </View>
          </View>

          {/* 재생기는 장 바깥에 있어 넘겨도 음악이 끊기지 않는다. 낭독을 켠 동안은 세운다. */}
          {cover.listenId ? (
            <MusicPlayer
              videoId={cover.listenId}
              paused={narration.playing}
              width={SCREEN_W - BODY_PADDING_X * 2}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.viewer,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  frame: {
    flex: 1,
    gap: 4,
  },

  bars: {
    paddingHorizontal: 12,
  },

  // 계정 줄
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 8,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: Colors.brown50,
    alignItems: 'center',
    justifyContent: 'center',
    // 표지는 원보다 세로로 길다 — 넘치는 위아래를 원이 잘라 낸다.
    overflow: 'hidden',
  },
  account: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  headerSpacer: {
    flex: 1,
  },
  close: {
    width: 40,
    height: 40,
  },

  body: {
    flex: 1,
    paddingHorizontal: BODY_PADDING_X,
  },
  stage: {
    flex: 1,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tapRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tapZone: {
    flex: 1,
  },

  /** 사진 위의 글 — 22px, 줄 높이 1.65배, 자간 -4%. */
  text: {
    alignSelf: 'stretch',
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    lineHeight: 36,
    letterSpacing: -0.88,
    color: Surface.plate,
  },
  /** 재생기가 아래를 200만큼 차지하는 항목은 글을 18px로 줄인다. */
  textWithMusic: {
    fontSize: 18,
    lineHeight: 30,
    letterSpacing: -0.72,
  },
  centered: {
    textAlign: 'center',
  },
  /** 표제 아래의 부제, 인용문 아래의 뜻풀이·출처. */
  sub: {
    marginTop: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: tracking(14),
    textAlign: 'center',
    color: Ink.muted,
  },
  subLeft: {
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  /** 낭독이 읽는 낱말 — 어두운 바탕이라 흰 글에 옅은 흰 판을 깐다. */
  spokenWord: {
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  // 아래 줄
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  bookmark: {
    width: 32,
    height: 32,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerHit: {
    width: 40,
    height: 40,
  },
});
