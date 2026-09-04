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
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getReadingProgress, getReadPlan, type ReadPlan } from '@/lib/progress';

// ── 말풍선이 차지하는 높이 ────────────────────────────────────────────────
// 말풍선은 흐름에서 빠져 나와 버튼 줄 위에 얹힌다(bubbleWrap). 그래서 제 자리를
// 스스로 만들지 못하고, 아무도 자리를 비워 주지 않으면 위에 있는 진행 줄을 덮는다 —
// 실제로 그랬다. 아래 값들로 그만큼을 actionsArea의 위 여백으로 비워 둔다.

/** 가운데 읽기 버튼의 지름. 말풍선은 이 위에 뜬다. */
const READ_BUTTON = 72;
/** 말풍선과 버튼 사이. */
const BUBBLE_LIFT = Space[8];
/** 말풍선 한 덩이 — 알약(위아래 여백 8씩 + 글줄)과 아래를 가리키는 꼬리 6. */
const BUBBLE_H = Space[8] * 2 + TypeScale.bodySm.lineHeight + 6;
/**
 * 말풍선 위에 더 얹을 숨.
 *
 * 0이다 — 위 둘만으로 겹침은 이미 풀리고, 진행 줄과 말풍선 사이는 책 카드의 아래 여백과
 * 본문 gap이 이미 벌려 준다. 여기에 더 얹으면 책이 위로 밀려 올라가 화면이 비어 보인다.
 * 간격을 다시 만질 일이 생기면 이 값 하나만 올린다.
 */
const BUBBLE_CLEARANCE = 0;

