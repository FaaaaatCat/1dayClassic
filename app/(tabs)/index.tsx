import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlarmDetailScreen from '@/app/(tabs)/alarm-detail';
import LessonCoverImage from '@/components/LessonCoverImage';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { getBookCalendar, getBookLesson, getLessonHeading } from '@/lib/books';
import { getReadingProgress, timeLeftToday, type ReadingProgress } from '@/lib/progress';
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
  /**
   * 목차 정렬 — 첫장부터(1월 1일이 위)와 최신순(오늘이 위)을 오간다.
   *
   * 기본이 첫장부터인 건 이 책이 1월 1일부터 차례로 읽어 나가는 물건이라서다.
   */
  const [newestFirst, setNewestFirst] = useState(false);

  /** 남은 시간은 스스로 줄어들어야 한다 — 화면을 열어 둔 채로도 분이 넘어간다. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  /**
   * 다시 들어올 때는 처음 상태로.
   *
   * 홈도 Tabs의 형제라 떠나도 사라지지 않는다 — 목차를 내려 둔 자리와 바꿔 둔 정렬이
   * 그대로 남는다. 저장한 것이 아니라 그때 잠깐 바꿔 본 것이므로 되돌린다.
   */
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      setNewestFirst(false);
      setAlarmOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

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
    /*
     * 안전 영역을 스크롤 안쪽이 아니라 바깥 틀에 준다.
     *
     * 붙박이 줄(최신순)은 '스크롤이 보이는 자리'의 맨 위에 붙는데, 그 자리가 화면 꼭대기에서
     * 시작하면 상태바 뒤로 올라가 가려진다. 틀이 상태바만큼 내려앉으면 스크롤이 보이는 자리도
     * 그만큼 내려와, 붙박이 줄이 상태바 바로 아래에 선다.
     */
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.body, { paddingTop: Space[12] }]}
        showsVerticalScrollIndicator={false}
        /**
         * 정렬 줄(네 번째 아이)이 목록을 따라 내려가도 위에 붙는다.
         *
         * 그래서 위쪽 것들은 저마다 좌우 여백을 갖고, 정렬 줄과 목록은 화면 가로를 다 쓴다
         * — 바깥에 한 번에 여백을 주면 붙박이 줄에도 그 여백이 따라붙어 화면 폭을 못 쓴다.
         */
        stickyHeaderIndices={[3]}>
        {/* 위 줄 — 왼쪽은 알람, 오른쪽은 이 앱의 다른 화면으로 가는 문 셋. */}
        <View style={[styles.topRow, styles.gutter]}>
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
        <ProgressBar progress={progress} />

        {/* 오늘 한 장. */}
        <View style={[styles.hero, styles.gutter]}>
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
                <Text style={styles.readText}>한쪽만 읽기</Text>
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

        {/* 목차 정렬 — 목록을 따라 내려가도 위에 붙어 있다(stickyHeaderIndices). */}
        <View style={styles.sortRow}>
          <ScaleButton
            accessibilityLabel={`정렬 ${newestFirst ? '최신순' : '첫장부터'}, 바꾸기`}
            style={styles.sortButton}
            onPress={() => setNewestFirst((v) => !v)}>
            <Ionicons name="swap-vertical" color={Ink.primary} size={14} />
            <Text style={styles.sortText}>{newestFirst ? '최신순' : '첫장부터'}</Text>
          </ScaleButton>
        </View>

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
 * 완독까지 얼마나 남았는지.
 *
 * 읽은 만큼 왼쪽부터 주황으로 찬다. 그 위에 얹힌 글자는 밝은 색이어야 읽히므로, 같은
 * 글줄을 두 벌 겹쳐 놓고 위엣것을 찬 만큼만 잘라 보여 준다 — 글자 하나가 반쯤 걸쳐도
 * 걸친 만큼만 색이 바뀐다. 글줄을 두 벌 두는 대신 글자마다 색을 계산하려면 어느 글자가
 * 경계에 걸리는지 재야 하는데, 그건 글꼴에 따라 달라져 맞출 수가 없다.
 */
