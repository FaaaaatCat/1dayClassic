import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useLessonDetail } from '@/components/lesson/LessonDetailContext';
import { blockStyles } from '@/components/lesson/blocks/blockStyles';
import ScaleButton from '@/components/ScaleButton';
import { Colors } from '@/constants/theme';
import { useLikes } from '@/context/LikesContext';

/**
 * 북마크 + 공유하기. 기존 today.tsx의 actionRow를 옮겼다.
 * 북마크는 기존 `useLikes()`, 공유는 `useLessonDetail().share()`를 쓴다.
 *
 * paddingTop:32는 기존 `content` 컨테이너의 gap(24) + actionRow 자신의 paddingTop(8)을
 * 더한 값이다 — 컨테이너가 사라진 자리를 이 블록이 스스로 채운다.
 */
export default function MoreFunctionsBlock() {
  const { bookLesson, share } = useLessonDetail();
  const lesson = bookLesson.lesson;
  const { isLiked, toggleLike } = useLikes();
  const liked = isLiked(lesson.id);

  return (
    <View style={[blockStyles.block, styles.actionRow]}>
      <ScaleButton
        accessibilityLabel={liked ? '보관함에서 빼기' : '보관함에 담기'}
        style={styles.actionButton}
        onPress={() => toggleLike(lesson.id)}
      >
        <SymbolView
          name={
            liked
              ? { ios: 'bookmark.fill', android: 'bookmark', web: 'bookmark' }
              : { ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }
          }
          tintColor={liked ? Colors.beige100 : Colors.brown100}
          size={18}
        />
      </ScaleButton>
      <ScaleButton accessibilityLabel="공유하기" style={styles.actionButton} onPress={share}>
        <SymbolView
          name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
          tintColor={Colors.brown100}
          size={18}
        />
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 32,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brown10,
  },
});
