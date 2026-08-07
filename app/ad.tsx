import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

/** 광고를 닫을 수 있게 되기까지의 시간. */
const AD_SECONDS = 10;

/**
 * 전면 광고 화면. 10초가 지나야 닫기 버튼이 열리고, 닫으면 오늘의 공부로 넘어간다 —
 * 뒤로가기로는 건너뛸 수 없다.
 *
 * **지금은 어디에도 붙어 있지 않다.** 원래는 알람을 끄면 거쳐 갔는데, 잠금화면 위에서
 * 건너뛸 수 없는 광고를 보여 주는 셈이 되어 알람 경로에서 뺐다(2026-08-07).
 * 화면과 라우트는 살려 두었고, 붙일 자리가 정해지면 그대로 쓴다.
 *
 * 다시 붙이는 방법은 둘 중 하나다.
 * - JS에서: `router.push('/ad')`
 * - 네이티브에서: `MainActivityIntent.ad(context)` — 이미 만들어져 있고 호출자만 없다
 *
 * 붙일 때 확인할 것: 잠금화면 위 알람 플로우 중에 뜨면 잠금 상태에서 건너뛸 수 없는
 * 광고가 된다. 필요하면 `useAlarmLockFlow()`로 그 상황을 걸러내야 한다.
 *
 * 광고 자리는 자체 플레이스홀더다. 실제 광고(AdMob 등)를 붙일 때는 아래 adSlot
 * View 안쪽만 갈아 끼우면 되고, 카운트다운·닫기·이동 흐름은 그대로 쓴다.
 */
export default function AdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(AD_SECONDS);
  const canClose = remaining === 0;

  useEffect(() => {
    if (remaining === 0) return;
    const id = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  // 알람 화면과 마찬가지로 탭 형제 화면으로의 back()은 기대대로 동작하지 않아 명시적 replace.
  // 자동 재생이 필요해지면 '/today?autoplay=…'로 바꾸면 된다(LessonDetailShell이 처리한다).
  const close = useCallback(() => router.replace('/today'), [router]);

  // 뒤로가기로 광고를 건너뛰지 못하게 항상 이벤트를 소비한다. 닫을 수 있게 된 뒤에는
  // 닫기 버튼과 똑같이 동작시킨다 — 그때까지는 아무 일도 일어나지 않는다.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canClose) close();
      return true;
    });
    return () => subscription.remove();
  }, [canClose, close]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        {canClose ? (
          <ScaleButton accessibilityLabel="광고 닫기" style={styles.closeButton} onPress={close}>
            <Text style={styles.closeText}>광고 닫기 ✕</Text>
          </ScaleButton>
        ) : (
          <View style={styles.countdown}>
            <Text style={styles.countdownText}>{remaining}초 후 닫기</Text>
          </View>
        )}
      </View>

      <View style={styles.adSlot}>
        <Text style={styles.adBadge}>광고</Text>
        <Text style={styles.adTitle}>하루 클래식</Text>
        <Text style={styles.adBody}>
          아침을 여는 한 편의 고전.{'\n'}오늘의 공부가 기다리고 있어요.
        </Text>
      </View>

      <Text style={styles.footnote}>
        {canClose ? '닫으면 오늘의 공부로 이동합니다' : '잠시 후 오늘의 공부로 이동합니다'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.beige10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: 40,
  },
  countdown: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brown10,
  },
  countdownText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
  },
  closeButton: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.beige100,
  },
  closeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  adSlot: {
    flex: 1,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.beige50,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  adBadge: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: Colors.beige100,
  },
  adTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 24,
    letterSpacing: tracking(24),
    color: Colors.brown100,
  },
  adBody: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: tracking(15),
    textAlign: 'center',
    color: Colors.brown50,
  },
  footnote: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
});
