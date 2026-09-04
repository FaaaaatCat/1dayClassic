import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Type, TypeScale } from '@/constants/theme';
import { useNotes, type Note } from '@/context/NotesContext';

/**
 * 감상 노트 — 아래에서 올라오는 창.
 *
 * 예전에는 전체 화면 팝업 하나에 줄노트가 깔려 있었다. 길게 쓰라고 만든 자리였는데
 * 실제로는 아무도 길게 쓰지 않고 한두 줄씩 던지듯 남겼다. 그래서 유튜브 댓글창처럼
 * 바꾼다 — 남긴 것들이 목록으로 쌓이고, 맨 아래 한 줄로 새로 적는다.
 *
 * ── 밀지 않고 덮는다 ──────────────────────────────────────────────────────
 * 유튜브는 창이 올라오면서 영상을 위로 밀어 올리지만 여기서는 읽던 장을 그대로 두고
 * 그 위를 덮는다. 뒤에 있는 것이 카드 한 장이라, 밀려 올라가면 읽던 자리가 흐트러진다.
 * 그래서 Modal 안에서 딤과 창만 얹는다 — 뒤 화면은 손대지 않는다.
 *
 * ── 자판 위에 앉는다 ─────────────────────────────────────────────────────
 * 입력칸을 누르면 이 창이 자판 바로 위에 붙어야 한다. 모달 창이 키보드에 맞춰 줄어들
 * 것 같지만 그렇지 않다 — 기기에서 재 보면 키보드가 떠 있는 동안에도 창은 화면 전체
 * 그대로다. 그래서 키보드 윗변을 받아 창을 직접 들어 올린다(아래 lift 주석).
 */
