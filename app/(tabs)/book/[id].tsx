import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import TagChip from '@/components/TagChip';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useToast } from '@/context/ToastContext';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';
import {
  formatPrice,
  getCatalogBook,
  getCatalogBookByBookId,
  type CatalogBook,
} from '@/lib/catalog';
import { fieldsOf, seriesOf } from '@/lib/tags';

/** 헤더 미니 표지가 나타날 때 위에서 살짝 내려오는 느낌을 주는 시작 오프셋(px) */
const MINI_SLIDE_OFFSET = 10;

/**
 * 하루 서점의 책 상세 페이지 — 두 종류가 이 화면 하나를 함께 쓴다.
 *
 * 1) 학습 가능한 '하루 시리즈' 9권: 표지가 로컬 에셋이다.
 * 2) 유유출판사 카탈로그의 나머지 책: 표지가 원격 URL이다.
 *
 * '이 책으로 선택하기' 버튼은 이미 선택된 책이 아닌 한 277권 전부에 뜬다. 다만 실제
 * 선택(selectBook)은 학습 콘텐츠가 있는 9권에서만 일어나고, 나머지 268권은 버튼을 눌러도
 * 선택되지 않고 '준비중' 토스트만 뜬다 — 이유는 chooseBook 주석 참고.
 *
 * 표지·저자·정가·상세 절은 두 종류가 같은 모양이라, 아래에서 view라는 한 덩어리로 합쳐 둔다.
 *
 * 헤더 줄은 늘 X 버튼이 오른쪽 끝에 있고, 히어로 영역(표지·제목 등)을 스크롤로 지나치면
 * 그 왼쪽 자리에 작은 표지+제목이 위에서 살짝 내려오듯 나타난다. 별도의 오버레이가 아니라
 * 헤더 줄 안의 형제 요소라 레이아웃이 늘 한 줄로 붙어 있다.
 *
 * 상세 내용은 노션 절(sections) 순서 그대로 반복 렌더하고, ScrollView의
 * stickyHeaderIndices로 절 제목을 화면 상단에 고정한다. 절 제목을 누르면 그 절로
 * 스크롤 이동한다.
 */
