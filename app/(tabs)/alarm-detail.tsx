import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import WheelPicker from '@/components/WheelPicker';
import { Colors, Fonts } from '@/constants/theme';
import { type AlarmSound, useAlarm } from '@/context/AlarmContext';

const MERIDIEMS = ['오전', '오후'];
const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const SOUND_OPTIONS: { value: AlarmSound; label: string }[] = [
  { value: 'default', label: '기본음' },
  { value: 'custom', label: '커스텀 사운드' },
];

function to12Hour(hour24: number): { meridiemIndex: number; hour12: number } {
  const meridiemIndex = hour24 < 12 ? 0 : 1;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { meridiemIndex, hour12 };
}

function to24Hour(meridiemIndex: number, hour12: number): number {
  const base = hour12 % 12;
  return meridiemIndex === 1 ? base + 12 : base;
}

/** 알람 편집 화면 — 갤럭시/애플 기본 시계 앱의 알람 편집 화면을 참고한 레이아웃. */
export default function AlarmDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm, updateAlarm } = useAlarm();

  const initial = to12Hour(alarm.hour);
  const [meridiemIndex, setMeridiemIndex] = useState(initial.meridiemIndex);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(alarm.minute);
  const [repeatDays, setRepeatDays] = useState<boolean[]>(alarm.repeatDays);
  const [sound, setSound] = useState<AlarmSound>(alarm.sound);

  const toggleDay = (index: number) => {
    setRepeatDays((prev) => prev.map((value, i) => (i === index ? !value : value)));
  };

  // Tabs 형제 화면 간 router.back()이 기대한 대로 동작하지 않아 홈으로 명시적 replace.
  const goHome = () => router.replace('/');

  const handleSave = () => {
    updateAlarm({
      hour: to24Hour(meridiemIndex, hour12),
      minute,
      repeatDays,
      sound,
    });
    goHome();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <ScaleButton accessibilityLabel="취소" onPress={goHome}>
          <Text style={styles.headerButtonText}>취소</Text>
        </ScaleButton>
        <Text style={styles.headerTitle}>알람 편집</Text>
        <ScaleButton accessibilityLabel="저장" onPress={handleSave}>
          <Text style={[styles.headerButtonText, styles.headerSaveText]}>저장</Text>
        </ScaleButton>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.pickerRow}>
          <WheelPicker items={MERIDIEMS} selectedIndex={meridiemIndex} onChange={setMeridiemIndex} width={56} />
          <WheelPicker items={HOUR_LABELS} selectedIndex={hour12 - 1} onChange={(i) => setHour12(i + 1)} width={56} />
          <Text style={styles.pickerColon}>:</Text>
          <WheelPicker items={MINUTE_LABELS} selectedIndex={minute} onChange={setMinute} width={56} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>반복</Text>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((day, index) => (
              <ScaleButton
                key={day}
                accessibilityLabel={`${day}요일 ${repeatDays[index] ? '반복 해제' : '반복 켜기'}`}
                style={[styles.dayCircle, repeatDays[index] && styles.dayCircleActive]}
                onPress={() => toggleDay(index)}>
                <Text style={[styles.dayCircleText, repeatDays[index] && styles.dayCircleTextActive]}>
                  {day}
                </Text>
              </ScaleButton>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소리</Text>
          <View style={styles.soundRow}>
            {SOUND_OPTIONS.map((option) => (
              <ScaleButton
                key={option.value}
                accessibilityLabel={`${option.label} 선택`}
                style={[styles.soundOption, sound === option.value && styles.soundOptionActive]}
                onPress={() => setSound(option.value)}>
                <Text
                  style={[
                    styles.soundOptionText,
                    sound === option.value && styles.soundOptionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </ScaleButton>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  headerButtonText: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.brown50,
  },
  headerSaveText: {
    fontFamily: Fonts.semiBold,
    color: Colors.beige100,
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.brown100,
  },
  body: {
    paddingHorizontal: 20,
    gap: 32,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
  },
  pickerColon: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 26,
    color: Colors.brown100,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown50,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.brown10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: Colors.beige100,
    borderColor: Colors.beige100,
  },
  dayCircleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown100,
  },
  dayCircleTextActive: {
    color: Colors.white,
  },
  soundRow: {
    flexDirection: 'row',
    gap: 8,
  },
  soundOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brown10,
  },
  soundOptionActive: {
    backgroundColor: Colors.beige100,
    borderColor: Colors.beige100,
  },
  soundOptionText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.brown100,
  },
  soundOptionTextActive: {
    color: Colors.white,
  },
});
