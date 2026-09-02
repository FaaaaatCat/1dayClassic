import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/** 고를 수 있는 책 배경. 아직 무엇도 바꾸지 않는다. */
const THEMES = [
  { id: 'light', label: '라이트', hint: '밝은 종이 위에 검은 글씨' },
  { id: 'dark', label: '다크', hint: '어두운 종이 위에 흰 글씨' },
] as const;

/**
 * 책 배경 설정 — 지금은 고르는 화면만 있다.
 *
 * 고른 값을 저장하지도, 뷰어에 반영하지도 않는다. 뷰어의 종이색을 바꾸는 일은 카드·표식·
 * 골 그늘·낭독 하이라이트까지 함께 정해야 하는 일이라, 화면만 먼저 세워 두고 붙이는 것은
 * 따로 한다. 그때 이 화면이 값을 어디에 둘지(BgmContext와 같은 모양의 저장소) 정하면 된다.
 */
export default function BookThemeScreen() {
  const [picked, setPicked] = useState<string>('light');

  return (
    <MyPageShell title="책 배경 설정">
      <Text style={styles.hint}>오늘의 공부를 읽을 때의 종이색입니다.</Text>

      {THEMES.map((theme, index) => {
        const on = theme.id === picked;
        return (
          <Pressable
            key={theme.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${theme.label} 배경`}
            style={[styles.row, index === THEMES.length - 1 && styles.rowLast]}
            onPress={() => setPicked(theme.id)}>
            <View style={styles.text}>
              <Text style={[styles.label, on && styles.labelPicked]}>{theme.label}</Text>
              <Text style={styles.sub}>{theme.hint}</Text>
            </View>
            {on && <Ionicons name="checkmark" color={Ink.primary} size={20} />}
          </Pressable>
        );
      })}

      <Text style={styles.note}>아직 고른 값이 화면에 반영되지 않습니다.</Text>
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
    paddingVertical: Space[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  text: {
    gap: Space[4],
  },
  label: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.primary,
  },
  labelPicked: {
    fontFamily: Type.uiMedium,
  },
  sub: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  note: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
    paddingHorizontal: MY_PAGE.gutter,
    paddingTop: Space[16],
  },
});
