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

/**
 * 미리보기로 넘겨 볼 페이지 이미지 — 지금은 비어 있다.
 *
 * 자리를 잡아 두었던 열 장은 유유출판사 책의 표지를 복사해 둔 것이라
 * data/_archive/uupress/preview로 옮겼다. 데모용 책들에는 아직 펼친 면을 찍은 이미지가 없어,
 * 이 모달은 어느 화면에서도 열지 않는다(책 상세·서재 상세의 미리보기는 토스트만 띄운다).
 * 페이지 이미지가 생기면 require('@/assets/…')로 여기 채우고 두 화면의 버튼을 되돌리면 된다.
 * 세로가 긴 책 페이지 비율(예: 3:4)을 권장하지만, resizeMode="contain"이라 잘리지 않는다.
 */
const PAGE_IMAGES: number[] = [];

/** 페이지 수 — 이미지 수가 곧 쪽수다. */
const PAGE_COUNT = PAGE_IMAGES.length;

/**
 * 책 상세페이지의 '미리보기' 버튼을 누르면 뜨는 팝업.
 *
 * 페이지를 가로로 스와이프하며 넘겨본다. 이미지는 PAGE_IMAGES 참고 — 지금은 비어 있다.
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
                name="close-outline"
                color={Colors.brown100}
                size={24}
              />
            </ScaleButton>
          </View>
        </View>

        <Text style={styles.notice}>
          미리보기입니다. 실제 책의 내용이 아닌 예시 콘텐츠로 구성되어
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
