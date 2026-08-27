import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface ScaleButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  /** 눌리지 않는 상태 — 손가락을 받지 않고 줄어드는 효과도 내지 않는다. */
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 누르면 살짝 줄어드는 공용 버튼 — 과하지 않은 스케일 효과. */
export default function ScaleButton({
  onPress,
  style,
  children,
  accessibilityLabel,
  disabled,
}: ScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => {
        if (disabled) return;
        scale.value = withTiming(0.96, { duration: 120 });
      }}
      onPressOut={() => {
        if (disabled) return;
        scale.value = withTiming(1, { duration: 160 });
      }}
      onPress={onPress}
      style={[styles.base, style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
