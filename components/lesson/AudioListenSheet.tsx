import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, Shadow, tracking } from '@/constants/theme';

interface Props {
  visible: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  /** 팝업을 닫는다 — 재생도 함께 멈춘다(호출부에서 stop 처리). */
  onClose: () => void;
}

/**
 * '오디오 듣기' 팝업 — 낭독이 자동으로 진행되는 동안의 재생 컨트롤만 모아 둔다.
 * 이전 하단 고정바를 대신하는 자리라, 상세 화면 본문 위로 전체화면 Modal로 띄운다.
 */
export default function AudioListenSheet({
  visible,
  isPlaying,
  isLoading,
  hasError,
  onTogglePlay,
  onRestart,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="팝업 닫기" onPress={onClose}>
        {/* onPress 빈 핸들러 — 카드 안쪽(버튼이 아닌 여백)을 눌러도 뒤 backdrop까지 눌리지 않게 막는다. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {/* 닫기 — 카드 안쪽 우측 상단에 고정. ScaleButton은 Pressable로 감싼 뒤 내부
              Animated.View에만 style을 넣는 구조라, position:absolute를 ScaleButton에
              직접 주면 크기가 0인 바깥 Pressable을 기준으로 계산돼 엉뚱한 자리(카드
              왼쪽 위)에 뜬다. 그래서 위치는 이 wrapper가 잡고 ScaleButton은 크기만 갖는다. */}
          <View style={styles.closeButtonWrap}>
            <ScaleButton accessibilityLabel="닫기" style={styles.closeButton} onPress={onClose}>
              <Ionicons
                name="close-outline"
                color={Colors.brown100}
                size={18}
              />
            </ScaleButton>
          </View>

          <View style={styles.iconCircle}>
            <Ionicons
              name="headset"
              color={Colors.beige100}
              size={48}
            />
          </View>

          <Text style={styles.statusText}>자동으로 읽는 중입니다</Text>

          {hasError && (
            <Text style={styles.errorText}>음원을 불러오지 못했습니다. 다시 시도해 주세요.</Text>
          )}

          <View style={styles.primaryRow}>
            <View style={styles.controlColumn}>
              <ScaleButton
                accessibilityLabel={isPlaying ? '일시정지' : '재생'}
                style={styles.primaryButton}
                onPress={onTogglePlay}>
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    color={Colors.white}
                    size={26}
                  />
                )}
              </ScaleButton>
              <Text style={styles.controlLabel}>{isPlaying ? '일시정지' : '재생'}</Text>
            </View>
            <View style={styles.controlColumn}>
              <ScaleButton accessibilityLabel="다시듣기" style={styles.primaryButton} onPress={onRestart}>
                <Ionicons
                  name="refresh"
                  color={Colors.white}
                  size={26}
                />
              </ScaleButton>
              <Text style={styles.controlLabel}>다시듣기</Text>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 3, 3, 0.6)',
    paddingHorizontal: 32,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: Colors.bg,
    gap: 8,
    ...Shadow.card,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.beige10,
  },
  statusText: {
    marginTop: 8,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.red100,
    textAlign: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 16,
  },
  controlColumn: {
    alignItems: 'center',
    gap: 6,
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brown100,
  },
  controlLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
  },
  closeButtonWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brown10,
  },
});
