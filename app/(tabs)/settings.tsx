import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import SettingRow from '@/components/SettingRow';
import { Palette, Radius, Shadow, Spacing, Typography } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.card}>
        <Text style={styles.appName}>하루 공부</Text>
        <Text style={styles.slogan}>매일 아침, 하루치 공부로 하루를 시작하세요.</Text>
        <Text style={styles.intro}>
          하루 공부는 유유 '하루 시리즈' 아홉 권의 하루치 이야기를 매일 아침 전하는 앱입니다.
          짧은 글과 낭독이 만나, 책을 읽는 시간이 하루의 가장 조용한 사치가 되기를 바랍니다.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(350)} style={styles.card}>
        <SettingRow label="버전" value="1.0.0 (데모)" />
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
  card: {
    marginTop: Spacing.md,
    backgroundColor: Palette.card,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  appName: {
    ...Typography.title,
  },
  slogan: {
    ...Typography.quote,
    marginTop: Spacing.sm,
  },
  intro: {
    ...Typography.body,
    color: Palette.subText,
    marginTop: Spacing.lg,
  },
});
