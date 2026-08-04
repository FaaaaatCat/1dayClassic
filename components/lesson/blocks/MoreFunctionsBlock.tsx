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
 * 두 버튼은 화면 오른쪽에 붙는다. 배경은 brown10, 아이콘은 brown50으로 닫기 버튼과 같은
 * 차림을 한다 — 셋 다 '내용이 아니라 조작'이라 같은 무게로 보여야 한다.
 * 북마크의 담김/안 담김은 색이 아니라 아이콘의 채움 여부로 구분된다.
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
          tintColor={Colors.brown50}
          size={18}
        />
      </ScaleButton>
      <ScaleButton accessibilityLabel="공유하기" style={styles.actionButton} onPress={share}>
        <SymbolView
          name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
          tintColor={Colors.brown50}
          size={18}
        />
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brown10,
  },
});
