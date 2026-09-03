import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import LessonCoverImage from '@/components/LessonCoverImage';
import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useBookmarkList, type BookmarkEntry } from '@/components/mypage/useBookmarkList';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { useBookmarks } from '@/context/BookmarkContext';
import { useToast } from '@/context/ToastContext';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import type { BookId } from '@/types';

/**
 * 배경 사진을 흐리게 하는 정도.
 *
 * 사진을 알아볼 만큼은 남기고 글이 이길 만큼만 흐린다 — 완전히 뭉개면 어느 항목의
 * 책갈피인지 배경이 말해 주지 못한다.
 */
const BACKGROUND_BLUR = 6;

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
      {!studyBook || bookmarks.length === 0 ? (
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
              bookId={studyBook.id}
              onRemove={() => removeBookmark(item.lessonId, item.page)}
            />
          ))}
        </View>
      )}
    </MyPageShell>
  );
}

/**
 * 책갈피 한 장.
 *
 * 그 항목의 표지를 배경으로 깔고(사진이 없는 책은 표식이 깔린다 — 무엇을 깔지는
 * LessonCoverImage가 lib/cover의 우선순위대로 고른다), 그 위에 어둠을 한 겹 얹은 뒤
 * 접어 둔 글을 놓는다. 사진을 흐리게 하는 건 사진을 보여 주려는 자리가 아니라 글을
 * 읽히려는 자리이기 때문이다 — 초점이 맞은 사진 위에서는 글이 사진과 다툰다.
 *
 * 카드는 누르는 물건이 아니다. 누를 것은 오른쪽 아래 X(빼기) 하나뿐이다. 글도 줄이지
 * 않는다 — 접어 둔 것을 다시 읽으러 온 자리에서 '더 보기'가 필요하면 접어 둔 의미가 없다.
 */
function BookmarkCard({
  item,
  bookId,
  onRemove,
}: {
  item: BookmarkEntry;
  bookId: BookId;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <LessonCoverImage
        lesson={item.lesson}
        bookId={bookId}
        style={StyleSheet.absoluteFill}
        blurRadius={BACKGROUND_BLUR}
        // 위쪽 구석은 글이 시작하는 자리라, 사진가 크레딧은 아래 가운데로 내린다.
        creditPlacement="bottomCenter"
      />
      {/* 사진이 밝아도 글이 읽히도록 어둠을 한 겹 깐다. */}
      <View style={styles.dim} pointerEvents="none" />

      {/*
        손가락을 받지 않는다(box-none). 이 층이 카드를 덮고 있어 그냥 두면 밑에 깔린
        Unsplash 크레딧 링크가 눌리지 않는다 — 그 링크는 사진을 쓸 자격이라 지울 수 없다.
      */}
      <View style={styles.body} pointerEvents="box-none">
        {item.text ? (
          <Text style={styles.text}>{item.text}</Text>
        ) : (
          <Text style={styles.noText}>글이 없는 장이에요</Text>
        )}

        <View style={styles.credit}>
          <Text style={styles.title}>{item.lessonTitle}</Text>
          {item.author ? <Text style={styles.author}>{item.author}</Text> : null}
        </View>
      </View>

      {/* 빼기 — 카드 오른쪽 아래 구석. 글과 겹치지 않게 body가 그만큼 아래를 비워 둔다. */}
      <ScaleButton
        accessibilityLabel={`${item.lessonTitle} ${item.page + 1}장 책갈피 빼기`}
        style={styles.removeButton}
        onPress={onRemove}>
        <Ionicons name="close" color={Surface.plate} size={18} />
      </ScaleButton>
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

  /**
   * 책갈피 한 장 — 표지 사진을 배경으로 깐 어두운 카드다.
   *
   * overflow를 감추는 건 배경이 모서리 밖으로 나가지 않게 하기 위해서고, 최소 높이를
   * 두는 건 글이 한 줄뿐인 장(인용·표지)에서도 카드가 사진처럼 보여야 하기 때문이다.
   */
  card: {
    minHeight: 300,
    borderRadius: Corner.card,
    backgroundColor: Ink.primary,
    overflow: 'hidden',
  },
  /** 사진 위에 까는 어둠 — 밝은 사진에서도 eggshell 글자가 읽혀야 한다. */
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3,3,3,0.55)',
  },
  /**
   * 글이 놓이는 자리 — 카드 높이를 다 쓰고 아래쪽으로 몰아 놓는다(RIDI 카드와 같은
   * 앉음새다). 아래 여백이 큰 건 오른쪽 아래 X가 앉을 자리를 비워 두기 위해서다.
   */
  body: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Space[20],
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[48],
  },
  /**
   * 접어 둔 글 — 읽는 글이라 본문 서체(을유1945)를, 어두운 바탕이라 eggshell을 쓴다.
   *
   * 줄 수를 제한하지 않는다. 카드가 길어지더라도 접어 둔 글은 통째로 보여야 한다.
   */
  text: {
    fontFamily: Type.readingRegular,
    fontSize: 16,
    lineHeight: 30,
    textAlign: 'center',
    color: Ink.onDark,
  },
  noText: {
    fontFamily: Type.readingRegular,
    fontSize: 16,
    lineHeight: 30,
    textAlign: 'center',
    color: Surface.plate,
  },
  /** 글 아래의 출처 두 줄 — 에피소드 제목과 그 아래 저자. */
  credit: {
    gap: Space[4],
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.onDark,
  },
  author: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Surface.plate,
    marginBottom: Space[20],
  },
  /** 빼기 — 카드 오른쪽 아래 구석. 작게 두되 손가락이 받을 자리는 넓힌다. */
  removeButton: {
    position: 'absolute',
    right: Space[12],
    bottom: Space[12],
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
  },
});
