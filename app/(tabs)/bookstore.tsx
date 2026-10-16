import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { BackHandler, FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, SlideInRight, SlideOutRight } from "react-native-reanimated";

import BookCard from "@/components/BookCard";
import BookstoreHome, { type ListTarget } from '@/components/bookstore/BookstoreHome';
import BookstoreSearch from '@/components/bookstore/BookstoreSearch';
import { useShelfBooks } from '@/components/mypage/useShelfBooks';
import ScreenHeader, { HeaderIconButton } from '@/components/ScreenHeader';
import { Ink, Surface, Type, trackBody } from '@/constants/theme';
import { useBookSelection } from "@/context/BookSelectionContext";
import { getCatalogBooks, type CatalogBook } from "@/lib/catalog";
import { getBookCoverPlan } from "@/lib/cover";
import { SLIDE_MS } from "@/lib/slideTransition";
import { isReadableBook } from "@/lib/bookstore";
import { fieldsOf } from "@/lib/tags";


interface Entry {
  book: CatalogBook;
  fields: string[];
  /** 오늘의 책으로 고를 수 있는 책인지 — 카드 모서리의 '읽기 가능' 탭. */
  readable: boolean;
  /** 제목+저자+출판사+분야를 공백 없이 소문자로 붙여 둔 검색용 문자열. */
  searchKey: string;
}

/** 서점 안에서 쌓이는 페이지 한 장. key는 같은 종류가 다시 쌓여도 새 장으로 그리기 위한 것. */
type PageBody =
  | { kind: "home" }
  | {
      kind: "list";
      field: string | null;
      query: string;
      /** 이 책들만 보여 준다(카탈로그 id). 책 줄의 '더보기'와 '읽기 가능' 바로가기가 쓴다. */
      only: string[] | null;
      /** 제목을 따로 줄 때 — 없으면 분야·검색어·'전체 도서' 순으로 정한다. */
      title: string | null;
    }
  | { kind: "search"; query: string };
type Page = PageBody & { key: number };