/** 읽기 버튼 말풍선의 문구 — 지금 누르면 무엇을 읽게 되는지. */
function planLabel(plan: ReadPlan): string {
  switch (plan.kind) {
    case 'first':
      return '무료로 첫화보기';
    case 'restart':
      return '1화부터 다시 읽기';
    case 'resume':
      return `이어 읽기 : 제${plan.no}화`;
  }
}

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
 * 그래서 읽기 버튼도 '오늘'이 아니라 '아직 안 읽은 첫 자리'를 연다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();

  /** 알람 설정 — 화면을 갈아 끼우지 않고 이 위에 띄운다. */
  const [alarmOpen, setAlarmOpen] = useState(false);

  /** 떠났다 돌아오면 알람 창은 닫혀 있어야 한다 — 홈은 Tabs의 형제라 떠나도 사라지지 않는다. */
  useFocusEffect(
    useCallback(() => {
      setAlarmOpen(false);
    }, []),
  );

  const book = getCatalogBookByBookId(selectedBookId);
  const progress = getReadingProgress(selectedBookId, isDone);
  /**
   * 읽기 버튼이 열 항목과, 말풍선이 뭐라고 부를지.
   *
   * 기준은 '마지막으로 끝낸 화'다 — 그 다음을 연다(갈래는 lib/progress의 getReadPlan).
   * 읽다 만 화는 끝난 것이 아니라서 그 화가 다시 열린다. 진행 줄이 보는 퀴즈 기록과는
   * 서로 다른 물음이라 값도 따로 온다.
   */
  const plan = getReadPlan(selectedBookId, cursorOf(selectedBookId));
  const percent =
    progress.totalPages > 0 ? Math.round((progress.readPages / progress.totalPages) * 100) : 0;

  const openResume = () => {
    if (!plan) return;
    router.push({
      pathname: '/today',
      params: { bookId: selectedBookId, lessonId: plan.lessonId },
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
        {/* 위 줄 — 왼쪽 끝에 하루 서점, 오른쪽 끝에 알람과 마이페이지. */}
        <View style={styles.topRow}>
          <ScaleButton
            accessibilityLabel="하루 서점"
            style={styles.roundButton}
            onPress={() => router.push('/bookstore')}>
            <Ionicons name="book" color={Ink.onDark} size={18} />
          </ScaleButton>

          <View style={styles.topRight}>
            {/* 알람이 꺼져 있으면 시각을 적지 않는다 — 울리지 않을 시각을 적어 두면
                켜져 있는 것으로 읽힌다. 종 모양도 함께 빗금 친 것으로 바꾼다. */}
            <ScaleButton
              accessibilityLabel={
                alarm.enabled
                  ? `알람 ${formatAlarmTime(alarm.hour, alarm.minute)} 설정`
                  : '알람 꺼짐, 설정'
              }
              style={styles.alarmChip}
              onPress={() => setAlarmOpen(true)}>
              <Ionicons
                name={alarm.enabled ? 'notifications-outline' : 'notifications-off-outline'}
                color={Ink.onDark}
                size={18}
              />
              <Text style={styles.alarmText}>
                {alarm.enabled ? formatAlarmTime(alarm.hour, alarm.minute) : '알람 꺼짐'}
              </Text>
            </ScaleButton>
            <ScaleButton
              accessibilityLabel="마이페이지"
              style={styles.myButton}
              onPress={() => router.push('/library')}>
              <Ionicons name="person" color={Ink.muted} size={18} />
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
        <View style={styles.actionsArea}>
          {/* 읽기 버튼이 무엇을 열지 미리 말해 주는 말풍선. 손가락은 밑의 버튼이 받는다. */}
          {plan ? (
            <View style={styles.bubbleWrap} pointerEvents="none">
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{planLabel(plan)}</Text>
              </View>
              <View style={styles.bubbleTail} />
            </View>
          ) : null}

          <View style={styles.actions}>
            <ScaleButton
              accessibilityLabel="목차"
              style={styles.sideButton}
              onPress={() => router.push('/toc')}>
              <Ionicons name="list" color={Ink.muted} size={24} />
              <Text style={styles.sideLabel}>목차</Text>
            </ScaleButton>

            <ScaleButton
              accessibilityLabel={plan ? planLabel(plan) : '읽기'}
              style={styles.readButton}
              onPress={openResume}>
              <Ionicons name="book" color={Ink.onDark} size={32} />
            </ScaleButton>

            <ScaleButton accessibilityLabel="리포트" style={styles.sideButton} onPress={openReport}>
              <Ionicons name="stats-chart" color={Ink.muted} size={24} />
              <Text style={styles.sideLabel}>리포트</Text>
            </ScaleButton>
          </View>
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
    paddingHorizontal: Space[12],
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  alarmText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Ink.onDark,
  },
  /** 오른쪽 끝 — 알람과 마이페이지가 나란히 선다. */
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
  },
  /** 하루 서점 — 왼쪽 끝. 알람 알약과 키가 같다. */
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  /** 마이페이지 — 이 줄에서 가장 작다. 늘 거기 있되 부르지는 않는 자리다. */
  myButton: {
    width: 28,
    height: 28,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },

  /**
   * 책 한 권이 놓이는 자리 — 남는 높이를 다 갖고, 안엣것을 아래로 몰아 놓는다.
   *
   * 아래 여백만 반으로 줄여 둔다. 그 밑은 말풍선이 자리를 비워 둔 구역이라(actionsArea),
   * 여기까지 16을 다 두면 진행 줄과 말풍선 사이가 두 번 벌어진다.
   */
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Space[20],
    padding: Space[16],
    paddingBottom: Space[8],
  },
  /** 표지가 앉는 자리 — 남는 높이를 다 쓰고 그 한가운데에 표지를 놓는다. */
  coverSlot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * 표지가 앉는 자리 — 바탕도 그림자도 없다.
   *
   * 표지 그림은 정면인 것도 있고 비스듬히 세워 찍은 것도 있는데, 비스듬한 것들은 책
   * 둘레가 투명하다. 바탕색을 깔아 두면 그 투명한 자리에 색이 비쳐 책 뒤에 어두운 상자가
   * 생긴다. 그림자도 같은 이유로 뺐다 — 안드로이드의 elevation은 그림 모양이 아니라 이
   * 네모의 윤곽을 따라 지므로, 바탕을 지워도 네모가 그림자로 남는다. 입체감은 표지 그림이
   * 이미 제 안에 담고 있다.
   */
  cover: {
    width: 160,
    height: 238,
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
  /**
   * 아직 안 읽은 만큼 — graphite다.
   *
   * 검은 화면 위라 종이색(Surface.plate)도 ash(Ink.muted)도 너무 밝았다. 차오른 주황이
   * 주인공이므로 그 뒤의 빈 줄은 바탕에서 겨우 떠오르는 정도면 된다.
   */
  bar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Ink.strong,
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
  /**
   * 말풍선을 버튼 줄 위에 띄우기 위한 자리.
   *
   * 위 여백이 말풍선 몫이다 — 그만큼 이 구역이 커지고, 남는 높이를 다 갖던 책 카드가
   * 그만큼 줄어 제목과 진행 줄이 위로 올라간다. 여백 없이 두면 얹힌 말풍선이 진행 줄을
   * 덮는다(파일 위쪽 상수 주석 참고).
   */
  actionsArea: {
    alignItems: 'center',
    paddingTop: BUBBLE_H + BUBBLE_LIFT + BUBBLE_CLEARANCE,
  },
  /**
   * 말풍선 — 가운데 읽기 버튼 바로 위에 뜬다.
   *
   * 흐름에서 빼내 얹는 건, 문구가 길어지거나 짧아져도 아래 버튼 셋의 자리가 흔들리지
   * 않게 하기 위해서다.
   */
  bubbleWrap: {
    position: 'absolute',
    bottom: READ_BUTTON + BUBBLE_LIFT,
    alignItems: 'center',
  },
  bubble: {
    paddingHorizontal: Space[16],
    paddingVertical: Space[8],
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  bubbleText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  /** 말풍선 꼬리 — 아래를 가리키는 삼각형. 테두리만으로 그린다. */
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Surface.canvas,
  },
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
    width: READ_BUTTON,
    height: READ_BUTTON,
    borderRadius: Corner.pill,
    backgroundColor: Spark.ember,
  },
});
