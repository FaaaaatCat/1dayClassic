import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScaleButton from '@/components/ScaleButton';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

interface LikeButtonProps {
  liked: boolean;
  onToggle: () => void;
}

/** 하트 토글 — 좋아요 시 보관함에 담긴다. */
export default function LikeButton({ liked, onToggle }: LikeButtonProps) {
  return (
    <ScaleButton
      onPress={onToggle}
      style={styles.button}
      accessibilityLabel={liked ? '좋아요 취소' : '좋아요'}>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        color={liked ? Palette.accent : Palette.subText}
        size={22}
      />
      <Text style={[styles.text, liked && styles.textLiked]}>
        {liked ? '보관함에 담겼습니다' : '좋아요'}
      </Text>
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.divider,
    backgroundColor: Palette.card,
  },
  text: {
    ...Typography.caption,
  },
  textLiked: {
    color: Palette.accent,
  },
});