/** 그 책을 낸 출판사 — 표지 값에 적혀 있다(학습 가능한 책은 그 책의 표지 값에서 찾는다). */
function imprintOf(book: CatalogBook): string {
  const plan = getBookCoverPlan(book.bookId, book.coverImage, book.coverDesign);
  return plan.kind === "design" ? plan.design.imprint : "";
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
 * 새 페이지가 오른쪽에서 들어와 앞 페이지를 덮는다. 닫을 때는 오른쪽으로 걷힌다.
 * 시간은 앱의 다른 오른쪽 전환과 같다(lib/slideTransition).
 */
const enterFromRight = SlideInRight.duration(SLIDE_MS).easing(Easing.out(Easing.cubic));
const exitToRight = SlideOutRight.duration(SLIDE_MS).easing(Easing.out(Easing.cubic));

let nextPageKey = 1;
const homePage = (): Page => ({ key: 0, kind: "home" });

/** 첫 화면에서 고른 것으로 목록 페이지 한 장을 만든다. */
function listPage(target?: ListTarget): PageBody {
  if (!target) return { kind: "list", field: null, query: "", only: null, title: null };
  if ("field" in target)
    return { kind: "list", field: target.field, query: "", only: null, title: null };
  return {
    kind: "list",
    field: null,
    query: "",
    only: target.books.map((book) => book.id),
    title: target.title,
  };
}

/**
 * 하루 서점 — 페이지를 한 장씩 쌓는다.
 *
 * 들어오면 둘러보는 첫 화면(BookstoreHome: 배너·분야 바로가기·책 줄)이 뜨고, 분야나 전체
 * 보기를 고르면 목록 페이지가, 검색을 누르면 검색 페이지가 그 위에 얹힌다. 검색어가 정해지면
 * 검색 페이지 위에 결과 목록이 얹힌다.
 *
 * 페이지들을 라우트로 나누지 않고 이 화면 안의 상태로 둔 것은, 이 화면이 Tabs의 형제라
 * 형제끼리 오가는 길이 스택에 쌓이지 않기 때문이다 — 돌아가는 길을 스스로 들고 있는 편이
 * 분명하다. 아래 장들을 내리지 않고 겹쳐 두므로, 위 장이 걷히면 아래 장이 보던 그대로 있다.
 */
export default function BookstoreScreen() {
  const router = useRouter();
  const { selectedBookId } = useBookSelection();

  const [pages, setPages] = useState<Page[]>(() => [homePage()]);
  /**
   * 서점을 새로 열 때마다 하나씩 올린다. 쌓인 장들을 이 값으로 통째로 갈아 끼우면 걷히는
   * 애니메이션 없이 사라진다 — 장마다 하나씩 빼면 저마다 오른쪽으로 미끄러져 나간다.
   */
  const [generation, setGeneration] = useState(0);

  /**
   * 책 한 권을 들여다보러 나가는 길인지.
   *
   * 그 왕복은 서점을 떠난 것으로 치지 않는다 — 아래 초기화가 이 값을 보고 비켜선다.
   * 라우트 파라미터로 표를 주고받지 않는 건, 파라미터 없이 같은 화면으로 이동하면
   * 예전 파라미터가 지워지지 않고 남아(React Navigation) 한 번 붙은 표가 영영 따라다니기
   * 때문이다. 나가는 쪽이 스스로 적어 두는 편이 수명이 분명하다.
   */
  const toBookRef = useRef(false);

  /**
   * 서점을 떠났다 다시 들어오면 첫 화면으로.
   *
   * 이 화면은 Tabs의 형제라 떠나도 사라지지 않는다 — 쌓아 둔 페이지가 그대로 남는다.
   * 그때 잠깐 걸어 본 조건이므로, 서점을 나갔다 오면 처음처럼 보이는 편이 맞다.
   *
   * 다만 책 하나를 열어 본 것은 서점을 떠난 것이 아니다. 좁혀 고른 책을 들여다보고
   * 돌아왔더니 목록이 풀려 있으면, 고르던 일을 처음부터 다시 해야 한다.
   */
  useFocusEffect(
    useCallback(() => {
      // 표는 한 번 쓰고 지운다 — 남겨 두면 다음에 서점을 새로 열어도 페이지가 풀리지 않는다.
      toBookRef.current = false;
      // 되돌리는 건 떠날 때 한다. 들어올 때 하면 쌓여 있던 장이 눈앞에서 걷힌다.
      return () => {
        if (toBookRef.current) return;
        setPages([homePage()]);
        setGeneration((value) => value + 1);
      };
    }, []),
  );

  const push = (page: PageBody) =>
    setPages((stack) => [...stack, { ...page, key: nextPageKey++ }]);

  const pop = useCallback(
    () => setPages((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack)),
    [],
  );

  /**
   * 검색 페이지 열기. 검색 결과 목록에서 누르면 새로 쌓지 않고 바로 아래의 검색 페이지로
   * 돌아간다 — 검색어를 고쳐 다시 찾는 길이 결과 → 검색 → 결과로 끝없이 쌓이지 않게.
   */
  const openSearch = () => {
    const below = pages[pages.length - 2];
    if (below?.kind === "search") pop();
    else push({ kind: "search", query: "" });
  };

  // 페이지가 쌓여 있는 동안 기기의 뒤로가기는 한 장씩 걷는다(서점을 나가지 않는다).
  const depth = pages.length;
  useFocusEffect(
    useCallback(() => {
      if (depth <= 1) return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        pop();
        return true;
      });
      return () => subscription.remove();
    }, [depth, pop]),
  );

  /** 학습 가능한 책은 BookId로 열어야 상세 화면이 목차와 '이 책으로 변경하기'를 띄운다. */
  const openBook = (book: CatalogBook) => {
    // 이 길로 나가면 돌아왔을 때 페이지를 그대로 둔다(toBookRef 주석 참고).
    toBookRef.current = true;
    router.push({
      pathname: "/book/[id]",
      params: { id: book.bookId ?? book.id, from: "bookstore" },
    });
  };

  const renderPage = (page: Page) => {
    switch (page.kind) {
      case "home":
        return (
          <>
            {/* 탭바를 걷어냈으므로 돌아가는 길이 화면 안에 있어야 한다. */}
            <ScreenHeader
              title="하루 서점"
              back="/"
              action={<HeaderIconButton name="search-outline" label="책 검색" onPress={openSearch} />}
            />
            <BookstoreHome
              onOpenBook={openBook}
              onOpenList={(target) => push(listPage(target))}
            />
          </>
        );
      case "search":
        return (
          <BookstoreSearch
            initialQuery={page.query}
            onBack={pop}
            onSearch={(query) => {
              // 결과에서 돌아왔을 때 창에 검색어가 남아 있도록 이 장에 적어 둔다.
              setPages((stack) => [
                ...stack.slice(0, -1),
                { ...page, query },
                { key: nextPageKey++, kind: "list", field: null, query, only: null, title: null },
              ]);
            }}
          />
        );
      case "list":
        return (
          <BookList
            field={page.field}
            query={page.query}
            only={page.only}
            title={page.title}
            selectedBookId={selectedBookId}
            onBack={pop}
            onSearch={openSearch}
            onOpenBook={openBook}
          />
        );
    }
  };

  return (
    <View key={generation} style={styles.screen}>
      {pages.map((page, index) => (
        <Animated.View
          key={page.key}
          // 맨 처음 장은 서점에 들어올 때 이미 그 자리에 있어야 하므로 미끄러지지 않는다.
          entering={index === 0 ? undefined : enterFromRight}
          exiting={index === 0 ? undefined : exitToRight}
          // 아래 장은 덮여 있는 동안 손가락을 받지 않는다.
          pointerEvents={index === pages.length - 1 ? "auto" : "none"}
          style={styles.page}>
          {renderPage(page)}
        </Animated.View>
      ))}
    </View>
  );
}

