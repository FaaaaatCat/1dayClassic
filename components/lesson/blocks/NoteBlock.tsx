import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useLessonDetail } from '@/components/lesson/LessonDetailContext';
import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useNotes, type Note } from '@/context/NotesContext';

/**
 * 감상 노트. 기존 today.tsx의 notesSection~noteList를 통째로 옮겼다.
 * 항목은 `useLessonDetail()`에서, 노트는 기존 `useNotes()`에서 가져온다.
 *
 * 입력 중인 글(draft)은 이 블록 안에서 관리한다. 항목이 바뀌면 비워야 하는데, 그건
 * 상위(조합 파일)가 `key`로 이 블록을 다시 마운트시켜 처리한다 — 여기서는 그걸 전제한다.
 *
 * 블록 사이 간격은 이 블록이 갖지 않는다 — blockStyles.block이 9종에 똑같이 준다.
 */
export default function NoteBlock() {
  const { bookLesson } = useLessonDetail();
  const lesson = bookLesson.lesson;
  const { notesOf, addNote, deleteNote } = useNotes();
  const notes = notesOf(lesson.id);
  // 음원이 없는 항목은 이야기 낭독만 한다 — 감상 노트 아이콘 선택에 쓴다.
  const hasAudio = Boolean(lesson.audio);

  const [draft, setDraft] = useState('');

  const submitDraft = () => {
    addNote(lesson.id, draft);
    setDraft('');
  };

  /** 편집: 내용을 입력창으로 되돌리고 목록에서 뺀다. 기록하기로 다시 저장. */
  const editNote = (note: Note) => {
    setDraft(note.text);
    deleteNote(lesson.id, note.id);
  };

  return (
    <View style={blockStyles.block}>
      <View style={styles.notesTitleRow}>
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          tintColor={Colors.brown100}
          size={14}
        />
        <Text style={styles.notesTitle}>감상 노트</Text>
      </View>

      <View style={styles.noteBox}>
        <TextInput
          style={styles.noteInput}
          multiline
          value={draft}
          onChangeText={setDraft}
          placeholder="오늘의 공부에서 떠오른 생각을 자유롭게 적어보세요."
          placeholderTextColor={Colors.brown50}
        />
        <ScaleButton accessibilityLabel="기록하기" style={styles.noteSubmit} onPress={submitDraft}>
          <Text style={styles.noteSubmitText}>기록하기</Text>
        </ScaleButton>
      </View>

      <View style={styles.noteList}>
        <View style={styles.noteCountRow}>
          <Text style={styles.noteCount}>{notes.length}개의 기록</Text>
          <View style={styles.noteCountLine} />
        </View>
        {notes.map((note) => (
          <View key={note.id} style={styles.noteItem}>
            <View style={styles.noteItemIcon}>
              <SymbolView
                name={
                  hasAudio
                    ? { ios: 'music.note', android: 'music_note', web: 'music_note' }
                    : { ios: 'book', android: 'menu_book', web: 'menu_book' }
                }
                tintColor={Colors.beige100}
                size={14}
              />
            </View>
            <View style={styles.noteItemBody}>
              <Text style={styles.noteItemText}>{note.text}</Text>
              <View style={styles.noteItemMeta}>
                <Text style={styles.noteItemDate}>{note.date}</Text>
                <ScaleButton accessibilityLabel="기록 편집" onPress={() => editNote(note)}>
                  <Text style={styles.noteItemAction}>편집</Text>
                </ScaleButton>
                <ScaleButton
                  accessibilityLabel="기록 삭제"
                  onPress={() => deleteNote(lesson.id, note.id)}
                >
                  <Text style={styles.noteItemAction}>삭제</Text>
                </ScaleButton>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  notesTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  noteBox: {
    borderWidth: 1,
    borderColor: Colors.brown50,
    borderRadius: 4,
    overflow: 'hidden',
  },
  noteInput: {
    height: 140,
    backgroundColor: Colors.beige10,
    padding: 16,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: tracking(16),
    color: Colors.brown100,
    textAlignVertical: 'top',
  },
  noteSubmit: {
    backgroundColor: Colors.beige50,
    borderTopWidth: 1,
    borderTopColor: Colors.brown50,
    paddingVertical: 16,
  },
  noteSubmitText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.beige100,
  },
  noteList: {
    paddingTop: 40,
  },
  noteCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingBottom: 13,
  },
  noteCount: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.beige100,
  },
  noteCountLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.beige50,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 16,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: Colors.beige50,
  },
  noteItemIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteItemBody: {
    flex: 1,
    gap: 16,
  },
  noteItemText: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 31,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  noteItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteItemDate: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
    color: Colors.beige100,
  },
  noteItemAction: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.beige50,
  },
});
