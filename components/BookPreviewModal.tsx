import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';

interface BookPreviewModalProps {
  visible: boolean;
  onClose: () => void;
}

/** 더미 페이지 수 — 실제 책 분량과 무관하게 미리보기 느낌만 준다. */
const PAGE_COUNT = 10;

/**
 * 미리보기 10장 — assets/images/preview/page-1.jpg ~ page-10.jpg.
 *
 * 지금은 자리만 잡아 둔 플레이스홀더(표지 이미지를 복사해 둔 것)라 전부 같은 그림으로
 * 보인다. 같은 파일명으로 실제 페이지 스캔 이미지를 덮어쓰기만 하면 코드 변경 없이
 * 바로 반영된다 — 세로가 긴 책 페이지 비율(예: 3:4)을 권장하지만, 다른 비율이어도
 * resizeMode="contain"이라 잘리지 않고 카드 안에 맞춰 보인다.
 */
const PAGE_IMAGES = [
  require('@/assets/images/preview/page-1.jpg'),
  require('@/assets/images/preview/page-2.jpg'),
  require('@/assets/images/preview/page-3.jpg'),
  require('@/assets/images/preview/page-4.jpg'),
  require('@/assets/images/preview/page-5.jpg'),
  require('@/assets/images/preview/page-6.jpg'),
  require('@/assets/images/preview/page-7.jpg'),
  require('@/assets/images/preview/page-8.jpg'),
  require('@/assets/images/preview/page-9.jpg'),
  require('@/assets/images/preview/page-10.jpg'),
] as const;

/**
 * 책 상세페이지의 '미리보기' 버튼을 누르면 뜨는 팝업.
 *
 * 10장을 가로로 스와이프하며 넘겨본다. 이미지는 PAGE_IMAGES 참고 — 지금은 플레이스홀더다.
 *
 * 책 데이터는 받지 않는다 — 더미 내용이라 어떤 책의 상세페이지에서 열어도 항상 같다.
 */
export default function BookPreviewModal({ visible, onClose }: BookPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(1);

  /**
   * pagingEnabled 스크롤이 관성으로 완전히 멈춘 시점의 x오프셋으로 현재 페이지를 계산한다.
   * 카드 폭이 화면 폭(width)과 같아 오프셋을 그대로 나누면 페이지 인덱스가 나온다.
   */
  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setPage(Math.min(PAGE_COUNT, Math.max(1, index + 1)));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>미리보기</Text>
          <View style={styles.headerRight}>
            <ScaleButton
              accessibilityLabel="닫기"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                color={Colors.brown100}
                size={24}
              />
            </ScaleButton>
          </View>
        </View>

        <Text style={styles.notice}>
          MVP 미리보기입니다. 실제 책의 내용이 아닌 예시 콘텐츠로 구성되어
          있습니다.
        </Text>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        >
          {PAGE_IMAGES.map((source, index) => (
            <View key={index} style={[styles.page, { width }]}>
              <View style={styles.pageCard}>
                <Image
                  source={source}
                  style={styles.pageImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.counter}>
          {page} / {PAGE_COUNT}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: tracking(18),
    color: Colors.brown100,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counter: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.brown50,
    paddingBottom: 80,
    alignSelf: "center",
  },
  closeButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  notice: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    letterSpacing: tracking(13),
    lineHeight: 20,
    color: Colors.brown50,
    textAlign: "left",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  // 흰 배경 카드가 페이지 한 장의 프레임 역할을 한다 — 그림자·모서리는 카드가 갖고,
  // 이미지 자체는 비율을 유지한 채(resizeMode="contain") 그 안에 맞춰진다.
  pageCard: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pageImage: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
  },
});
