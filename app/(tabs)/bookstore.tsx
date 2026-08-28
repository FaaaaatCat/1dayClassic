import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookCard from "@/components/BookCard";
import TagChip from "@/components/TagChip";
import { Colors, Fonts, tracking } from "@/constants/theme";
import { useBookSelection } from "@/context/BookSelectionContext";
import { BOOKSTORE_BOOKS, isMvpBook } from "@/lib/bookstore";
import { getCatalogBooks, type CatalogBook } from "@/lib/catalog";
import { isCatalogBookPurchased } from "@/lib/purchase";
import { FIELD_NAMES, fieldsOf, SERIES_NAMES, seriesOf } from "@/lib/tags";

/** 학습 가능한 9권은 표지를 로컬 에셋으로 갖고 있다 — 원격 URL보다 선명하고 오프라인에서도 뜬다. */
const LOCAL_COVERS = new Map(
  BOOKSTORE_BOOKS.map((book) => [book.id as string, book.coverImage]),
);

/**
 * 방향이 바뀌었다고 인정하기까지 한 방향으로 움직여야 하는 거리(px).
 *
 * 이벤트 하나의 이동량이 아니라 '같은 방향으로 누적한' 거리를 본다 — 천천히 스크롤하면
 * 한 프레임에 1~2px씩만 오므로, 프레임별로 재면 아무리 올려도 문턱을 못 넘는다.
 */
const DIRECTION_THRESHOLD = 8;
/** 오버레이가 나타날 때 위에서 살짝 내려오는 느낌을 주는 시작 오프셋(px). */
const OVERLAY_SLIDE = 10;

/**
 * 시리즈 필터에 얹는 MVP 칩의 라벨. 출판사 태그가 아니라 앱이 만든 합성 카테고리라
 * lib/tags.ts의 SERIES_NAMES에는 넣지 않고, 이 화면에서만 특수 케이스로 다룬다.
 */
const MVP_FILTER = "MVP";

interface Entry {
  book: CatalogBook;
  series: string[];
  fields: string[];
  purchased: boolean;
  /** 학습 가능한 9권 중 지금 MVP가 제공하는 책인지(liberal 제외). */
  mvp: boolean;
  /** 제목+저자를 공백 없이 소문자로 붙여 둔 검색용 문자열. */
  searchKey: string;
}

/** 검색어와 검색 대상을 같은 모양으로 맞춘다 — 공백과 대소문자를 무시하고 비교하기 위해. */
const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();

/** 격자 한 줄에 두 권. 마지막 줄은 한 권만 올 수 있다. */
function toRows(entries: Entry[]): Entry[][] {
  const rows: Entry[][] = [];
  for (let i = 0; i < entries.length; i += 2)
    rows.push(entries.slice(i, i + 2));
  return rows;
}

/**
 * 하루 서점 — 유유출판사 277권을 한 격자에 놓는다.
 *
 * 타이틀과 필터는 목록과 함께 스크롤되어 올라간다(그래서 탭 네비게이터의 공용 헤더를 껐다).
 * 둘이 화면 밖으로 나가면 같은 내용이 위에서 덮듯 나타나는데, 책 상세 화면의 미니박스와
 * 같은 방식이다 — position:absolute 오버레이라 목록 레이아웃에는 영향을 주지 않는다.
 *
 * 나타나는 조건이 둘로 나뉜다:
 * - 필터: 위치로 판단한다. 흐름 속 필터가 화면 위로 사라지면 나타나고, 돌아오면 사라진다.
 * - 타이틀: 방향으로 판단한다. 목록 어디에 있든 위로 스크롤하는 동안 보이고, 내리면 접힌다.
 *
 * 격자는 numColumns 대신 두 권씩 묶은 줄을 항목으로 넘긴다 — 그래야 한 줄의 두 카드가
 * 같은 높이로 늘어난다.
 */