function ProgressBar({ progress }: { progress: ReadingProgress }) {
  /** 잘라 보여 줄 쪽의 글줄도 같은 자리에 놓이려면 칸의 폭을 알아야 한다. */
  const [width, setWidth] = useState(0);
  const ratio = progress.totalPages > 0 ? progress.readPages / progress.totalPages : 0;
  const filled = Math.round(width * Math.min(1, Math.max(0, ratio)));

  const line = (onFill: boolean) => (
    <View style={[styles.progressLine, { width: width || undefined }]}>
      <View style={styles.progressLeft}>
        <Text style={[styles.progressLabel, onFill && styles.progressOnFill]}>완독까지</Text>
        <Text style={[styles.progressNumber, onFill && styles.progressOnFill]}>
          {`${progress.remainingPages}P`}
        </Text>
        <Text style={[styles.progressLabel, onFill && styles.progressOnFill]}>남음</Text>
      </View>
      <Text style={[styles.progressTotal, onFill && styles.progressOnFill]}>
        {`총 ${progress.totalPages}p`}
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.progressBar, styles.gutter]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.progressFill, { width: filled }]} pointerEvents="none" />
      {line(false)}
      {/* 찬 만큼만 남기고 잘라 낸 같은 글줄 — 주황 위에서는 이쪽이 보인다. */}
      <View style={[styles.progressClip, { width: filled }]} pointerEvents="none">
        {line(true)}
      </View>
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
          <Ionicons name="time-outline" color={Spark.ember} size={14} />
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
    paddingBottom: Space[40],
    gap: Space[12],
  },
  /** 위쪽 것들이 저마다 갖는 좌우 여백. 정렬 줄과 목록은 이걸 쓰지 않는다. */
  gutter: {
    marginHorizontal: Space[20],
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
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
    borderRadius: Corner.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.card,
    // 찬 만큼을 잘라 보여 주므로, 넘치는 부분이 모서리 밖으로 나가지 않게 한다.
    overflow: 'hidden',
  },
  /**
   * 읽은 만큼 차오르는 자리.
   *
   * 주황(Spark.ember)을 여기 얹는 것은 완독까지 얼마나 왔는지가 이 화면에서 가장 먼저
   * 눈에 들어와야 하는 것이고, 무채색으로는 '얼마나 찼는지'가 읽히지 않아서다.
   * 이 화면의 나머지 주황은 오늘 줄에 붙는 남은 시간(rowTime) 하나뿐이다.
   */
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Spark.ember,
  },
  /** 글줄 한 벌 — 아래층과 잘라 낸 위층이 같은 모양이라야 겹쳤을 때 어긋나지 않는다. */
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[16],
    paddingVertical: Space[12],
  },
  /** 위층을 찬 만큼만 남기고 자른다. */
  progressClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  /** 주황 위에 얹히는 글자. */
  progressOnFill: {
    color: Surface.canvas,
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space[4],
  },
  /**
   * '완독까지'와 '남음'.
   *
   * 줄 높이를 주지 않는다. 크기가 다른 셋(13·22·13)을 한 줄에 세울 때 저마다 다른 줄
   * 높이를 갖고 있으면, 글자 위아래로 붙는 여백이 달라 가운데가 어긋나 보인다. 줄 높이를
   * 빼면 글자 상자가 글자에 딱 붙어 baseline이 그대로 맞는다.
   *
   * 0을 넣지 않는 건 안드로이드가 한 줄짜리 Text의 높이를 줄 높이로 잡기 때문이다 —
   * 0이면 상자가 없어져 글자가 통째로 잘린다.
   */
  progressLabel: {
    fontFamily: Type.ui,
    fontSize: TypeScale.bodySm.fontSize,
    letterSpacing: TypeScale.bodySm.letterSpacing,
    color: Ink.body,
    /*
     * 큰 숫자와 눈으로 맞추기 위해 3px 올린다.
     *
     * baseline을 맞춰 놓아도 13pt와 22pt는 글자의 무게 중심이 다른 자리에 있어, 작은 쪽이
     * 아래로 처져 보인다. 자리를 옮기는 것이라 layout을 건드리지 않는 transform을 쓴다 —
     * absolute로 빼면 글줄의 폭 계산에서 빠져 옆 글자와 간격이 무너진다.
     */
    transform: [{ translateY: -3 }],
  },
  /** 남은 쪽수 — 이 줄에서 유일하게 큰 글자다. 줄 높이를 빼는 이유는 위와 같다. */
  progressNumber: {
    fontFamily: Type.uiMedium,
    fontSize: TypeScale.headingSm.fontSize,
    letterSpacing: TypeScale.headingSm.letterSpacing,
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
  /**
   * 정렬 줄 — 목록을 따라 내려가도 위에 붙는다.
   *
   * 바탕색을 주는 건 붙박이라서다. 없으면 아래로 지나가는 목록이 글자 뒤로 비쳐 보인다.
   */
  sortRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Space[20],
    paddingVertical: Space[8],
    backgroundColor: Surface.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Ink.primary,
  },
  sortButton: {
    flexDirection: 'row',
    gap: Space[4],
    height: 32,
  },
  sortText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  /** 목록은 상자가 아니라 화면 가로를 다 쓰는 줄들이다 — 테두리도 모서리도 없다. */
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingHorizontal: Space[20],
    paddingVertical: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  /** 마지막 줄 — 목록이 끝나는 자리라 선을 긋지 않는다. */
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
  /** 오늘 줄에만 붙는 남은 시간 — 완독바와 같은 주황으로 오늘이라는 것을 알린다. */
  rowTime: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Spark.ember,
  },
});
