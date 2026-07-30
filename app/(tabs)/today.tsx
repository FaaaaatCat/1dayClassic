import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioListenSheet from '@/components/lesson/AudioListenSheet';
import HeaderMoreMenu from '@/components/lesson/HeaderMoreMenu';
import LessonHeading from '@/components/lesson/LessonHeading';
import LessonCoverImage from '@/components/LessonCoverImage';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getBookLesson, getBookName, getLessonHeading } from '@/lib/books';
import type { BookId } from '@/types';

interface Note {
  id: string;
  text: string;
  /** "2026.07.01 (16:53)" 형태 */
  date: string;
}

/**
 * 데모용 시드 기록 — 피그마 시안과 동일. 클래식 항목에만 얹는다.
 * 내용이 피치카토 폴카를 두고 쓴 것이라 다른 책에 붙으면 앞뒤가 맞지 않는다.
 */
const SEED_NOTES: Note[] = [
  {
    id: 'seed-1',
    text: '피치카토 주법을 찾아봐야겠어요. 그리고 다른 노래들도 있는지 알아봐야겠다.',
    date: '2026.07.01 (16:53)',
  },
  { id: 'seed-2', text: '처음 듣는데 진짜 좋다.', date: '2026.04.21 (12:13)' },
];

function formatNoteDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${pad(date.getHours())}:${pad(date.getMinutes())})`;
}

/** lesson.date("1월 1일" 형태)를 헤더에 쓰는 "1 · 1"로 바꾼다. 없으면 빈 문자열. */
function formatHeaderDate(dateStr: string | undefined): string {
  const match = dateStr?.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (!match) return '';
  return `${match[1]} · ${match[2]}`;
}

/**
 * 하루 시리즈 9권이 공유하는 항목 상세 화면.
 *
 * 히어로·본문·감상 노트는 책과 무관하게 같고, 표제부만 LessonHeading이 책별로 갈라진다.
 * 재생 컨트롤은 하단 고정바 대신 헤더의 '오디오 듣기' 버튼 하나로 들어가며, 실제 컨트롤은
 * AudioListenSheet 팝업에 모여 있다.
 *
 * 파라미터를 주지 않으면 클래식의 오늘 항목을 보여 준다 — 네이티브 알람이 항목을 지정하지 않고
 * `1dayclassic://today?autoplay=…`로 열기 때문에 이 기본값이 필요하다.
 * trackId는 클래식 시절 홈·목차가 쓰던 이름이라 lessonId의 별칭으로 계속 받는다.
 */