/**
 * 목록 페이지 — 카탈로그의 책을 한 격자에 놓는다. 분야로 좁히거나 검색어로 찾은 결과다.
 *
 * 제목 줄은 목록 밖에 있어 스크롤과 무관하게 늘 붙어 있다(그래서 탭 네비게이터의 공용
 * 헤더를 껐다). 격자는 numColumns 대신 두 권씩 묶은 줄을 항목으로 넘긴다 — 그래야 한 줄의
 * 두 카드가 같은 높이로 늘어난다.
 */
function BookList({
  field,
  query,
  only,
  title: givenTitle,
  selectedBookId,
  onBack,
  onSearch,
  onOpenBook,
}: {
  field: string | null;
  query: string;
  only: string[] | null;
  title: string | null;
  selectedBookId: string | null;
  onBack: () => void;
  onSearch: () => void;
  onOpenBook: (book: CatalogBook) => void;
}) {
  /**
   * 책마다 분야를 미리 풀어 둔다 — 필터를 누를 때마다 109권치 태그를
   * 다시 훑지 않기 위해서다. 선택 여부는 자주 바뀌므로 여기 넣지 않는다.
   */
  const tagged = useMemo<Entry[]>(
    () =>
      getCatalogBooks().map((book) => {
        const fields = fieldsOf(book.tags);
        return {
          book,
          fields,
          readable: book.bookId !== null && isReadableBook(book.bookId),
          searchKey: normalize(`${book.title}${book.author}${imprintOf(book)}${fields.join("")}`),
        };
      }),
    [],
  );

  const rows = useMemo(() => {
    const needle = normalize(query);
    const allowed = only ? new Set(only) : null;
    const matched = tagged
      .filter((entry) => allowed === null || allowed.has(entry.book.id))
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
  }, [tagged, field, query, only, selectedBookId]);

  // '내 서재' 리본을 걸 책들 — 서재의 '읽을 예정인 책'(다 읽은 책은 빠진다).
  const { planned } = useShelfBooks();
  const plannedIds = useMemo(() => new Set(planned.map((entry) => entry.book.id)), [planned]);

  const title =
    givenTitle ?? field ?? (query !== "" ? `'${query}' 검색 결과` : "전체 도서");

  return (
    <>
      {/* 헤더 밑에 가는 선을 그어 격자와 가른다 — 목록은 헤더 바로 아래에서 스크롤된다. */}
      <View style={styles.listHeader}>
        <ScreenHeader
          title={title}
          back={onBack}
          action={<HeaderIconButton name="search-outline" label="책 검색" onPress={onSearch} />}
        />
      </View>
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
                  bookId={entry.book.bookId}
                  coverImage={entry.book.coverImage}
                  coverDesign={entry.book.coverDesign}
                  fields={entry.fields}
                  readable={entry.readable}
                  inShelf={plannedIds.has(entry.book.id)}
                  selected={
                    entry.book.bookId !== null &&
                    entry.book.bookId === selectedBookId
                  }
                  onPress={() => onOpenBook(entry.book)}
                />
              </View>
            ))}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  /** 페이지는 모두 같은 자리에 겹친다. 바탕을 칠해 두어야 위 장이 아래 장을 가린다. */
  page: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Surface.canvas,
  },
  listHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Ink.muted,
  },
  content: {
    paddingBottom: 40,
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
