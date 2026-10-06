import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import BookCoverArt from '@/components/book/BookCoverArt';
import Chevron from '@/components/Chevron';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { isReadableBook } from '@/lib/bookstore';
import { getCatalogBooks, type CatalogBook } from '@/lib/catalog';
import { getBookCoverPlan } from '@/lib/cover';
import { getExhibitions, type Exhibition } from '@/lib/exhibitions';
import { FIELD_NAMES } from '@/lib/tags';

/**
 * 하루 서점의 첫 화면 — 둘러보는 자리.
 *
 * 다른 서점에서 늘 보던 순서를 그대로 따른다: 넘기는 배너 → 분야 바로가기 → 책 줄들.
 * 낯선 것을 만들지 않는 것이 이 화면의 방침이다. 서점은 길을 헤매지 않는 것이 먼저다.
 *
 * 배너 바탕은 기획전마다 편집이 고른 색이다(data/exhibitions.json의 color). 그 밖의 자리는
 * 전부 무채색 토큰이고, 색은 책 표지에서 온다.
 *
 * 값(정가)은 여기 적지 않는다. 값은 책 상세에서만 보여 준다.
 */

const { width: SCREEN_W } = Dimensions.get('window');
/** 화면 좌우 여백 — 줄 제목과 표지 줄이 같은 선에 선다. */
const GUTTER = Space[20];

/**
 * 기획전 배너. 가운데 장이 216, 양옆에 걸친 장이 180이고, 넘기는 동안 가운데로 올수록
 * 키가 커진다. 폭은 그대로라 양옆 장은 화면 끝에 조금씩 걸쳐 보인다.
 */
const BANNER_W = 320;
const BANNER_GAP = Space[4];
const BANNER_STEP = BANNER_W + BANNER_GAP;
const BANNER_H = 216;
const BANNER_SIDE_H = 180;
/** 첫 장을 화면 가운데에 세우는 좌우 여백. */
const BANNER_INSET = (SCREEN_W - BANNER_W) / 2;
/** 배너가 저절로 넘어가는 간격. */
const BANNER_INTERVAL_MS = 4500;
/** 저절로 넘긴 뒤 자리를 고쳐 잡기까지 — 넘기는 애니메이션이 끝날 만큼. */
const BANNER_SETTLE_MS = 450;
/** 배너에 부채꼴로 펼친 표지의 폭. */
const BANNER_COVER_W = 52;

/** 책 줄의 표지 폭. */
const SHELF_COVER_W = 100;
/** 2026년에 나온 책을 신간으로 본다 — 카탈로그의 가장 최근 발행일이 2026-04다. */
const NEW_SINCE = '2026-01-01';

/** 책 한 권씩 내거는 배너 줄(spotlight)의 한 장. */
const SPOT_W = 320;
const SPOT_GAP = 10;
const SPOT_COVER_W = 100;
/** 표지가 서는 자리의 높이 — 표지(145)의 아래 23을 잘라 띠 밑변에 맞춘다. */
const SPOT_STAGE_H = 122;
const SPOT_BAND_H = 80;
/** 배너 줄의 글자색 — 피그마에서 고른 값이다. */
const SPOT_INK = '#1C3143';

const MVP_MARK = require('@/assets/images/bookstore/mvp.png');
const CLOUD_PATTERN = require('@/assets/images/bookstore/cloud-pattern.png');
const BAND_GLOW = require('@/assets/images/bookstore/ellipse-1.png');
const BAND_SHADE = require('@/assets/images/bookstore/ellipse-2.png');

/** 분야 바로가기의 그림. 표에 없는 분야가 생기면 책 그림으로 둔다. */
const FIELD_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  고전: 'library-outline',
  '한자·한문': 'brush-outline',
  '철학·사상': 'bulb-outline',
  '언어·번역': 'language-outline',
  '글쓰기·문장': 'create-outline',
  '음악·예술': 'musical-notes-outline',
  '심리·마음': 'heart-outline',
  '교양·역사': 'globe-outline',
};

/**
 * 첫 화면 바로가기에 세우는 분야. '읽기·책'은 뺀다 — 전체·읽기 가능과 합쳐 다섯 칸씩 두 줄,
 * 열 칸에 맞추려는 것이다. 분야 자체는 그대로라 검색과 책 칩에는 남는다.
 */