export default function NoteSheet({
  lessonId,
  visible,
  onClose,
}: {
  lessonId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { notesOf, addNote, deleteNote } = useNotes();
  const notes = notesOf(lessonId);

  const [draft, setDraft] = useState('');

  /**
   * 키보드에 가리지 않으려고 창을 들어 올릴 높이. 키보드가 없으면 0이다.
   *
   * 키보드가 차지한 높이(height)가 아니라 키보드 윗변(screenY)에서 거꾸로 잰다.
   * 그 둘은 내비게이션 바만큼 다르다 — 이 기기에서 재 보면 화면 780, 키보드 윗변 438,
   * 키보드 높이 294, 내비 바 48이다. 창 바닥을 키보드 윗변에 맞추려면 780-438=342를
   * 들어야 하는데, height만 쓰면 48이 모자라 그만큼 가린다.
   */
  const [lift, setLift] = useState(0);
  useEffect(() => {
    // 안드로이드는 will* 이벤트를 내지 않는다 — did*만 듣는다.
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setLift(Math.max(0, screenH - e.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [screenH]);

  /**
   * 창이 올라오는 움직임. 1이면 화면 아래에 완전히 내려가 있고 0이면 제자리다.
   *
   * 닫힐 때는 건드리지 않는다 — 모달이 페이드로 사라지는 동안 창이 아래로 뛰어내리면
   * 그 움직임이 그대로 보인다. 대신 열릴 때마다 1에서 다시 시작한다.
   */
  const rise = useSharedValue(1);
  useEffect(() => {
    if (!visible) return;
    rise.value = 1;
    rise.value = withTiming(0, { duration: RISE_DURATION, easing: Easing.out(Easing.cubic) });
  }, [visible, rise]);

  /**
   * 창 높이 — 화면의 60%다.
   *
   * 키보드가 올라오면 창이 그만큼 위로 들리므로, 남은 자리보다 크면 상태바를 넘어선다.
   * 넘치지 않게 잘라 둔다 — 창이 화면 끝까지 차 버리면 뒤가 무엇이었는지 알 수 없다.
   */
  const height = Math.min(screenH * SHEET_RATIO, screenH - lift - insets.top - Space[8]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value * height }],
  }));
  // 창이 올라오는 만큼 딤도 함께 짙어진다. 다 올라와도 뒤가 비쳐야 하므로 DIM에서 멈춘다.
  const dimStyle = useAnimatedStyle(() => ({ opacity: (1 - rise.value) * DIM }));

  /**
   * 창을 닫는다 — 키보드가 올라와 있으면 그것부터 내린다.
   *
   * 적다 만 글은 여기서 버린다. 다음에 열었을 때 지난번에 쓰다 만 것이 입력칸에 남아
   * 있으면, 남길 생각이 없어 닫은 글을 다시 마주하게 된다.
   */
  const close = () => {
    setDraft('');
    Keyboard.dismiss();
    onClose();
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addNote(lessonId, text);
    setDraft('');
    // 다 적었으면 목록으로 돌아간다 — 키보드가 그대로 서 있으면 방금 쓴 것이 안 보인다.
    Keyboard.dismiss();
  };

  /**
   * 노트를 지운다 — 한 번 되묻는다.
   *
   * 책갈피는 되묻지 않고 바로 뺀다. 다시 꽂는 값이 작아서다(그 장에서 한 번 더 누르면
   * 된다). 노트는 다르다 — 되돌리려면 적었던 글을 다시 써야 하고, 그 글은 어디에도
   * 남아 있지 않다. 지울 것이 무엇인지 물음 안에 함께 보여 준다.
   */
  const confirmDelete = (note: Note) => {
    Alert.alert('이 노트를 지울까요?', note.text, [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => deleteNote(lessonId, note.id) },
    ]);
  };

  return (
    /*
     * 이 모달 창은 키보드가 올라와도 줄어들지 않는다.
     *
     * 기기에서 창 프레임을 재 보면 키보드가 떠 있는 동안에도 [0,0][1080,2340] — 화면
     * 전체 그대로다(안드로이드가 요즘 창을 줄이는 대신 인셋으로 알려 주기 때문이다).
     * 그래서 아래에 붙은 이 창은 가만두면 키보드에 그대로 덮인다. 자리는 위 lift가
     * 직접 든다.
     */
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.root}>
        {/* 딤 — 뒤 화면이 비치되 물러나 있다. 눌러서 닫는다. */}
        <Pressable style={styles.dimHit} onPress={close} accessibilityLabel="감상 노트 닫기">
          <Animated.View style={[styles.dim, dimStyle]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height,
              // 자판 위로 비켜선다. 없을 때는 내비게이션 바를 피한다.
              marginBottom: lift,
              // 들어 올린 값에 내비 바 몫이 이미 들어 있어, 그때는 아래 여백을 두지 않는다.
              paddingBottom: lift > 0 ? 0 : insets.bottom,
            },
          ]}>
          {/* 검은 잉크 위에 흰빛 10% — 뒤 화면보다 아주 조금만 밝게 떠 있다.
              내용보다 먼저 그려 두면 뒤에 깔린다. */}
          <View style={styles.tint} pointerEvents="none" />

          {/* 위 한 줄 — 제목과 갯수, 그리고 닫기.
              화면 맨 위에 서는 공용 헤더(ScreenHeader)를 쓰지 않는 건 그것이 상태바
              높이를 스스로 대기 때문이다. 여기는 화면 아래에 뜨는 창이라 그 자리가 없다. */}
          <View style={styles.header}>
            <Text style={styles.title}>감상 노트</Text>
            {notes.length > 0 ? <Text style={styles.count}>{notes.length}</Text> : null}
            <View style={styles.headerSpacer} />
            <ScaleButton accessibilityLabel="닫기" style={styles.close} onPress={close}>
              <Ionicons name="close-outline" color={Ink.onDark} size={24} />
            </ScaleButton>
          </View>

          {notes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>작성한 노트가 없습니다</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {notes.map((note) => (
                <View key={note.id} style={styles.note}>
                  <View style={styles.noteBody}>
                    <Text style={styles.noteDate}>{note.date}</Text>
                    <Text style={styles.noteText}>{note.text}</Text>
                  </View>
                  <ScaleButton
                    accessibilityLabel="이 노트 지우기"
                    style={styles.noteDelete}
                    onPress={() => confirmDelete(note)}>
                    <Ionicons name="close-outline" color={Ink.muted} size={18} />
                  </ScaleButton>
                </View>
              ))}
            </ScrollView>
          )}

          {/* 아래 한 줄 — 여기에 적는다. 누르면 키보드가 올라오고 창이 그 위로 비켜선다. */}
          <View style={styles.composer}>
            {/* 창 바탕 위에 흰빛을 한 겹 더 — 목록과 적는 자리가 구분된다.
                창이 쓰는 것과 같은 층이라 세기도 같은 값(TINT)에서 나온다. */}
            <View style={styles.tint} pointerEvents="none" />

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="노트 작성하기"
              placeholderTextColor={Ink.muted}
              multiline
              underlineColorAndroid="transparent"
            />
            {/* 보내기는 적은 것이 있을 때만 눈에 띈다 — 빈 채로 누를 일이 없다. */}
            <ScaleButton
              accessibilityLabel="노트 남기기"
              disabled={draft.trim().length === 0}
              style={[styles.send, draft.trim().length === 0 && styles.sendOff]}
              onPress={submit}>
              <Ionicons
                name="arrow-up"
                color={draft.trim().length === 0 ? Ink.muted : Ink.onDark}
                size={18}
              />
            </ScaleButton>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** 창이 차지하는 화면 높이의 비율. */
