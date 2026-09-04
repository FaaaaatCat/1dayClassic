import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useNoteList, type NoteEntry } from '@/components/mypage/useNoteList';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { useNotes } from '@/context/NotesContext';
import { useToast } from '@/context/ToastContext';
import { isDatedBook } from '@/lib/books';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/**
 * 독서 노트.
 *
 * 마이페이지 → 리포트의 '독서 노트' 칸에서 들어온다. 읽으면서 남긴 노트를 책 한 권치
 * 모아 목차 순으로 늘어놓는다 — 노트는 읽던 화면의 창(NoteSheet)에서 항목별로만 보이는데,
 * 그러면 '내가 이 책에 무엇을 적어 왔나'를 볼 자리가 없다.
 *
 * 여기서 할 수 있는 일은 읽기와 지우기다. 적는 일은 읽는 흐름 안에 있어야 해서 그 창에
 * 그대로 둔다.
 */
export default function NotesScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { deleteNote } = useNotes();
  const { showToast } = useToast();

  // 라우트로 받은 id가 학습 가능한 책인지 확인한다 — 노트는 그 책들의 항목에만 붙는다.
  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const notes = useNoteList(studyBook?.id);
  /** 날짜를 달고 나온 책인지 — 아니면 언제 적었는지 대신 어느 글에 적었는지만 말한다. */
  const dated = studyBook ? isDatedBook(studyBook.id) : false;

  /**
   * 노트를 지운다 — 한 번 되묻는다.
   *
   * 책갈피는 되묻지 않고 바로 뺀다. 다시 꽂는 값이 작아서다. 노트는 다르다 — 되돌리려면
   * 적었던 글을 다시 써야 하고, 그 글은 어디에도 남아 있지 않다. 지울 것이 무엇인지
   * 물음 안에 함께 보여 준다. 읽던 화면의 노트 창(NoteSheet)도 같은 규칙을 쓴다.
   */
  const confirmDelete = (item: NoteEntry) => {
    Alert.alert('이 노트를 지울까요?', item.note.text, [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: () => {
          deleteNote(item.lessonId, item.note.id);
          showToast('노트를 지웠습니다');
        },
      },
    ]);
  };

  // 들어온 자리(리포트)로 돌려보낸다. 그 화면도 제가 어디서 왔는지(from)를 들고 있어야
  // 한 단계 더 뒤로 갈 수 있으므로 그대로 실어 보낸다.
  const back = id ? `/library/book/${id}${from ? `?from=${from}` : ''}` : '/library';

  return (
    <MyPageShell title="독서 노트" back={back}>
      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 남긴 노트가 없어요</Text>
          <Text style={styles.emptyNote}>읽다가 떠오른 생각을 노트로 남겨 보세요</Text>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.count}>{`${notes.length}개`}</Text>
          {notes.map((item) => (
            <NoteCard
              key={item.key}
              item={item}
              dated={dated}
              onDelete={() => confirmDelete(item)}
            />
          ))}
        </View>
      )}
    </MyPageShell>
  );
}

/**
 * 노트 한 장 — 어느 날 어느 글에 적은 것인지가 위, 적은 글이 아래.
 *
 * 카드는 누르는 물건이 아니다. 여기는 적어 둔 것을 다시 읽는 자리고, 누를 것은 카드마다
 * 하나 — 오른쪽 위의 X(지우기)뿐이다. 고치기는 아직 어디에도 없다.
 */
function NoteCard({
  item,
  dated,
  onDelete,
}: {
  item: NoteEntry;
  dated: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      {/* 글이 지우기 버튼 밑으로 들어가지 않게 그 폭만큼 비켜 둔다. */}
      <View style={styles.cardBody}>
        {/* 날짜가 없는 책에서는 표제만 적는다 — 원본에 없는 날짜를 앱이 지어내지 않는다. */}
        <Text style={styles.where}>
          {dated ? `${item.month}월 ${item.day}일 · ${item.lessonTitle}` : item.lessonTitle}
        </Text>
        <Text style={styles.when}>{item.note.date}</Text>
        <Text style={styles.text}>{item.note.text}</Text>
      </View>

      <ScaleButton
        accessibilityLabel={`${item.lessonTitle}에 남긴 노트 지우기`}
        style={styles.delete}
        onPress={onDelete}>
        <Ionicons name="close-outline" color={Ink.muted} size={18} />
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

  /** 노트 한 장 — 테두리 없이 한 단 올라온 종이다(틀린 문제 카드와 같은 앉음새). */
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[8],
    padding: Space[20],
    borderRadius: Corner.card,
    backgroundColor: Surface.card,
  },
  cardBody: {
    flex: 1,
    gap: Space[4],
  },
  /** 지우기 — 카드 오른쪽 위. 물러난 색으로 두되 손가락 자리는 넓힌다. */
  delete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Corner.pill,
    // 첫 줄과 눈높이를 맞춘다 — 넓힌 손가락 자리만큼 위로 되민다.
    marginTop: -Space[4],
  },
  where: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.strong,
  },
  when: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  /** 적은 글 — 읽는 글이라 본문 서체(을유1945)를 쓴다. 줄이지 않고 통째로 보여 준다. */
  text: {
    fontFamily: Type.readingRegular,
    ...TypeScale.body,
    color: Ink.primary,
    paddingTop: Space[4],
  },
});
