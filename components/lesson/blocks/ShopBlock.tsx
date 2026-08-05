import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * 책 사러 가기 — 잘린 본문 바로 아래에 놓여 나머지를 보려면 책을 사야 함을 알린다.
 * DescBlock이 본문을 80%에서 자르고 배경색으로 흐리게 덮으므로, 이 블록이 그 흐름을 받는다.
 *
 * 누를 때의 목적지는 아직 정하지 않았다(설계 문서 non-goals) — onPress는 비어 있다.
 */
export default function ShopBlock() {
  return (
    <View style={[blockStyles.block, styles.wrap]}>
      <SymbolView
        name={{ ios: 'book', android: 'menu_book', web: 'menu_book' }}
        tintColor={Colors.beige50}
        size={44}
      />

      <Text style={styles.notice}>뒷 내용이 궁금하시다면 책을 구매해주세요.</Text>

      <ScaleButton
        accessibilityLabel="구매하러 가기"
        style={styles.button}
        // 목적지 미정 — 다음 작업
        onPress={() => {}}
      >
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>구매하러 가기</Text>
          <SymbolView
            name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
            tintColor={Colors.white}
            size={18}
          />
        </View>
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
  },
  notice: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
    textAlign: 'center',
  },
  button: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: Colors.brown100,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.white,
  },
});
