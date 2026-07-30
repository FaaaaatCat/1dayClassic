import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing, Typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '찾을 수 없는 화면' }} />
      <View style={styles.container}>
        <Text style={styles.title}>화면을 찾을 수 없습니다.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>오늘의 공부로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
    padding: Spacing.xl,
  },
  title: {
    ...Typography.title,
  },
  link: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  linkText: {
    ...Typography.caption,
    color: Palette.accent,
  },
});
