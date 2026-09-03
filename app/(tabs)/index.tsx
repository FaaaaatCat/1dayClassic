import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlarmDetailScreen from '@/app/(tabs)/alarm-detail';
import ScaleButton from '@/components/ScaleButton';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { getBookLesson, getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getReadingProgress } from '@/lib/progress';

/** hour(0~23) → "오후 11:00" */
function formatAlarmTime(hour: number, minute: number): string {
  const meridiem = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`;
}

/**
 * 홈.
 *
 * 지금 읽는 책 한 권이 검은 화면 한가운데 서 있고, 그 아래 문 셋이 있다 — 목차, 읽기,
 * 리포트. 이 앱에서 유일하게 어두운 화면이던 뷰어에 이어 여기도 어둡게 둔 건, 홈이
 * 책장에서 책 한 권을 꺼내 든 장면이기 때문이다.
 *
 * 예전에는 오늘 한 장(표지 사진 + 제목 + 읽기 버튼)과 목차 목록이 이 화면에 함께 있었다.
 * 목차는 제 화면(app/(tabs)/toc.tsx)으로 떼어냈고, 오늘 한 장은 가운데 읽기 버튼 하나가
 * 대신한다 — 홈이 말하는 것은 '오늘 무엇을 읽는가'가 아니라 '지금 어떤 책을 읽고 있는가'다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();

  /** 알람 설정 — 화면을 갈아 끼우지 않고 이 위에 띄운다. */
  const [alarmOpen, setAlarmOpen] = useState(false);

  /** 떠났다 돌아오면 알람 창은 닫혀 있어야 한다 — 홈은 Tabs의 형제라 떠나도 사라지지 않는다. */
  useFocusEffect(
    useCallback(() => {
      setAlarmOpen(false);
    }, []),
  );

  const book = getCatalogBookByBookId(selectedBookId);
  const todayLesson = getBookLesson(selectedBookId);
  const progress = getReadingProgress(selectedBookId, isDone);
  const percent =
    progress.totalPages > 0 ? Math.round((progress.readPages / progress.totalPages) * 100) : 0;

  const openToday = () => {
    if (!todayLesson) return;
    router.push({
      pathname: '/today',
      params: { bookId: selectedBookId, lessonId: todayLesson.lesson.id },
    });
  };

  /** 리포트 — 그 책에 쌓인 기록(진도·정답률·책갈피·노트·마지막으로 읽은 날). */
  const openReport = () =>
    router.push({
      pathname: '/library/book/[id]',
      params: { id: selectedBookId, from: 'home' },
    });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 화면이 검으므로 상태바도 검게 — 띠가 화면 속으로 이어져 보인다. */}
      <StatusBarTint />

      <View style={[styles.body, { paddingBottom: insets.bottom + Space[20] }]}>
        {/* 위 줄 — 왼쪽은 알람, 오른쪽은 마이페이지와 하루 서점. */}
        <View style={styles.topRow}>
          <ScaleButton
            accessibilityLabel={`알람 ${formatAlarmTime(alarm.hour, alarm.minute)} 설정`}
            style={styles.alarmChip}
            onPress={() => setAlarmOpen(true)}>
            <Ionicons name="notifications-outline" color={Ink.onDark} size={18} />
            <Text style={styles.alarmText}>{formatAlarmTime(alarm.hour, alarm.minute)}</Text>
          </ScaleButton>

          <View style={styles.topButtons}>
            <ScaleButton
              accessibilityLabel="마이페이지"
              style={styles.roundButton}
              onPress={() => router.push('/library')}>
              <Ionicons name="person" color={Ink.onDark} size={18} />
            </ScaleButton>
            <ScaleButton
              accessibilityLabel="하루 서점"
              style={styles.roundButton}
              onPress={() => router.push('/bookstore')}>
              <Ionicons name="book" color={Ink.onDark} size={18} />
            </ScaleButton>
          </View>
        </View>

        {/* 지금 읽는 책 한 권 — 표지, 제목과 지은이, 그리고 어디까지 왔는지. */}
        <View style={styles.card}>
          <View style={styles.coverSlot}>
            {book?.coverImage ? (
              <Image
                source={{ uri: book.coverImage }}
                style={styles.cover}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.cover} />
            )}
          </View>

          <View style={styles.titles}>
            <Text style={styles.title} numberOfLines={2}>
              {book?.title ?? getBookName(selectedBookId)}
            </Text>
            {book?.author ? (
              <Text style={styles.author} numberOfLines={1}>
                {book.author}
              </Text>
            ) : null}
          </View>

          {/* 읽은 만큼 차오르는 가는 줄과, 그 아래 숫자 둘. */}
          <View style={styles.progress}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, percent)}%` }]} />
            </View>
            <View style={styles.barText}>
              <Text style={styles.barRead}>{`${progress.readPages}p 읽음`}</Text>
              <Text style={styles.barTotal}>{`총 ${progress.totalPages}p`}</Text>
            </View>
          </View>
        </View>

        {/* 문 셋 — 가운데 읽기가 이 화면이 하러 온 일이라 혼자 크고 주황이다. */}
        <View style={styles.actions}>
          <ScaleButton
            accessibilityLabel="목차"
            style={styles.sideButton}
            onPress={() => router.push('/toc')}>
            <Ionicons name="list" color={Ink.muted} size={24} />
            <Text style={styles.sideLabel}>목차</Text>
          </ScaleButton>

          <ScaleButton
            accessibilityLabel="오늘의 공부 읽기"
            style={styles.readButton}
            onPress={openToday}>
            <Ionicons name="book" color={Ink.onDark} size={32} />
          </ScaleButton>

          <ScaleButton accessibilityLabel="리포트" style={styles.sideButton} onPress={openReport}>
            <Ionicons name="stats-chart" color={Ink.muted} size={24} />
            <Text style={styles.sideLabel}>리포트</Text>
          </ScaleButton>
        </View>
      </View>

      {/* 알람 설정 — 화면을 옮기지 않고 이 위에 띄운다. */}
      <Modal
        visible={alarmOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAlarmOpen(false)}>
        <AlarmDetailScreen onClose={() => setAlarmOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  body: {
    flex: 1,
    gap: Space[12],
    padding: Space[20],
  },

  // 위 줄
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /** 알람 — 누르는 자리라 알약으로 둔다. 검은 바탕이라 한 단 밝은 회색으로 떠 있는다. */
  alarmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    height: 34,
    paddingHorizontal: Space[8],
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  alarmText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.onDark,
  },
  topButtons: {
    flexDirection: 'row',
    gap: Space[8],
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },

  /** 책 한 권이 놓이는 자리 — 남는 높이를 다 갖고, 안엣것을 아래로 몰아 놓는다. */
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Space[20],
    padding: Space[16],
  },
  /** 표지가 앉는 자리 — 남는 높이를 다 쓰고 그 한가운데에 표지를 놓는다. */
  coverSlot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: 160,
    height: 238,
    backgroundColor: Ink.strong,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  titles: {
    alignItems: 'center',
    gap: Space[4],
  },
  /** 책 제목 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  title: {
    fontFamily: Type.readingBold,
    ...TypeScale.heading,
    textAlign: 'center',
    color: Ink.onDark,
  },
  author: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    textAlign: 'center',
    color: Ink.onDark,
  },

  // 진행 줄 — 가는 선 하나와 그 아래 숫자 둘.
  progress: {
    alignSelf: 'stretch',
    gap: Space[4],
  },
  bar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: Spark.ember,
  },
  barText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barRead: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Spark.ember,
  },
  barTotal: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },

  // 문 셋
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 31,
  },
  sideButton: {
    width: 48,
    height: 48,
    gap: Space[4],
  },
  sideLabel: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.muted,
  },
  /**
   * 읽기 — 이 화면이 하러 온 일 하나라, 포인트 컬러가 여기 붙는다.
   * 이 화면에서 주황은 이 버튼과 진행 줄뿐이다.
   */
  readButton: {
    width: 72,
    height: 72,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
});
