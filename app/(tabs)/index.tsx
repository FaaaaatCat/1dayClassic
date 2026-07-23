import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts } from '@/constants/theme';
import {
  buildCalendarYear,
  CALENDAR_MONTHS,
  TODAY_DAY,
  TODAY_MONTH,
  type CalendarDay,
} from '@/lib/calendar';
import { getCoverImageSource, getTodayTrack } from '@/lib/data';
import type { Track } from '@/types';

const imgAlarmBook = require('@/assets/images/home/alarm-book.png');

/** 무한 스크롤 착시를 위해 같은 365일을 두 벌 이어붙인다 — 작년/올해 구분(연도 표기) 없이 완전히 동일하게. */
type Row =
  | { kind: 'header'; month: number; copy: 0 | 1 }
  | { kind: 'entry'; entry: CalendarDay; copy: 0 | 1 };

function buildRows(days: CalendarDay[], copy: 0 | 1): Row[] {
  const rows: Row[] = [];
  let lastMonth = -1;
  for (const entry of days) {
    if (entry.month !== lastMonth) {
      rows.push({ kind: 'header', month: entry.month, copy });
      lastMonth = entry.month;
    }
    rows.push({ kind: 'entry', entry, copy });
  }
  return rows;
}

const CALENDAR_DAYS = buildCalendarYear();
const ALL_ROWS: Row[] = [...buildRows(CALENDAR_DAYS, 0), ...buildRows(CALENDAR_DAYS, 1)];

/** 스크롤이 복사본 경계 근처에 오면 반대편으로 조용히 점프시키는 여유 구간(px) */
const LOOP_EDGE_MARGIN = 600;

/**
 * '오늘' 카드 — 헤더 바로 아래 고정되는 별개 컴포넌트(리스트에 안 섞여 스크롤되지 않는다).
 * 누르면 카드 크기는 그대로, 안의 이미지만 확대된다.
 */
