import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Surface, Type, trackBody } from '@/constants/theme';

interface AppHeaderProps {
  /** 헤더에 표시할 페이지 타이틀 */
  title: string;
}

/**
 * 상단 공용 헤더 — 뒤로 가기와 페이지 타이틀.
 *
 * 탭바를 걷어내면서 뒤로 가기가 필요해졌다. 이 화면들은 이제 홈의 버튼으로 들어오는
 * 곳이라, 돌아가는 길이 화면 안에 있어야 한다.
 *
 * back()이 아니라 홈으로 명시해 옮긴다. 이 화면들은 Tabs의 형제라 옮겨 와도 스택에 쌓이지
 * 않아서, back()은 그 앞에 남아 있던 것으로 튄다 — 지금은 그것이 우연히 홈일 뿐이다.
 */
export default function AppHeader({ title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <ScaleButton accessibilityLabel="뒤로" style={styles.back} onPress={() => router.replace('/')}>
        <Ionicons name="chevron-back" color={Ink.primary} size={22} />
      </ScaleButton>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: Surface.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: Corner.pill,
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 17,
    letterSpacing: trackBody(17),
    color: Ink.primary,
  },
});
