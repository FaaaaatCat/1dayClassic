import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  /** 팝업을 닫는다 — 뒤로가기와 '완료' 버튼이 함께 쓴다. */
  onClose: () => void;
  /**
   * 아직 끝내지 않았으면 false. 그러면 하단 '완료' 버튼이 보이지 않고,
   * 좌측 상단 뒤로가기로만 나갈 수 있다.
   */
  done: boolean;
  children: ReactNode;
}

/**
 * 퀴즈와 감상 노트가 함께 쓰는 전체화면 팝업.
 *
 * 나가는 길이 두 개다 — 끝내기 전에는 좌측 상단 뒤로가기뿐이고, 끝내고 나면
 * 하단에 '완료' 버튼이 생긴다. 둘 다 하는 일은 같지만, 완료 버튼은 "다 했다"는
 * 마무리 동작이라 끝낸 뒤에만 나타난다.
 *
 * 닫기 버튼은 위치를 감싸는 View가 잡고 ScaleButton은 크기만 갖는다 —
 * ScaleButton에 position:absolute를 직접 주면 바깥 Pressable이 0×0이 되어 눌리지 않는다.
 */
export default function BlockSheet({ visible, title, onClose, done, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <ScaleButton accessibilityLabel="뒤로가기" style={styles.backButton} onPress={onClose}>
            <Ionicons
              name="arrow-back"
              color={Colors.brown100}
              size={20}
            />
          </ScaleButton>
          <Text style={styles.title}>{title}</Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {children}

          {done && (
            <ScaleButton accessibilityLabel="완료" style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>완료</Text>
            </ScaleButton>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: tracking(18),
    color: Colors.brown100,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 24,
  },
  doneButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brown100,
  },
  doneButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.white,
  },
});
