import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useBookmarkList, type BookmarkEntry } from '@/components/mypage/useBookmarkList';
import ScaleButton from '@/components/ScaleButton';
import { formatReadDate } from '@/components/mypage/useBookStats';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/**
 * 책갈피.
 *
 * 마이페이지 → 책 정보의 '책갈피' 칸에서 들어온다. 접어 둔 장들을 최근에 접은 순으로
 * 늘어놓고, 그 장에 적혀 있던 글을 함께 보여 준다 — 장 번호만 적어 두면 무엇을 접었는지
 * 알 수 없어 다시 열어 봐야 한다.
 *
 * 줄을 누르면 그 항목이 열린다. 다만 접어 둔 '장'이 아니라 첫 장부터다 — 카드 넘김
 * 화면은 다시 들어올 때마다 처음부터 펴는 것이 규칙이라(CardDeckDetail의 useFocusEffect
 * 주석), 여기서만 그 규칙을 어기면 같은 화면이 들어오는 문에 따라 다르게 굴게 된다.
 */
export default function BookmarksScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const router = useRouter();

  // 라우트로 받은 id가 학습 가능한 책인지 확인한다 — 책갈피는 그 책들의 장에만 꽂힌다.
  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const bookmarks = useBookmarkList(studyBook?.id);

  // 들어온 자리(책 정보)로 돌려보낸다. 그 화면도 제가 어디서 왔는지(from)를 들고 있어야
  // 한 단계 더 뒤로 갈 수 있으므로 그대로 실어 보낸다.
  const back = id ? `/library/book/${id}${from ? `?from=${from}` : ''}` : '/library';

  const openLesson = (lessonId: string) => {
    if (!studyBook) return;
    router.push({ pathname: '/today', params: { bookId: studyBook.id, lessonId } });
  };

  return (
    <MyPageShell title="책갈피" back={back}>
      {bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 꽂아 둔 책갈피가 없어요</Text>
          <Text style={styles.emptyNote}>읽다가 접어 두고 싶은 장에서 책갈피를 눌러 보세요</Text>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.count}>{`${bookmarks.length}개`}</Text>
          {bookmarks.map((item) => (
            <BookmarkCard key={item.key} item={item} onPress={() => openLesson(item.lessonId)} />
          ))}
        </View>
      )}
    </MyPageShell>
  );
}

/** 책갈피 한 장 — 어느 날 몇 번째 장이었는지, 접어 둔 글, 접은 날 순으로 읽힌다. */
function BookmarkCard({ item, onPress }: { item: BookmarkEntry; onPress: () => void }) {
  return (
    <ScaleButton
      accessibilityLabel={`${item.lessonTitle} 열기`}
      style={styles.card}
      onPress={onPress}>
      <Text style={styles.where}>{`${item.month}월 ${item.day}일 · ${item.lessonTitle}`}</Text>
      <Text style={styles.page}>
        {`${item.page + 1} / ${item.pageCount}장${item.label ? ` · ${item.label}` : ''}`}
      </Text>

      {item.text ? (
        // 넉 줄까지만 보여 준다 — 목록이 본문을 통째로 옮겨 오면 목록이 아니게 된다.
        <Text style={styles.text} numberOfLines={4}>
          {item.text}
        </Text>
      ) : (
        <Text style={styles.noText}>글이 없는 장이에요</Text>
      )}

      <Text style={styles.at}>{formatReadDate(item.at)}</Text>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Space[12],
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[8],
  },
  count: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  empty: {
    gap: Space[4],
    alignItems: 'center',
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[72],
  },
  emptyText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  emptyNote: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
    textAlign: 'center',
  },

  /**
   * 책갈피 한 장 — 테두리 없이 한 단 올라온 종이다(Surface.card).
   *
   * ScaleButton은 기본으로 안을 가운데 정렬하므로 왼쪽으로 되돌린다. 글이 가운데 서면
   * 문단이 아니라 표어처럼 읽힌다.
   */
  card: {
    gap: Space[4],
    padding: Space[20],
    borderRadius: Corner.card,
    backgroundColor: Surface.card,
    alignItems: 'flex-start',
  },
  where: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.strong,
  },
  page: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  /** 접어 둔 글 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  text: {
    alignSelf: 'stretch',
    fontFamily: Type.readingRegular,
    fontSize: 15,
    lineHeight: 26,
    color: Ink.primary,
    paddingTop: Space[4],
  },
  noText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
    paddingTop: Space[4],
  },
  at: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
    paddingTop: Space[4],
  },
});
