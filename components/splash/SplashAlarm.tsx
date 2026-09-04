import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import SplashQuestion from '@/components/splash/SplashQuestion';
import WheelPicker from '@/components/WheelPicker';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';

const MERIDIEMS = ['오전', '오후'];
const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/** 처음 놓이는 시각 — 오전 7시 정각. 아침에 한 쪽 읽자는 이 화면의 말과 같은 자리다. */
const DEFAULT_MERIDIEM = 0;
const DEFAULT_HOUR = 7;
const DEFAULT_MINUTE = 0;

/** 미리듣기는 여기까지만 들려준다. */
const PREVIEW_SECONDS = 30;

/** 오전/오후와 12시제 시각 → 0~23. 알람 편집 화면의 것과 같은 셈이다. */
function to24Hour(meridiemIndex: number, hour12: number): number {
  const base = hour12 % 12;
  return meridiemIndex === 1 ? base + 12 : base;
}

/** 이 화면이 고른 시각. 저장은 부르는 쪽이 한다. */
export interface SplashAlarmChoice {
  /** 0~23 */
  hour: number;
  /** 0~59 */
  minute: number;
  enabled: boolean;
}

/**
 * 질문 3 — 매일 알림을 받을지, 받는다면 몇 시에.
 *
 * 알람은 켜진 채로 시작한다. 이 물음의 답이 '네'인 편이 자연스럽고, 그래서 다음 버튼도
 * 처음부터 눌린다 — 그냥 넘겨도 하루 한 알람이 걸리는 것이 이 앱의 기본값이다.
 *
 * 고른 시각을 이 화면이 저장하지는 않는다. 위로 올려 주기만 하고, 알람을 실제로 거는 일은
 * 부르는 쪽이 맡는다 — 미리보기에서 고른 시각으로 아침에 알람이 울리면 안 되기 때문이다.
 */
export default function SplashAlarm({
  onNext,
  onBack,
}: {
  onNext: (choice: SplashAlarmChoice) => void;
  onBack: () => void;
}) {
  const [meridiemIndex, setMeridiemIndex] = useState(DEFAULT_MERIDIEM);
  const [hour12, setHour12] = useState(DEFAULT_HOUR);
  const [minute, setMinute] = useState(DEFAULT_MINUTE);
  const [enabled, setEnabled] = useState(true);
  const [preview, setPreview] = useState(false);

  return (
    <SplashQuestion
      step={3}
      title="매일 알림을 드릴까요?"
      hint="매일 책 한쪽의 내용으로 아침을 시작해보세요"
      canGoNext
      onNext={() =>
        onNext({ hour: to24Hour(meridiemIndex, hour12), minute, enabled })
      }
      onBack={onBack}
      scroll={false}>
      <View style={styles.body}>
        {/* 시각 — 알람 편집 화면과 같은 휠이다. 같은 일은 같은 것으로 한다. */}
        <View style={styles.clock}>
          <WheelPicker
            items={MERIDIEMS}
            selectedIndex={meridiemIndex}
            onChange={setMeridiemIndex}
            width={76}
            weight="medium"
          />
          <WheelPicker
            items={HOUR_LABELS}
            selectedIndex={hour12 - 1}
            onChange={(i) => setHour12(i + 1)}
            width={56}
          />
          {/* 쌍점은 고른 줄에만 있어야 하므로 휠이 아니라 가운데에 못 박아 둔다. */}
          <Text style={styles.colon}>:</Text>
          <WheelPicker
            items={MINUTE_LABELS}
            selectedIndex={minute}
            onChange={setMinute}
            width={56}
          />
        </View>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.rowLabel}>알림 사용하기</Text>
            <ScaleButton
              accessibilityLabel={enabled ? '알림 끄기' : '알림 켜기'}
              style={[styles.toggle, enabled && styles.toggleOn]}
              onPress={() => setEnabled((v) => !v)}>
              <View style={[styles.knob, enabled && styles.knobOn]} />
            </ScaleButton>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`알림 미리듣기 ${PREVIEW_SECONDS}초`}
            style={styles.row}
            onPress={() => setPreview(true)}>
            <Text style={styles.rowLabel}>알림 미리듣기({PREVIEW_SECONDS}초)</Text>
            <Ionicons name="play" size={20} color={Ink.body} />
          </Pressable>
        </View>
      </View>

      {preview ? <PreviewSheet onClose={() => setPreview(false)} /> : null}
    </SplashQuestion>
  );
}

/**
 * 미리듣기 팝업.
 *
 * 열리면 바로 흐르고, 닫으면 멈춘다 — 소리는 화면이 살아 있는 동안만 난다. 여는 사람이
 * 공공장소일 수 있으니 멈추는 버튼이 가장 크고 가운데에 있다.
 */
