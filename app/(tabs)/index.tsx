import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlarmDetailScreen from '@/app/(tabs)/alarm-detail';
import LessonCoverImage from '@/components/LessonCoverImage';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { getBookCalendar, getBookLesson, getLessonHeading } from '@/lib/books';
import { getReadingProgress, timeLeftToday } from '@/lib/progress';
import type { CalendarDay } from '@/lib/calendar';

/** 남은 시간을 다시 세는 주기 — 분 단위로 보여 주므로 1분이면 충분하다. */
const TICK_MS = 60_000;

/** hour(0~23) → "오후 11:00" */
function formatAlarmTime(hour: number, minute: number): string {
  const meridiem = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${meridiem} ${hour12}:${String(minute).padStart(2, '0')}`;
}

/**
 * 홈.
 *
 * 하루에 한 쪽만 편다. 그래서 화면의 중심은 오늘 한 장이고, 그 아래 목차는 지나온 날과
 * 아직 잠긴 날을 보여 주는 자리다. 탭바를 걷어내고 위 줄의 버튼 셋이 그 자리를 대신한다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { attemptOf } = useQuiz();

  /** 알람 설정 — 화면을 갈아 끼우지 않고 이 위에 띄운다. */
  const [alarmOpen, setAlarmOpen] = useState(false);
  /** 목차 정렬 — 최신순(오늘이 위)과 오래된순을 오간다. */
  const [newestFirst, setNewestFirst] = useState(true);

  /** 남은 시간은 스스로 줄어들어야 한다 — 화면을 열어 둔 채로도 분이 넘어간다. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const todayLesson = getBookLesson(selectedBookId);
  const progress = useMemo(
    () => getReadingProgress(selectedBookId, (id) => attemptOf(id) !== undefined),
    [selectedBookId, attemptOf],
  );

  /**
   * 목차 — 원고가 있는 날만 남긴다. 잠긴 날까지 365줄을 그리면 스크롤이 끝나지 않고,
   * 아직 없는 것을 세는 목록이 된다.
   */
  const days = useMemo(() => {
    const real = getBookCalendar(selectedBookId).filter((day) => day.lessonId !== undefined);
    return newestFirst ? [...real].reverse() : real;
  }, [selectedBookId, newestFirst]);

  if (!todayLesson) return null;

  const heading = getLessonHeading(todayLesson);
  const todayRead = attemptOf(todayLesson.lesson.id) !== undefined;

  const openToday = () => {
    router.push({
      pathname: '/today',
      params: { bookId: selectedBookId, lessonId: todayLesson.lesson.id },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + Space[12] }]}
        showsVerticalScrollIndicator={false}>
        {/* 위 줄 — 왼쪽은 알람, 오른쪽은 이 앱의 다른 화면으로 가는 문 셋. */}
        <View style={styles.topRow}>
          <ScaleButton
            accessibilityLabel={`알람 ${formatAlarmTime(alarm.hour, alarm.minute)} 설정`}
            style={styles.alarmChip}
            onPress={() => setAlarmOpen(true)}>
            <Ionicons name="notifications-outline" color={Ink.primary} size={16} />
            <Text style={styles.alarmText}>{formatAlarmTime(alarm.hour, alarm.minute)}</Text>
          </ScaleButton>

          <View style={styles.topButtons}>
            <ScaleButton
              accessibilityLabel="내 서재"
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
            <ScaleButton
              accessibilityLabel="설정"
              style={styles.roundButton}
              onPress={() => router.push('/settings')}>
              <Ionicons name="settings-sharp" color={Ink.onDark} size={18} />
            </ScaleButton>
          </View>
        </View>

        {/* 완독까지 얼마나 남았는지 — 쪽수는 실제 책의 쪽수다(lib/progress 주석 참고). */}
        <View style={styles.progressBar}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressLabel}>완독까지</Text>
            <Text style={styles.progressNumber}>{progress.remainingPages}P</Text>
            <Text style={styles.progressLabel}>남음</Text>
          </View>
          <Text style={styles.progressTotal}>{`총 ${progress.totalPages}p`}</Text>
        </View>

        {/* 오늘 한 장. */}
        <View style={styles.hero}>
          <LessonCoverImage
            lesson={todayLesson.lesson}
            bookId={selectedBookId}
            style={styles.heroImage}
          />
          {/* 사진 위에 글을 얹으므로 어둠을 한 겹 깐다 — 밝은 사진에서도 글이 읽혀야 한다. */}
          <View style={styles.heroScrim} pointerEvents="none" />

          <Text style={styles.heroPage}>{`p.${progress.todayPage}`}</Text>

          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {heading.title}
            </Text>
            {heading.subtitle ? (
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {heading.subtitle}
              </Text>
            ) : null}

            <View style={styles.heroButtons}>
              <ScaleButton
                accessibilityLabel="오늘의 공부 읽기"
                style={styles.readButton}
                onPress={openToday}>
                <Ionicons name="play" color={Ink.primary} size={14} />
                <Text style={styles.readText}>읽기</Text>
              </ScaleButton>

              {/* 다 읽은 날에만 나오는 표시 — 누르는 것이 아니라 알리는 것이다. */}
              {todayRead && (
                <View style={styles.doneButton}>
                  <Ionicons name="checkmark" color={Ink.onDark} size={14} />
                  <Text style={styles.doneText}>다 읽은 페이지</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 목차 정렬. */}
        <ScaleButton
          accessibilityLabel={`정렬 ${newestFirst ? '최신순' : '오래된순'}, 바꾸기`}
          style={styles.sortButton}
          onPress={() => setNewestFirst((v) => !v)}>
          <Ionicons name="swap-vertical" color={Ink.primary} size={14} />
          <Text style={styles.sortText}>{newestFirst ? '최신순' : '오래된순'}</Text>
        </ScaleButton>

        {/* 목차 — 오늘 줄만 남은 시간을 달고, 아직 오지 않은 날은 잠겨 있다. */}
        <View style={styles.list}>
          {days.map((day, index) => (
            <TocRow
              key={day.lessonId}
              day={day}
              last={index === days.length - 1}
              timeLeft={day.isToday ? timeLeftToday(now) : undefined}
              read={day.lessonId !== undefined && attemptOf(day.lessonId) !== undefined}
              onPress={day.isToday ? openToday : undefined}
            />
          ))}
        </View>
      </ScrollView>

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

/**
 * 목차 한 줄.
 *
 * 오늘 줄만 누를 수 있다 — 지나간 날과 앞으로 올 날은 잠겨 있고, 그 사실을 자물쇠로
 * 말한다. 하루에 한 쪽이라는 약속이 이 목록의 규칙이다.
 */
function TocRow({
  day,
  last,
  timeLeft,
  read,
  onPress,
}: {
  day: CalendarDay;
  last: boolean;
  /** 오늘 줄에만 있는 값 — 자정까지 남은 시간. */
  timeLeft?: string;
  read: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {day.title}
        </Text>
        {day.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {day.subtitle}
          </Text>
        ) : null}
      </View>

      {timeLeft ? (
        <View style={styles.rowRight}>
          <Ionicons name="time-outline" color={Ink.primary} size={14} />
          <Text style={styles.rowTime}>{timeLeft}</Text>
          {read && <Ionicons name="checkmark-circle" color={Ink.primary} size={16} />}
        </View>
      ) : (
        <Ionicons name="lock-closed" color={Ink.muted} size={16} />
      )}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${day.title} 읽기`} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  body: {
    paddingHorizontal: Space[20],
    paddingBottom: Space[40],
    gap: Space[12],
  },

  // 위 줄
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /** 알람 — 누르는 자리라 알약으로 둔다. */
  alarmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    height: 36,
    paddingHorizontal: Space[16],
    borderRadius: Corner.pill,
    backgroundColor: Surface.card,
  },
  alarmText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  topButtons: {
    flexDirection: 'row',
    gap: Space[8],
  },
  roundButton: {
    width: 36,
    height: 36,
    borderRadius: Corner.pill,
    backgroundColor: Ink.primary,
  },

  // 진행 줄
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[16],
    paddingVertical: Space[12],
    borderRadius: Corner.small,
    backgroundColor: Surface.card,
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space[4],
  },
  progressLabel: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  /** 남은 쪽수 — 이 줄에서 유일하게 큰 글자다. */
  progressNumber: {
    fontFamily: Type.uiMedium,
    ...TypeScale.headingSm,
    color: Ink.primary,
  },
  progressTotal: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },

  // 오늘 한 장
  hero: {
    height: 380,
    borderRadius: Corner.card,
    overflow: 'hidden',
    backgroundColor: Ink.primary,
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  /** 사진 위 어둠 — 글이 읽히게 하는 최소한만. */
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroPage: {
    position: 'absolute',
    top: Space[16],
    left: Space[16],
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
  },
  heroBottom: {
    alignItems: 'center',
    gap: Space[4],
    padding: Space[16],
  },
  heroTitle: {
    fontFamily: Type.readingBold,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.onDark,
  },
  heroSubtitle: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    textAlign: 'center',
    color: Ink.onDark,
  },
  heroButtons: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Space[8],
    marginTop: Space[12],
  },
  readButton: {
    flex: 1,
    flexDirection: 'row',
    gap: Space[8],
    height: 44,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  readText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.primary,
  },
  /** 다 읽었다는 표시 — 읽기 버튼과 나란히 서되 눌리지 않는다. */
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[8],
    height: 44,
    borderRadius: Corner.pill,
    backgroundColor: 'rgba(253, 252, 252, 0.35)',
  },
  doneText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.onDark,
  },

  // 목차
  sortButton: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: Space[4],
    height: 32,
    paddingHorizontal: Space[12],
    borderRadius: Corner.pill,
    backgroundColor: Surface.card,
  },
  sortText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  list: {
    borderRadius: Corner.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingHorizontal: Space[16],
    paddingVertical: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  /** 마지막 줄 — 목록의 테두리와 겹치지 않게 제 선을 지운다. */
  rowLast: {
    borderBottomWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: Space[4],
  },
  rowTitle: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  rowSubtitle: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
  },
  rowTime: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
});