function TodayFixedCard({ track, onPress }: { track: Track; onPress: () => void }) {
  const imageScale = useSharedValue(1);
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${track.title} 재생하기`}
      onPressIn={() => {
        imageScale.value = withTiming(1.08, { duration: 220 });
      }}
      onPressOut={() => {
        imageScale.value = withTiming(1, { duration: 220 });
      }}
      onPress={onPress}
      style={styles.heroFixedWrap}>
      <Animated.Image
        source={getCoverImageSource(track)}
        style={[styles.heroImage, imageAnimatedStyle]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', Colors.brown100]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.heroDateTag}>
        <Text style={styles.heroDateTagText}>
          {TODAY_MONTH}월 {TODAY_DAY}일 · 오늘
        </Text>
      </View>
      <View style={styles.heroBottomContent}>
        <Text style={styles.heroTitleText} numberOfLines={1}>
          {track.title}
        </Text>
        <View style={styles.heroBottomRow}>
          <View style={styles.heroInfoText}>
            <Text style={styles.heroComposer} numberOfLines={1}>
              {track.composer}
            </Text>
            {track.composerEn && (
              <Text style={styles.heroComposerLatin} numberOfLines={1}>
                {track.composerEn}
              </Text>
            )}
          </View>
          <View style={styles.heroPlayButton}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              tintColor={Colors.white}
              size={12}
            />
            <Text style={styles.heroPlayText}>재생</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifOn, setNotifOn] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  /** 한 사본의 실제 렌더링 높이(px) — 초기 스크롤 위치와 무한 루프 경계 점프량 계산에 쓰인다. */
  const copy0HeightRef = useRef(0);
  const didInitialScroll = useRef(false);
  const jumping = useRef(false);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    copy0HeightRef.current = height / 2;
    if (!didInitialScroll.current && copy0HeightRef.current > 0) {
      didInitialScroll.current = true;
      // copy 1의 시작(1월 1일)으로 바로 이동 — 두 사본이 완전히 동일하므로 이 위치가 곧 '오늘'이다.
      scrollRef.current?.scrollTo({ y: copy0HeightRef.current, animated: false });
    }
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const copyHeight = copy0HeightRef.current;
    if (copyHeight > 0) {
      if (contentOffset.y < LOOP_EDGE_MARGIN) {
        jumping.current = true;
        scrollRef.current?.scrollTo({ y: contentOffset.y + copyHeight, animated: false });
        jumping.current = false;
      } else if (contentOffset.y + layoutMeasurement.height > contentSize.height - LOOP_EDGE_MARGIN) {
        jumping.current = true;
        scrollRef.current?.scrollTo({ y: contentOffset.y - copyHeight, animated: false });
        jumping.current = false;
      }
    }
  }, []);

  const openTrack = useCallback(
    (trackId: string) => {
      router.push({ pathname: '/today', params: { trackId } });
    },
    [router],
  );

  const renderEntry = (entry: CalendarDay, copy: 0 | 1) => {
    if (entry.locked) {
      return (
        <View key={`${copy}-${entry.month}-${entry.day}`} style={styles.row}>
          <Text style={styles.rowDayLocked}>
            {entry.month} · {entry.day}
          </Text>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={Colors.brown10}
            size={22}
            style={styles.rowLockIcon}
          />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitleLocked} numberOfLines={1}>
              {entry.title}
            </Text>
            <Text style={styles.rowComposerLocked} numberOfLines={1}>
              {entry.composer}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScaleButton
        key={`${copy}-${entry.month}-${entry.day}`}
        accessibilityLabel={`${entry.title} 보기`}
        style={styles.row}
        onPress={() => entry.trackId && openTrack(entry.trackId)}>
        <Text style={styles.rowDay}>
          {entry.month} · {entry.day}
        </Text>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.rowComposer} numberOfLines={1}>
            {entry.composer}
          </Text>
        </View>
      </ScaleButton>
    );
  };

  const renderRow = (row: Row) => {
    if (row.kind === 'header') {
      return (
        <View key={`${row.copy}-h${row.month}`} style={styles.monthHeader}>
          <Text style={styles.monthHeaderText}>{CALENDAR_MONTHS[row.month - 1]}</Text>
        </View>
      );
    }
    return renderEntry(row.entry, row.copy);
  };

  const todayTrack = getTodayTrack();

  return (
    <View style={styles.screen}>
      {/* 고정 헤더 — 타이틀만 */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.appTitle}>오늘의 클래식</Text>
          <ScaleButton
            accessibilityLabel="메뉴"
            style={styles.menuButton}
            onPress={() => router.push({ pathname: '/menu', params: { from: '/' } })}>
            <SymbolView
              name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
              tintColor={Colors.brown100}
              size={22}
            />
          </ScaleButton>
        </View>
      </View>

      {/* '오늘' 카드 — 헤더 바로 아래 고정, 스크롤과 무관 */}
      <TodayFixedCard track={todayTrack} onPress={() => openTrack(todayTrack.id)} />

      {/* 연간 타임라인 */}
      <View style={styles.timelineArea}>
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timelineContent}>
          {ALL_ROWS.map((row) => renderRow(row))}
        </ScrollView>
      </View>

      {/* 알람 카드 — 화면 가장 하단에 고정 */}
      <View style={[styles.alarmCard, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.alarmTopRow}>
          <Text style={styles.alarmBell}>🔔</Text>
          <Text style={styles.alarmCountdownText}>
            {notifOn ? '4시간 22분 후 알람이 울립니다' : '알람이 꺼져 있습니다'}
          </Text>
        </View>
        <View style={styles.alarmBodyRow}>
          <Image source={imgAlarmBook} style={styles.alarmBookImage} resizeMode="cover" />
          <View style={styles.alarmMiddle}>
            <View style={styles.alarmDaysRow}>
              {ALARM_DAYS.map(({ label, dimmed }) => (
                <Text
                  key={label}
                  style={[styles.alarmDayText, dimmed && styles.alarmDayTextDimmed]}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.alarmTimeRow}>
              <Text style={styles.alarmTimeMeridiem}>오전</Text>
              <Text style={styles.alarmTimeValue}>7:00</Text>
            </View>
          </View>
          <ScaleButton
            accessibilityLabel={notifOn ? '알람 끄기' : '알람 켜기'}
            onPress={() => setNotifOn((v) => !v)}>
            <View style={[styles.alarmToggle, notifOn && styles.alarmToggleOn]}>
              <View style={[styles.alarmToggleKnob, notifOn && styles.alarmToggleKnobOn]} />
            </View>
          </ScaleButton>
        </View>
      </View>
    </View>
  );
}

const ALARM_DAYS: { label: string; dimmed: boolean }[] = [
  { label: '일', dimmed: true },
  { label: '월', dimmed: false },
  { label: '화', dimmed: false },
  { label: '수', dimmed: false },
  { label: '목', dimmed: false },
  { label: '금', dimmed: false },
  { label: '토', dimmed: true },
];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: -0.68,
    color: Colors.brown100,
  },
  menuButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 알람 카드
  alarmCard: {
    backgroundColor: Colors.beige10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  alarmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  alarmBell: {
    fontSize: 15,
  },
  alarmCountdownText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
    color: Colors.beige100,
  },
  alarmBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  alarmBookImage: {
    width: 46,
    height: 66,
    borderRadius: 2,
    backgroundColor: Colors.beige50,
  },
  alarmMiddle: {
    flex: 1,
    gap: 8,
  },
  alarmDaysRow: {
    flexDirection: 'row',
    gap: 5,
  },
  alarmDayText: {
    width: 15,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
    color: Colors.brown100,
  },
  alarmDayTextDimmed: {
    opacity: 0.3,
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  alarmTimeMeridiem: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
    color: Colors.brown100,
  },
  alarmTimeValue: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 32,
    letterSpacing: -0.64,
    color: Colors.brown100,
  },
  alarmToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 3,
    backgroundColor: Colors.beige50,
    justifyContent: 'center',
  },
  alarmToggleOn: {
    backgroundColor: Colors.beige100,
  },
  alarmToggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.bg,
  },
  alarmToggleKnobOn: {
    transform: [{ translateX: 20 }],
  },

  // 타임라인
  timelineArea: {
    flex: 1,
    position: 'relative',
  },
  timelineContent: {
    paddingBottom: 40,
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  monthHeaderText: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.beige100,
    textTransform: 'uppercase',
  },

  // 일반 행
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  rowDay: {
    width: 44,
    textAlign: 'left',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige100,
  },
  rowDayLocked: {
    width: 44,
    textAlign: 'left',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige50,
  },
  rowLockIcon: {
    width: 22,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
    color: Colors.brown100,
  },
  rowTitleLocked: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
    color: Colors.brown50,
  },
  rowComposer: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.beige100,
    marginTop: 2,
  },
  rowComposerLocked: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.beige50,
    marginTop: 2,
  },

  // 오늘 고정 카드
  heroFixedWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.beige10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroDateTag: {
    position: 'absolute',
    top: 12,
    left: 20,
    backgroundColor: Colors.beige10,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroDateTagText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: -0.22,
    color: Colors.beige100,
  },
  heroBottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
  },
  heroTitleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: -0.72,
    color: Colors.white,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  heroInfoText: {
    flex: 1,
    minWidth: 0,
  },
  heroComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: -0.26,
    color: Colors.white,
  },
  heroComposerLatin: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 11,
    color: Colors.beige50,
    marginTop: 2,
  },
  heroPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroPlayText: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 13,
    color: Colors.white,
  },
});
