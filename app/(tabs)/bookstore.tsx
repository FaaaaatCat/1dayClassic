import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookCard from "@/components/BookCard";
import SelectField, { SelectRow, type SelectOption } from "@/components/SelectField";
import { Ink, Surface, Type, trackBody } from '@/constants/theme';
import { useBookSelection } from "@/context/BookSelectionContext";
import { BOOKSTORE_BOOKS, isMvpBook } from "@/lib/bookstore";
import { getCatalogBooks, type CatalogBook } from "@/lib/catalog";
import { FIELD_NAMES, fieldsOf, SERIES_NAMES, seriesOf } from "@/lib/tags";

/**
 * 시리즈 필터에 얹는 MVP 칩의 라벨. 출판사 태그가 아니라 앱이 만든 합성 카테고리라
 * lib/tags.ts의 SERIES_NAMES에는 넣지 않고, 이 화면에서만 특수 케이스로 다룬다.
 */
const MVP_FILTER = "MVP";

interface Entry {
  book: CatalogBook;
  series: string[];
  fields: string[];
  /** 학습 가능한 책 중 지금 MVP가 제공하는 책인지(liberal 제외). */
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
 * 제목 줄과 필터는 목록 밖에 있어 스크롤과 무관하게 늘 붙어 있다(그래서 탭 네비게이터의
 * 공용 헤더를 껐다). 예전에는 스크롤 방향을 세어 접었다 폈다 했는데, 방향이 꺾이는 자리마다
 * 상태가 엇갈려 화면이 튀었다.
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

  /** 검색 열기 — 제목 줄 아래에 인풋이 붙는다. */
  const openSearch = () => setSearchOpen(true);

  /** 검색 닫기 — 검색어까지 비워서 목록을 원래대로 되돌린다. */
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  /**
   * 책마다 시리즈·분야를 미리 풀어 둔다 — 필터를 누를 때마다 277권치 태그를
   * 다시 훑지 않기 위해서다. 선택 여부는 자주 바뀌므로 여기 넣지 않는다.
   */
  const tagged = useMemo<Entry[]>(
    () =>
      getCatalogBooks().map((book) => ({
        book,
        series: seriesOf(book.tags, book.title),
        fields: fieldsOf(book.tags),
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

    // 고른 책이 맨 앞. sort는 안정 정렬이라 같은 등급 안에서는
    // 카탈로그 순서(발행일 최신순)가 그대로 유지된다.
    const rank = (entry: Entry) => {
      if (entry.book.bookId !== null && entry.book.bookId === selectedBookId)
        return 0;
      return 1;
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

  /** 학습 가능한 책은 BookId로 열어야 상세 화면이 목차와 '이 책으로 변경하기'를 띄운다. */
  const openBook = (book: CatalogBook) => {
    router.push({
      pathname: "/book/[id]",
      params: { id: book.bookId ?? book.id, from: "bookstore" },
    });
  };

  /**
   * 타이틀 줄과 (열려 있으면) 검색 인풋.
   *
   * 목록과 함께 스크롤되지 않고 화면 맨 위에 붙어 있다. 예전에는 스크롤 방향을 세어
   * 접었다 폈다 했는데, 방향이 꺾이는 순간마다 상태가 두 번씩 바뀌며 화면이 튀었다.
   * 책을 고르는 화면에서 제목 줄이 몇 픽셀 아끼자고 그렇게 흔들릴 이유가 없다.
   */
  const titleSection = () => (
    <View>
      <View style={styles.titleBar}>
        {/* 탭바를 걷어냈으므로 돌아가는 길이 화면 안에 있어야 한다. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color={Ink.primary} size={22} />
        </Pressable>
        <Text style={styles.title}>하루 서점</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="책 검색"
          hitSlop={12}
          onPress={openSearch}
        >
          <Ionicons
            name="search"
            color={Ink.primary}
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
              autoFocus
              placeholder="제목이나 저자로 찾기"
              placeholderTextColor={Ink.body}
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
                color={Ink.body}
                size={18}
              />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  /**
   * 고를 수 있는 것들 — '전체'가 맨 위에 오고, 나머지는 권수 많은 순이다. 0권인 항목은
   * 아예 넣지 않는다(고르면 빈 화면이 나오는 선택지를 보여 줄 이유가 없다).
   */
  const optionsFor = (
    allLabel: string,
    names: string[],
    tally: Record<string, number>,
    pinned: string[] = [],
  ): SelectOption[] => [
    { value: null, label: allLabel },
    ...pinned.map((name) => ({ value: name, label: name })),
    ...names
      .filter((name) => (tally[name] ?? 0) > 0)
      .sort((a, b) => tally[b] - tally[a])
      .map((name) => ({ value: name, label: name, count: tally[name] })),
  ];

  const filters = (
    <SelectRow>
      <SelectField
        title="시리즈"
        label={series ?? '시리즈 전체'}
        options={optionsFor('시리즈 전체', SERIES_NAMES, counts.bySeries, [MVP_FILTER])}
        value={series}
        onChange={setSeries}
      />
      <SelectField
        title="분야"
        label={field ?? '분야 전체'}
        options={optionsFor('분야 전체', FIELD_NAMES, counts.byField)}
        value={field}
        onChange={setField}
      />
    </SelectRow>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 제목 줄과 필터는 목록 밖에 있다 — 스크롤과 무관하게 늘 같은 자리에 붙어 있다. */}
      {titleSection()}
      {filters}

      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(row) => row[0].book.id}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        windowSize={5}
        removeClippedSubviews
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
                      { uri: entry.book.coverImage }) || {
                      uri: entry.book.coverImage,
                    }
                  }
                  series={entry.series}
                  fields={entry.fields}
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

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  content: {
    paddingBottom: 40,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: Surface.canvas,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Surface.canvas,
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
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  searchInput: {
    flex: 1,
    // 안드로이드 TextInput은 기본 세로 여백이 있어 40px 상자 안에서 글자가 아래로 쏠린다.
    paddingVertical: 0,
    fontFamily: Type.ui,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.primary,
  },
  title: {
    flex: 1,
    fontFamily: Type.uiMedium,
    fontSize: 17,
    letterSpacing: trackBody(17),
    color: Ink.primary,
  },
  row: {
    flexDirection: "row",
  },
  cellWrap: {
    width: "50%",
  },
  empty: {
    fontFamily: Type.ui,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.body,
    textAlign: "center",
    paddingVertical: 40,
  },
});
