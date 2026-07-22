import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
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
import { buildCalendarYear, CALENDAR_MONTHS, type CalendarDay } from '@/lib/calendar';
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
// ScrollView의 stickyHeaderIndices가 직속 자식 인덱스를 요구하므로, 두 사본을 감싸는 View 없이
// 하나의 평평한 배열로 이어붙인다.
const ALL_ROWS: Row[] = [...buildRows(CALENDAR_DAYS, 0), ...buildRows(CALENDAR_DAYS, 1)];
const STICKY_HEADER_INDICES = ALL_ROWS.reduce<number[]>((acc, row, i) => {
  if (row.kind === 'header') acc.push(i);
  return acc;
}, []);

/** 스크롤이 복사본 경계 근처에 오면 반대편으로 조용히 점프시키는 여유 구간(px) */
const LOOP_EDGE_MARGIN = 600;
/** '오늘' 카드 전체 높이 대략값 — 화면에서 벗어났는지 판단하는 데만 쓰는 근사치 */
const TODAY_CARD_HEIGHT_ESTIMATE = 270;

/**
 * '오늘' 히어로 카드 — 누르면 카드 크기는 그대로, 안의 이미지만 확대된다.
 * (카드 전체를 줄이는 ScaleButton 대신 이미지에만 거는 별도 애니메이션이 필요해 분리했다.)
 */
function TodayHeroCard({
  entry,
  track,
  onPress,
  onLayout,
}: {
  entry: CalendarDay;
  track: Track;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const imageScale = useSharedValue(1);
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  return (
    <View onLayout={onLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.title} 재생하기`}
        onPressIn={() => {
          imageScale.value = withTiming(1.08, { duration: 220 });
        }}
        onPressOut={() => {
          imageScale.value = withTiming(1, { duration: 220 });
        }}
        onPress={onPress}>
        <View style={styles.heroImageWrap}>
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
              {entry.month}월 {entry.day}일 · 오늘
            </Text>
          </View>
          <View style={styles.heroTitleOverlay}>
            <Text style={styles.heroTitleText} numberOfLines={2}>
              {entry.title}
            </Text>
          </View>
        </View>
        <View style={styles.heroInfoBar}>
          <View style={styles.heroInfoText}>
            <Text style={styles.heroComposer}>{entry.composer}</Text>
            {entry.composerLatin && (
              <Text style={styles.heroComposerLatin}>{entry.composerLatin}</Text>
            )}
          </View>
          <View style={styles.heroPlayButton}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              tintColor={Colors.white}
              size={14}
            />
            <Text style={styles.heroPlayText}>재생</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifOn, setNotifOn] = useState(true);
  /** '오늘' 카드가 화면 밖으로 벗어나면 우측 하단 복귀 버튼을 띄운다. */
  const [showBackToToday, setShowBackToToday] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  /** 한 사본의 실제 렌더링 높이(px) — 무한 루프 경계 점프량 계산에만 쓰인다. */
  const copy0HeightRef = useRef(0);
  /** copy 1(두 번째 사본) 안 '오늘' 카드의 절대 y 오프셋(스크롤 콘텐츠 기준) */
  const todayYRef = useRef<number | null>(null);
  const didInitialScroll = useRef(false);
  const jumping = useRef(false);

  const scrollToToday = useCallback((animated: boolean) => {
    if (todayYRef.current == null) return;
    scrollRef.current?.scrollTo({ y: todayYRef.current, animated });
  }, []);

  const tryInitialScroll = useCallback(() => {
    if (didInitialScroll.current) return;
    if (todayYRef.current == null) return;
    didInitialScroll.current = true;
    scrollToToday(false);
  }, [scrollToToday]);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    copy0HeightRef.current = height / 2;
  }, []);

  const onTodayRowLayout = useCallback(
    (e: LayoutChangeEvent) => {
      todayYRef.current = e.nativeEvent.layout.y;
      tryInitialScroll();
    },
    [tryInitialScroll],
  );

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

    if (todayYRef.current != null) {
      const cardTop = todayYRef.current;
      const cardBottom = cardTop + TODAY_CARD_HEIGHT_ESTIMATE;
      const viewTop = contentOffset.y;
      const viewBottom = contentOffset.y + layoutMeasurement.height;
      const isVisible = cardBottom > viewTop && cardTop < viewBottom;
      setShowBackToToday(!isVisible);
    }
  }, []);

  const openTrack = useCallback(
    (trackId: string) => {
      router.push({ pathname: '/today', params: { trackId } });
    },
    [router],
  );

  const renderEntry = (entry: CalendarDay, copy: 0 | 1) => {
    if (entry.isToday) {
      const track = getTodayTrack();
      return (
        <TodayHeroCard
          key={`${copy}-${entry.month}-${entry.day}`}
          entry={entry}
          track={track}
          onPress={() => openTrack(track.id)}
          onLayout={copy === 1 ? onTodayRowLayout : undefined}
        />
      );
    }

    if (entry.locked) {
      return (
        <View key={`${copy}-${entry.month}-${entry.day}`} style={styles.row}>
          <Text style={styles.rowDayLocked}>{entry.day}</Text>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={Colors.brown10}
            size={11}
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
        <Text style={styles.rowDay}>{entry.day}</Text>
        <View style={styles.rowDot} />
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

  return (
    <View style={styles.screen}>
      {/* 고정 헤더 */}
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

        {/* 알람 카드 */}
        <View style={styles.alarmCard}>
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

      {/* 연간 타임라인 */}
      <View style={styles.timelineArea}>
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={STICKY_HEADER_INDICES}
          contentContainerStyle={styles.timelineContent}>
          {ALL_ROWS.map((row) => renderRow(row))}
        </ScrollView>
      </View>

      {/* '오늘' 카드가 화면 밖으로 벗어났을 때만 나타나는 복귀 버튼 */}
      {showBackToToday && (
        <ScaleButton
          accessibilityLabel="오늘로 이동"
          style={[styles.backToTodayButton, { bottom: insets.bottom + 20 }]}
          onPress={() => scrollToToday(true)}>
          <Text style={styles.backToTodayText}>오늘</Text>
        </ScaleButton>
      )}
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
    paddingBottom: 12,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Colors.beige10,
    overflow: 'hidden',
  },
  alarmTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
  },
  alarmBell: {
    fontSize: 14,
  },
  alarmCountdownText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: -0.24,
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
    width: 20,
    textAlign: 'right',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige100,
  },
  rowDayLocked: {
    width: 20,
    textAlign: 'right',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige50,
  },
  rowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.beige50,
  },
  rowLockIcon: {
    width: 11,
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

  // 오늘 히어로 카드
  heroImageWrap: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: Colors.beige10,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroDateTag: {
    position: 'absolute',
    top: 16,
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
  heroTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 0,
  },
  heroTitleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: -0.8,
    color: Colors.white,
  },
  heroInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: Colors.brown100,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  heroInfoText: {
    flex: 1,
    minWidth: 0,
  },
  heroComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: Colors.white,
  },
  heroComposerLatin: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 12,
    color: Colors.beige50,
    marginTop: 2,
  },
  heroPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  heroPlayText: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.white,
  },

  // '오늘로' 복귀 버튼
  backToTodayButton: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.brown100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  backToTodayText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: -0.28,
    color: Colors.white,
  },
});
