import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, Shadow, tracking } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** 음원이 있는 항목이면 10초 전/후, 없으면(낭독 전용) 이전/다음 문장으로 이동한다. */
  hasAudio: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  /** 팝업을 닫는다 — 재생도 함께 멈춘다(호출부에서 stop 처리). */
  onClose: () => void;
}

/**
 * '오디오 듣기' 팝업 — 낭독이 자동으로 진행되는 동안의 재생 컨트롤만 모아 둔다.
 * 이전 하단 고정바를 대신하는 자리라, 상세 화면 본문 위로 전체화면 Modal로 띄운다.
 */
export default function AudioListenSheet({
  visible,
  hasAudio,
  isPlaying,
  isLoading,
  hasError,
  onTogglePlay,
  onRestart,
  onSeekBack,
  onSeekForward,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityLabel="팝업 닫기" onPress={onClose}>
        {/* onPress 빈 핸들러 — 카드 안쪽(버튼이 아닌 여백)을 눌러도 뒤 backdrop까지 눌리지 않게 막는다. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {/* 닫기 — 카드 안쪽 우측 상단에 고정. 화면 기준으로 두면 today.tsx 헤더(오디오 듣기
              버튼 등)와 겹쳐서, 카드 자체의 모서리로 옮겼다. */}
          <ScaleButton accessibilityLabel="닫기" style={styles.closeButton} onPress={onClose}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={Colors.brown100}
              size={18}
            />
          </ScaleButton>

          <View style={styles.iconCircle}>
            <SymbolView
              name={{ ios: 'headphones', android: 'headset', web: 'headset' }}
              tintColor={Colors.beige100}
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
                  <SymbolView
                    name={
                      isPlaying
                        ? { ios: 'pause.fill', android: 'pause', web: 'pause' }
                        : { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }
                    }
                    tintColor={Colors.white}
                    size={26}
                  />
                )}
              </ScaleButton>
              <Text style={styles.controlLabel}>{isPlaying ? '일시정지' : '재생'}</Text>
            </View>
            <View style={styles.controlColumn}>
              <ScaleButton accessibilityLabel="다시듣기" style={styles.primaryButton} onPress={onRestart}>
                <SymbolView
                  name={{ ios: 'arrow.counterclockwise', android: 'replay', web: 'replay' }}
                  tintColor={Colors.white}
                  size={26}
                />
              </ScaleButton>
              <Text style={styles.controlLabel}>다시듣기</Text>
            </View>
          </View>

          <View style={styles.secondaryRow}>
            <View style={styles.controlColumn}>
              <ScaleButton
                accessibilityLabel={hasAudio ? '10초 전으로' : '이전 문장'}
                style={styles.secondaryButton}
                onPress={onSeekBack}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
                  tintColor={Colors.beige100}
                  size={20}
                />
              </ScaleButton>
              <Text style={styles.controlLabelSmall}>{hasAudio ? '10초 전' : '이전 문장'}</Text>
            </View>
            <View style={styles.controlColumn}>
              <ScaleButton
                accessibilityLabel={hasAudio ? '10초 후로' : '다음 문장'}
                style={styles.secondaryButton}
                onPress={onSeekForward}>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  tintColor={Colors.beige100}
                  size={20}
                />
              </ScaleButton>
              <Text style={styles.controlLabelSmall}>{hasAudio ? '10초 후' : '다음 문장'}</Text>
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
  secondaryRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 8,
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
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.beige10,
  },
  controlLabel: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
  },
  controlLabelSmall: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    letterSpacing: tracking(11),
    color: Colors.brown50,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
