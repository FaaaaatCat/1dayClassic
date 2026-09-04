import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import ScreenHeader from '@/components/ScreenHeader';
import WheelPicker from '@/components/WheelPicker';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useToast } from '@/context/ToastContext';
import { getNextAlarmMessage } from '@/lib/alarmTime';

const MERIDIEMS = ['오전', '오후'];
const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function to12Hour(hour24: number): { meridiemIndex: number; hour12: number } {
  const meridiemIndex = hour24 < 12 ? 0 : 1;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { meridiemIndex, hour12 };
}

function to24Hour(meridiemIndex: number, hour12: number): number {
  const base = hour12 % 12;
  return meridiemIndex === 1 ? base + 12 : base;
}

/**
 * 반복 요일을 한 줄로 — "매주 월, 화".
 *
 * 하나도 안 고르면 다음에 울릴 때가 없다(lib/alarmTime의 getNextAlarmMessage가 null을
 * 준다). 그것도 사실대로 적는다 — 아무 말이 없으면 반복이 걸린 줄 알 수 있다.
 */
function repeatLabel(repeatDays: boolean[]): string {
  const picked = DAY_LABELS.filter((_, index) => repeatDays[index]);
  if (picked.length === 0) return '반복 없음';
  if (picked.length === DAY_LABELS.length) return '매일';
  return `매주 ${picked.join(', ')}`;
}

/**
 * 알람 편집 화면.
 *
 * 위는 시각을 고르는 휠 셋(오전·오후 / 시 / 분)이 남는 높이를 다 갖고, 아래는 알람을 켜고
 * 끄는 스위치와 반복 요일이 든 카드 한 장, 그리고 화면 맨 아래에 저장 버튼이 붙는다.
 *
 * 소리를 고르는 칸은 없앴다. '기본음 / 커스텀 사운드' 둘 중 하나를 골랐는데 커스텀이라
 * 해 봐야 번들 음원 하나여서 고를 이유가 없었다. 이제 알람음은 기기의 기본 알람음이고,
 * 그것이 없는 기기에서만 번들 음원으로 떨어진다(AlarmRingingService).
 *
 * 저장이 헤더 오른쪽이 아니라 화면 아래 붙박이인 것은, 이 화면에서 할 일이 그것 하나라
 * 손가락이 닿는 자리에 크게 두는 편이 맞아서다.
 */
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
  const [enabled, setEnabled] = useState(alarm.enabled);

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
    updateAlarm({ hour, minute, repeatDays, enabled });

    // 꺼 둔 알람은 다음에 울릴 때가 없다 — 언제 울린다고 말할 수 없다.
    if (enabled) {
      const message = getNextAlarmMessage({ hour, minute, repeatDays });
      if (message) showToast(message);
    }

    goHome();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="알림" back={goHome} />

      {/* 시각 — 화면에서 가장 큰 것이라 남는 높이를 다 갖는다. */}
      <View style={styles.clock}>
        <WheelPicker
          items={MERIDIEMS}
          selectedIndex={meridiemIndex}
          onChange={setMeridiemIndex}
          width={76}
          weight="medium"
        />
        <WheelPicker
          items={HOUR_LABELS}
          selectedIndex={hour12 - 1}
          onChange={(i) => setHour12(i + 1)}
          width={56}
        />
        {/* 쌍점은 고른 줄에만 있어야 하므로 휠이 아니라 가운데에 못 박아 둔다. */}
        <Text style={styles.colon}>:</Text>
        <WheelPicker
          items={MINUTE_LABELS}
          selectedIndex={minute}
          onChange={setMinute}
          width={56}
        />
      </View>

      {/* 알람 카드 — 켜고 끄는 스위치와 반복 요일이 한 장에 든다. */}
      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>알람</Text>
            <View style={styles.switchRow}>
              <Text style={styles.cardValue}>{enabled ? '알림 사용 중' : '알림 꺼짐'}</Text>
              <ScaleButton
                accessibilityLabel={enabled ? '알람 끄기' : '알람 켜기'}
                style={[styles.toggle, enabled && styles.toggleOn]}
                onPress={() => setEnabled((v) => !v)}>
                <View style={[styles.knob, enabled && styles.knobOn]} />
              </ScaleButton>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Text style={styles.cardTitle}>{repeatLabel(repeatDays)}</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((day, index) => (
                <ScaleButton
                  key={day}
                  accessibilityLabel={`${day}요일 ${repeatDays[index] ? '반복 해제' : '반복 켜기'}`}
                  style={[styles.day, repeatDays[index] && styles.dayOn]}
                  onPress={() => toggleDay(index)}>
                  <Text style={[styles.dayText, repeatDays[index] && styles.dayTextOn]}>{day}</Text>
                </ScaleButton>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* 저장 — 화면 맨 아래에 붙박이로 앉는다. */}
      <View style={[styles.footer, { paddingBottom: Space[8] + insets.bottom }]}>
        <ScaleButton accessibilityLabel="저장" style={styles.save} onPress={handleSave}>
          <Text style={styles.saveText} numberOfLines={1}>
            저장
          </Text>
        </ScaleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },

  /** 휠 셋이 나란히 선다. 남는 높이를 다 갖고 그 한가운데에 시각을 놓는다. */
  clock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[20],
    paddingHorizontal: Space[28],
    paddingBottom: Space[20],
  },
  /** 휠 글자와 같은 크기여야 한 줄로 읽힌다(WheelPicker의 FONT_SIZE). */
  colon: {
    fontFamily: Type.displayLight,
    fontSize: 36,
    lineHeight: 36 * 1.2,
    color: Ink.primary,
  },

  cardWrap: {
    padding: Space[20],
  },
  card: {
    borderRadius: Corner.card,
    borderWidth: 1,
    borderColor: Surface.plate,
    backgroundColor: Surface.card,
    overflow: 'hidden',
  },
  cardTop: {
    gap: Space[8],
    padding: Space[20],
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  cardBottom: {
    gap: Space[16],
    padding: Space[20],
  },
  cardTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  cardValue: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /** 켜고 끄는 스위치 — 권한 카드의 것과 같은 치수다. */
  toggle: {
    width: 44,
    height: 24,
    borderRadius: Corner.pill,
    padding: 3,
    backgroundColor: Surface.plate,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toggleOn: {
    backgroundColor: Spark.ember,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  knobOn: {
    transform: [{ translateX: 20 }],
  },

  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /** 요일 하나 — 고르면 검게 채우고, 아니면 종이색에 선만 두른다. */
  day: {
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  dayOn: {
    borderColor: Ink.primary,
    backgroundColor: Ink.primary,
  },
  dayText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.body,
  },
  dayTextOn: {
    color: Ink.onDark,
  },

  /** 저장이 앉는 줄 — 버튼이 폭을 다 차지하도록 줄로 두고 flex를 준다. */
  footer: {
    flexDirection: 'row',
    padding: Space[8],
    backgroundColor: Surface.canvas,
  },
  save: {
    flex: 1,
    height: 48,
    borderRadius: Corner.input,
    backgroundColor: Spark.ember,
  },
  saveText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    textAlign: 'center',
    color: Ink.onDark,
  },
});
