import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { BGM_OPTIONS } from '@/lib/bgm';

/**
 * 배경음악 설정 — 낭독 아래에 깔릴 음악을 고른다.
 *
 * 설정 화면에 있던 것을 그대로 옮겼다. 고른 것은 색이 아니라 잉크와 체크로 알린다
 * (이 시스템에서 '켜짐'은 검정이다).
 */
export default function BgmScreen() {
  const { bgmId, select } = useBgm();

  return (
    <MyPageShell title="배경음악 설정">
      <Text style={styles.hint}>
        오디오 듣기를 누르면 여기서 고른 음악이 낭독 아래에 깔립니다.
      </Text>

      {BGM_OPTIONS.map((option, index) => {
        const picked = option.id === bgmId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            accessibilityLabel={`${option.label} 배경음악`}
            style={[styles.row, index === BGM_OPTIONS.length - 1 && styles.rowLast]}
            onPress={() => select(option.id)}>
            <Text style={[styles.label, picked && styles.labelPicked]}>{option.label}</Text>
            {picked && <Ionicons name="checkmark" color={Ink.primary} size={20} />}
          </Pressable>
        );
      })}
    </MyPageShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
    paddingHorizontal: MY_PAGE.gutter,
    paddingBottom: Space[16],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MY_PAGE.rowHeight,
    paddingHorizontal: MY_PAGE.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.primary,
  },
  labelPicked: {
    fontFamily: Type.uiMedium,
  },
});
