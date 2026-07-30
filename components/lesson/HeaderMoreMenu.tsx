import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, Shadow, tracking } from '@/constants/theme';

interface Props {
  liked: boolean;
  onToggleBookmark: () => void;
  onShare: () => void;
}

/**
 * 헤더의 더보기(⋮) 버튼과 그 드롭다운. 항목이 북마크·공유하기 둘뿐이라 별도 라우트 대신
 * 팝오버로 둔다. 전체화면 Modal 위에 그려서, 화면 어디를 눌러도(펼친 메뉴 바깥) 닫힌다.
 */
export default function HeaderMoreMenu({ liked, onToggleBookmark, onShare }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <ScaleButton
        accessibilityLabel="더보기"
        style={styles.trigger}
        onPress={() => setOpen(true)}>
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
          tintColor={Colors.brown100}
          size={22}
        />
      </ScaleButton>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="메뉴 닫기" onPress={close} />
        <View style={[styles.menu, { top: insets.top + 56 }]}>
          <ScaleButton
            accessibilityLabel="북마크"
            style={styles.item}
            onPress={() => {
              onToggleBookmark();
              close();
            }}>
            <View style={styles.itemRow}>
              <SymbolView
                name={
                  liked
                    ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
                    : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
                }
                tintColor={liked ? Colors.beige100 : Colors.brown100}
                size={18}
              />
              <Text style={styles.itemText}>북마크</Text>
            </View>
          </ScaleButton>
          <View style={styles.divider} />
          <ScaleButton
            accessibilityLabel="공유하기"
            style={styles.item}
            onPress={() => {
              onShare();
              close();
            }}>
            <View style={styles.itemRow}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                tintColor={Colors.brown100}
                size={18}
              />
              <Text style={styles.itemText}>공유하기</Text>
            </View>
          </ScaleButton>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  menu: {
    position: 'absolute',
    right: 20,
    minWidth: 152,
    borderRadius: 12,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadow.card,
  },
  item: {
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.brown10,
  },
});
