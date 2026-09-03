import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { getBookCalendar } from '@/lib/books';
import type { CalendarDay } from '@/lib/calendar';
import { getFreeLessonIds } from '@/lib/progress';

/**
 * 목차.
 *
 * 홈에 붙어 있던 목록을 제 화면으로 떼어냈다. 홈은 지금 읽는 책 한 권을 보여 주는 자리고,
 * 그 안에 무엇이 들었는지는 여기서 본다 — 한 화면이 둘을 함께 말하면 어느 쪽이 주인공인지
 * 흐려진다.
 *
 * 앞의 다섯 줄만 누를 수 있다. 그 뒤는 잠겨 있고, 그 사실을 자물쇠로 말한다.
 */
export default function TocScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();

  /**
   * 정렬 — 첫장부터(1월 1일이 위)와 최신순(오늘이 위)을 오간다.
   *
   * 기본이 첫장부터인 건 이 책이 1월 1일부터 차례로 읽어 나가는 물건이라서다.
   */
  const [newestFirst, setNewestFirst] = useState(false);

  /** 다시 들어올 때는 처음 상태로 — 이 화면도 Tabs의 형제라 떠나도 사라지지 않는다. */
  useFocusEffect(
    useCallback(() => {
      setNewestFirst(false);
    }, []),
  );

  /**
   * 원고가 있는 날만 남긴다. 잠긴 날까지 365줄을 그리면 스크롤이 끝나지 않고, 아직 없는
   * 것을 세는 목록이 된다.
   */
  const days = useMemo(() => {
    const real = getBookCalendar(selectedBookId).filter((day) => day.lessonId !== undefined);
    return newestFirst ? [...real].reverse() : real;
  }, [selectedBookId, newestFirst]);

  /**
   * 무료로 열려 있는 항목들. 목록을 최신순으로 뒤집어도 열려 있는 다섯은 그대로여야
   * 하므로, 뒤집기 전 차례(달력 원본)에서 고른다 — 그 일은 lib/progress가 한다.
   * 홈의 이어읽기가 고르는 범위와 같은 값을 봐야 해서 그 한 곳에 뒀다.
   */
  const freeLessonIds = useMemo(() => getFreeLessonIds(selectedBookId), [selectedBookId]);

  const openLesson = (lessonId: string) => {
    router.push({ pathname: '/today', params: { bookId: selectedBookId, lessonId } });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 헤더 60px 한 줄 — 뒤로가기와 가운데 제목. 제목은 좌우에 밀리지 않게 못 박는다. */}
      <View style={[styles.header, { height: 60 + insets.top }]}>
        <ScaleButton
          accessibilityLabel="뒤로"
          style={styles.backButton}
          // 홈은 Tabs의 형제라 back()이 아니라 이름으로 되돌린다.
          onPress={() => router.replace('/')}>
          <Ionicons name="chevron-back" color={Ink.primary} size={24} />
        </ScaleButton>
        <View style={styles.headerTitleSlot} pointerEvents="none">
          <Text style={styles.headerTitle}>목차</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Space[40] }}>
        {/* 정렬 — 오른쪽 끝에 붙는다. */}
        <View style={styles.sortRow}>
          <ScaleButton
            accessibilityLabel={`정렬 ${newestFirst ? '최신순' : '첫장부터'}, 바꾸기`}
            style={styles.sortButton}
            onPress={() => setNewestFirst((v) => !v)}>
            <Ionicons name="swap-vertical" color={Ink.primary} size={18} />
            <Text style={styles.sortText}>{newestFirst ? '최신순' : '첫장부터'}</Text>
          </ScaleButton>
        </View>

        <View style={styles.list}>
          {days.map((day) => {
            const free = day.lessonId !== undefined && freeLessonIds.has(day.lessonId);
            return (
              <TocRow
                key={day.lessonId}
                day={day}
                free={free}
                read={day.lessonId !== undefined && isDone(day.lessonId)}
                onPress={free ? () => openLesson(day.lessonId!) : undefined}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * 목차 한 줄.
 *
 * 열린 줄의 오른쪽 끝은 화살표다. 퀴즈까지 끝낸 줄이면 그 왼쪽에 주황 체크가 하나 더
 * 붙어, '읽었다'와 '들어갈 수 있다'를 한 자리에서 같이 말한다. 잠긴 줄은 자물쇠 하나뿐이다.
 */
function TocRow({
  day,
  free,
  read,
  onPress,
}: {
  day: CalendarDay;
  /** 무료로 열려 있는 줄인지 — 잠긴 줄은 자물쇠만 단다. */
  free: boolean;
  read: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
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

      {free ? (
        <View style={styles.rowRight}>
          {read && <Ionicons name="checkmark-circle" color={Spark.ember} size={24} />}
          <Ionicons name="chevron-forward" color={Ink.muted} size={24} />
        </View>
      ) : (
        <Ionicons name="lock-closed" color={Ink.muted} size={18} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[20],
  },
  /** 글리프는 24px이지만 손가락이 받을 자리는 40px이다 — 넓힌 만큼 음수 마진으로 되민다. */
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -Space[8],
    borderRadius: Corner.pill,
  },
  headerTitleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },

  sortRow: {
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Space[20],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    paddingVertical: Space[8],
  },
  sortText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.primary,
  },

  /** 줄들은 붙어 있지 않고 8씩 떨어진 카드다 — 저마다 한 장으로 읽힌다. */
  list: {
    gap: Space[8],
    paddingHorizontal: Space[20],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    height: 60,
    paddingHorizontal: Space[20],
    paddingVertical: Space[8],
    borderRadius: Corner.small,
    backgroundColor: Surface.card,
  },
  rowText: {
    flex: 1,
    gap: Space[4],
  },
  /** 항목 표제 — 읽는 글이라 본문 서체(을유1945)를 쓴다. */
  rowTitle: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  rowSubtitle: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
  },
});