export default function TodayScreen() {
  const params = useLocalSearchParams<{
    bookId?: string;
    lessonId?: string;
    trackId?: string;
    autoplay?: string;
  }>();
  const { autoplay } = params;
  const bookId = (params.bookId ?? 'classic') as BookId;
  const bookLesson = getBookLesson(bookId, params.lessonId ?? params.trackId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPlaying, isLoading, hasError, togglePlay, restart, stop } = useAudioPlayer();
  const { isLiked, toggleLike } = useLikes();
  const [sheetVisible, setSheetVisible] = useState(false);

  // 낭독 멘트에 쓸 이름 — 항목만으로는 못 만든다(표제 필드가 책마다 다르고 책 이름은 카탈로그에 있다).
  const bookName = getBookName(bookId);
  const narrationLabels = bookLesson
    ? { bookName, lessonTitle: getLessonHeading(bookLesson).title }
    : null;

  // 알람 알림을 탭해서 들어온 경우(autoplay=타임스탬프) 자동으로 재생을 시작한다.
  // autoplay 값은 탭마다 새로 생성돼서, 같은 항목이어도(반복 알람) 매번 다시 트리거된다.
  const handledAutoplayRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoplay || !bookLesson || !narrationLabels) return;
    if (handledAutoplayRef.current === autoplay) return;
    handledAutoplayRef.current = autoplay;
    togglePlay(bookLesson.lesson, narrationLabels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // 시드 기록은 클래식 항목에만 얹는다 — 내용이 그 곡을 두고 쓴 것이다.
  const [notes, setNotes] = useState<Note[]>(bookId === 'classic' ? SEED_NOTES : []);
  const [draft, setDraft] = useState('');

  // /today는 탭 라우트라 파라미터만 바뀌면 이 컴포넌트와 재생 훅이 그대로 유지된다.
  // 그때 걷어내지 않으면 앞 항목의 재생 상태('일시정지' 표시)와 기록이 다음 항목에 남는다.
  // 첫 렌더에서는 실행하지 않는다 — 알람 자동재생 효과가 방금 시작한 재생을 멈춰 버린다.
  const shownLessonKey = `${bookId}:${bookLesson?.lesson.id ?? ''}`;
  const shownLessonKeyRef = useRef(shownLessonKey);
  useEffect(() => {
    if (shownLessonKeyRef.current === shownLessonKey) return;
    shownLessonKeyRef.current = shownLessonKey;
    stop();
    setSheetVisible(false);
    setNotes(bookId === 'classic' ? SEED_NOTES : []);
    setDraft('');
  }, [shownLessonKey, bookId, stop]);

  // 데이터가 비면 보여 줄 항목이 없다. 훅은 위에서 모두 호출한 뒤이므로 안전하다.
  if (!bookLesson || !narrationLabels) return null;

  const lesson = bookLesson.lesson;
  const liked = isLiked(lesson.id);
  const paragraphs = lesson.story;
  // 음원이 없는 항목은 이야기 낭독만 한다 — 감상 노트 아이콘 선택에 쓴다.
  const hasAudio = Boolean(lesson.audio);

  /** 헤더의 '오디오 듣기' — 기존 재생 버튼과 같은 토글을 실행하고 팝업을 띄운다. */
  const openAudioSheet = () => {
    togglePlay(lesson, narrationLabels);
    setSheetVisible(true);
  };

  /** 팝업 닫기 — 재생도 함께 멈춘다. */
  const closeAudioSheet = () => {
    stop();
    setSheetVisible(false);
  };

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      { id: `note-${Date.now()}`, text, date: formatNoteDate() },
      ...prev,
    ]);
    setDraft('');
  };

  /** 편집: 내용을 입력창으로 되돌리고 목록에서 뺀다. 기록하기로 다시 저장. */
  const editNote = (note: Note) => {
    setDraft(note.text);
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  const deleteNote = (note: Note) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  };

  const shareLesson = async () => {
    const heading = getLessonHeading(bookLesson);
    const subtitle = heading.subtitle ? `, ${heading.subtitle}` : '';
    try {
      await Share.share({ message: `${bookName} — ${heading.title}${subtitle}` });
    } catch {
      // 공유 시트를 지원하지 않는 환경(웹 등)에서는 조용히 무시한다.
    }
  };

  return (
    <View style={styles.screen}>
      {/* 고정 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing12 }]}>
        <View style={styles.headerLeft}>
          <ScaleButton
            accessibilityLabel="닫기"
            style={styles.headerIconButton}
            onPress={() => router.replace('/')}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={Colors.brown100}
              size={24}
            />
          </ScaleButton>
          <Text style={styles.headerDate}>{formatHeaderDate(lesson.date)}</Text>
        </View>
        <View style={styles.headerRight}>
          <HeaderMoreMenu
            liked={liked}
            onToggleBookmark={() => toggleLike(lesson.id)}
            onShare={shareLesson}
          />
          <ScaleButton
            accessibilityLabel="오디오 듣기"
            style={styles.listenButton}
            onPress={openAudioSheet}>
            <View style={styles.listenButtonInner}>
              <SymbolView
                name={{ ios: 'headphones', android: 'headset', web: 'headset' }}
                tintColor={Colors.white}
                size={16}
              />
              <Text style={styles.listenButtonText}>오디오 듣기</Text>
            </View>
          </ScaleButton>
        </View>
      </View>

      {/* 스크롤되는 본문 */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <LessonCoverImage lesson={lesson} style={styles.hero} resizeMode="cover" />

        <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
          {/* 표제부 — 책에 따라 갈라지는 단 하나의 자리 */}
          <LessonHeading bookLesson={bookLesson} bookName={bookName} />

          {/* 인용문 — 클래식 항목만 갖는다(쓰기 책의 에피그래프는 표제부 안에 있다) */}
          {bookLesson.book === 'classic' && bookLesson.lesson.quote && (
            <View style={styles.quoteOuter}>
              <View style={styles.quoteInner}>
                <Text style={styles.quoteText}>{bookLesson.lesson.quote}</Text>
                {bookLesson.lesson.quoteBy && (
                  <Text style={styles.quoteText}>{bookLesson.lesson.quoteBy}</Text>
                )}
              </View>
            </View>
          )}

          {/* 본문 */}
          {paragraphs.map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}

          {/* 감상 노트 */}
          <View style={styles.notesSection}>
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
              <ScaleButton
                accessibilityLabel="기록하기"
                style={styles.noteSubmit}
                onPress={addNote}>
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
                      <ScaleButton
                        accessibilityLabel="기록 편집"
                        onPress={() => editNote(note)}>
                        <Text style={styles.noteItemAction}>편집</Text>
                      </ScaleButton>
                      <ScaleButton
                        accessibilityLabel="기록 삭제"
                        onPress={() => deleteNote(note)}>
                        <Text style={styles.noteItemAction}>삭제</Text>
                      </ScaleButton>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <AudioListenSheet
        visible={sheetVisible}
        isPlaying={isPlaying}
        isLoading={isLoading}
        hasError={hasError}
        onTogglePlay={() => togglePlay(lesson, narrationLabels)}
        onRestart={() => restart(lesson, narrationLabels)}
        onClose={closeAudioSheet}
      />
    </View>
  );
}

/** 피그마 시안 고정 수치 */
const Spacing12 = 12;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header — 상단 고정
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  headerDate: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: -0.8,
    color: Colors.brown100,
  },

  // Body — 스크롤 영역
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 40,
  },
  hero: {
    width: '100%',
    height: 320,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 24,
  },

  // 인용문
  quoteOuter: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.brown10,
    paddingVertical: 17,
  },
  quoteInner: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.yellow,
    paddingLeft: 22,
    gap: 4,
  },
  quoteText: {
    // 피그마 시안 지정 서체. 라틴 전용이라 한글은 시스템 폴백으로 렌더링된다.
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    lineHeight: 26,
    letterSpacing: tracking(14),
    color: Colors.blue100,
  },

  // 본문
  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 31,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },

  // 감상 노트
  notesSection: {
    paddingTop: 20,
  },
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

  // 헤더의 '오디오 듣기' 버튼
  listenButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: Colors.brown100,
  },
  listenButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listenButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.white,
  },
});