export default function BookstoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId } = useBookSelection();

  const [series, setSeries] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  /**
   * 검색 열기. 목록은 그 자리에 두고, 타이틀만 펴서 그 아래에 인풋이 붙게 한다
   * (내리는 중이었다면 타이틀이 접혀 있어서 인풋까지 화면 밖으로 밀려난다).
   */
  const openSearch = () => {
    setSearchOpen(true);
    setShowTitle(true);
  };

  /** 검색 닫기 — 검색어까지 비워서 목록을 원래대로 되돌린다. */
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  /**
   * 책마다 시리즈·분야·구매 여부를 미리 풀어 둔다 — 필터를 누를 때마다 277권치 태그를
   * 다시 훑지 않기 위해서다. 선택 여부는 자주 바뀌므로 여기 넣지 않는다.
   */
  const tagged = useMemo<Entry[]>(
    () =>
      getCatalogBooks().map((book) => ({
        book,
        series: seriesOf(book.tags, book.title),
        fields: fieldsOf(book.tags),
        purchased: isCatalogBookPurchased(book.id),
        mvp: book.bookId !== null && isMvpBook(book.bookId),
        searchKey: normalize(`${book.title}${book.author}`),
      })),
    [],
  );

  const rows = useMemo(() => {
    const needle = normalize(query);
    const matched = tagged
      .filter((entry) => {
        if (series === null) return true;
        if (series === MVP_FILTER) return entry.mvp;
        return entry.series.includes(series);
      })
      .filter((entry) => field === null || entry.fields.includes(field))
      .filter((entry) => needle === "" || entry.searchKey.includes(needle));

    // 고른 책이 맨 앞, 그다음이 구매한 책. sort는 안정 정렬이라 같은 등급 안에서는
    // 카탈로그 순서(발행일 최신순)가 그대로 유지된다.
    const rank = (entry: Entry) => {
      if (entry.book.bookId !== null && entry.book.bookId === selectedBookId)
        return 0;
      return entry.purchased ? 1 : 2;
    };
    return toRows([...matched].sort((a, b) => rank(a) - rank(b)));
  }, [tagged, series, field, query, selectedBookId]);

  /**
   * 시리즈·분야별 권수. 화면에 숫자로 보여 주지는 않고, 0권인 칩을 감추고
   * 많이 쓰인 칩을 앞에 놓는 데만 쓴다. 다른 축의 선택은 반영하지 않는다.
   */
  const counts = useMemo(() => {
    const bySeries: Record<string, number> = {};
    const byField: Record<string, number> = {};
    for (const entry of tagged) {
      for (const name of entry.series)
        bySeries[name] = (bySeries[name] ?? 0) + 1;
      for (const name of entry.fields) byField[name] = (byField[name] ?? 0) + 1;
    }
    return { bySeries, byField };
  }, [tagged]);

  /** 학습 가능한 9권은 BookId로 열어야 상세 화면이 목차와 '이 책으로 변경하기'를 띄운다. */
  const openBook = (book: CatalogBook) => {
    router.push({
      pathname: "/book/[id]",
      params: { id: book.bookId ?? book.id, from: "bookstore" },
    });
  };

  // ── 오버레이 상태 ──────────────────────────────────────────────
  const headerHeightRef = useRef(0);
  const [titleHeight, setTitleHeight] = useState(0);
  const lastOffsetRef = useRef(0);
  /** 방향이 안 바뀌는 동안 쌓아 온 이동 거리. 위로 올리면 음수, 내리면 양수. */
  const dirAccumRef = useRef(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  /**
   * 칩을 가로로 스크롤해 둔 위치. 오버레이는 같은 줄을 새로 그리므로, 이걸 기억해 두지 않으면
   * 오버레이가 뜰 때마다 칩이 맨 앞으로 되돌아간다.
   */
  const chipOffsetRef = useRef({ series: 0, field: 0 });

  const filtersProgress = useSharedValue(0);
  const titleProgress = useSharedValue(0);

  useEffect(() => {
    filtersProgress.value = withTiming(showFilters ? 1 : 0, { duration: 200 });
  }, [showFilters, filtersProgress]);

  useEffect(() => {
    titleProgress.value = withTiming(showTitle ? 1 : 0, { duration: 200 });
  }, [showTitle, titleProgress]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: filtersProgress.value,
    transform: [{ translateY: (1 - filtersProgress.value) * -OVERLAY_SLIDE }],
  }));

  // 타이틀이 접히면 오버레이 안쪽 기둥을 그만큼 위로 밀어 필터가 맨 위로 올라오게 한다.
  const columnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - titleProgress.value) * titleHeight }],
  }));

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const delta = y - lastOffsetRef.current;
    lastOffsetRef.current = y;

    setShowFilters(y >= headerHeightRef.current && headerHeightRef.current > 0);

    // 검색 중에는 인풋이 타이틀에 딸려 있으므로 타이틀을 접지 않는다 —
    // 접으면 인풋까지 화면 밖으로 밀려난다.
    // 튕김 구간(y<0)에서는 방향이 뒤집혀 들어와 타이틀이 깜빡인다.
    if (searchOpen || y <= 0) {
      dirAccumRef.current = 0;
      setShowTitle(true);
      return;
    }

    // 방향이 꺾이면 지금까지 쌓은 건 버리고 새 방향으로 다시 센다.
    if (delta * dirAccumRef.current < 0) dirAccumRef.current = 0;
    dirAccumRef.current += delta;

    if (dirAccumRef.current <= -DIRECTION_THRESHOLD) setShowTitle(true);
    else if (dirAccumRef.current >= DIRECTION_THRESHOLD) setShowTitle(false);
  };

  /**
   * 타이틀 줄과 (열려 있으면) 검색 인풋. 흐름 속 헤더와 오버레이가 같은 것을 그린다.
   *
   * 인풋이 둘 생기지만 값은 하나를 공유한다. 자동 포커스는 지금 눈에 보이는 쪽에만 주는데,
   * 어느 쪽이 보이는지는 오버레이가 떠 있는지(showFilters)로 갈린다.
   */
  const titleSection = (isOverlay: boolean) => (
    <View>
      <View style={styles.titleBar}>
        <Text style={styles.title}>하루 서점</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="책 검색"
          hitSlop={12}
          onPress={openSearch}
        >
          <Ionicons
            name="search"
            color={Colors.brown100}
            size={22}
          />
        </Pressable>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus={isOverlay === showFilters}
              placeholder="제목이나 저자로 찾기"
              placeholderTextColor={Colors.brown50}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색 닫기"
              hitSlop={10}
              onPress={closeSearch}
            >
              <Ionicons
                name="close"
                color={Colors.brown50}
                size={18}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  const filterRow = (
    axis: "series" | "field",
    allLabel: string,
    names: string[],
    tally: Record<string, number>,
    active: string | null,
    setActive: (next: string | null) => void,
    /** "전체" 바로 다음에 항상 고정으로 보여줄 칩(MVP처럼 권수 집계가 없는 합성 카테고리용). */
    pinned: string[] = [],
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      contentOffset={{ x: chipOffsetRef.current[axis], y: 0 }}
      scrollEventThrottle={64}
      onScroll={(event) => {
        chipOffsetRef.current[axis] = event.nativeEvent.contentOffset.x;
      }}
    >
      <TagChip
        label={allLabel}
        variant={axis}
        selected={active === null}
        onPress={() => setActive(null)}
      />
      {pinned.map((name) => (
        <TagChip
          key={name}
          label={name}
          variant={axis}
          selected={active === name}
          onPress={() => setActive(active === name ? null : name)}
        />
      ))}
      {names
        .filter((name) => (tally[name] ?? 0) > 0)
        // 권수 많은 시리즈·분야를 앞에 둔다 — 오른쪽으로 스크롤해야 보이는 칩일수록 덜 쓰인다.
        .sort((a, b) => tally[b] - tally[a])
        .map((name) => (
          <TagChip
            key={name}
            label={name}
            variant={axis}
            selected={active === name}
            // 같은 칩을 다시 누르면 해제한다.
            onPress={() => setActive(active === name ? null : name)}
          />
        ))}
    </ScrollView>
  );

  const filters = (
    <View style={styles.filters}>
      {filterRow(
        "series",
        "시리즈 전체",
        SERIES_NAMES,
        counts.bySeries,
        series,
        setSeries,
        [MVP_FILTER],
      )}
      {filterRow(
        "field",
        "분야 전체",
        FIELD_NAMES,
        counts.byField,
        field,
        setField,
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(row) => row[0].book.id}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={4}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          <View
            onLayout={(event) => {
              headerHeightRef.current = event.nativeEvent.layout.height;
            }}
          >
            <View
              onLayout={(event) =>
                setTitleHeight(event.nativeEvent.layout.height)
              }
            >
              {titleSection(false)}
            </View>
            {filters}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>조건에 맞는 책이 없습니다.</Text>
        }
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((entry) => (
              <View key={entry.book.id} style={styles.cellWrap}>
                <BookCard
                  title={entry.book.title}
                  author={entry.book.author}
                  cover={
                    (entry.book.bookId !== null &&
                      LOCAL_COVERS.get(entry.book.bookId)) || {
                      uri: entry.book.coverImage,
                    }
                  }
                  series={entry.series}
                  fields={entry.fields}
                  purchased={entry.purchased}
                  mvp={entry.mvp}
                  selected={
                    entry.book.bookId !== null &&
                    entry.book.bookId === selectedBookId
                  }
                  onPress={() => openBook(entry.book)}
                />
              </View>
            ))}
          </View>
        )}
      />

      {/* 목록 위를 덮는 오버레이. 바깥 틀은 타이틀까지 펼쳤을 때의 높이를 잡아 두고 넘치는 부분을
          잘라내며, box-none이라 타이틀이 접혀 빈 자리는 터치가 그대로 목록으로 지나간다. */}
      <Animated.View
        pointerEvents={showFilters ? "box-none" : "none"}
        style={[styles.overlay, { top: insets.top }, overlayStyle]}
      >
        <Animated.View style={[styles.overlayColumn, columnStyle]}>
          {titleSection(true)}
          {filters}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingBottom: 40,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.white,
  },
  searchInput: {
    flex: 1,
    // 안드로이드 TextInput은 기본 세로 여백이 있어 40px 상자 안에서 글자가 아래로 쏠린다.
    paddingVertical: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: tracking(17),
    color: Colors.brown100,
  },
  filters: {
    backgroundColor: Colors.bg,
    paddingTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
  },
  overlayColumn: {
    backgroundColor: Colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.brown10,
  },
  row: {
    flexDirection: "row",
  },
  cellWrap: {
    width: "50%",
  },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
    textAlign: "center",
    paddingVertical: 40,
  },
});
