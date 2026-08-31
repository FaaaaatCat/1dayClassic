import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import BookCard from '@/components/BookCard';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useShelf } from '@/context/ShelfContext';
import { BOOKSTORE_BOOKS, isMvpBook } from '@/lib/bookstore';
import { getCatalogBooks, type CatalogBook } from '@/lib/catalog';
import { fieldsOf, seriesOf } from '@/lib/tags';

interface Entry {
  book: CatalogBook;
  series: string[];
  fields: string[];
  mvp: boolean;
}

/** 격자 한 줄에 두 권. 마지막 줄은 한 권만 올 수 있다. */
function toRows(entries: Entry[]): Entry[][] {
  const rows: Entry[][] = [];
  for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
  return rows;
}

/**
 * 내 서재 — 하루 서점에서 "내 서재에 담기"를 누른 책만 모아 보여준다.
 *
 * 목록이 작아 bookstore.tsx의 필터·검색·sticky 오버레이는 가져오지 않는다. 대신
 * 탭 네비게이터가 그려주는 공용 헤더를 그대로 쓴다(_layout.tsx의 TITLES 참고).
 */
export default function LibraryScreen() {
  const router = useRouter();
  const { shelfIds } = useShelf();
  const { selectedBookId } = useBookSelection();

  const rows = useMemo(() => {
    const catalogById = new Map(getCatalogBooks().map((book) => [book.id, book]));
    // 최신 담은 순 — shelfIds는 오래된 것 먼저라 뒤집는다.
    const entries: Entry[] = [...shelfIds]
      .reverse()
      .map((id) => catalogById.get(id))
      .filter((book): book is CatalogBook => book !== undefined)
      .map((book) => ({
        book,
        series: seriesOf(book.tags, book.title),
        fields: fieldsOf(book.tags),
        mvp: book.bookId !== null && isMvpBook(book.bookId),
      }));
    return toRows(entries);
  }, [shelfIds]);

  const openBook = (book: CatalogBook) => {
    router.push({
      pathname: '/library/book/[id]',
      params: { id: book.bookId ?? book.id },
    });
  };

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(row) => row[0].book.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>아직 담은 책이 없습니다. 하루 서점에서 책을 담아보세요.</Text>
        }
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((entry) => (
              <View key={entry.book.id} style={styles.cellWrap}>
                <BookCard
                  title={entry.book.title}
                  author={entry.book.author}
                  cover={
{ uri: entry.book.coverImage }
                  }
                  series={entry.series}
                  fields={entry.fields}
                  mvp={entry.mvp}
                  selected={entry.book.bookId !== null && entry.book.bookId === selectedBookId}
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
    backgroundColor: Colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
  },
  cellWrap: {
    width: '50%',
  },
  empty: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
    textAlign: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
});
