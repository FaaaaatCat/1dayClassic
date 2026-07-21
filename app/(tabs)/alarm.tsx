import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import SettingRow from '@/components/SettingRow';
import { Palette, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const ACTIVE_DAYS = ['월', '화', '수', '목', '금'];

/** 알람 화면 — 데모용 UI. 실제 알람 동작은 구현하지 않는다. */
export default function AlarmScreen() {
  const [enabled, setEnabled] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={styles.caption}>매일 아침, 클래식 한 곡으로 하루를 시작하세요</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.card}>
        <View style={styles.timeRow}>
          <Text style={[styles.time, !enabled && styles.timeDisabled]}>07:00</Text>
          <SettingRow label="" switchValue={enabled} onSwitchChange={setEnabled} />
        </View>

        <View style={styles.days}>
          {DAYS.map((day) => {
            const active = ACTIVE_DAYS.includes(day);
            return (
              <View key={day} style={[styles.day, active && styles.dayActive]}>
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        <SettingRow label="페이드인" switchValue={fadeIn} onSwitchChange={setFadeIn} />
        <SettingRow
          label="오늘의 클래식 자동 재생"
          switchValue={autoPlay}
          onSwitchChange={setAutoPlay}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  caption: {
    ...Typography.caption,
  },
  card: {
    marginTop: Spacing.xl,
    backgroundColor: Palette.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 44,
    fontWeight: '300',
    color: Palette.text,
    letterSpacing: 1,
    paddingLeft: Spacing.lg,
  },
  timeDisabled: {
    color: Palette.subText,
  },
  days: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  day: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  dayActive: {
    backgroundColor: Palette.primary,
  },
  dayText: {
    fontSize: 13,
    color: Palette.subText,
  },
  dayTextActive: {
    color: Palette.card,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
});
