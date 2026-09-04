import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Corner, Ink, Space, Surface, Type, TypeScale } from '@/constants/theme';

/**
 * 로그인 — 위는 어두운 화면, 아래는 종이색 시트 한 장.
 *
 * 레퍼런스에서 가져온 짜임 그대로다. 위쪽 절반이 이 앱이 무엇인지 보여 주고, 아래 시트가
 * 들어오는 문 두 개를 내민다. 아래를 밝게 두는 건 누를 것이 거기 있다는 뜻이다.
 *
 * 지금은 어느 버튼을 눌러도 그냥 다음으로 간다 — 미리보기라 실제 로그인은 붙이지 않았다.
 */
export default function SplashLogin({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {/* 위 — 아직 사진이 없어 활자로 채운다. 표지 사진이 정해지면 이 자리에 깔면 된다. */}
      <View style={styles.stage}>
        <Text style={styles.stageMark}>유유</Text>
        <Text style={styles.stageNote}>오늘 읽을 한 쪽이 기다리고 있습니다</Text>
      </View>

      <View style={[styles.sheet, { paddingBottom: Space[20] + insets.bottom }]}>
        <Text style={styles.headline}>{'하루를 여는 알람이\n한 쪽의 책이 되도록'}</Text>

        <ScaleButton accessibilityLabel="카카오로 계속하기" style={styles.kakao} onPress={onDone}>
          <Ionicons name="chatbubble" color={KAKAO_LABEL} size={18} />
          <Text style={styles.kakaoText}>카카오로 계속하기</Text>
        </ScaleButton>

        <ScaleButton accessibilityLabel="구글로 계속하기" style={styles.google} onPress={onDone}>
          <Ionicons name="logo-google" color={Ink.primary} size={18} />
          <Text style={styles.googleText}>Google로 계속하기</Text>
        </ScaleButton>

        <Text style={styles.terms}>회원가입 시 이용약관 및 개인정보처리방침에 동의합니다.</Text>
      </View>
    </View>
  );
}

/** 카카오의 노랑과 그 위 글자색 — 브랜드 색이라 팔레트가 아니라 여기 둔다. */
const KAKAO = '#FEE500';
const KAKAO_LABEL = '#191600';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
  /** 위 절반 — 아래 시트가 밝은 만큼 여기는 물러나 있는다. */
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[16],
  },
  stageMark: {
    fontFamily: Type.readingBold,
    fontSize: 64,
    lineHeight: 76,
    color: Ink.onDark,
  },
  stageNote: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.muted,
  },

  /** 아래 시트 — 위 두 귀만 둥글다. 여기부터가 누르는 자리다. */
  sheet: {
    gap: Space[12],
    paddingHorizontal: Space[20],
    paddingTop: Space[32],
    borderTopLeftRadius: Corner.largeCard,
    borderTopRightRadius: Corner.largeCard,
    backgroundColor: Surface.canvas,
  },
  headline: {
    fontFamily: Type.readingBold,
    ...TypeScale.headingSm,
    textAlign: 'center',
    color: Ink.primary,
    marginBottom: Space[8],
  },
  kakao: {
    flexDirection: 'row',
    gap: Space[8],
    height: 52,
    borderRadius: Corner.pill,
    backgroundColor: KAKAO,
  },
  kakaoText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: KAKAO_LABEL,
  },
  google: {
    flexDirection: 'row',
    gap: Space[8],
    height: 52,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Surface.canvas,
  },
  googleText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  terms: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    textAlign: 'center',
    color: Ink.muted,
    marginTop: Space[8],
  },
});
