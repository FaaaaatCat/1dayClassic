import { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ink, Surface, Type } from '@/constants/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
}

/**
 * 세로 스크롤로 값을 고르는 휠 피커 — 갤럭시/애플 알람 편집 화면의 시간 선택기를
 * 새 패키지 설치 없이 흉내낸다. 가운데 줄이 선택값, snapToInterval로 항목에 딱 맞춰 멈춘다.
 */
export default function WheelPicker({ items, selectedIndex, onChange, width = 64 }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isInternalScroll = useRef(false);

  useEffect(() => {
    if (isInternalScroll.current) {
      isInternalScroll.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIndex = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, rawIndex));
    if (clamped === selectedIndex) return;
    isInternalScroll.current = true;
    onChange(clamped);
  };

  return (
    <View style={[styles.wrap, { width, height: ITEM_HEIGHT * VISIBLE_ITEMS }]}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.item}>
            <Text style={[styles.itemText, index === selectedIndex && styles.itemTextSelected]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: PADDING,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Surface.plate,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Type.ui,
    fontSize: 18,
    color: Ink.body,
  },
  itemTextSelected: {
    fontFamily: Type.serifDisplay,
    fontSize: 26,
    color: Ink.primary,
  },
});
