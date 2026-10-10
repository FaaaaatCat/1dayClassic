import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MyPageShell from '@/components/mypage/MyPageShell';
import SettingSection from '@/components/mypage/SettingSection';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Ink, Spark, Surface, Type } from '@/constants/theme';
import { useReaderSettings, type ReaderSettings } from '@/context/ReaderSettingsContext';
import { useToast } from '@/context/ToastContext';

/**
 * 선택지 오른쪽에 놓는 설명 그림.
 * - swatch: 둥근 네모 안의 A — 그 배경의 종이색과 글자색을 그대로 보여 준다.
 * - glyph: A 한 자 — 그 글자 크기를 보여 준다.
 * - icon: Ionicons 그림 하나.
 */
type OptionHint =
  | { kind: 'swatch'; paper: string; ink: string }
  | { kind: 'glyph'; size: number }
  | { kind: 'icon'; name: React.ComponentProps<typeof Ionicons>['name'] };

interface Section {
  id: 'background' | 'turn' | 'fontSize';
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  options: { id: string; label: string; hint: OptionHint }[];
}

/** 고를 수 있는 것들. 처음 값은 ReaderSettingsContext의 DEFAULT_READER_SETTINGS다. */
const SECTIONS: Section[] = [
  {
    id: 'background',
    title: '책 배경 설정',
    icon: 'color-palette-outline',
    options: [
      // 그 배경의 종이색과 글자색 — 읽기 화면의 라이트·다크 종이를 그대로 보여 준다.
      { id: 'light', label: '라이트', hint: { kind: 'swatch', paper: Surface.canvas, ink: Ink.primary } },
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
 * 셋 다 오늘의 공부 화면에 바로 반영된다. 구역의 모양은 배경음악·TTS 설정과 같은 것을
 * 쓴다(SettingSection).
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
      {SECTIONS.map((section, index) => (
        <SettingSection
          key={section.id}
          first={index === 0}
          title={section.title}
          icon={section.icon}
          picked={draft[section.id]}
          onPick={(id) => setDraft((prev) => ({ ...prev, [section.id]: id }))}
          options={section.options.map((option) => ({
            id: option.id,
            label: option.label,
            right: <OptionHintView hint={option.hint} />,
          }))}
        />
      ))}
    </MyPageShell>
  );
}

/** 선택지 오른쪽의 설명 그림. */
function OptionHintView({ hint }: { hint: OptionHint }) {
  if (hint.kind === 'swatch') {
    return (
      <View style={[styles.swatch, { backgroundColor: hint.paper }]}>
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
      <Ionicons name={hint.name} size={20} color={Surface.plate} />
    </View>
  );
}

const styles = StyleSheet.create({
  /** 설명 그림이 서는 자리 — 그림마다 크기가 달라도 같은 폭을 차지한다. */
  hint: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 종이 견본 — 어두운 판 위에서 검은 견본도 보이게 가는 테를 두른다. */
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Ink.body,
  },
  swatchA: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
  },
  glyph: {
    fontFamily: Type.uiMedium,
    color: Surface.plate,
  },
});
