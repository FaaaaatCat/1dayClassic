import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import LessonCoverImage from '@/components/LessonCoverImage';
import { Colors, Fonts, Radius, Shadow, tracking } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { getTomorrowTrack, TODAY_DAY, TODAY_MONTH } from '@/lib/calendar';
import { getTodayTrack } from '@/lib/classic';

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

  const todayTrack = getTodayTrack();
  const tomorrowTrack = getTomorrowTrack();
  const { meridiem, time } = formatAlarmTime(alarm.hour, alarm.minute);

  // 데이터가 비면 홈 화면이 성립하지 않는다. 훅은 위에서 모두 호출한 뒤이므로 안전하다.
  if (!todayTrack) return null;

  const openTrack = (trackId: string) => {
    router.push({ pathname: '/today', params: { trackId } });
  };

  const openAlarmDetail = () => {
    router.push('/alarm-detail');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.pageTitle}>
          <Text style={styles.pageTitleText}>하루 클래식 공부</Text>
          <View style={styles.pageTitleDateRow}>
            <Text style={styles.pageTitleDateNumber}>{TODAY_MONTH}</Text>
            <Text style={styles.pageTitleDateStar}>✦</Text>
            <Text style={styles.pageTitleDateNumber}>{TODAY_DAY}</Text>
          </View>
        </View>

        <View style={styles.todayCard}>
          <LessonCoverImage lesson={todayTrack} style={styles.todayImage} resizeMode="cover" />
          <ScaleButton
            accessibilityLabel={`${todayTrack.title} 상세 보기`}
            style={styles.todayCardBody}
            onPress={() => openTrack(todayTrack.id)}>
            <Text style={styles.todayLabel}>오늘의 공부</Text>
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
                  size={28}
                />
              </View>
            </View>
          </ScaleButton>

          <View style={styles.cardDivider}>
            <Text style={styles.cardDividerStar}>✦</Text>
            <View style={styles.cardDividerLine} />
            <Text style={styles.cardDividerStar}>✦</Text>
          </View>

          <View style={styles.alarmRow}>
            <View style={styles.alarmIconBadge}>
              <SymbolView
                name={{ ios: 'alarm', android: 'alarm', web: 'alarm' }}
                tintColor={Colors.beige100}
                size={17}
              />
            </View>
            <View style={styles.alarmInfoWrap}>
              <ScaleButton
                accessibilityLabel="알람 편집"
                style={styles.alarmInfo}
                onPress={openAlarmDetail}>
                <View style={styles.alarmDaysRow}>
                  {DAY_LABELS.map((label, index) => (
                    <Text
                      key={label}
                      style={[styles.alarmDayText, !alarm.repeatDays[index] && styles.alarmDayTextDimmed]}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.alarmTimeRow}>
                  <Text style={styles.alarmMeridiem}>{meridiem}</Text>
                  <Text style={styles.alarmTimeValue}>{time}</Text>
                </View>
              </ScaleButton>
            </View>
            <ScaleButton
              accessibilityLabel={alarm.enabled ? '알람 끄기' : '알람 켜기'}
              onPress={toggleEnabled}>
              <View style={[styles.alarmToggle, alarm.enabled && styles.alarmToggleOn]}>
                <View style={[styles.alarmToggleKnob, alarm.enabled && styles.alarmToggleKnobOn]} />
              </View>
            </ScaleButton>
          </View>
        </View>

        {tomorrowTrack && (
          <View style={styles.tomorrowRow}>
            <View style={styles.tomorrowColumn}>
              <View style={styles.tomorrowTitleRow}>
                <Text style={styles.tomorrowLabel}>내일은?</Text>
                <View style={styles.tomorrowDivider} />
                <Text style={styles.tomorrowTitle} numberOfLines={1}>
                  {tomorrowTrack.title}
                </Text>
              </View>
              <Text style={styles.tomorrowComposer} numberOfLines={1}>
                {tomorrowTrack.composer}
              </Text>
            </View>
            <LessonCoverImage
              lesson={tomorrowTrack}
              style={styles.tomorrowCover}
              resizeMode="cover"
              placeholderLabelSize={8}
            />
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

  // 본문
  body: {
    padding: 8,
    gap: 12,
    paddingBottom: 24,
  },

  // 페이지 타이틀 — 헤더가 아니라 스크롤되는 본문의 일부
  pageTitle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 16,
  },
  pageTitleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },
  pageTitleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitleDateNumber: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -0.85,
    color: Colors.brown100,
  },
  pageTitleDateStar: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },

  // 오늘의 알람 카드 (곡 정보 + 알람 시간 통합)
  todayCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    overflow: 'hidden',
    width: '100%',
    ...Shadow.card,
  },
  todayImage: {
    width: '100%',
    height: 160,
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
    letterSpacing: tracking(14),
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
    letterSpacing: tracking(24),
    color: Colors.brown100,
  },
  todayComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  todayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 곡 정보 / 알람 시간 구분선
  cardDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  cardDividerStar: {
    fontFamily: Fonts.regular,
    fontSize: 8,
    letterSpacing: tracking(8),
    color: Colors.brown10,
  },
  cardDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.brown10,
  },

  // 알람 시간
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  alarmIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.beige10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  alarmInfo: {
    alignItems: 'stretch',
    width: '100%',
    gap: 4,
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  alarmMeridiem: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
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
    fontSize: 10,
    letterSpacing: tracking(10),
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
    paddingVertical: 12,
  },
  tomorrowColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 4,
  },
  tomorrowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  tomorrowLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  tomorrowDivider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.brown10,
  },
  tomorrowTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  tomorrowComposer: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: tracking(10),
    color: Colors.brown100,
    textAlign: 'right',
    width: '100%',
  },
  tomorrowCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
});
