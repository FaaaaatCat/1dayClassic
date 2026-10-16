import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MyPageShell from '@/components/mypage/MyPageShell';
import { useStackBack } from '@/components/mypage/useStackBack';
import SettingSection, { SettingToggle } from '@/components/mypage/SettingSection';
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
  id: 'background' | 'fontSize';
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  options: { id: string; label: string; hint: OptionHint }[];
}

/**
 * 고를 수 있는 것들. 처음 값은 ReaderSettingsContext의 DEFAULT_READER_SETTINGS다.
 *
 * '책 넘기기 설정'은 통째로 걷어냈다 — 오늘의 공부 본문은 이제 늘 스크롤 보기라 고를 것이 없다
 * (ReaderSettingsContext의 ReaderPageTurn 주석). 책 오픈 효과는 켜고 끄기뿐이라 이 목록이 아닌
 * 스위치(SettingToggle)로 아래에 따로 둔다.
 */
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
 * 책 보기 설정 — 배경·글자 크기·책 오픈 효과를 고르고 '저장'으로 확정한다(ReaderSettingsContext).
 *
 * 배경·글자 크기는 오늘의 공부 화면에, 책 오픈 효과는 홈의 읽기 버튼에 반영된다. 구역의 모양은 배경음악·TTS 설정과 같은 것을
 * 쓴다(SettingSection).
 */
export default function BookThemeScreen() {
  const goBack = useStackBack('/library');
  const { showToast } = useToast();
  const { settings, update } = useReaderSettings();

  /**
   * 고르는 동안의 값 — 오른쪽 위 '저장'을 눌러야 실제 설정이 된다.
   *
   * 들어올 때마다 저장된 값에서 다시 시작한다. 저장하지 않고 나간 것은 없던 일이 된다.
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
    // 저장했으면 마이페이지로 — 스택에서 이 한 장을 걷는다.
    goBack();
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
      {/* 홈의 읽기 버튼을 눌렀을 때 책이 펼쳐지는 장면을 지날지(ReaderSettingsContext의 ReaderBookOpen). */}
      <SettingToggle
        title="책 오픈 효과"
        icon="sparkles-outline"
        label="책이 열리는 모션"
        right={<OptionHintView hint={{ kind: 'icon', name: 'book-outline' }} />}
        value={draft.bookOpen === 'on'}
        onChange={(on) => setDraft((prev) => ({ ...prev, bookOpen: on ? 'on' : 'off' }))}
      />
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
