import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookPreviewModal from "@/components/BookPreviewModal";
import ScaleButton from "@/components/ScaleButton";
import TagChip from "@/components/TagChip";
import { Colors, Fonts, tracking } from "@/constants/theme";
import { useBookSelection } from "@/context/BookSelectionContext";
import { useShelf } from "@/context/ShelfContext";
import { useToast } from "@/context/ToastContext";
import { BOOKSTORE_BOOKS, isMvpBook } from "@/lib/bookstore";
import {
  getCatalogBook,
  getCatalogBookByBookId,
  type CatalogBook,
} from "@/lib/catalog";
import { fieldsOf, seriesOf } from "@/lib/tags";

/** 헤더 미니 표지가 나타날 때 위에서 살짝 내려오는 느낌을 주는 시작 오프셋(px) */
const MINI_SLIDE_OFFSET = 10;

/**
 * 하루 서점의 책 상세 페이지 — 두 종류가 이 화면 하나를 함께 쓴다.
 *
 * 1) 학습 가능한 '하루 시리즈' 9권: 표지가 로컬 에셋이다.
 * 2) 유유출판사 카탈로그의 나머지 책: 표지가 원격 URL이다.
 *
 * 하단 CTA 바는 catalogBook이 있으면 늘 뜨고, 진입 경로(from)로 버튼 역할이 완전히
 * 갈린다 — 하루 서점 쪽에는 '내 서재에 담기'류만, 내 서재 쪽에는 '이 책으로 변경하기'류만
 * 나오고 서로 섞이지 않는다(4갈래 분기는 renderCta 참고):
 * - 하루 서점(from !== 'library')에서는 서재(ShelfContext) 여부로 갈린다. 서재에 없으면
 *   '내 서재에 담기'(누르면 담길 뿐 오늘의 책은 안 바뀐다), 이미 담겼으면 눌러도 아무 일도
 *   안 하는 안내용 비활성 버튼('서재에 담긴 책입니다.')이다.
 * - 내 서재(from === 'library')에서는 오늘의 책 선택 여부로 갈린다. 아직 선택 전이면
 *   '이 책으로 변경하기'. 다만 실제 선택(selectBook)은 학습 콘텐츠가 있는 9권에서만
 *   일어나고, 나머지 268권은 버튼을 눌러도 선택되지 않고 '준비중' 토스트만 뜬다 — 이유는
 *   chooseBook 주석 참고. 이미 선택된 책이면 눌러도 아무 일도 안 하는 비활성 버튼('현재
 *   선택중', 히어로 배지와 같은 파란 그라데이션)이다.
 *
 * 이 화면은 하루 서점과 내 서재 두 탭이 함께 쓴다(라우트 파라미터 from으로 온 곳을 기억해
 * 뒀다가 X·뒤로가기 때 그리로 돌아간다).
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
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId, selectBook } = useBookSelection();
  const { isInShelf, addToShelf, removeFromShelf } = useShelf();
  const { showToast } = useToast();

  // 하루 서점과 내 서재 두 탭에서 들어올 수 있어, 온 곳을 기억해 뒀다가 그리로 돌아간다.
  // from이 없거나 다른 값이면(예: 딥링크) 기존처럼 서점으로 되돌린다.
  const isFromLibrary = from === "library";
  const closeDestination = isFromLibrary ? "/library" : "/bookstore";

  // 학습 가능한 9권이 먼저다 — 그 9권은 카탈로그에도 있지만 표지를 로컬 에셋으로 쓴다.
  const studyBook = BOOKSTORE_BOOKS.find((candidate) => candidate.id === id);
  const catalogBook: CatalogBook | undefined = studyBook
    ? getCatalogBookByBookId(studyBook.id)
    : getCatalogBook(id ?? "");

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
  // 서재의 키는 항상 catalogBook.id(노션 uuid) — 라우트 id는 9권일 때 BookId라 값이 달라
  // 그대로 쓰면 안 된다(catalogBook은 studyBook 여부와 무관하게 항상 계산되어 있다).
  const inShelf = catalogBook ? isInShelf(catalogBook.id) : false;

  // 시리즈 칩을 앞에, 분야 칩을 뒤에 둔다. 학습 가능한 9권도 카탈로그 태그를 그대로 쓴다.
  const tags = catalogBook?.tags ?? [];
  const chips = [
    // 제목 규칙이 걸린 시리즈도 있어서 카탈로그 쪽 제목을 넘긴다(9권은 표기가 조금 다르다).
    ...seriesOf(tags, catalogBook?.title ?? "").map((label) => ({
      label,
      variant: "series" as const,
    })),
    ...fieldsOf(tags).map((label) => ({ label, variant: "field" as const })),
  ];

  /**
   * 안드로이드 뒤로가기(제스처 포함)를 닫기(X)와 같은 동작으로 묶는다.
   *
   * 이 화면은 탭 네비게이터의 형제라서 그냥 두면 뒤로가기가 첫 탭('오늘의 공부')으로
   * 돌아간다 — 탭 네비게이터의 기본 backBehavior가 firstRoute이기 때문이다.
   * 하루 서점·내 서재 어느 쪽에서 왔는지에 따라 closeDestination으로 되돌린다.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace(closeDestination);
          return true;
        },
      );
      return () => subscription.remove();
    }, [router, closeDestination]),
  );

  const chooseBook = () => {
    // selectedBookId는 학습 가능한 9권짜리 BookId 유니온이고, 홈 화면의
    // getTomorrowLesson → getBookCalendar → BUILD_CALENDAR[bookId]()가 이 값을 그대로 키로
    // 쓴다. 카탈로그 전용 책의 id를 selectBook에 넘기면 BUILD_CALENDAR에 없는 키라 홈 화면이
    // 그 자리에서 크래시한다 — 그래서 studyBook이 없을 때는 절대 selectBook을 호출하지 않고
    // 안내 토스트만 띄운다. liberal처럼 9권에는 있지만 아직 MVP가 제공하지 않는 책도 같은 이유로 막는다.
    if (!studyBook || !isMvpBook(studyBook.id)) {
      showToast("MVP에서는 제공하지 않는 콘텐츠입니다.");
      return;
    }
    selectBook(studyBook.id);
    showToast(`선택 완료 — ${studyBook.title}`);
  };

  /** 서재에 담긴 책만 '이 책으로 변경하기'가 뜨므로, 담을 곳(catalogBook)이 없으면 버튼도 렌더하지 않는다. */
  const addBookToShelf = () => {
    if (!catalogBook) return;
    addToShelf(catalogBook.id);
    showToast("선택하신 책이 내 서재에 담겼습니다");
  };

  /** 서재에 담긴 책에만 뜨는 삭제 — catalogBook 없으면(극단적 예외) 아무 일도 안 한다. */
  const removeBookFromShelf = () => {
    if (!catalogBook) return;
    removeFromShelf(catalogBook.id);
    showToast("내 서재에서 삭제했습니다");
  };

  // more 메뉴의 두 옵션 — 기존 동작(previewOpen/removeBookFromShelf)을 그대로 부르고
  // 메뉴만 닫는다.
  const openPreviewFromMenu = () => {
    setMoreMenuOpen(false);
    setPreviewOpen(true);
  };
  const removeBookFromShelfFromMenu = () => {
    setMoreMenuOpen(false);
    removeBookFromShelf();
  };

  /** 실제 결제 연동이 없는 MVP라 구매를 완료 처리하지 않는다 — 왜 안 되는지만 안내한다. */
  const notifyPurchaseUnavailable = () => {
    Alert.alert(
      "아직 준비 중인 기능이에요",
      "MVP 단계라 구현되지 않은 기능이며, 출판사와의 협의가 필요합니다.",
    );
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const infoHeightRef = useRef(0);
  // 절 제목 View의 onLayout에서 채워진다 — ScrollView 콘텐츠 기준 y좌표라 scrollTo에 그대로 쓴다.
  const sectionOffsetsRef = useRef<Record<number, number>>({});
  const [showMiniHeader, setShowMiniHeader] = useState(false);
  // 미리보기 팝업 — 구매/선택 상태와 무관하게 모든 책 상세페이지에서 열 수 있다.
  const [previewOpen, setPreviewOpen] = useState(false);
  // 서재에 담긴 책만 뜨는 more 버튼의 옵션 박스(미리보기/삭제).
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const miniHeaderProgress = useSharedValue(0);

  useEffect(() => {
    miniHeaderProgress.value = withTiming(showMiniHeader ? 1 : 0, {
      duration: 240,
    });
  }, [showMiniHeader, miniHeaderProgress]);

  const miniHeaderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: miniHeaderProgress.value,
    transform: [
      { translateY: (1 - miniHeaderProgress.value) * -MINI_SLIDE_OFFSET },
    ],
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
    setMoreMenuOpen(false);
    sectionOffsetsRef.current = {};
  }, [id]);

  // 카탈로그에 없는 id로 들어온 경우. 훅은 위에서 모두 호출한 뒤이므로 안전하다.
  if (!view) return null;

  /**
   * 하단 CTA의 내용을 만든다 — 진입 경로(from)마다 버튼이 하는 일이 완전히 다르므로
   * (하루 서점=서재 담기, 내 서재=오늘의 책 선택) 한 갈래가 다른 갈래의 문구를 절대
   * 빌려 쓰지 않게 if로 4갈래를 명시적으로 나눈다. 비활성 상태(눌러도 아무 일도 안 함)는
   * ScaleButton으로 감싸지 않는다 — 눌리지 않는데 Pressable을 씌우면 스크린리더가
   * 버튼으로 잘못 읽는다.
   */
  const renderCta = () => {
    if (isFromLibrary) {
      if (isSelected) {
        return (
          <LinearGradient
            colors={[Colors.blue100, Colors.blue50]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBase}
          >
            <SymbolView
              name={{ ios: "checkmark", android: "check", web: "check" }}
              tintColor={Colors.white}
              size={18}
            />
            <Text style={styles.selectButtonText}>현재 선택중</Text>
          </LinearGradient>
        );
      }
      return (
        <ScaleButton
          accessibilityLabel={
            studyBook && isMvpBook(studyBook.id)
              ? `${view.title}을(를) 오늘의 공부로 선택`
              : `${view.title}은(는) MVP에서 제공하지 않는 콘텐츠`
          }
          style={styles.selectButton}
          onPress={chooseBook}
        >
          <SymbolView
            name={{
              ios: "arrow.triangle.2.circlepath",
              android: "sync",
              web: "sync",
            }}
            tintColor={Colors.white}
            size={18}
          />
          <Text style={styles.selectButtonText}>이 책으로 변경하기</Text>
        </ScaleButton>
      );
    }

    if (inShelf) {
      return (
        <View style={styles.ctaDisabled}>
          <Text style={styles.ctaDisabledText}>서재에 담긴 책입니다.</Text>
        </View>
      );
    }
    return (
      <ScaleButton
        accessibilityLabel={`${view.title}을(를) 내 서재에 담기`}
        style={styles.selectButton}
        onPress={addBookToShelf}
      >
        <Text style={styles.selectButtonText}>내 서재에 담기</Text>
      </ScaleButton>
    );
  };

  const goToLibraryBook = () => {
    if (!catalogBook) return;
    router.push({
      pathname: "/book/[id]",
      params: { id: catalogBook.bookId ?? catalogBook.id, from: "library" },
    });
  };

  const renderHeroButtons = () => {
    if (isFromLibrary) return null;
    if (inShelf) {
      return (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={[styles.heroButton, styles.shelfStatusButton]}
          >
            <Text style={styles.heroButtonText}>서재에 담은 책입니다</Text>
          </Pressable>
          <ScaleButton
            accessibilityLabel={`${view.title} 내 서재 상세페이지로 이동`}
            style={[styles.heroButton, styles.goToLibraryButton]}
            onPress={goToLibraryBook}
          >
            <Text style={[styles.heroButtonText, styles.goToLibraryButtonText]}>보러가기</Text>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
              tintColor={Colors.brown100}
              size={18}
            />
          </ScaleButton>
        </>
      );
    }
    return (
      <>
        <ScaleButton
          accessibilityLabel={`${view.title}을(를) 내 서재에 담기`}
          style={[styles.heroButton, styles.addShelfButton]}
          onPress={addBookToShelf}
        >
          <SymbolView
            name={{ ios: "bookmark", android: "bookmark_border", web: "bookmark_border" }}
            tintColor={Colors.white}
            size={18}
          />
          <Text style={styles.heroButtonText}>내 서재에 담기</Text>
        </ScaleButton>
        <ScaleButton
          accessibilityLabel="미리보기"
          style={[styles.heroButton, styles.previewButton]}
          onPress={() => setPreviewOpen(true)}
        >
          <SymbolView
            name={{ ios: "eye", android: "visibility", web: "visibility" }}
            tintColor={Colors.brown50}
            size={18}
          />
          <Text style={[styles.heroButtonText, styles.previewButtonText]}>미리보기</Text>
        </ScaleButton>
      </>
    );
  };

  // ScrollView의 직속 자식을 평평한 배열로 짜면서, 절 제목 자식의 인덱스를 같이 모은다
  // (stickyHeaderIndices에 그대로 넘기기 위해).
  const scrollChildren: React.ReactNode[] = [];
  const stickyHeaderIndices: number[] = [];

  scrollChildren.push(
    <View
      key="hero"
      onLayout={(e) => {
        infoHeightRef.current = e.nativeEvent.layout.height;
      }}
    >
      <View style={styles.hero}>
        {/* '현재 선택중' 배지는 하단 CTA(renderCta)가 같은 문구·같은 그라데이션으로
            대신한다 — 히어로 상단에 또 띄우면 같은 상태를 두 번 말하게 된다. */}
        <Image source={view.cover} style={styles.cover} resizeMode="cover" />
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.author}>{view.author}</Text>
        {chips.length > 0 && (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <TagChip key={`${chip.variant}-${chip.label}`} detail {...chip} />
            ))}
          </View>
        )}
        <View style={styles.buttonRow}>{renderHeroButtons()}</View>
      </View>
    </View>,
  );

  // 문단이 하나도 없거나 전부 공백뿐인 절(노션에 소제목만 있고 본문이 없는 경우, 예:
  // Review)은 제목까지 통째로 걸러낸다. sticky 헤더 인덱스와 스크롤 이동용
  // sectionOffsetsRef는 이 필터링된 배열의 인덱스를 그대로 기준으로 삼아야 어긋나지 않는다.
  const visibleSections = view.sections.filter((section) =>
    section.paragraphs.some((paragraph) => paragraph.trim() !== ""),
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
        style={styles.sectionTitleRow}
      >
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
    <>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Animated.View
            pointerEvents={showMiniHeader ? "auto" : "none"}
            style={[styles.headerMini, miniHeaderAnimatedStyle]}
          >
            <Image
              source={view.cover}
              style={styles.headerMiniCover}
              resizeMode="cover"
            />
            <Text style={styles.headerMiniTitle} numberOfLines={1}>
              {view.title}
            </Text>
          </Animated.View>
          <ScaleButton
            accessibilityLabel="닫기"
            style={styles.headerIconButton}
            onPress={() => router.replace(closeDestination)}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={Colors.brown100}
              size={24}
            />
          </ScaleButton>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={stickyHeaderIndices}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: 40 + insets.bottom },
          ]}
        >
          {scrollChildren}
        </ScrollView>

        {/* 스크롤과 무관하게 화면 하단에 고정되는 CTA 영역 — header와 마찬가지로 ScrollView의
            형제라 absolute 없이도 flexbox가 알아서 하단에 붙여 준다. catalogBook이 없으면
            담을 곳도 선택할 곳도 없으니(renderCta가 그릴 게 없다) 그때만 빈 띠가 남지 않게
            렌더하지 않는다 — 내 서재에서 isSelected여도 '현재 선택중' 비활성 버튼을
            보여줘야 하므로 더 이상 isSelected로 영역 자체를 숨기지 않는다.
            세이프에어리어 하단 패딩은 바깥 래퍼가 갖는다 — inShelf일 때 그 아래 삭제 링크가
            추가돼도 총 여백은 그대로고, ctaBar(CTA+미리보기 한 줄)의 모양은 전혀 안 바뀐다. */}
        {catalogBook && (
          <View
            style={[styles.ctaFooter, { paddingBottom: 12 + insets.bottom }]}
          >
            <View style={styles.ctaBar}>
              {renderCta()}

              {/* 서재에 담긴 책은 미리보기 버튼이 more 버튼으로 바뀐다 — 미리보기와
                  삭제를 그 위 옵션 박스(moreMenuOpen)로 모아 보여준다. 서재에 없으면
                  기존 미리보기 버튼 그대로. */}
              {inShelf ? (
                <ScaleButton
                  accessibilityLabel={moreMenuOpen ? "더보기 닫기" : "더보기"}
                  style={styles.moreButton}
                  onPress={() => setMoreMenuOpen((open) => !open)}
                >
                  <SymbolView
                    name={{ ios: "ellipsis", android: "more_vert", web: "more_vert" }}
                    tintColor={Colors.brown100}
                    size={20}
                  />
                </ScaleButton>
              ) : (
                <ScaleButton
                  accessibilityLabel="미리보기"
                  style={styles.previewButton}
                  onPress={() => setPreviewOpen(true)}
                >
                  <Text style={styles.previewButtonText}>미리보기</Text>
                </ScaleButton>
              )}
            </View>
          </View>
        )}

        {/* more 버튼 위 옵션 박스. 화면 전체를 덮는 투명한 Pressable로 바깥을 눌러도
            닫히게 하고, 흰 박스는 그 위에서 more 버튼 바로 위쪽에 자리 잡는다.
            ctaFooter/ctaBar의 padding·height 상수(12+insets.bottom, 12, 52)로
            more 버튼 위치를 그대로 계산한다 — onLayout 측정 없이도 정확히 겹친다. */}
        {inShelf && moreMenuOpen && (
          <>
            <Pressable
              accessibilityLabel="옵션 닫기"
              style={styles.moreMenuBackdrop}
              onPress={() => setMoreMenuOpen(false)}
            />
            <View
              style={[
                styles.moreMenuBox,
                { bottom: insets.bottom + 12 + 52 + 8 },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="미리보기"
                style={styles.moreMenuItem}
                onPress={openPreviewFromMenu}
              >
                <SymbolView
                  name={{ ios: "eye", android: "visibility", web: "visibility" }}
                  tintColor={Colors.brown100}
                  size={18}
                />
                <Text style={styles.moreMenuItemText}>미리보기</Text>
              </Pressable>
              <View style={styles.moreMenuDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${view.title}을(를) 내 서재에서 삭제`}
                style={styles.moreMenuItem}
                onPress={removeBookFromShelfFromMenu}
              >
                <SymbolView
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  tintColor={Colors.red100}
                  size={18}
                />
                <Text style={[styles.moreMenuItemText, styles.moreMenuDeleteText]}>
                  내 서재에서 삭제하기
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
      <BookPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

// CTA 바의 버튼 4종(활성 2 + 비활성 2)이 상태에 따라 자리를 서로 바꿔 끼우므로, 크기·모양을
// 여기 하나로 묶어 상태가 바뀌어도 레이아웃이 흔들리지 않게 한다. StyleSheet.create 안에서는
// 같은 객체 리터럴의 다른 키를 참조할 수 없어 바깥에 따로 뺐다.
interface LegacyLibraryDetailProps {
  catalogId: string;
  title: string;
  author: string;
  cover: ImageSourcePropType;
  chips: Array<{ label: string; variant: "series" | "field" }>;
  onChangeBook: () => void;
}

// 공부 진도 — 책마다 실제 총 페이지수를 아직 안 갖고 있어(카탈로그의 pages는 "336쪽"
// 같은 문자열이라 책마다 제각각이고 신뢰하기 어렵다), MVP 동안은 모든 책을 320p로,
// 진행 그리드는 320p에 맞춘 칸 수 대신 딱 200칸으로 고정한다 — 둘 다 나중에 책별 실제
// 데이터가 생기면 그 값으로 바꾸면 된다.
const MVP_TOTAL_PAGES = 320;
const PROGRESS_DOT_COUNT = 200;
const PROGRESS_DOT_DONE = 0;

function LegacyLibraryDetail({
  catalogId,
  title,
  author,
  cover,
  chips,
  onChangeBook,
}: LegacyLibraryDetailProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { removeFromShelf } = useShelf();
  const { showToast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const removeBook = () => {
    if (!catalogId) return;
    removeFromShelf(catalogId);
    showToast("내 서재에서 삭제했습니다");
    router.replace("/library");
  };

  return (
    <>
      <View style={libraryStyles.screen}>
        <View style={[libraryStyles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={libraryStyles.headerTitle}>내 서재</Text>
          <ScaleButton
            accessibilityLabel="내 서재로 돌아가기"
            style={libraryStyles.closeButton}
            onPress={() => router.replace("/library")}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={Colors.brown100}
              size={24}
            />
          </ScaleButton>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        >
          {/* 책 info — 표지+제목/저자/태그가 가로로 나란히, 그 아래 버튼 줄. Figma의
              "책 info" 프레임과 동일하게 이 블록만 자체 좌우 padding(20)을 갖는다 —
              아래 카드 목록은 padding이 8로 훨씬 좁다. */}
          <View style={libraryStyles.hero}>
            <View style={libraryStyles.coverRow}>
              <Image source={cover} style={libraryStyles.cover} resizeMode="cover" />
              <View style={libraryStyles.infoColumn}>
                <Text style={libraryStyles.title}>{title}</Text>
                <Text style={libraryStyles.author}>{author}</Text>
                <View style={libraryStyles.chips}>
                  {chips.map((chip) => (
                    <TagChip key={`${chip.variant}-${chip.label}`} detail {...chip} />
                  ))}
                </View>
              </View>
            </View>

            <View style={libraryStyles.buttonRow}>
              <ScaleButton
                accessibilityLabel={`${title} 오늘의 책으로 변경하기`}
                style={[libraryStyles.actionButton, libraryStyles.changeButton]}
                onPress={onChangeBook}
              >
                <SymbolView
                  name={{ ios: "arrow.triangle.2.circlepath", android: "sync", web: "sync" }}
                  tintColor={Colors.white}
                  size={18}
                />
                <Text style={libraryStyles.changeButtonText}>이 책으로 변경하기</Text>
              </ScaleButton>
              <ScaleButton
                accessibilityLabel="미리보기"
                style={[libraryStyles.actionButton, libraryStyles.previewButton]}
                onPress={() => setPreviewOpen(true)}
              >
                <Text style={libraryStyles.previewButtonText}>미리보기</Text>
              </ScaleButton>
              <ScaleButton
                accessibilityLabel={moreMenuOpen ? "더보기 닫기" : "더보기"}
                style={[libraryStyles.actionButton, libraryStyles.moreButton]}
                onPress={() => setMoreMenuOpen((open) => !open)}
              >
                <SymbolView
                  name={{ ios: "ellipsis", android: "more_vert", web: "more_vert" }}
                  tintColor={Colors.brown100}
                  size={20}
                />
              </ScaleButton>
            </View>

            {moreMenuOpen && (
              <View style={libraryStyles.moreMenu}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="내 서재에서 삭제하기"
                  style={libraryStyles.moreMenuItem}
                  onPress={removeBook}
                >
                  <SymbolView
                    name={{ ios: "trash", android: "delete", web: "delete" }}
                    tintColor={Colors.red100}
                    size={18}
                  />
                  <Text style={libraryStyles.deleteText}>내 서재에서 삭제하기</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={libraryStyles.cardList}>
            {/* 독서 기록 — 다른 카드처럼 값 하나가 아니라 문장 한 줄 + 구분선으로 나눈
                통계 한 줄이라 LibraryStatCard 대신 직접 그린다. */}
            <View style={libraryStyles.card}>
              <Text style={libraryStyles.cardTitle}>독서 기록</Text>
              <Text style={libraryStyles.readingSentence}>0일 동안 이 책을 읽었어요.</Text>
              <View style={libraryStyles.readingStatsRow}>
                <Text style={libraryStyles.readingStatText}>총 0시간 0분</Text>
                <View style={libraryStyles.readingStatDivider} />
                <Text style={libraryStyles.readingStatText}>0p</Text>
                <View style={libraryStyles.readingStatDivider} />
                <Text style={libraryStyles.readingStatText}>0일 독서</Text>
              </View>
            </View>

            <LibraryStatCard
              title="공부 진도"
              value="0p"
              note={`(총 ${MVP_TOTAL_PAGES}p)`}
              buttonLabel="빼먹은 진도 채우기"
            >
              <ProgressDotGrid total={PROGRESS_DOT_COUNT} done={PROGRESS_DOT_DONE} />
            </LibraryStatCard>

            <LibraryStatCard
              title="퀴즈 정답률"
              value="0%"
              note="(아직 푼 퀴즈가 없어요)"
              buttonLabel="틀린 문제 보러가기"
            />

            <LibraryStatCard title="독서 노트" value="0개" buttonLabel="기록한 노트 보기" />

            <View style={libraryStyles.card}>
              <Text style={libraryStyles.cardTitle}>마지막으로 책갈피 끼워둔 날</Text>
              <Text style={libraryStyles.emptyBookmark}>아직 읽지 않은 책이에요</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

function LibraryStatCard({
  title,
  value,
  note,
  buttonLabel,
  children,
}: {
  title: string;
  value?: string;
  note?: string;
  buttonLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={libraryStyles.card}>
      <Text style={libraryStyles.cardTitle}>{title}</Text>
      {value && (
        <View style={libraryStyles.valueRow}>
          <Text style={libraryStyles.cardValue}>{value}</Text>
          {note && <Text style={libraryStyles.cardNote}>{note}</Text>}
        </View>
      )}
      {children}
      {buttonLabel && (
        <Pressable style={libraryStyles.cardButton}>
          <Text style={libraryStyles.cardButtonText}>{buttonLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 공부 진도의 더미 진행 그리드 — done개는 초록, 나머지는 회색 사각형. */
function ProgressDotGrid({ total, done }: { total: number; done: number }) {
  return (
    <View style={libraryStyles.dotGrid}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[libraryStyles.dot, index < done && libraryStyles.dotDone]}
        />
      ))}
    </View>
  );
}

const libraryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 18,
    letterSpacing: tracking(18),
    color: Colors.brown100,
  },
  closeButton: { width: 41, height: 41, borderRadius: 20.5, alignItems: "center", justifyContent: "center" },
  // 책 info 블록 — 표지+텍스트 줄, 버튼 줄 순서로 세로 gap 20, 자체 좌우 padding 20,
  // 아래 카드 목록과 얇은 구분선으로 나뉜다(Figma 원래 색 #F4F0F7는 팔레트에 없어
  // 앱이 이미 구분선으로 쓰는 brown10으로 대체).
  hero: {
    gap: 20,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
  },
  coverRow: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  cover: {
    width: 95,
    height: 140,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoColumn: { flex: 1, gap: 12, paddingTop: 20 },
  title: { fontFamily: Fonts.semiBold, fontSize: 22, letterSpacing: tracking(22), color: Colors.brown100 },
  author: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  buttonRow: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center" },
  actionButton: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingHorizontal: 20 },
  changeButton: { flex: 1, backgroundColor: Colors.beige100 },
  changeButtonText: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.white },
  previewButton: { backgroundColor: Colors.brown100 },
  previewButtonText: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.white },
  moreButton: { width: 40, paddingHorizontal: 0, borderWidth: 1, borderColor: Colors.brown10, backgroundColor: Colors.white },
  moreMenu: { alignSelf: "stretch", backgroundColor: Colors.white, borderRadius: 10, shadowColor: Colors.brown100, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  moreMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  deleteText: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.red100 },
  // 카드 목록 — 화면 padding이 hero 블록(20)보다 훨씬 좁다(8). 카드 사이 gap 20.
  cardList: { paddingHorizontal: 8, paddingTop: 8, gap: 20 },
  card: { gap: 8, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 20, backgroundColor: Colors.white },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.brown100, paddingBottom: 8 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  cardValue: { fontFamily: Fonts.semiBold, fontSize: 20, letterSpacing: tracking(20), color: Colors.brown100 },
  cardNote: { fontFamily: Fonts.regular, fontSize: 15, letterSpacing: tracking(15), color: Colors.brown100 },
  readingSentence: { fontFamily: Fonts.semiBold, fontSize: 20, letterSpacing: tracking(20), color: Colors.brown100 },
  readingStatsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readingStatText: { fontFamily: Fonts.regular, fontSize: 15, letterSpacing: tracking(15), color: Colors.brown100 },
  readingStatDivider: { width: 1, height: 12, backgroundColor: Colors.brown10 },
  // 공부 진도의 더미 진행 그리드 — 완료 칸은 green100(Figma 원래 색 #34C759는 팔레트에
  // 없어 지정 팔레트의 green100으로 대체), 미완료 칸은 brown10(Figma와 동일한 색).
  dotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 4 },
  dot: { width: 8, height: 8, backgroundColor: Colors.brown10 },
  dotDone: { backgroundColor: Colors.green100 },
  cardButton: {
    alignSelf: "flex-start",
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.brown50,
  },
  cardButtonText: { fontFamily: Fonts.semiBold, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
  emptyBookmark: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
});

const ctaSize: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  gap: 6,
  height: 52,
  paddingHorizontal: 20,
  borderRadius: 26,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
  },
  headerMini: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
  scrollView: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg,
  },
  subhero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  buyCard: {
    gap: 12,
    padding: 20,
    backgroundColor: Colors.brown10,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  heroButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 26,
  },
  heroButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  addShelfButton: {
    backgroundColor: Colors.brown100,
  },
  shelfStatusButton: {
    backgroundColor: Colors.brown50,
  },
  goToLibraryButton: {
    borderWidth: 1,
    borderColor: Colors.brown100,
    backgroundColor: Colors.white,
  },
  goToLibraryButtonText: {
    color: Colors.brown100,
  },
  price: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(15),
    color: Colors.brown100,
    textAlign: "center",
  },
  buyButton: {
    width: "100%",
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: Colors.beige100,
  },
  buyButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  buyHint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
    textAlign: "center",
    marginTop: 8,
    width: "100%",
    alignSelf: "stretch",
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
    marginTop: 4,
    fontFamily: Fonts.semiBold,
    fontSize: 22,
    letterSpacing: tracking(22),
    color: Colors.brown100,
    textAlign: "center",
  },
  author: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
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
  // 화면 하단에 고정되는 CTA 영역 전체를 감싸는 래퍼 — 세이프에어리어 하단 패딩은
  // 여기서 한 번만 준다(ctaBar 아래에 삭제 링크가 붙어도 총 여백이 흔들리지 않게).
  ctaFooter: {
    display: "none",
    backgroundColor: Colors.bg,
  },
  // CTA 바 — sticky 절 제목 구분선과 같은 톤의 얇은 위쪽 경계선으로 스크롤 영역과 구분한다.
  ctaBar: {
    flexDirection: "row",
    backgroundColor: Colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  // more 버튼 위 옵션 박스를 열었을 때 화면 전체를 덮는 투명 배경 — 탭하면 닫힌다.
  // 화면 루트(screen)의 기본 position:relative를 기준으로 꽉 채운다.
  moreMenuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  moreMenuBox: {
    position: "absolute",
    right: 20,
    minWidth: 208,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  moreMenuItemText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  moreMenuDeleteText: {
    color: Colors.red100,
  },
  moreMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.brown10,
    marginHorizontal: 12,
  },
  ctaBase: ctaSize,
  selectButton: {
    ...ctaSize,
    backgroundColor: Colors.beige100,
  },
  selectButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(14),
    color: Colors.white,
  },
  // 눌러도 아무 일도 하지 않는 안내용 버튼(하루 서점에서 이미 서재에 담긴 책) — 옅은 회색으로
  // 활성 버튼과 시각적으로 구분한다.
  ctaDisabled: {
    ...ctaSize,
    backgroundColor: Colors.brown10,
  },
  ctaDisabledText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown50,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: Colors.brown50,
    backgroundColor: Colors.white,
  },
  previewButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  moreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.brown10,
    backgroundColor: Colors.white,
  },
});
