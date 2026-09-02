import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import ScaleButton from '@/components/ScaleButton';
import SettingRow from '@/components/SettingRow';
import { Corner, Ink, Space, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { previewAlarmScreens } from '@/lib/alarmBook';
import { isNativeAlarmAvailable } from '@/modules/alarm-clock';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.card}>
        <Text style={styles.appName}>개발용 설정</Text>
        <Text style={styles.intro}>
          만드는 동안 화면을 견주어 보려고 둔 자리입니다. 사용자가 쓰는 설정(배경음악·권한·
          계정)은 마이페이지로 옮겼습니다. 출시 전에 이 화면을 지우거나 __DEV__로 감쌉니다.
        </Text>
      </Animated.View>

      {/*
        디자인 확인용. 실제 알람 화면을 그대로 띄우므로 여기서 보이는 게 곧 아침에 보일 화면이다.
        출시 전에 이 카드를 지우거나 __DEV__로 감쌀 것.
      */}
      {isNativeAlarmAvailable() && (
        <Animated.View entering={FadeIn.duration(700).delay(450)} style={styles.card}>
          <Text style={styles.sectionTitle}>알람 화면 미리보기</Text>
          <Text style={styles.sectionHint}>
            아홉 권의 알람 화면을 차례로 봅니다. 화면을 누르면 다음 책, 우측 상단 ✕로 닫습니다.
          </Text>
          <ScaleButton
            accessibilityLabel="알람 테스트"
            style={styles.testButton}
            onPress={() => {
              previewAlarmScreens().catch((error) => {
                console.warn('[settings] 알람 미리보기 실패:', error);
              });
            }}>
            <Text style={styles.testButtonLabel}>알람 테스트</Text>
          </ScaleButton>
        </Animated.View>
      )}

      {/*
        디자인 확인용. 오늘의 공부 상세를 카드뉴스로 바꿀지 판단하려고 넘김 동작만 먼저 만든
        데모라, 실제 학습 데이터와는 연결돼 있지 않다. 방향이 정해지면 이 카드를 지울 것.
      */}
      <Animated.View entering={FadeIn.duration(700).delay(475)} style={styles.card}>
        <Text style={styles.sectionTitle}>카드 슬라이드 미리보기</Text>
        <Text style={styles.sectionHint}>
          오늘의 공부를 좌우로 넘겨 보는 카드 형식으로 바꾸면 어떤 느낌인지 봅니다. 좌우로
          쓸어 넘기고, 우측 상단 ✕로 닫습니다.
        </Text>
        <ScaleButton
          accessibilityLabel="카드 슬라이드 미리보기 열기"
          style={styles.testButton}
          onPress={() => router.push('/card-slide-preview')}>
          <Text style={styles.testButtonLabel}>카드 넘겨보기</Text>
        </ScaleButton>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(450)} style={styles.card}>
        <Text style={styles.sectionTitle}>인스타 스토리 미리보기</Text>
        <Text style={styles.sectionHint}>
          같은 내용을 인스타그램 스토리 형식으로 봅니다. 좌우를 탭해 넘기고, 우측 상단 ✕로
          닫습니다.
        </Text>
        <ScaleButton
          accessibilityLabel="인스타 스토리 미리보기 열기"
          style={styles.testButton}
          onPress={() => router.push('/insta-preview')}>
          <Text style={styles.testButtonLabel}>스토리로 보기</Text>
        </ScaleButton>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(500)} style={styles.card}>
        <Text style={styles.sectionTitle}>원페이지 미리보기</Text>
        <Text style={styles.sectionHint}>
          지금 오늘의 공부 상세가 쓰는 형식입니다. 위의 두 가지와 같은 글을 견주어 보려고
          같은 자리에 두었습니다. 우측 상단 ✕로 닫습니다.
        </Text>
        <ScaleButton
          accessibilityLabel="원페이지 미리보기 열기"
          style={styles.testButton}
          onPress={() => router.push('/onepage-preview')}>
          <Text style={styles.testButtonLabel}>원페이지로 보기</Text>
        </ScaleButton>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(500)} style={styles.card}>
        <SettingRow label="버전" value="1.0.0 (데모)" />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  content: {
    paddingHorizontal: Space[24],
    paddingTop: Space[8],
    paddingBottom: Space[48],
  },
  /**
   * 카드 — 바탕(eggshell)에서 한 단 올라온 taupe다. 경계는 stone 선이 맡는다.
   *
   * 떠 있는 것처럼 보이지 않게 그림자를 두지 않는다. 이 시스템은 종이 위에 인쇄된
   * 것처럼 보여야 하고, 구역은 그림자가 아니라 색과 선으로 나눈다.
   */
  card: {
    marginTop: Space[12],
    backgroundColor: Surface.card,
    borderRadius: Corner.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    padding: Space[24],
  },
  appName: {
    ...TypeScale.headingSm,
    fontFamily: Type.readingBold,
    color: Ink.primary,
  },
  intro: {
    ...TypeScale.body,
    fontFamily: Type.ui,
    color: Ink.body,
    marginTop: Space[16],
  },

  // 낭독 배경음악 고르기
  sectionTitle: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.primary,
  },
  sectionHint: {
    fontFamily: Type.ui,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: trackBody(13),
    color: Ink.body,
    marginTop: Space[4],
  },
  /** 고른 줄 — 이 시스템에서 '켜짐'은 색이 아니라 잉크다. */

  // 알람 화면 미리보기
  testButton: {
    marginTop: Space[16],
    height: 44,
    borderRadius: Corner.pill,
    backgroundColor: Ink.strong,
  },
  testButtonLabel: {
    fontFamily: Type.uiMedium,
    fontSize: 15,
    letterSpacing: trackBody(15),
    color: Surface.canvas,
  },
});
