import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import ScaleButton from '@/components/ScaleButton';
import SettingRow from '@/components/SettingRow';
import { Corner, Ink, Space, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { previewAlarmScreens } from '@/lib/alarmBook';
import { resetOnboarding } from '@/lib/onboarding';
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
        첫 실행 흐름 확인용. 아직 앱에 붙이지 않았고, 여기서만 열린다 —
        스플래시부터 홈까지 이어지는 길을 눈으로 먼저 보려는 자리다.
      */}
      <Animated.View entering={FadeIn.duration(700).delay(460)} style={styles.card}>
        <Text style={styles.sectionTitle}>첫 실행 흐름</Text>
        <Text style={styles.sectionHint}>
          설치하고 처음 켰을 때 지나는 길입니다 — 스플래시, 질문 넷, 로딩, 그리고 홈까지.
          {'\n\n'}
          <Text style={styles.strong}>미리보기</Text>는 아무것도 저장하지 않습니다. 권한도
          묻지 않고, 여기서 맞춘 알람으로 아침에 울리지도 않습니다. 실제 흐름에서는 지나가는
          로그인 시트도 여기서만 뜹니다.
          {'\n\n'}
          <Text style={styles.strong}>다시 겪어보기</Text>는 첫 실행 기록을 지우고 진짜 흐름을
          엽니다. 고른 책과 알람이 실제로 바뀌고 권한 팝업도 뜹니다.
        </Text>
        <ScaleButton
          accessibilityLabel="첫 실행 미리보기 열기"
          style={styles.testButton}
          onPress={() => router.push('/splash-preview')}>
          <Text style={styles.testButtonLabel}>미리보기 (저장 안 함)</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="첫 실행 다시 겪어보기"
          style={[styles.testButton, styles.testButtonAlt]}
          onPress={() => {
            resetOnboarding()
              .then(() => router.replace('/onboarding'))
              .catch((error) => console.warn('[settings] 첫 실행 되돌리기 실패:', error));
          }}>
          <Text style={[styles.testButtonLabel, styles.testButtonAltLabel]}>
            다시 겪어보기 (실제 저장)
          </Text>
        </ScaleButton>
      </Animated.View>

      {/*
        디자인 확인용. 홈의 읽기 버튼에 붙일 전환을 먼저 여기서 본다. 홈에 붙이면 지울 것.
      */}
      <Animated.View entering={FadeIn.duration(700).delay(470)} style={styles.card}>
        <Text style={styles.sectionTitle}>책 펼침 전환 미리보기</Text>
        <Text style={styles.sectionHint}>
          홈의 읽기 버튼부터 오늘의 학습 완료까지 한 번에 봅니다 — 책이 열리며 빛이 화면을
          채우고, 첫페이지장, 본문, 오늘의 퀴즈, 학습 완료 순서입니다. 홈과 똑같이 보이지만 읽기
          버튼만 동작하고, 아무것도 저장하지 않습니다. 어느 단계에서든 닫으면 닫힌 책으로 돌아와
          다시 볼 수 있고, 닫힌 책에서 기기의 뒤로가기로 나갑니다.
          {'\n\n'}
          <Text style={styles.strong}>펼침없이 전환 보기</Text>도 홈에서 시작하지만, 읽기를 누르면
          책이 열리고 빛이 차는 부분을 건너뛰고 첫페이지장이 바로 떠오릅니다.
        </Text>
        <ScaleButton
          accessibilityLabel="책 펼침 전환 미리보기 열기"
          style={styles.testButton}
          onPress={() => router.push('/book-opening-preview')}>
          <Text style={styles.testButtonLabel}>전환 보기</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="책 펼침 없이 전환 미리보기 열기"
          style={[styles.testButton, styles.testButtonSecond]}
          onPress={() => router.push('/book-opening-preview?skip=1')}>
          <Text style={styles.testButtonLabel}>펼침없이 전환 보기</Text>
        </ScaleButton>
        {/* 유튜브가 없는 화로 같은 흐름을 본다 — 명심보감. 고른 책은 바꾸지 않는다. */}
        <Text style={[styles.sectionHint, styles.subHint]}>유튜브 없는 화 — 명심보감</Text>
        <ScaleButton
          accessibilityLabel="명심보감으로 책 펼침 전환 미리보기 열기"
          style={[styles.testButton, styles.testButtonSecond]}
          onPress={() => router.push('/book-opening-preview?book=quote')}>
          <Text style={styles.testButtonLabel}>전환 보기</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="명심보감으로 책 펼침 없이 전환 미리보기 열기"
          style={[styles.testButton, styles.testButtonSecond]}
          onPress={() => router.push('/book-opening-preview?book=quote&skip=1')}>
          <Text style={styles.testButtonLabel}>펼침없이 전환 보기</Text>
        </ScaleButton>
      </Animated.View>

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

      <Animated.View entering={FadeIn.duration(700).delay(475)} style={styles.card}>
        <Text style={styles.sectionTitle}>그림전체배경 미리보기</Text>
        <Text style={styles.sectionHint}>
          항목의 사진을 화면 가득 깔고 그 위에 글을 큰 글씨로 얹은 형식입니다. 유튜브가 딸린
          항목은 재생기가 아래에 붙고 글씨가 작아져서, 두 경우를 따로 엽니다. 좌우를 탭해
          넘기고, 우측 상단 ✕로 닫습니다.
        </Text>
        <ScaleButton
          accessibilityLabel="그림전체배경 미리보기 열기, 유튜브 없는 항목"
          style={styles.testButton}
          onPress={() => router.push('/backdrop-preview')}>
          <Text style={styles.testButtonLabel}>유튜브 없는 화면 보기</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="그림전체배경 미리보기 열기, 유튜브 있는 항목"
          style={[styles.testButton, styles.testButtonSecond]}
          onPress={() => router.push('/backdrop-preview?music=1')}>
          <Text style={styles.testButtonLabel}>유튜브 있는 화면 보기</Text>
        </ScaleButton>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(700).delay(475)} style={styles.card}>
        <Text style={styles.sectionTitle}>섞어쓰기 미리보기</Text>
        <Text style={styles.sectionHint}>
          카드 슬라이드를 뼈대로 두고, 표지 장과 구절 장만 그림을 카드 가득 깔아 흰 글을
          얹습니다. 해설 본문은 종이 카드 그대로입니다. 좌우로 쓸어 넘기고, 우측 상단 ✕로
          닫습니다.
        </Text>
        <ScaleButton
          accessibilityLabel="섞어쓰기 미리보기 열기, 유튜브 없는 항목"
          style={styles.testButton}
          onPress={() => router.push('/mixed-preview')}>
          <Text style={styles.testButtonLabel}>유튜브 없는 화면 보기</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="섞어쓰기 미리보기 열기, 유튜브 있는 항목"
          style={[styles.testButton, styles.testButtonSecond]}
          onPress={() => router.push('/mixed-preview?music=1')}>
          <Text style={styles.testButtonLabel}>유튜브 있는 화면 보기</Text>
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
  /** 버튼 무리 사이의 작은 소제목. */
  subHint: {
    marginTop: Space[16],
  },
  /** 같은 무게의 버튼이 둘일 때 둘째 — 사이를 좁힌다. */
  testButtonSecond: {
    marginTop: Space[8],
  },
  /** 실제로 값을 바꾸는 버튼 — 선만 두어 채운 버튼과 무게를 달리한다. */
  testButtonAlt: {
    marginTop: Space[8],
    borderWidth: 1,
    borderColor: Ink.strong,
    backgroundColor: 'transparent',
  },
  testButtonAltLabel: {
    color: Ink.strong,
  },
  strong: {
    fontFamily: Type.uiMedium,
    color: Ink.primary,
  },
});
