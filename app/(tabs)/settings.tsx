import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import ScaleButton from '@/components/ScaleButton';
import SettingRow from '@/components/SettingRow';
import { Colors, Fonts, Palette, Radius, Shadow, Spacing, tracking, Typography } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { BGM_OPTIONS } from '@/lib/bgm';

export default function SettingsScreen() {
  const { bgmId, select } = useBgm();

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
        <Text style={styles.sectionTitle}>낭독 배경음악</Text>
        <Text style={styles.sectionHint}>
          오디오 듣기를 누르면 여기서 고른 음악이 낭독 아래에 깔립니다.
        </Text>

        <View style={styles.bgmList}>
          {BGM_OPTIONS.map((option) => {
            const selected = option.id === bgmId;
            return (
              <ScaleButton
                key={option.id}
                accessibilityLabel={`배경음악 ${option.label}`}
                style={[styles.bgmRow, selected && styles.bgmRowSelected]}
                onPress={() => select(option.id)}
              >
                <View style={styles.bgmRowInner}>
                  <Text style={[styles.bgmLabel, selected && styles.bgmLabelSelected]}>
                    {option.label}
                  </Text>
                  {selected && (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      tintColor={Colors.green100}
                      size={18}
                    />
                  )}
                </View>
              </ScaleButton>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(500)} style={styles.card}>
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

  // 낭독 배경음악 고르기
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  sectionHint: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: tracking(13),
    color: Colors.brown50,
    marginTop: Spacing.xs,
  },
  bgmList: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  bgmRow: {
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: Colors.brown10,
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  bgmRowSelected: {
    borderColor: Colors.green100,
    backgroundColor: Colors.green10,
  },
  bgmRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bgmLabel: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  bgmLabelSelected: {
    fontFamily: Fonts.semiBold,
    color: Colors.green100,
  },
});
