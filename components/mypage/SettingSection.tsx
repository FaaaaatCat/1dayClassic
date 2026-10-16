import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Corner, Ink, Space, Spark, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import Toggle from '@/components/Toggle';

export interface SettingOption {
  id: string;
  label: string;
  /** 줄 오른쪽에 놓을 것 — 설명 그림이나 '미리듣기' 버튼. */
  right?: React.ReactNode;
}

/**
 * 하나만 고르는 설정 한 구역 — 책 보기 설정·배경음악 설정·TTS 설정이 함께 쓴다.
 * 켜고 끄기만 하는 설정은 아래 SettingToggle을 쓴다.
 *
 * 머리에 둥근 판의 그림과 이름, 그 아래 한 단 올라온 판 위에 고르는 줄들. 고른 줄은 왼쪽에
 * 주황 원과 흰 체크, 아닌 줄은 빈 원이다. 고른 값은 부르는 쪽이 들고 있다 — 이 구역은 그리고
 * 눌린 것을 알리기만 한다(저장은 각 화면의 '저장' 버튼이 한다).
 *
 * 마이페이지 안이라 다크다.
 */
export default function SettingSection({
  title,
  icon,
  options,
  picked,
  onPick,
  first = false,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  options: readonly SettingOption[];
  picked: string;
  onPick: (id: string) => void;
  /** 화면의 첫 구역이면 위 여백을 두지 않는다. */
  first?: boolean;
}) {
  return (
    <View style={[styles.section, !first && styles.sectionGap]}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <Ionicons name={icon} size={18} color={Surface.plate} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.panel}>
        {options.map((option, index) => {
          const on = option.id === picked;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${title} ${option.label}`}
              style={[styles.row, index === options.length - 1 && styles.rowLast]}
              onPress={() => onPick(option.id)}>
              <View style={[styles.radio, on && styles.radioOn]}>
                {on && <Ionicons name="checkmark" color={Surface.canvas} size={14} />}
              </View>
              <Text style={[styles.label, on && styles.labelPicked]}>{option.label}</Text>
              {option.right}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 켜고 끄기만 하는 설정 한 구역 — 머리와 판은 SettingSection과 같고, 판 위에 줄이 하나 선다.
 * 그 줄의 왼쪽은 고르는 원 대신 스위치, 가운데는 무엇을 켜는지 적은 글, 오른쪽은 설명 그림이다.
 * 고를 것이 둘(켜기·끄기)뿐인 설정을 줄 두 개로 펼치지 않으려는 것이다. 값은 부르는 쪽이 들고
 * 있다(저장은 각 화면의 '저장' 버튼이 한다).
 */
export function SettingToggle({
  title,
  icon,
  label,
  right,
  value,
  onChange,
  first = false,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** 줄의 글 — 켜면 무엇이 되는지. */
  label: string;
  /** 줄 오른쪽에 놓을 설명 그림. */
  right?: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  /** 화면의 첫 구역이면 위 여백을 두지 않는다. */
  first?: boolean;
}) {
  return (
    <View style={[styles.section, !first && styles.sectionGap]}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <Ionicons name={icon} size={18} color={Surface.plate} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.panel}>
        {/* 줄 어디를 눌러도 스위치가 바뀐다 — 고르는 줄들과 같은 손맛. */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: value }}
          accessibilityLabel={`${title} ${label}`}
          style={[styles.row, styles.rowLast]}
          onPress={() => onChange(!value)}>
          <Toggle value={value} onChange={onChange} />
          {/* 글은 켜고 꺼도 늘 연하게 — 켜졌는지는 스위치가 말한다. */}
          <Text style={styles.label}>{label}</Text>
          {right}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * 줄 오른쪽의 작은 글자 버튼 — 배경음악·목소리의 '미리듣기'. 듣는 동안은 '멈춤'이 된다.
 * 줄을 고르는 누름과 겹치지 않게 제 누름을 따로 받는다.
 */
export function PreviewButton({
  playing,
  onPress,
  label,
}: {
  playing: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? `${label} 미리듣기 멈추기` : `${label} 미리듣기`}
      hitSlop={8}
      style={[styles.preview, playing && styles.previewOn]}
      onPress={onPress}>
      <Ionicons name={playing ? 'pause' : 'play'} size={12} color={playing ? Ink.onDark : Surface.plate} />
      <Text style={[styles.previewText, playing && styles.previewTextOn]}>
        {playing ? '멈춤' : '미리듣기'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Space[20],
    gap: Space[12],
  },
  sectionGap: {
    marginTop: Space[32],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
  },
  /** 구역 이름 앞의 그림 — 서점 분야 바로가기와 같은 결의 둥근 판. */
  headIcon: {
    width: 32,
    height: 32,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brown90,
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.onDark,
  },
  /** 고르는 줄들을 모은 판 — 테두리 없이 한 단 올라온 자리. */
  panel: {
    borderRadius: Corner.small,
    backgroundColor: Colors.brown90,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    minHeight: 56,
    paddingHorizontal: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Ink.strong,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.muted,
  },
  labelPicked: {
    fontFamily: Type.uiMedium,
    color: Ink.onDark,
  },
  /** 선택 표시 — 빈 원, 고르면 주황 원에 흰 체크. */
  radio: {
    width: 20,
    height: 20,
    borderRadius: Corner.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Ink.body,
  },
  radioOn: {
    borderWidth: 0,
    backgroundColor: Spark.ember,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    height: 28,
    paddingHorizontal: Space[12],
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Ink.strong,
  },
  previewOn: {
    borderColor: Spark.ember,
    backgroundColor: Spark.ember,
  },
  previewText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Surface.plate,
  },
  previewTextOn: {
    color: Ink.onDark,
  },
});
