import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useBookmarkList, type BookmarkEntry } from '@/components/mypage/useBookmarkList';
import ScaleButton from '@/components/ScaleButton';
import { formatReadDate } from '@/components/mypage/useBookStats';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { useBookmarks } from '@/context/BookmarkContext';
import { useToast } from '@/context/ToastContext';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/**
 * 책갈피.
 *
 * 마이페이지 → 책 정보의 '책갈피' 칸에서 들어온다. 접어 둔 장들을 최근에 접은 순으로
 * 늘어놓고, 그 장에 적혀 있던 글을 통째로 보여 준다 — 장 번호만 적어 두면 무엇을
 * 접었는지 알 수 없어 다시 열어 봐야 하고, 글을 줄이면 여기서 또 한 번 열어 봐야 한다.
 *
 * 카드는 누르는 물건이 아니다. 여기는 접어 둔 글을 다시 읽는 자리고, 누를 것은 카드마다
 * 하나 — 오른쪽 아래의 X(빼기)뿐이다.
 */
export default function BookmarksScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { remove } = useBookmarks();
  const { showToast } = useToast();

  // 라우트로 받은 id가 학습 가능한 책인지 확인한다 — 책갈피는 그 책들의 장에만 꽂힌다.
  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const bookmarks = useBookmarkList(studyBook?.id);

  /**
   * 책갈피를 뺀다 — 되묻지 않는다.
   *
   * 다시 꽂는 데 드는 값이 작고(그 장에서 책갈피를 한 번 더 누르면 된다), 목록에서
   * 사라지는 것이 그 자리에서 바로 보인다. 대신 무슨 일이 일어났는지는 토스트로 말한다.
   */
  const removeBookmark = (lessonId: string, page: number) => {
    remove(lessonId, page);
    showToast('책갈피를 뺐습니다');
  };

  // 들어온 자리(책 정보)로 돌려보낸다. 그 화면도 제가 어디서 왔는지(from)를 들고 있어야
  // 한 단계 더 뒤로 갈 수 있으므로 그대로 실어 보낸다.
  const back = id ? `/library/book/${id}${from ? `?from=${from}` : ''}` : '/library';

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
            <BookmarkCard
              key={item.key}
              item={item}
              onRemove={() => removeBookmark(item.lessonId, item.page)}
            />
          ))}
        </View>
      )}
    </MyPageShell>
  );
}

/**
 * 책갈피 한 장 — 어느 날 몇 번째 장이었는지, 접어 둔 글, 접은 날 순으로 읽힌다.
 *
 * 카드는 누르는 물건이 아니다. 접어 둔 글을 그대로 읽는 자리고, 누를 것은 오른쪽 아래
 * X(빼기) 하나뿐이다. 글은 줄이지 않는다 — 접어 둔 것을 다시 읽으러 온 자리에서 '더
 * 보기'가 필요하면 접어 둔 의미가 없다.
 */
function BookmarkCard({ item, onRemove }: { item: BookmarkEntry; onRemove: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.where}>{`${item.month}월 ${item.day}일 · ${item.lessonTitle}`}</Text>
      <Text style={styles.page}>
        {`${item.page + 1} / ${item.pageCount}장${item.label ? ` · ${item.label}` : ''}`}
      </Text>

      {item.text ? (
        <Text style={styles.text}>{item.text}</Text>
      ) : (
        <Text style={styles.noText}>글이 없는 장이에요</Text>
      )}

      {/* 접은 날과 빼기가 한 줄에 — 날짜는 왼쪽 끝, X는 오른쪽 끝이다. */}
      <View style={styles.footRow}>
        <Text style={styles.at}>{formatReadDate(item.at)}</Text>
        <ScaleButton
          accessibilityLabel={`${item.lessonTitle} ${item.page + 1}장 책갈피 빼기`}
          style={styles.removeButton}
          onPress={onRemove}>
          <Ionicons name="close" color={Ink.muted} size={18} />
        </ScaleButton>
      </View>
    </View>
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

  /** 책갈피 한 장 — 테두리 없이 한 단 올라온 종이다(Surface.card). */
  card: {
    gap: Space[4],
    padding: Space[20],
    borderRadius: Corner.card,
    backgroundColor: Surface.card,
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
  /**
   * 접어 둔 글 — 읽는 글이라 본문 서체(을유1945)를 쓴다.
   *
   * 줄 수를 제한하지 않는다. 카드가 길어지더라도 접어 둔 글은 통째로 보여야 한다.
   */
  text: {
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
  /** 접은 날과 빼기 버튼이 마주 보는 줄. */
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Space[4],
  },
  at: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  /**
   * 빼기 — 작게 두되 손가락이 받을 자리는 넓힌다. 음수 마진으로 넓힌 만큼 되밀어,
   * 아이콘 자체는 카드 오른쪽 여백에 맞춰 선다.
   */
  removeButton: {
    width: 32,
    height: 32,
    marginRight: -Space[8],
    marginVertical: -Space[8],
    borderRadius: Corner.pill,
  },
});