function PreviewSheet({ onClose }: { onClose: () => void }) {
  const player = useAudioPlayer(require('@/assets/test/1_1.mp3'));
  const status = useAudioPlayerStatus(player);

  const elapsed = Math.min(status.currentTime ?? 0, PREVIEW_SECONDS);
  const playing = status.playing;

  /**
   * 열리면 바로 흐른다.
   *
   * 닫힐 때 멈추는 코드는 두지 않는다. useAudioPlayer가 화면이 사라질 때 재생기를 스스로
   * 반납하는데(expo-modules-core의 useReleasingSharedObject), 그 정리는 이 컴포넌트의
   * 정리보다 먼저 돈다 — 그 뒤에 pause를 부르면 이미 없는 네이티브 객체를 부르는 셈이라
   * 오류가 난다. 반납되면 소리도 함께 그치므로 따로 멈출 일이 없다.
   */
  useEffect(() => {
    player.play();
  }, [player]);

  // 미리듣기는 30초까지다. 음원이 그보다 길어도 여기서 끊는다.
  useEffect(() => {
    if ((status.currentTime ?? 0) >= PREVIEW_SECONDS && status.playing) player.pause();
  }, [status.currentTime, status.playing, player]);

  const toggle = () => {
    if (playing) {
      player.pause();
      return;
    }
    // 끝까지 들은 뒤 다시 누르면 처음부터. seekTo는 약속을 돌려주므로 받아 둔다 —
    // 놓아두면 실패했을 때 갈 곳 없는 오류가 되어 나중에 터진다.
    if (elapsed >= PREVIEW_SECONDS) {
      player.seekTo(0).catch((error) => console.warn('[splash] 미리듣기 되감기 실패:', error));
    }
    player.play();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose}>
        {/* 안쪽을 눌러도 닫히지 않게, 눌림을 여기서 멈춘다. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>알림 미리듣기</Text>
          <Text style={styles.sheetHint}>아침에 이런 소리로 깨워 드려요</Text>

          <ScaleButton
            accessibilityLabel={playing ? '멈추기' : '듣기'}
            style={styles.play}
            onPress={toggle}>
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={28}
              color={Ink.onDark}
              // 세모는 무게중심이 왼쪽에 쏠려 있어 가운데에 두면 왼쪽으로 치우쳐 보인다.
              style={playing ? undefined : styles.playGlyph}
            />
          </ScaleButton>

          {/* 흐른 만큼 — 30초를 한 줄로 눕혀 놓은 것이다. */}
          <View style={styles.track}>
            <View style={[styles.trackFill, { flex: elapsed }]} />
            <View style={{ flex: PREVIEW_SECONDS - elapsed }} />
          </View>
          <Text style={styles.time}>
            {Math.floor(elapsed)}초 / {PREVIEW_SECONDS}초
          </Text>

          <ScaleButton accessibilityLabel="닫기" style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </ScaleButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: Space[8],
  },

  /** 휠 셋이 나란히 선다. 남는 높이를 다 갖고 그 한가운데에 시각을 놓는다. */
  clock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[20],
  },
  /** 휠 글자와 같은 크기여야 한 줄로 읽힌다(WheelPicker의 FONT_SIZE). */
  colon: {
    fontFamily: Type.displayLight,
    fontSize: 36,
    lineHeight: 36 * 1.2,
    color: Ink.primary,
  },

  /** 카드 — 바탕(taupe)에서 한 단 올라온 eggshell. */
  card: {
    borderRadius: Corner.card,
    borderWidth: 1,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[20],
    paddingVertical: Space[16],
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  rowLabel: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },

  /** 켜고 끄는 스위치 — 알람 편집 화면의 것과 같은 치수다. */
  toggle: {
    width: 44,
    height: 24,
    borderRadius: Corner.pill,
    padding: 3,
    backgroundColor: Surface.plate,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  toggleOn: {
    backgroundColor: Spark.ember,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  knobOn: {
    transform: [{ translateX: 20 }],
  },

  dim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space[28],
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    width: '100%',
    alignItems: 'center',
    gap: Space[8],
    padding: Space[28],
    borderRadius: Corner.card,
    backgroundColor: Surface.canvas,
  },
  sheetTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.headingSm,
    color: Ink.primary,
  },
  sheetHint: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  play: {
    width: 72,
    height: 72,
    borderRadius: Corner.pill,
    marginVertical: Space[16],
    backgroundColor: Spark.ember,
  },
  playGlyph: {
    marginLeft: 4,
  },
  track: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 4,
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  trackFill: {
    backgroundColor: Spark.ember,
  },
  time: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  close: {
    alignSelf: 'stretch',
    height: 48,
    marginTop: Space[16],
    borderRadius: Corner.pill,
    backgroundColor: Surface.plate,
  },
  closeText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
});
