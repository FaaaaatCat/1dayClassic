import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Corner, Ink, Surface, Type, TypeScale, trackBody } from '@/constants/theme';

export interface SelectOption {
  /** 고른 값. 전체를 뜻하는 항목은 null이다. */
  value: string | null;
  label: string;
  /** 오른쪽에 적는 권수. 셀 수 없는 항목(전체·MVP)은 비워 둔다. */
  count?: number;
}

/**
 * 검은 띠 하나로 된 고르기 칸.
 *
 * 예전에는 칩을 가로로 스크롤해 골랐다. 시리즈가 늘면서 오른쪽으로 밀려 안 보이는 칩이
 * 생겼고, 지금 무엇으로 걸러 보고 있는지도 한눈에 안 들어왔다. 띠 하나에 지금 고른 것만
 * 적고, 나머지는 눌렀을 때 목록으로 보여 준다.
 *
 * 눌렀을 때 뜨는 것은 안드로이드가 기본으로 쓰는 모양이다 — 뒤가 어두워지고 목록이 화면
 * 한가운데에 뜬다. 아래에서 올라오는 시트가 아니라 이쪽인 건, 고르고 나면 바로 닫히는
 * 짧은 선택이라 화면을 크게 차지할 이유가 없어서다.
 */
export default function SelectField({
  label,
  title,
  options,
  value,
  onChange,
}: {
  /** 띠에 적는 글 — 고른 것이 있으면 그 이름, 없으면 '시리즈 전체'처럼 전체를 뜻하는 말. */
  label: string;
  /** 목록 맨 위에 적는 이름. */
  title: string;
  options: SelectOption[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} 고르기, 지금 ${label}`}
        style={styles.field}
        onPress={() => setOpen(true)}>
        <Text style={styles.fieldLabel} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" color={Ink.onDark} size={16} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent>
        {/* 뒤를 눌러도 닫힌다 — 안드로이드 기본 대화상자와 같은 몸짓이다. */}
        <Pressable style={styles.dim} onPress={() => setOpen(false)}>
          {/* 목록 위를 눌렀을 때 닫히지 않도록 눌림을 여기서 멈춘다. */}
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text style={styles.dialogTitle}>{title}</Text>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const picked = option.value === value;
                return (
                  <Pressable
                    key={option.value ?? '__all__'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: picked }}
                    style={styles.option}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}>
                    <Text style={[styles.optionLabel, picked && styles.optionLabelPicked]}>
                      {option.label}
                    </Text>
                    {option.count !== undefined && (
                      <Text style={styles.optionCount}>{option.count}</Text>
                    )}
                    {picked && <Ionicons name="checkmark" color={Ink.primary} size={18} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /** 검은 띠 — 나란히 놓이므로 폭은 밖에서 정한다(flex: 1). */
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: Ink.primary,
  },
  fieldLabel: {
    fontFamily: Type.uiMedium,
    ...TypeScale.body,
    color: Ink.onDark,
  },

  /** 뒤에 깔리는 어둠 — 목록은 그 위 한가운데에 뜬다. */
  dim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    alignSelf: 'stretch',
    // 항목이 많아도 화면을 다 덮지 않는다 — 뒤가 보여야 무엇 위에 떠 있는지 알 수 있다.
    maxHeight: '70%',
    paddingVertical: 8,
    borderRadius: Corner.card,
    backgroundColor: Surface.canvas,
  },
  dialogTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.muted,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionLabel: {
    flex: 1,
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.strong,
  },
  /** 지금 고른 것 — 색이 아니라 굵기와 체크로 알린다. */
  optionLabelPicked: {
    fontFamily: Type.uiMedium,
    color: Ink.primary,
  },
  optionCount: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
});

/** 두 개의 띠를 나란히 놓는 줄 — 사이에 실선 하나를 둔다. */
export function SelectRow({ children }: { children: React.ReactNode }) {
  return <View style={rowStyles.row}>{children}</View>;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // 검은 띠 둘을 붙여 놓고 사이에만 실선을 남긴다 — 카드 격자의 세로선과 같은 결이다.
    gap: StyleSheet.hairlineWidth,
    backgroundColor: Ink.strong,
  },
});
