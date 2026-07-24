import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import TrackCoverImage from '@/components/TrackCoverImage';
import { Colors, Fonts } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { getTomorrowTrack, TODAY_DAY, TODAY_MONTH } from '@/lib/calendar';
import { getTodayTrack } from '@/lib/data';
import { getAlarmCountdown } from '@/lib/notifications';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** hour(0~23) → "오전"/"오후" + 12시간제 표시 */
function formatAlarmTime(hour: number, minute: number): { meridiem: string; time: string } {
  const meridiem = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { meridiem, time: `${hour12}:${String(minute).padStart(2, '0')}` };
}

/** 알람(홈) 화면. */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm, toggleEnabled } = useAlarm();

  // 카운트다운이 실제 시간 기준이라 1분마다 다시 계산해 화면을 갱신한다.
  const [countdown, setCountdown] = useState(() => getAlarmCountdown(alarm));
  useEffect(() => {
    setCountdown(getAlarmCountdown(alarm));
    const interval = setInterval(() => setCountdown(getAlarmCountdown(alarm)), 30000);
    return () => clearInterval(interval);
  }, [alarm]);

  const todayTrack = getTodayTrack();
  const tomorrowTrack = getTomorrowTrack();
  const { meridiem, time } = formatAlarmTime(alarm.hour, alarm.minute);

  const openTrack = (trackId: string) => {
    router.push({ pathname: '/today', params: { trackId } });
  };

  const openAlarmDetail = () => {
    router.push('/alarm-detail');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.appTitle}>하루 알람</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateGroup}>
              <Text style={styles.dateNumber}>{TODAY_MONTH}</Text>
              <Text style={styles.dateUnit}>월</Text>
            </View>
            <View style={styles.dateGroup}>
              <Text style={styles.dateNumber}>{TODAY_DAY}</Text>
              <Text style={styles.dateUnit}>일</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <View style={styles.todayCard}>
          <TrackCoverImage track={todayTrack} style={styles.todayImage} resizeMode="cover" />
          <ScaleButton
            accessibilityLabel={`${todayTrack.title} 상세 보기`}
            style={styles.todayCardBody}
            onPress={() => openTrack(todayTrack.id)}>
            <Text style={styles.todayLabel}>오늘의 알람</Text>
            <View style={styles.todayRow}>
              <View style={styles.todayInfo}>
                <Text style={styles.todayTitle} numberOfLines={1}>
                  {todayTrack.title}
                </Text>
                <Text style={styles.todayComposer} numberOfLines={1}>
                  {todayTrack.composer}
                </Text>
              </View>
              <View style={styles.todayButton}>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={Colors.brown100}
                  size={20}
                />
              </View>
            </View>
          </ScaleButton>
        </View>

        <View style={styles.alarmCard}>
          <ScaleButton
            accessibilityLabel="알람 편집"
            style={styles.alarmInfo}
            onPress={openAlarmDetail}>
            <View style={styles.alarmCountdownRow}>
              {countdown.prefix.length > 0 && (
                <Text style={styles.alarmCountdownBold}>{countdown.prefix}</Text>
              )}
              <Text style={styles.alarmCountdownRegular}>{countdown.suffix}</Text>
            </View>
            <View style={styles.alarmTimeBlock}>
              <View style={styles.alarmTimeRow}>
                <Text style={styles.alarmMeridiem}>{meridiem}</Text>
                <Text style={styles.alarmTimeValue}>{time}</Text>
              </View>
              <View style={styles.alarmDaysRow}>
                {DAY_LABELS.map((label, index) => (
                  <Text
                    key={label}
                    style={[styles.alarmDayText, !alarm.repeatDays[index] && styles.alarmDayTextDimmed]}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </ScaleButton>
          <ScaleButton
            accessibilityLabel={alarm.enabled ? '알람 끄기' : '알람 켜기'}
            onPress={toggleEnabled}>
            <View style={[styles.alarmToggle, alarm.enabled && styles.alarmToggleOn]}>
              <View style={[styles.alarmToggleKnob, alarm.enabled && styles.alarmToggleKnobOn]} />
            </View>
          </ScaleButton>
        </View>

        {tomorrowTrack && (
          <View style={styles.tomorrowRow}>
            <Text style={styles.tomorrowLabel}>
              <Text style={styles.tomorrowLabelStar}>✦ </Text>
              내일의 알람
            </Text>
            <View style={styles.tomorrowInfo}>
              <Text style={styles.tomorrowTitle} numberOfLines={1}>
                {tomorrowTrack.title}
              </Text>
              <Text style={styles.tomorrowComposer} numberOfLines={1}>
                {tomorrowTrack.composer}
              </Text>
            </View>
            <TrackCoverImage track={tomorrowTrack} style={styles.tomorrowCover} resizeMode="cover" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: Colors.bg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.brown100,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  dateNumber: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 34,
    lineHeight: 34,
    color: Colors.brown100,
  },
  dateUnit: {
    fontFamily: Fonts.regular,
    fontSize: 20,
    color: Colors.brown100,
  },

  // 본문
  body: {
    padding: 8,
    gap: 12,
    paddingBottom: 24,
  },

  // 오늘의 알람 카드
  todayCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
  },
  todayImage: {
    width: '100%',
    height: 200,
  },
  todayCardBody: {
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  todayLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown50,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  todayInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  todayTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 24,
    color: Colors.brown100,
  },
  todayComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.brown100,
  },
  todayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.brown10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 알람 시간 카드
  alarmCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  alarmInfo: {
    alignItems: 'stretch',
    flex: 1,
    minWidth: 0,
    gap: 16,
  },
  alarmCountdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  alarmCountdownBold: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown100,
  },
  alarmCountdownRegular: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.brown50,
  },
  alarmTimeBlock: {
    gap: 8,
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  alarmMeridiem: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.brown100,
  },
  alarmTimeValue: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 34,
    color: Colors.brown100,
  },
  alarmDaysRow: {
    flexDirection: 'row',
    gap: 2,
  },
  alarmDayText: {
    width: 15,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.brown100,
  },
  alarmDayTextDimmed: {
    opacity: 0.3,
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
    backgroundColor: Colors.white,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  alarmToggleKnobOn: {
    transform: [{ translateX: 20 }],
  },

  // 내일의 알람 프리뷰
  tomorrowRow: {
    opacity: 0.4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tomorrowLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown100,
  },
  tomorrowLabelStar: {
    fontFamily: Fonts.regular,
  },
  tomorrowInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    alignItems: 'flex-end',
  },
  tomorrowTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.brown100,
    textAlign: 'right',
  },
  tomorrowComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.brown100,
    textAlign: 'right',
  },
  tomorrowCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
});