const SHEET_RATIO = 0.6;
/** 올라오는 데 걸리는 시간 — 끝에서 느려지며 놓인다. */
const RISE_DURATION = 260;
/** 다 올라왔을 때 딤의 짙기 — 뒤 화면이 비치되 물러나 보일 만큼. */
const DIM = 0.55;
/**
 * 창 바탕에 얹는 흰빛의 세기.
 *
 * 읽기 화면이 검으므로 이 창도 검다. 다만 완전히 같은 검정이면 어디까지가 창인지
 * 보이지 않아, 흰빛을 10%만 얹어 아주 조금 띄운다. Ink.strong 같은 기존 회색은
 * 이 자리에 쓰기엔 너무 밝다.
 */
const TINT = 0.1;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  /** 딤이 받는 손가락 — 창 뒤 전체를 덮는다. */
  dimHit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dim: {
    flex: 1,
    backgroundColor: '#000000',
  },
  /** 아래에서 올라와 앉는 창 — 위 두 귀만 둥글다. */
  sheet: {
    borderTopLeftRadius: Corner.card,
    borderTopRightRadius: Corner.card,
    backgroundColor: Ink.primary,
    overflow: 'hidden',
  },
  /**
   * 검정 위에 깔리는 흰빛 — 창 바탕과 적는 자리가 함께 쓴다.
   *
   * 적는 자리에는 이것이 한 겹 더 얹혀 창보다 밝다. 그래야 읽는 목록과 적는 자리가
   * 선 하나에 기대지 않고도 갈린다.
   */
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Ink.onDark,
    opacity: TINT,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    height: 52,
    paddingLeft: Space[20],
    paddingRight: Space[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Ink.strong,
  },
  title: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
  count: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  headerSpacer: {
    flex: 1,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: Corner.pill,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.muted,
  },

  list: {
    flex: 1,
  },
  listBody: {
    gap: Space[20],
    paddingHorizontal: Space[20],
    paddingVertical: Space[16],
  },
  /** 노트 한 개 — 글 왼쪽, 지우기 오른쪽. */
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space[8],
  },
  /** 언제 적었는지가 위, 적은 글이 아래. */
  noteBody: {
    flex: 1,
    gap: Space[4],
  },
  /**
   * 지우기 — 글 오른쪽에 조용히 선다.
   *
   * 글자보다 물러난 색(muted)을 쓰는 건 여기가 읽는 자리이지 지우는 자리가 아니어서다.
   * 다만 손가락이 받을 자리는 글리프보다 넓게 둔다.
   */
  noteDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Corner.pill,
    // 첫 줄(날짜)과 눈높이를 맞춘다 — 넓힌 손가락 자리만큼 위로 되민다.
    marginTop: -Space[4],
  },
  noteDate: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  /** 적은 글 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  noteText: {
    fontFamily: Type.readingRegular,
    ...TypeScale.body,
    color: Ink.onDark,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space[8],
    paddingHorizontal: Space[20],
    paddingVertical: Space[12],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Ink.strong,
  },
  input: {
    flex: 1,
    // 안드로이드 TextInput은 기본 세로 여백이 있어 글이 아래로 쏠린다.
    paddingVertical: 0,
    // 여러 줄이 되어도 창을 다 밀어내지 않게 잘라 둔다.
    maxHeight: 96,
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.onDark,
  },
  send: {
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
  /** 적은 것이 없을 때 — 눌리지 않는다는 게 색으로 보여야 한다. */
  sendOff: {
    backgroundColor: Ink.strong,
  },
});