export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId, selectBook } = useBookSelection();
  const { showToast } = useToast();

  // 학습 가능한 9권이 먼저다 — 그 9권은 카탈로그에도 있지만 표지를 로컬 에셋으로 쓴다.
  const studyBook = BOOKSTORE_BOOKS.find((candidate) => candidate.id === id);
  const catalogBook: CatalogBook | undefined = studyBook
    ? getCatalogBookByBookId(studyBook.id)
    : getCatalogBook(id ?? '');

  const view = studyBook
    ? {
        title: studyBook.title,
        author: studyBook.author,
        cover: studyBook.coverImage,
        price: catalogBook?.price ?? null,
        sections: catalogBook?.sections ?? [],
      }
    : catalogBook && {
        title: catalogBook.title,
        author: catalogBook.author,
        cover: { uri: catalogBook.coverImage },
        price: catalogBook.price,
        sections: catalogBook.sections,
      };

  const isSelected = studyBook?.id === selectedBookId;

  // 시리즈 칩을 앞에, 분야 칩을 뒤에 둔다. 학습 가능한 9권도 카탈로그 태그를 그대로 쓴다.
  const tags = catalogBook?.tags ?? [];
  const chips = [
    // 제목 규칙이 걸린 시리즈도 있어서 카탈로그 쪽 제목을 넘긴다(9권은 표기가 조금 다르다).
    ...seriesOf(tags, catalogBook?.title ?? '').map((label) => ({
      label,
      variant: 'series' as const,
    })),
    ...fieldsOf(tags).map((label) => ({ label, variant: 'field' as const })),
  ];

  /**
   * 안드로이드 뒤로가기(제스처 포함)를 닫기(X)와 같은 동작으로 묶는다.
   *
   * 이 화면은 탭 네비게이터의 형제라서 그냥 두면 뒤로가기가 첫 탭('오늘의 공부')으로
   * 돌아간다 — 탭 네비게이터의 기본 backBehavior가 firstRoute이기 때문이다.
   * 여기로는 하루 서점에서만 들어오므로 서점으로 되돌린다.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/bookstore');
        return true;
      });
      return () => subscription.remove();
    }, [router]),
  );

  const chooseBook = () => {
    // selectedBookId는 학습 가능한 9권짜리 BookId 유니온이고, 홈 화면의
    // getTomorrowLesson → getBookCalendar → BUILD_CALENDAR[bookId]()가 이 값을 그대로 키로
    // 쓴다. 카탈로그 전용 책의 id를 selectBook에 넘기면 BUILD_CALENDAR에 없는 키라 홈 화면이
    // 그 자리에서 크래시한다 — 그래서 studyBook이 없을 때는 절대 selectBook을 호출하지 않고
    // 안내 토스트만 띄운다.
    if (!studyBook) {
      showToast('준비중인 콘텐츠입니다');
      return;
    }
    selectBook(studyBook.id);
    showToast(`선택 완료 — ${studyBook.title}`);
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const infoHeightRef = useRef(0);
  // 절 제목 View의 onLayout에서 채워진다 — ScrollView 콘텐츠 기준 y좌표라 scrollTo에 그대로 쓴다.
  const sectionOffsetsRef = useRef<Record<number, number>>({});
  const [showMiniHeader, setShowMiniHeader] = useState(false);
  const miniHeaderProgress = useSharedValue(0);

  useEffect(() => {
    miniHeaderProgress.value = withTiming(showMiniHeader ? 1 : 0, { duration: 240 });
  }, [showMiniHeader, miniHeaderProgress]);

  const miniHeaderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: miniHeaderProgress.value,
    transform: [{ translateY: (1 - miniHeaderProgress.value) * -MINI_SLIDE_OFFSET }],
  }));

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const infoHeight = infoHeightRef.current;
    if (infoHeight <= 0) return;
    setShowMiniHeader(e.nativeEvent.contentOffset.y >= infoHeight);
  };

  const scrollToSection = (sectionIndex: number) => {
    const y = sectionOffsetsRef.current[sectionIndex];
    if (y === undefined) return;
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  /**
   * 이 화면은 탭 네비게이터의 화면이라 다른 책을 열어도 스택 push가 아니라
   * 같은 컴포넌트 인스턴스가 재사용되고 id 파라미터만 바뀐다. 언마운트가 안 되니
   * ScrollView도 그대로 살아 있어 스크롤 위치·미니헤더·절 오프셋이 이전 책 것으로
   * 남아 있다 — id가 바뀔 때마다 이 셋을 직접 처음 상태로 되돌린다.
   */
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setShowMiniHeader(false);
    sectionOffsetsRef.current = {};
  }, [id]);

  // 카탈로그에 없는 id로 들어온 경우. 훅은 위에서 모두 호출한 뒤이므로 안전하다.
  if (!view) return null;

  // ScrollView의 직속 자식을 평평한 배열로 짜면서, 절 제목 자식의 인덱스를 같이 모은다
  // (stickyHeaderIndices에 그대로 넘기기 위해).
  const scrollChildren: React.ReactNode[] = [];
  const stickyHeaderIndices: number[] = [];

  scrollChildren.push(
    <View
      key="hero"
      onLayout={(e) => {
        infoHeightRef.current = e.nativeEvent.layout.height;
      }}>
      <View style={styles.hero}>
        {isSelected && (
          <LinearGradient
            colors={[Colors.blue100, Colors.blue50]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              tintColor={Colors.white}
              size={14}
            />
            <Text style={styles.badgeText}>현재 선택중</Text>
          </LinearGradient>
        )}
        <Image source={view.cover} style={styles.cover} resizeMode="cover" />
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.author}>{view.author}</Text>
        {view.price !== null && <Text style={styles.price}>{formatPrice(view.price)}</Text>}
        {chips.length > 0 && (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <TagChip key={`${chip.variant}-${chip.label}`} {...chip} />
            ))}
          </View>
        )}
        {!isSelected && (
          <ScaleButton
            accessibilityLabel={
              studyBook
                ? `${view.title}을(를) 오늘의 공부로 선택`
                : `${view.title}은(는) 아직 준비중인 콘텐츠`
            }
            style={styles.selectButton}
            onPress={chooseBook}>
            <Text style={styles.selectButtonText}>이 책으로 선택하기</Text>
          </ScaleButton>
        )}
      </View>
    </View>,
  );

  // 문단이 하나도 없거나 전부 공백뿐인 절(노션에 소제목만 있고 본문이 없는 경우, 예:
  // Review)은 제목까지 통째로 걸러낸다. sticky 헤더 인덱스와 스크롤 이동용
  // sectionOffsetsRef는 이 필터링된 배열의 인덱스를 그대로 기준으로 삼아야 어긋나지 않는다.
  const visibleSections = view.sections.filter((section) =>
    section.paragraphs.some((paragraph) => paragraph.trim() !== ''),
  );

  visibleSections.forEach((section, sectionIndex) => {
    stickyHeaderIndices.push(scrollChildren.length);
    scrollChildren.push(
      <Pressable
        key={`section-title-${sectionIndex}`}
        onLayout={(e) => {
          sectionOffsetsRef.current[sectionIndex] = e.nativeEvent.layout.y;
        }}
        onPress={() => scrollToSection(sectionIndex)}
        style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitleText}>{section.title}</Text>
      </Pressable>,
    );
    scrollChildren.push(
      <View key={`section-body-${sectionIndex}`} style={styles.sectionBody}>
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <Text key={paragraphIndex} style={styles.paragraphText}>
            {paragraph}
          </Text>
        ))}
      </View>,
    );
  });

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Animated.View
          pointerEvents={showMiniHeader ? 'auto' : 'none'}
          style={[styles.headerMini, miniHeaderAnimatedStyle]}>
          <Image source={view.cover} style={styles.headerMiniCover} resizeMode="cover" />
          <Text style={styles.headerMiniTitle} numberOfLines={1}>
            {view.title}
          </Text>
        </Animated.View>
        <ScaleButton
          accessibilityLabel="닫기"
          style={styles.headerIconButton}
          onPress={() => router.replace('/bookstore')}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            tintColor={Colors.brown100}
            size={24}
          />
        </ScaleButton>
      </View>

      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={stickyHeaderIndices}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + insets.bottom }]}>
        {scrollChildren}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  headerMini: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  headerMiniCover: {
    width: 32,
    height: 48,
    borderRadius: 2,
  },
  headerMiniTitle: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  headerIconButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  bodyContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    height: 24,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.white,
  },
  cover: {
    width: 140,
    height: 207,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 4,
  },
  title: {
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    letterSpacing: tracking(22),
    color: Colors.brown100,
    textAlign: 'center',
  },
  author: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
    textAlign: 'center',
  },
  price: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  // sticky로 상단에 고정되는 절 제목 — 아래 본문이 비쳐 보이지 않게 불투명 배경을 깔고,
  // 얇은 구분선으로 헤더와 경계를 준다.
  sectionTitleRow: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
  },
  sectionTitleText: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: tracking(18),
    color: Colors.brown100,
  },
  sectionBody: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  paragraphText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: tracking(15),
    color: Colors.brown100,
  },
  selectButton: {
    marginTop: 8,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.brown100,
  },
  selectButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
});