const HOME_FIELDS = FIELD_NAMES.filter((name) => name !== '읽기·책');

/**
 * 목록 페이지로 무엇을 넘기는가 — 아무것도 없으면 전체, field면 그 분야, books면 그 책들만
 * (책 줄의 '더보기'·'읽기 가능' 바로가기). title은 목록 페이지의 제목이다.
 */
export type ListTarget = { field: string } | { title: string; books: CatalogBook[] };

interface Props {
  onOpenBook: (book: CatalogBook) => void;
  onOpenList: (target?: ListTarget) => void;
}

export default function BookstoreHome({ onOpenBook, onOpenList }: Props) {
  const exhibitions = getExhibitions();
  const { readable, fresh, total } = useMemo(() => {
    const books = getCatalogBooks();
    return {
      readable: books.filter((book) => book.bookId !== null && isReadableBook(book.bookId)),
      // 카탈로그는 발행일 순이라 뒤집으면 최신이 앞에 온다.
      fresh: books.filter((book) => book.pubDate >= NEW_SINCE).reverse(),
      total: books.length,
    };
  }, []);

  const openReadable = () => onOpenList({ title: '읽기 가능', books: readable });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Banners exhibitions={exhibitions} onOpenBook={onOpenBook} />

      {/* 분야 바로가기 — 다섯 칸씩 두 줄. 앞의 두 칸은 전체와 읽기 가능이다. */}
      <View style={styles.fields}>
        <FieldButton label="전체" icon="grid-outline" onPress={() => onOpenList()} />
        <ReadableButton count={readable.length} onPress={openReadable} />
        {HOME_FIELDS.map((name) => (
          <FieldButton
            key={name}
            label={name}
            icon={FIELD_ICONS[name] ?? 'book-outline'}
            onPress={() => onOpenList({ field: name })}
          />
        ))}
      </View>

      <Shelf
        title="지금 바로 읽을 수 있는 책"
        books={readable}
        onOpenBook={onOpenBook}
        onMore={openReadable}
      />

      {exhibitions.map((exhibition) =>
        exhibition.spotlight ? (
          <SpotlightShelf
            key={exhibition.id}
            exhibition={exhibition}
            onOpenBook={onOpenBook}
            onMore={() => onOpenList({ title: exhibition.title, books: exhibition.books })}
          />
        ) : (
          <Shelf
            key={exhibition.id}
            title={exhibition.title}
            books={exhibition.books}
            onOpenBook={onOpenBook}
            onMore={() => onOpenList({ title: exhibition.title, books: exhibition.books })}
          />
        ),
      )}

      <Shelf
        title="새로 나온 책"
        books={fresh}
        onOpenBook={onOpenBook}
        onMore={() => onOpenList({ title: '새로 나온 책', books: fresh })}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`전체 도서 ${total}권 보기`}
        style={styles.allButton}
        onPress={() => onOpenList()}>
        <Text style={styles.allButtonText}>{`전체 도서 ${total}권 보기`}</Text>
        <Chevron size={18} color={Ink.strong} direction="forward" />
      </Pressable>
    </ScrollView>
  );
}

/**
 * 넘기는 배너 — 기획전마다 한 장.
 *
 * 끝없이 돈다. 양 끝에 반대쪽 장을 한 장씩 덧대 두고(마지막 | 1 2 3 | 첫째), 덧댄 장에
 * 멈추면 같은 그림의 진짜 장으로 소리 없이 옮겨 앉는다. 그래서 첫 장에서도 왼쪽에 마지막
 * 장이 걸쳐 보인다.
 *
 * 저절로 넘어가되, 손으로 넘기면 그 자리에서 다시 센다. 손댄 직후에 제멋대로 넘어가면
 * 읽던 배너를 빼앗긴다.
 */
