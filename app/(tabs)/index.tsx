import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getCoverImageSource, getTodayTrack } from '@/lib/data';

interface Note {
  id: string;
  text: string;
  /** "2026.07.01 (16:53)" 형태 */
  date: string;
}

/** 데모용 시드 기록 — 피그마 시안과 동일 */
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

/** 초 → "0:07" 형태의 mm:ss */
function formatPlaybackTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function TodayScreen() {
  const track = getTodayTrack();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isPlaying,
    isLoading,
    hasError,
    progress,
    elapsedSeconds,
    totalSeconds,
    togglePlay,
    restart,
  } = useAudioPlayer();
  const { isLiked, toggleLike } = useLikes();

  const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
  const [draft, setDraft] = useState('');

  const today = new Date();
  const liked = isLiked(track.id);
  const paragraphs = track.story;

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

  const shareTrack = async () => {
    try {
      await Share.share({ message: `하루 클래식 — ${track.title}, ${track.composer}` });
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
            accessibilityLabel="메뉴"
            style={styles.headerIconButton}
            onPress={() => router.push({ pathname: '/menu', params: { from: '/' } })}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={Colors.brown100}
              size={24}
            />
          </ScaleButton>
          <Text style={styles.headerDate}>
            {today.getMonth() + 1} · {today.getDate()}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <ScaleButton
            accessibilityLabel={liked ? '보관함에서 빼기' : '보관함에 담기'}
            style={styles.headerIconButton}
            onPress={() => toggleLike(track.id)}>
            <SymbolView
              name={
                liked
                  ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                  : {
                      ios: 'bookmark',
                      android: 'bookmark_border',
                      web: 'bookmark_border',
                    }
              }
              tintColor={liked ? Colors.beige100 : Colors.brown100}
              size={24}
            />
          </ScaleButton>
          <ScaleButton
            accessibilityLabel="공유"
            style={styles.headerIconButton}
            onPress={shareTrack}>
            <SymbolView
              name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
              tintColor={Colors.brown100}
              size={24}
            />
          </ScaleButton>
        </View>
      </View>

      {/* 스크롤되는 본문 */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <Image
          source={getCoverImageSource(track)}
          style={styles.hero}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />

        <Animated.View entering={FadeIn.duration(600)} style={styles.content}>
          {/* 곡 정보 */}
          <View style={styles.songInfo}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{track.tag ?? '하루 클래식 공부'}</Text>
            </View>
            <View style={styles.titles}>
              <Text style={styles.title}>{track.title}</Text>
              <Text style={styles.composer}>{track.composer}</Text>
            </View>
            {track.titleEn && (
              <View style={styles.englishRow}>
                <Text style={styles.englishText}>{track.titleEn}</Text>
                <Text style={styles.englishStar}>✦</Text>
                <Text style={styles.englishText}>{track.composerEn}</Text>
              </View>
            )}
          </View>

          {/* 인용문 */}
          {track.quote && (
            <View style={styles.quoteOuter}>
              <View style={styles.quoteInner}>
                <Text style={styles.quoteText}>{track.quote}</Text>
                {track.quoteBy && <Text style={styles.quoteText}>{track.quoteBy}</Text>}
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
                placeholder="이 곡을 들으며 떠오른 생각을 자유롭게 적어보세요."
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
                      name={{
                        ios: 'music.note',
                        android: 'music_note',
                        web: 'music_note',
                      }}
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

      {/* 고정 하단 재생 바 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing16 }]}>
        {hasError && (
          <Text style={styles.errorText}>
            음원을 불러오지 못했습니다. 다시 시도해 주세요.
          </Text>
        )}
        <View style={styles.bottomRow}>
          {/* Pressable은 row에서 내용 크기로 줄어들므로 flex:1 래퍼로 가로를 채운다 */}
          <View style={styles.playPillWrap}>
            <ScaleButton
              accessibilityLabel={isPlaying ? '일시정지' : '노래 듣기'}
              style={styles.playPill}
              onPress={() => togglePlay(track)}>
              <View style={styles.playPillInner}>
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <SymbolView
                    name={
                      isPlaying
                        ? { ios: 'pause.fill', android: 'pause', web: 'pause' }
                        : { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }
                    }
                    tintColor={Colors.white}
                    size={18}
                  />
                )}
                <Text style={styles.playPillText}>
                  {isPlaying ? '일시정지' : '노래 듣기'}
                </Text>
              </View>
            </ScaleButton>
          </View>
          <ScaleButton
            accessibilityLabel="다시듣기"
            style={styles.replayButton}
            onPress={() => restart(track)}>
            <SymbolView
              name={{
                ios: 'arrow.counterclockwise',
                android: 'replay',
                web: 'replay',
              }}
              tintColor={Colors.white}
              size={18}
            />
          </ScaleButton>
        </View>
        <View style={styles.progressGroup}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressTimeRow}>
            <Text style={styles.progressTimeText}>{formatPlaybackTime(elapsedSeconds)}</Text>
            <Text style={styles.progressTimeText}>{formatPlaybackTime(totalSeconds)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** 피그마 시안 고정 수치 */
const Spacing12 = 12;
const Spacing16 = 16;

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
    gap: 2,
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
    backgroundColor: Colors.beige10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 24,
  },

  // 곡 정보
  songInfo: {
    gap: 16,
    paddingBottom: 20,
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.beige10,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    color: Colors.beige100,
  },
  titles: {
    gap: 4,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 28,
    letterSpacing: -1.12,
    color: Colors.brown100,
  },
  composer: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: -0.64,
    color: Colors.brown100,
  },
  englishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  englishText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    color: Colors.brown100,
  },
  englishStar: {
    fontFamily: Fonts.regular,
    fontSize: 8,
    color: Colors.beige100,
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
    letterSpacing: -0.28,
    color: Colors.blue100,
  },

  // 본문
  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 31,
    letterSpacing: -0.32,
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
    letterSpacing: -0.64,
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
    letterSpacing: -0.32,
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
    letterSpacing: -0.28,
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
    letterSpacing: -0.26,
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
    letterSpacing: -0.32,
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
    letterSpacing: -0.26,
    color: Colors.beige50,
  },

  // Bottom_btn — 하단 고정
  bottomBar: {
    backgroundColor: Colors.brown100,
    borderTopWidth: 1,
    borderTopColor: Colors.brown50,
    paddingHorizontal: 12,
    paddingTop: 13,
    gap: 16,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.red50,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playPillWrap: {
    flex: 1,
  },
  playPill: {
    width: '100%',
    height: 48,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  playPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: -0.72,
    color: Colors.white,
  },
  replayButton: {
    width: 48,
    height: 48,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 100,
    backgroundColor: Colors.beige10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: Colors.beige100,
  },
  progressGroup: {
    gap: 4,
  },
  progressTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTimeText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.beige50,
  },
});
