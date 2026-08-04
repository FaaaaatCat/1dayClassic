import * as WebBrowser from 'expo-web-browser';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useLessonDetail } from '@/components/lesson/LessonDetailContext';
import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/**
 * `SymbolView`의 `name` prop 모양을 그대로 따른다 — 웹은 AndroidSymbol 세트를 쓴다
 * (expo-symbols의 실제 타입 정의와 같다).
 */
interface SymbolName {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
}

export type IntroAction =
  | { kind: 'audio' }
  | { kind: 'link'; label: string; icon: SymbolName; url: string };

interface Props {
  /** "7월 21일" — 없으면 줄이 통째로 빠진다 */
  date?: string;
  /** "클래식 공부의 시간입니다." */
  tagline: string;
  actions: IntroAction[];
}

/** 헤드폰 아이콘 — 'audio' 액션 전용 고정 아이콘 */
const AUDIO_ICON: SymbolName = { ios: 'headphones', android: 'headset', web: 'headset' };

/**
 * 항목 상세의 인트로 — 날짜 문구와 액션 버튼들. Figma를 따라 가운데 정렬한다
 * (기존 today.tsx는 왼쪽 정렬이었다). 8권도 함께 가운데 정렬로 바뀐다 — 의도된 변화다.
 *
 * 화면의 첫 블록이라 위 여백을 공통 간격(20) 대신 스스로 정한다 — INTRO_PADDING_TOP.
 * safe area를 더하지 않고 고정값을 쓴다: 100px면 어떤 기기의 노치보다 충분히 아래다.
 */
const INTRO_PADDING_TOP = 100;

export default function IntroBlock({ date, tagline, actions }: Props) {
  const { openAudio } = useLessonDetail();

  return (
    <View style={[blockStyles.block, styles.wrap, { paddingTop: INTRO_PADDING_TOP }]}>
      <View style={styles.textGroup}>
        {date && <Text style={styles.line}>{date}</Text>}
        <Text style={styles.line}>{tagline}</Text>
      </View>

      <View style={styles.buttons}>
        {actions.map((action, index) =>
          action.kind === 'audio' ? (
            <ScaleButton
              key={index}
              accessibilityLabel="오디오 듣기"
              style={styles.button}
              onPress={openAudio}
            >
              <SymbolView name={AUDIO_ICON} tintColor={Colors.white} size={18} />
              <Text style={styles.buttonText}>오디오 듣기</Text>
            </ScaleButton>
          ) : (
            <ScaleButton
              key={index}
              accessibilityLabel={action.label}
              style={styles.button}
              onPress={() => WebBrowser.openBrowserAsync(action.url)}
            >
              <SymbolView name={action.icon} tintColor={Colors.white} size={18} />
              <Text style={styles.buttonText}>{action.label}</Text>
            </ScaleButton>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: 20,
    gap: 16,
  },
  textGroup: {
    alignItems: 'center',
    gap: 8,
  },
  line: {
    fontFamily: Fonts.semiBold,
    fontSize: 24,
    letterSpacing: tracking(24),
    color: Colors.brown100,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.brown100,
  },
  buttonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.white,
  },
});
