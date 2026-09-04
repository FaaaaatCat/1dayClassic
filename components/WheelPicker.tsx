import { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ink, Type } from '@/constants/theme';

/**
 * 한 칸의 높이 — 글자가 앉는 자리에 위아래 숨을 더한 값이다.
 *
 * 스크롤 휠에는 칸 사이 간격이라는 것이 없어서, 줄 간격을 칸 높이에 접어 넣는다.
 * 시안의 88은 실제로 보니 너무 벌어져 있어 좁혔다.
 */
const ITEM_HEIGHT = 64;

/** 한 번에 보이는 칸 수 — 고른 것 하나와 위아래 하나씩. */
const VISIBLE_ITEMS = 3;

const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface WheelPickerProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  /** 가장 큰 표제라 서체가 다르다 — 시·분은 가늘게, 오전/오후는 그보다 조금 굵게. */
  weight?: 'light' | 'medium';
}

/**
 * 세로 스크롤로 값을 고르는 휠 피커 — 시계 앱의 시간 선택기를 새 패키지 없이 흉내낸다.
 *
 * 가운데 줄이 선택값이고, snapToInterval로 칸에 딱 맞춰 멈춘다. 선택된 줄만 검은 글자이고
 * 위아래는 물러난 회색(ash)이다 — 가운데를 선으로 감싸지 않고 색만으로 가른다.
 */
export default function WheelPicker({
  items,
  selectedIndex,
  onChange,
  width = 64,
  weight = 'light',
}: WheelPickerProps) {
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
    <View style={{ width, height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
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
            <Text
              style={[
                styles.itemText,
                weight === 'medium' && styles.itemTextMedium,
                index === selectedIndex && styles.itemTextSelected,
              ]}
              numberOfLines={1}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * 이 화면에서 가장 큰 글자.
 *
 * 시안은 48이지만 그대로 두면 '오전'·'오후' 두 글자가 칸 폭을 넘어 말줄임표가 생긴다.
 * 한 단 줄여 글자가 온전히 들어가게 했다.
 */
const FONT_SIZE = 36;

const styles = StyleSheet.create({
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: Type.displayLight,
    fontSize: FONT_SIZE,
    // 큰 글자는 기본 줄높이가 넉넉해 위아래가 잘린다 — 글자 크기에 맞춰 눌러 준다.
    lineHeight: FONT_SIZE * 1.2,
    textAlign: 'center',
    color: Ink.muted,
  },
  itemTextMedium: {
    fontFamily: Type.ui,
  },
  /** 고른 줄만 검다. 나머지는 물러나 있어 어디를 골랐는지 색으로 읽힌다. */
  itemTextSelected: {
    color: Ink.primary,
  },
});
