import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { useReaderSettings, type ReaderSettings } from '@/context/ReaderSettingsContext';
import { useToast } from '@/context/ToastContext';

/**
 * 선택지 오른쪽에 놓는 설명 그림.
 * - swatch: 둥근 네모 안의 A — 그 배경의 종이색과 글자색을 그대로 보여 준다.
 * - glyph: A 한 자 — 그 글자 크기를 보여 준다.
 * - icon: Ionicons 그림 하나.
 */
type OptionHint =
  | { kind: 'swatch'; paper: string; ink: string; edge?: boolean }
  | { kind: 'glyph'; size: number }
  | { kind: 'icon'; name: React.ComponentProps<typeof Ionicons>['name'] };

interface Option {
  id: string;
  label: string;
  hint: OptionHint;
}

interface Section {
  id: keyof ReaderSettings;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  options: Option[];
}

/** 고를 수 있는 것들. 처음 값은 ReaderSettingsContext의 DEFAULT_READER_SETTINGS다. */
const SECTIONS: Section[] = [
  {
    id: 'background',
    title: '책 배경 설정',
    icon: 'color-palette-outline',
    options: [
      // 라이트는 흰 판이 바탕(줄의 판)에 묻히지 않게 가는 테를 두른다.
      { id: 'light', label: '라이트', hint: { kind: 'swatch', paper: Surface.canvas, ink: Ink.primary, edge: true } },
      { id: 'dark', label: '다크', hint: { kind: 'swatch', paper: Ink.primary, ink: Surface.canvas } },
    ],
  },
  {
    id: 'turn',
    title: '책 넘기기 설정',
    icon: 'book-outline',
    options: [
      { id: 'bookmark', label: '책 넘김 효과', hint: { kind: 'icon', name: 'book-outline' } },
      { id: 'none', label: '카드로 보기', hint: { kind: 'icon', name: 'albums-outline' } },
      { id: 'scroll', label: '스크롤 보기', hint: { kind: 'icon', name: 'swap-vertical' } },
    ],
  },
  {
    id: 'fontSize',
    title: '폰트 크기 설정',
    icon: 'text-outline',
    options: [
      { id: 'small', label: '작게', hint: { kind: 'glyph', size: 15 } },
      { id: 'medium', label: '중간', hint: { kind: 'glyph', size: 17 } },
      { id: 'large', label: '크게', hint: { kind: 'glyph', size: 22 } },
    ],
  },
];

/**
 * 책 보기 설정 — 배경·넘기기·글자 크기, 세 가지를 고르고 '저장'으로 확정한다(ReaderSettingsContext).
 *
 * 셋 다 오늘의 공부 화면에 바로 반영된다.
 *
 * 구역마다 머리에 그림 하나와 이름을 두고, 고르는 줄들은 한 단 올라온 판 위에 모은다.
 */
export default function BookThemeScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { settings, update } = useReaderSettings();

  /**
   * 고르는 동안의 값 — 오른쪽 위 '저장'을 눌러야 실제 설정이 된다.
   *
   * 이 화면은 Tabs의 형제라 떠나도 사라지지 않으므로, 들어올 때마다 저장된 값에서 다시
   * 시작한다. 저장하지 않고 나간 것은 없던 일이 된다.
   */
  const [draft, setDraft] = useState<ReaderSettings>(settings);
  useFocusEffect(
    useCallback(() => {
      setDraft(settings);
    }, [settings]),
  );

  const save = () => {
    (Object.keys(draft) as (keyof ReaderSettings)[]).forEach((key) => {
      if (draft[key] !== settings[key]) update(key, draft[key] as never);
    });
    showToast('책 보기 설정을 저장했습니다');
    router.replace('/library');
  };

  return (
    <MyPageShell
      title="책 보기 설정"
      action={<HeaderTextButton label="저장" color={Spark.ember} onPress={save} />}>
      {SECTIONS.map((section, sectionIndex) => (
        <View key={section.id} style={[styles.section, sectionIndex > 0 && styles.sectionGap]}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <Ionicons name={section.icon} size={18} color={Ink.strong} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>

          <View style={styles.panel}>
            {section.options.map((option, index) => {
              const on = option.id === draft[section.id];
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${section.title} ${option.label}`}
                  style={[styles.row, index === section.options.length - 1 && styles.rowLast]}
                  onPress={() => setDraft((prev) => ({ ...prev, [section.id]: option.id }))}>
                  {/* 고른 것은 왼쪽에 주황 원과 흰 체크, 아닌 것은 빈 원. */}
                  <View style={[styles.radio, on && styles.radioOn]}>
                    {on && <Ionicons name="checkmark" color={Surface.canvas} size={14} />}
                  </View>
                  <Text style={[styles.label, on && styles.labelPicked]}>{option.label}</Text>
                  <OptionHintView hint={option.hint} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </MyPageShell>
  );
}

/** 선택지 오른쪽의 설명 그림. */
function OptionHintView({ hint }: { hint: OptionHint }) {
  if (hint.kind === 'swatch') {
    return (
      <View style={[styles.swatch, { backgroundColor: hint.paper }, hint.edge && styles.swatchEdge]}>
        <Text style={[styles.swatchA, { color: hint.ink }]}>A</Text>
      </View>
    );
  }
  if (hint.kind === 'glyph') {
    return (
      <View style={styles.hint}>
        <Text style={[styles.glyph, { fontSize: hint.size, lineHeight: hint.size * 1.2 }]}>A</Text>
      </View>
    );
  }
  return (
    <View style={styles.hint}>
      <Ionicons name={hint.name} size={20} color={Ink.strong} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: MY_PAGE.gutter,
    gap: Space[12],
  },
  sectionGap: {
    marginTop: Space[32],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
  },
  /** 구역 이름 앞의 그림 — 서점 분야 바로가기와 같은 결의 둥근 판. */
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Surface.card,
  },
  sectionTitle: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  /** 고르는 줄들을 모은 판 — 테두리 없이 한 단 올라온 자리. */
  panel: {
    borderRadius: Corner.small,
    backgroundColor: Surface.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    minHeight: MY_PAGE.rowHeight,
    paddingHorizontal: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.body,
  },
  /** 선택 표시 — 빈 원, 고르면 주황 원에 흰 체크. */
  radio: {
    width: 20,
    height: 20,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Ink.muted,
  },
  radioOn: {
    borderWidth: 0,
    backgroundColor: Spark.ember,
  },
  /** 설명 그림이 서는 자리 — 그림마다 크기가 달라도 같은 폭을 차지한다. */
  hint: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEdge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Ink.muted,
  },
  swatchA: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
  },
  glyph: {
    fontFamily: Type.uiMedium,
    color: Ink.strong,
  },
  labelPicked: {
    fontFamily: Type.uiMedium,
    color: Ink.primary,
  },
});