function Banners({
  exhibitions,
  onOpenBook,
}: {
  exhibitions: Exhibition[];
  onOpenBook: (book: CatalogBook) => void;
}) {
  const count = exhibitions.length;
  const looped = count > 1;
  const slides = looped ? [exhibitions[count - 1], ...exhibitions, exhibitions[0]] : exhibitions;
  const first = looped ? 1 : 0;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(first * BANNER_STEP);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  /** 지금 가운데 선 장(덧댄 장까지 센 자리). */
  const [slot, setSlot] = useState(first);
  const [dragging, setDragging] = useState(false);
  const placedRef = useRef(false);

  /** 멈춘 자리를 읽어 들이고, 덧댄 장이면 진짜 장으로 옮겨 앉는다. */
  const settle = useCallback(
    (x: number) => {
      let next = Math.round(x / BANNER_STEP);
      if (looped && next === 0) next = count;
      else if (looped && next === count + 1) next = 1;
      if (next * BANNER_STEP !== x) scrollRef.current?.scrollTo({ x: next * BANNER_STEP, animated: false });
      setSlot(next);
    },
    [count, looped, scrollRef],
  );

  useEffect(() => {
    if (!looped || dragging) return;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      const target = (slot + 1) * BANNER_STEP;
      scrollRef.current?.scrollTo({ x: target, animated: true });
      settleTimer = setTimeout(() => settle(target), BANNER_SETTLE_MS);
    }, BANNER_INTERVAL_MS);
    return () => {
      clearTimeout(timer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [slot, looped, dragging, settle, scrollRef]);

  if (count === 0) return null;

  const index = looped ? (slot - 1 + count) % count : slot;

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={BANNER_STEP}
      decelerationRate="fast"
      disableIntervalMomentum
      contentOffset={{ x: first * BANNER_STEP, y: 0 }}
      // 안드로이드는 contentOffset을 무시할 때가 있어, 처음 자리를 잡을 때 한 번 더 옮겨 앉힌다.
      onContentSizeChange={() => {
        if (placedRef.current) return;
        placedRef.current = true;
        scrollRef.current?.scrollTo({ x: first * BANNER_STEP, animated: false });
      }}
      contentContainerStyle={styles.bannerTrack}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => setDragging(true)}
      onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        setDragging(false);
        settle(event.nativeEvent.contentOffset.x);
      }}>
      {slides.map((exhibition, position) => (
        <Banner
          key={`${exhibition.id}-${position}`}
          exhibition={exhibition}
          position={position}
          looped={looped}
          scrollX={scrollX}
          current={index + 1}
          count={count}
          onOpenBook={onOpenBook}
        />
      ))}
    </Animated.ScrollView>
  );
}

