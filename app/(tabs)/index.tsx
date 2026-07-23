import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts } from '@/constants/theme';
import { TODAY_DAY, TODAY_MONTH } from '@/lib/calendar';
import { getCoverImageSource, getTodayTrack } from '@/lib/data';
import type { Track } from '@/types';

const imgAlarmBook = require('@/assets/images/home/alarm-book.png');

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

  const openTrack = (trackId: string) => {
    router.push({ pathname: '/today', params: { trackId } });
  };

  const todayTrack = getTodayTrack();

  return (
    <View style={styles.screen}>
      {/* 고정 헤더 — 타이틀만 */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.appTitle}>오늘의 클래식</Text>
        </View>
      </View>

      {/* '오늘' 카드 — 헤더 바로 아래 고정, 스크롤과 무관 */}
      <TodayFixedCard track={todayTrack} onPress={() => openTrack(todayTrack.id)} />

      {/* 목차는 '하루 클래식 공부' 상세 페이지로 이동했다 — 남은 공간은 알람 카드를 하단에 고정시키는 여백. */}
      <View style={styles.timelineArea} />

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
  },
  appTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    letterSpacing: -0.68,
    color: Colors.brown100,
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

  // 타임라인 — 목차가 상세 페이지로 이동해 이제는 알람 카드를 하단에 고정시키는 여백 역할만 한다.
  timelineArea: {
    flex: 1,
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
