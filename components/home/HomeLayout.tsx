import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import type { ReadPlan } from '@/lib/progress';

// ── 말풍선이 차지하는 높이 ────────────────────────────────────────────────
// 말풍선은 흐름에서 빠져 나와 버튼 줄 위에 얹힌다(bubbleWrap). 그래서 제 자리를
// 스스로 만들지 못하고, 아무도 자리를 비워 주지 않으면 위에 있는 진행 줄을 덮는다 —
// 실제로 그랬다. 아래 값들로 그만큼을 actionsArea의 위 여백으로 비워 둔다.

/** 홈 표지의 폭 — 높이는 표지 비율이 정한다. */
export const COVER_W = 160;

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
export function planLabel(plan: ReadPlan): string {
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

interface HomeLayoutProps {
  /** 표지 자리에 놓을 것 — 홈은 세워 둔 책, 전환 미리보기는 펼쳐지는 책. */
  cover: ReactNode;
  title: string;
  author?: string;
  alarm: { enabled: boolean; hour: number; minute: number };
  readPages: number;
  totalPages: number;
  plan?: ReadPlan;
  /** 눌렀을 때 할 일. 비워 두면 눌러도 아무 일이 없다(전환 미리보기). */
  onBookstore?: () => void;
  onAlarm?: () => void;
  onMyPage?: () => void;
  onToc?: () => void;
  onRead?: () => void;
  onReport?: () => void;
  /** 표지를 뺀 나머지 전부에 얹는 스타일 — 전환 중에 책만 남기고 물러나게 할 때 쓴다. */
  chromeStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}

/**
 * 홈의 생김새 — 위 줄, 책 한 권, 제목과 진행 줄, 문 셋.
 *
 * 홈(app/(tabs)/index.tsx)과 책 펼침 전환 미리보기가 함께 쓴다. 미리보기가 홈을 베껴
 * 그리면 홈을 고칠 때마다 둘이 어긋나므로, 생김새는 여기 한 곳에 두고 무엇을 하는지는
 * 부르는 화면이 정한다. 화면 바탕·상태바·위아래 띄움(insets)은 부르는 쪽 몫이다.
 */
export default function HomeLayout({
  cover,
  title,
  author,
  alarm,
  readPages,
  totalPages,
  plan,
  onBookstore,
  onAlarm,
  onMyPage,
  onToc,
  onRead,
  onReport,
  chromeStyle,
}: HomeLayoutProps) {
  const insets = useSafeAreaInsets();
  const percent = totalPages > 0 ? Math.round((readPages / totalPages) * 100) : 0;

  return (
    <View style={[styles.body, { paddingBottom: insets.bottom + Space[20] }]}>
      {/* 위 줄 — 왼쪽 끝에 하루 서점, 오른쪽 끝에 알람과 마이페이지. */}
      <Animated.View style={[styles.topRow, chromeStyle]}>
        <ScaleButton accessibilityLabel="하루 서점" style={styles.roundButton} onPress={onBookstore}>
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
            onPress={onAlarm}>
            <Ionicons
              name={alarm.enabled ? 'notifications-outline' : 'notifications-off-outline'}
              color={Ink.onDark}
              size={18}
            />
            <Text style={styles.alarmText}>
              {alarm.enabled ? formatAlarmTime(alarm.hour, alarm.minute) : '알람 꺼짐'}
            </Text>
          </ScaleButton>
          <ScaleButton accessibilityLabel="마이페이지" style={styles.myButton} onPress={onMyPage}>
            <Ionicons name="person" color={Ink.muted} size={18} />
          </ScaleButton>
        </View>
      </Animated.View>

      {/* 지금 읽는 책 한 권 — 표지, 제목과 지은이, 그리고 어디까지 왔는지. */}
      <View style={styles.card}>
        <View style={styles.coverSlot}>{cover}</View>

        <Animated.View style={[styles.titles, chromeStyle]}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {author ? (
            <Text style={styles.author} numberOfLines={1}>
              {author}
            </Text>
          ) : null}
        </Animated.View>

        {/* 읽은 만큼 차오르는 가는 줄과, 그 아래 숫자 둘. */}
        <Animated.View style={[styles.progress, chromeStyle]}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, percent)}%` }]} />
          </View>
          <View style={styles.barText}>
            <Text style={styles.barRead}>{`${readPages}p 읽음`}</Text>
            <Text style={styles.barTotal}>{`총 ${totalPages}p`}</Text>
          </View>
        </Animated.View>
      </View>

      {/* 문 셋 — 가운데 읽기가 이 화면이 하러 온 일이라 혼자 크고 주황이다. */}
      <Animated.View style={[styles.actionsArea, chromeStyle]}>
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
          <ScaleButton accessibilityLabel="목차" style={styles.sideButton} onPress={onToc}>
            <Ionicons name="list" color={Ink.muted} size={24} />
            <Text style={styles.sideLabel}>목차</Text>
          </ScaleButton>

          <ScaleButton
            accessibilityLabel={plan ? planLabel(plan) : '읽기'}
            style={styles.readButton}
            onPress={onRead}>
            <Ionicons name="book" color={Ink.onDark} size={32} />
          </ScaleButton>

          <ScaleButton accessibilityLabel="리포트" style={styles.sideButton} onPress={onReport}>
            <Ionicons name="stats-chart" color={Ink.muted} size={24} />
            <Text style={styles.sideLabel}>리포트</Text>
          </ScaleButton>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
   * 안드로이드의 elevation은 그림 모양이 아니라 네모의 윤곽을 따라 지므로, 세워 둔 책에
   * 얹으면 책이 아니라 상자의 그림자가 생긴다. 바닥에 흐린 타원을 깔아 볼 수도 있지만
   * 이 화면 바탕이 #000이라 검은 그늘은 어차피 보이지 않는다. 입체감은 책등과 원근이
   * 만들고(BookCover3D), 이 자리는 폭만 정한다.
   */
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
