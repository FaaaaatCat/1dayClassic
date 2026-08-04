import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 책 사러 가기 CTA. Figma 노드(`I2136:1376;0:5`)의 정확한 조판을 확인하지 못했다 —
 * 조회 중 Figma MCP 호출 한도(Starter 플랜)에 걸려 이 카드만은 기존 블록들의 조판 규칙
 * (여백 20px, `Colors`, `tracking`)에 맞춰 새로 짰다. 한도가 풀리면 Figma와 대조해
 * 다듬어야 한다 — 지금은 배치만 잡아 둔 상태다.
 *
 * 링크 목적지와 누를 때의 동작은 이번 범위가 아니다(설계 문서 non-goals). onPress는
 * 비워 둔다.
 */
export default function ShopBlock() {
  return (
    <View style={[blockStyles.block, styles.wrap]}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <SymbolView
            name={{ ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' }}
            tintColor={Colors.beige100}
            size={28}
          />
        </View>
        <Text style={styles.title}>더 깊이 알고 싶다면</Text>
        <Text style={styles.subtitle}>오늘의 이야기가 실린 책을 만나보세요.</Text>
        <ScaleButton
          accessibilityLabel="책 사러 가기"
          style={styles.button}
          // 목적지 미정 — 다음 작업
          onPress={() => {}}
        >
          <Text style={styles.buttonText}>책 사러 가기</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 24,
  },
  card: {
    height: 240,
    borderRadius: 10,
    backgroundColor: Colors.beige10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige50,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: Colors.brown100,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.white,
  },
});
