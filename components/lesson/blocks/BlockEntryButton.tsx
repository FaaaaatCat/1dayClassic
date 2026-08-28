import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

interface Props {
  label: string;
  /** 끝냈으면 버튼 오른쪽에 초록 체크와 '완료'가 붙는다. */
  done: boolean;
  onPress: () => void;
}

/**
 * 전체화면 팝업을 여는 블록의 입구 버튼. 퀴즈와 감상 노트가 같은 모양을 쓴다.
 *
 * 상세 화면에는 이 버튼만 남고 실제 내용은 팝업 안에 있다 — 화면이 길어지는 것을 막고,
 * 오늘 할 일을 끝냈는지를 한눈에 보여 주기 위해서다.
 */
export default function BlockEntryButton({ label, done, onPress }: Props) {
  return (
    <View style={styles.row}>
      <ScaleButton accessibilityLabel={label} style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>{label}</Text>
      </ScaleButton>

      {done && (
        <View style={styles.done}>
          <Ionicons
            name="checkmark-circle"
            color={Colors.green100}
            size={18}
          />
          <Text style={styles.doneText}>완료</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Colors.white,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doneText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.green100,
  },
});