function Banner({
  exhibition,
  position,
  looped,
  scrollX,
  current,
  count,
  onOpenBook,
}: {
  exhibition: Exhibition;
  position: number;
  looped: boolean;
  scrollX: SharedValue<number>;
  current: number;
  count: number;
  onOpenBook: (book: CatalogBook) => void;
}) {
  /**
   * 가운데에서 한 장 떨어질 때까지 216 → 180으로 줄어든다.
   *
   * 거리는 한 바퀴(count장)로 접어서 잰다 — 덧댄 장과 그 진짜 장이 언제나 같은 크기가 되게.
   * 그냥 재면 덧댄 장에서 진짜 장으로 옮겨 앉는 순간, 스크롤 값이 따라오기 전 한 프레임
   * 동안 진짜 장이 '몇 장 떨어진 장'으로 계산되어 줄었다 커지며 움찔한다.
   */
  const grow = useAnimatedStyle(() => {
    let offset = (scrollX.value - position * BANNER_STEP) / BANNER_STEP;
    if (looped) {
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;
    }
    return {
      height: interpolate(Math.abs(offset), [0, 1], [BANNER_H, BANNER_SIDE_H], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.banner, { backgroundColor: exhibition.color }, grow]}>
      <View style={styles.bannerTop}>
        <Text style={styles.bannerEyebrow}>기획전</Text>
        <View style={styles.bannerCount}>
          <Text style={styles.bannerCountNow}>{current}</Text>
          <Text style={styles.bannerCountAll}>{`/ ${count}`}</Text>
        </View>
      </View>
      <BannerFan books={exhibition.books} onOpenBook={onOpenBook} />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {exhibition.title}
        </Text>
        <Text style={styles.bannerSubtitle} numberOfLines={1}>
          {exhibition.subtitle}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * 표지 셋을 부채꼴로 — 첫째는 왼쪽으로 15° 눕고, 셋째는 오른쪽으로 15° 눕고, 둘째가 그
 * 위 가운데에 곧게 선다. 자리는 피그마의 값 그대로다(눕힌 표지의 상자 기준).
 */
const FAN_W = 119;
const FAN_H = 89.4;
const FAN_SLOTS = [
  { left: 8.87, top: 8.55, rotate: '-15deg' },
  { left: 58.11, top: 7.05, rotate: '15deg' },
  { left: 32.74, top: 0, rotate: '0deg' },
];
/** 그리는 차례(뒤에서 앞으로)와 그 자리에 올 책의 순번. */
const FAN_ORDER = [
  { slot: 0, book: 0 },
  { slot: 1, book: 2 },
  { slot: 2, book: 1 },
];

function BannerFan({
  books,
  onOpenBook,
}: {
  books: CatalogBook[];
  onOpenBook: (book: CatalogBook) => void;
}) {
  return (
    <View style={styles.fanRow}>
      <View style={styles.fan}>
        {FAN_ORDER.map(({ slot, book: at }) => {
          const book = books[at];
          if (!book) return null;
          const { left, top, rotate } = FAN_SLOTS[slot];
          return (
            <Pressable
              key={book.id}
              accessibilityRole="button"
              accessibilityLabel={`${book.title} 상세 보기`}
              style={[styles.fanCover, { left, top, transform: [{ rotate }] }]}
              onPress={() => onOpenBook(book)}>
              <BookCoverArt
                bookId={book.bookId}
                coverImage={book.coverImage}
                coverDesign={book.coverDesign}
                width={BANNER_COVER_W}
                style={styles.bannerCoverEdge}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FieldButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} 분야 보기`}
      style={styles.field}
      onPress={onPress}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={22} color={Ink.strong} />
      </View>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** '읽기 가능' 바로가기 — 검은 판에 MVP 표, 오른쪽 위에 읽을 수 있는 권수. */
function ReadableButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`읽기 가능한 책 ${count}권 보기`}
      style={styles.field}
      onPress={onPress}>
      <View style={[styles.fieldIcon, styles.readableIcon]}>
        <Image source={MVP_MARK} style={styles.mvpMark} resizeMode="contain" />
        <View style={styles.readableBadge}>
          <Text style={styles.readableBadgeText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.fieldLabel} numberOfLines={1}>
        읽기 가능
      </Text>
    </Pressable>
  );
}

/** 줄 제목 — 위에 짧은 검은 막대를 얹고, 오른쪽 끝에 '더보기'. */
function ShelfHead({ title, onMore }: { title: string; onMore: () => void }) {
  return (
    <View style={styles.shelfHead}>
      <View style={styles.shelfMark} />
      <View style={styles.shelfTitleRow}>
        <Text style={styles.shelfTitle} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} 더보기`}
          hitSlop={10}
          onPress={onMore}>
          <Text style={styles.shelfMore}>더보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** 책 줄 — 제목 아래 표지를 가로로 늘어놓는다. '더보기'는 이 책들만 모은 목록을 연다. */
function Shelf({
  title,
  books,
  onOpenBook,
  onMore,
}: {
  title: string;
  books: CatalogBook[];
  onOpenBook: (book: CatalogBook) => void;
  onMore: () => void;
}) {
  if (books.length === 0) return null;

  return (
    <View style={styles.shelf}>
      <ShelfHead title={title} onMore={onMore} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfBooks}>
        {books.map((book) => (
          <Pressable
            key={book.id}
            accessibilityRole="button"
            accessibilityLabel={`${book.title} 상세 보기`}
            style={styles.shelfBook}
            onPress={() => onOpenBook(book)}>
            <BookCoverArt
              bookId={book.bookId}
              coverImage={book.coverImage}
              coverDesign={book.coverDesign}
              width={SHELF_COVER_W}
            />
            <Text style={styles.bookTitle} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>
              {book.author}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * 책 한 권씩 내거는 배너 줄 — 기획전에 spotlight 문구가 있으면 표지 줄 대신 이것으로 그린다.
 *
 * 표지가 그 책 종이색의 띠 위에 서고, 띠에는 구름 무늬와 표지 뒤의 빛·그늘이 깔린다.
 * 띠 색은 표지에서 오므로 책이 바뀌어도 그 책의 색으로 따라간다(그늘도 그 색으로 물들인다).
 */
function SpotlightShelf({
  exhibition,
  onOpenBook,
  onMore,
}: {
  exhibition: Exhibition;
  onOpenBook: (book: CatalogBook) => void;
  onMore: () => void;
}) {
  if (exhibition.books.length === 0) return null;

  return (
    <View style={styles.shelf}>
      <ShelfHead title={exhibition.title} onMore={onMore} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SPOT_W + SPOT_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.spotTrack}>
        {exhibition.books.map((book) => (
          <SpotlightCard
            key={book.id}
            book={book}
            lines={exhibition.spotlight?.[book.id] ?? [book.title]}
            onPress={() => onOpenBook(book)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SpotlightCard({
  book,
  lines,
  onPress,
}: {
  book: CatalogBook;
  lines: string[];
  onPress: () => void;
}) {
  const plan = getBookCoverPlan(book.bookId, book.coverImage, book.coverDesign);
  const paper = plan.kind === 'design' ? plan.design.paper : Surface.plate;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title} 상세 보기`}
      style={styles.spotCard}
      onPress={onPress}>
      <View style={styles.spotStage}>
        <View style={[styles.spotBand, { backgroundColor: paper }]}>
          <View style={styles.spotBandDim} />
          <Image source={CLOUD_PATTERN} style={styles.spotPattern} resizeMode="cover" />
          <Image source={BAND_SHADE} style={[styles.spotShade, { tintColor: paper }]} />
          <Image source={BAND_GLOW} style={styles.spotGlow} />
        </View>
        <BookCoverArt
          bookId={book.bookId}
          coverImage={book.coverImage}
          coverDesign={book.coverDesign}
          width={SPOT_COVER_W}
          style={styles.spotCover}
        />
      </View>
      <View style={styles.spotText}>
        <Text style={styles.spotLines}>{lines.join('\n')}</Text>
        <Text style={styles.spotAuthor} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </Pressable>
  );
}

/** 구름 무늬 그림의 비율(740×493)과, 띠 위아래로 80씩 넘치게 까는 높이. */
const PATTERN_H = SPOT_BAND_H + 160;
const PATTERN_W = (PATTERN_H * 740) / 493;
/** 표지 뒤의 빛·그늘 타원(203×120). */
const ELLIPSE_W = 203;
const ELLIPSE_H = 120;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  content: {
    paddingTop: Space[8],
    paddingBottom: Space[48],
  },

  // 배너
  bannerTrack: {
    height: BANNER_H,
    alignItems: 'center',
    gap: BANNER_GAP,
    paddingHorizontal: BANNER_INSET,
  },
  banner: {
    width: BANNER_W,
    borderRadius: Corner.card,
    paddingHorizontal: Space[20],
    paddingVertical: Space[8],
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerEyebrow: {
    flex: 1,
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.onDark,
    opacity: 0.7,
  },
  bannerCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space[4],
    paddingHorizontal: Space[8],
    paddingVertical: 2,
    borderRadius: Corner.pill,
    // 검정 70% — 어느 배너 색 위에서도 숫자가 서도록.
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  bannerCountNow: {
    fontFamily: Type.uiMedium,
    fontSize: 12,
    lineHeight: 17,
    color: Ink.onDark,
  },
  bannerCountAll: {
    fontFamily: Type.uiMedium,
    fontSize: 10,
    lineHeight: 17,
    color: Ink.onDark,
    opacity: 0.5,
  },
  fanRow: {
    alignItems: 'center',
  },
  fan: {
    width: FAN_W,
    height: FAN_H,
  },
  fanCover: {
    position: 'absolute',
  },
  /** 바탕과 표지가 같은 색일 때 표지가 묻히지 않도록 가는 테를 두른다. */
  bannerCoverEdge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
  },
  bannerText: {
    gap: Space[4],
    paddingBottom: Space[16],
  },
  bannerTitle: {
    fontFamily: Type.readingBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.8,
    color: Ink.onDark,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontFamily: Type.ui,
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.13,
    color: Ink.onDark,
    opacity: 0.8,
    textAlign: 'center',
  },

  // 분야 바로가기
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GUTTER,
    paddingTop: Space[24],
    rowGap: Space[16],
  },
  field: {
    width: '20%',
    alignItems: 'center',
    gap: Space[8],
  },
  fieldIcon: {
    width: 48,
    height: 48,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.card,
  },
  fieldLabel: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.strong,
  },
  readableIcon: {
    backgroundColor: Ink.primary,
  },
  mvpMark: {
    width: 36.27,
    height: 12.46,
  },
  readableBadge: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Spark.ember,
  },
  readableBadgeText: {
    fontFamily: Type.uiMedium,
    fontSize: 11,
    letterSpacing: trackBody(11),
    color: Ink.onDark,
  },

  // 책 줄
  shelf: {
    marginTop: Space[40],
  },
  shelfHead: {
    paddingHorizontal: GUTTER,
    gap: Space[4],
  },
  /** 줄 제목 위의 짧은 막대 — 구역이 바뀌는 자리를 표시한다. */
  shelfMark: {
    width: 20,
    height: 2,
    backgroundColor: Ink.primary,
  },
  shelfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
  },
  shelfTitle: {
    flex: 1,
    fontFamily: Type.readingBold,
    ...TypeScale.bodyLg,
    letterSpacing: -0.72,
    color: Ink.primary,
  },
  shelfMore: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  shelfBooks: {
    paddingHorizontal: GUTTER,
    paddingTop: Space[16],
    gap: Space[16],
  },
  shelfBook: {
    width: SHELF_COVER_W,
    gap: Space[4],
  },
  bookTitle: {
    marginTop: Space[8],
    fontFamily: Type.readingBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: trackBody(14),
    color: Ink.primary,
  },
  bookAuthor: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },

  // 책 한 권씩 내거는 배너 줄
  spotTrack: {
    paddingHorizontal: GUTTER,
    paddingTop: Space[16],
    gap: SPOT_GAP,
  },
  spotCard: {
    width: SPOT_W,
    gap: Space[16],
  },
  spotStage: {
    height: SPOT_STAGE_H,
    overflow: 'hidden',
  },
  spotBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SPOT_BAND_H,
    borderRadius: Corner.card,
    overflow: 'hidden',
  },
  spotBandDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  /** 구름 무늬 — 피그마는 plus-lighter로 얹었는데 RN에는 없어 가장 가까운 screen으로 얹는다. */
  spotPattern: {
    position: 'absolute',
    top: -80,
    left: (SPOT_W - PATTERN_W) / 2,
    width: PATTERN_W,
    height: PATTERN_H,
    opacity: 0.5,
    mixBlendMode: 'screen',
  },
  spotShade: {
    position: 'absolute',
    top: 12,
    left: (SPOT_W - ELLIPSE_W) / 2 - 0.5,
    width: ELLIPSE_W,
    height: ELLIPSE_H,
    mixBlendMode: 'multiply',
  },
  spotGlow: {
    position: 'absolute',
    top: -52,
    left: (SPOT_W - ELLIPSE_W) / 2 - 0.5,
    width: ELLIPSE_W,
    height: ELLIPSE_H,
    mixBlendMode: 'overlay',
  },
  spotCover: {
    position: 'absolute',
    top: 0,
    left: (SPOT_W - SPOT_COVER_W) / 2,
  },
  spotText: {
    alignItems: 'center',
    gap: Space[4],
  },
  spotLines: {
    fontFamily: Type.readingBold,
    fontSize: 18,
    lineHeight: 25.2,
    letterSpacing: -0.72,
    color: SPOT_INK,
    textAlign: 'center',
  },
  spotAuthor: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: SPOT_INK,
    opacity: 0.8,
    textAlign: 'center',
  },

  allButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[4],
    marginTop: Space[48],
    marginHorizontal: GUTTER,
    height: 48,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
  },
  allButtonText: {
    fontFamily: Type.uiMedium,
    fontSize: 15,
    letterSpacing: trackBody(15),
    color: Ink.strong,
  },
});
