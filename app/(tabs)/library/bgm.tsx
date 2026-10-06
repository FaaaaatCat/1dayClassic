import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { useToast } from '@/context/ToastContext';
import { BGM_OPTIONS, type BgmId } from '@/lib/bgm';

/**
 * 배경음악 설정 — 낭독 아래에 깔릴 음악을 고른다.
 *
 * 설정 화면에 있던 것을 그대로 옮겼다. 고른 것은 색이 아니라 잉크와 체크로 알린다
 * (이 시스템에서 '켜짐'은 검정이다).
 *
 * 책 보기 설정과 같이, 고른 것은 오른쪽 위 '저장'을 눌러야 실제 설정이 된다.
 */
export default function BgmScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { bgmId, select } = useBgm();

  /**
   * 고르는 동안의 값. 이 화면은 Tabs의 형제라 떠나도 사라지지 않으므로, 들어올 때마다
   * 저장된 값에서 다시 시작한다 — 저장하지 않고 나간 것은 없던 일이 된다.
   */
  const [draft, setDraft] = useState<BgmId>(bgmId);
  useFocusEffect(
    useCallback(() => {
      setDraft(bgmId);
    }, [bgmId]),
  );

  const save = () => {
    if (draft !== bgmId) select(draft);
    showToast('배경음악 설정을 저장했습니다');
    router.replace('/library');
  };

  return (
    <MyPageShell
      title="배경음악 설정"
      action={<HeaderTextButton label="저장" color={Spark.ember} onPress={save} />}>
      <Text style={styles.hint}>
        오디오 듣기를 누르면 여기서 고른 음악이 낭독 아래에 깔립니다.
      </Text>

      {BGM_OPTIONS.map((option, index) => {
        const picked = option.id === draft;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            accessibilityLabel={`${option.label} 배경음악`}
            style={[styles.row, index === BGM_OPTIONS.length - 1 && styles.rowLast]}
            onPress={() => setDraft(option.id)}>
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
