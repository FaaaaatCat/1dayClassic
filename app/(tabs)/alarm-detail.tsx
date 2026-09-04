import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import ScreenHeader, { HeaderTextButton } from '@/components/ScreenHeader';
import WheelPicker from '@/components/WheelPicker';
import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';
import { type AlarmSound, useAlarm } from '@/context/AlarmContext';
import { useToast } from '@/context/ToastContext';
import { getNextAlarmMessage } from '@/lib/alarmTime';

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
export default function AlarmDetailScreen({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm, updateAlarm } = useAlarm();
  const { showToast } = useToast();

  const initial = to12Hour(alarm.hour);
  const [meridiemIndex, setMeridiemIndex] = useState(initial.meridiemIndex);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(alarm.minute);
  const [repeatDays, setRepeatDays] = useState<boolean[]>(alarm.repeatDays);
  const [sound, setSound] = useState<AlarmSound>(alarm.sound);

  const toggleDay = (index: number) => {
    setRepeatDays((prev) => prev.map((value, i) => (i === index ? !value : value)));
  };

  /**
   * 닫기 — 홈 위에 팝업으로 떠 있으면 그 팝업만 닫고, 화면으로 열렸으면 홈으로 돌아간다.
   *
   * Tabs 형제 화면 간 router.back()이 기대한 대로 동작하지 않아 화면일 때는 명시적으로
   * replace한다(lib/preview-nav의 같은 사정).
   */
  const goHome = () => (onClose ? onClose() : router.replace('/'));

  const handleSave = () => {
    const hour = to24Hour(meridiemIndex, hour12);
    updateAlarm({ hour, minute, repeatDays, sound });

    if (alarm.enabled) {
      const message = getNextAlarmMessage({ hour, minute, repeatDays });
      if (message) showToast(message);
    }

    goHome();
  };

  return (
    <View style={styles.screen}>
      {/* 왼쪽은 저장하지 않고 나가는 길이다(예전의 '취소'). */}
      <ScreenHeader
        title="알람 편집"
        back={goHome}
        action={<HeaderTextButton label="저장" onPress={handleSave} />}
      />

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
    backgroundColor: Surface.canvas,
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
    fontFamily: Type.serifDisplay,
    fontSize: 26,
    color: Ink.primary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.body,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: Corner.card,
    borderWidth: 1,
    borderColor: Surface.plate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: Ink.strong,
    borderColor: Ink.strong,
  },
  dayCircleText: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.primary,
  },
  dayCircleTextActive: {
    color: Surface.canvas,
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
    borderRadius: Corner.small,
    borderWidth: 1,
    borderColor: Surface.plate,
  },
  soundOptionActive: {
    backgroundColor: Ink.strong,
    borderColor: Ink.strong,
  },
  soundOptionText: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.primary,
  },
  soundOptionTextActive: {
    color: Surface.canvas,
  },
});
