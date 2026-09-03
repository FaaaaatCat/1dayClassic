import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookPreviewModal from "@/components/BookPreviewModal";
import ScaleButton from "@/components/ScaleButton";
import { StatusBarTint } from "@/components/StatusBarTint";
import TagChip from "@/components/TagChip";
import { Colors, Corner, Elevation, Feedback, Ink, Spark, Surface, Type, TypeScale, trackBody, trackDisplay } from '@/constants/theme';
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

/**
 * 하루 서점의 책 상세 페이지 — 두 종류가 이 화면 하나를 함께 쓴다.
 *
 * 1) 학습 가능한 '하루 시리즈': 표지가 로컬 에셋이다(듣기의 말들만 아직 URL이다).
 * 2) 유유출판사 카탈로그의 나머지 책: 표지가 원격 URL이다.
 *
 * 화면 전체가 warm taupe(Surface.card) 한 색이다 — 헤더·본문·하단 바가 모두 같은 종이라,
 * 나뉘는 자리는 색이 아니라 얇은 선 하나가 맡는다.
 *
 * 헤더는 60px 한 줄이다: 왼쪽 뒤로가기, 가운데 '책 정보', 오른쪽 미리보기. 미리보기는
 * 예전에 하단 CTA 옆에 있었는데, 아래 자리를 '읽을 책에 추가하기' 하나에 통째로 내주고
 * 위로 올라왔다. 다만 MVP에서는 아직 팝업을 열지 않고 안내 토스트만 띄운다(openPreview).
 *
 * 하단 CTA 바는 catalogBook이 있으면 늘 뜨고, 화면 폭을 꽉 채운 버튼 하나다. 진입
 * 경로(from)로 버튼 역할이 완전히 갈린다 — 하루 서점 쪽에는 '읽을 책에 추가하기'류만,
 * 내 서재 쪽에는 '이 책으로 변경하기'류만 나오고 서로 섞이지 않는다(4갈래 분기는
 * renderCta 참고):
 * - 하루 서점(from !== 'library')에서는 서재(ShelfContext) 여부로 갈린다. 서재에 없으면
 *   '읽을 책에 추가하기'(누르면 담길 뿐 오늘의 책은 안 바뀐다), 이미 담겼으면 눌러도 아무
 *   일도 안 하는 안내용 비활성 버튼('내 서재에 추가된 책입니다.')이다.
 * - 내 서재(from === 'library')에서는 오늘의 책 선택 여부로 갈린다. 아직 선택 전이면
 *   '이 책으로 변경하기'. 다만 실제 선택(selectBook)은 학습 콘텐츠가 있는 책에서만
 *   일어나고, 나머지 268권은 버튼을 눌러도 선택되지 않고 '준비중' 토스트만 뜬다 — 이유는
 *   chooseBook 주석 참고. 이미 선택된 책이면 눌러도 아무 일도 안 하는 비활성 버튼('현재
 *   선택중')이다.
 *
 * 서재에서 빼는 일은 이 화면이 하지 않는다 — 내 서재 → 책 정보(LibraryBookDetailScreen)의
 * 더보기에만 둔다. 여기는 담는 화면이라 담기 하나만 있는 편이 읽기 쉽다.
 *
 * 표지·저자·정가·상세 절은 두 종류가 같은 모양이라, 아래에서 view라는 한 덩어리로 합쳐 둔다.
 *
 * 상세 내용은 노션 절(sections) 순서 그대로 반복 렌더한다. 절 제목은 고정하지 않고
 * 본문과 같이 흘러가며, 앞 절과 나뉘는 자리는 제목 위에 그은 선 하나가 맡는다. 절 제목을
 * 누르면 그 절로 스크롤 이동한다.
 */
export default function BookDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId, selectBook } = useBookSelection();
  const { isInShelf, addToShelf } = useShelf();
  const { showToast } = useToast();

  // 하루 서점과 내 서재 두 탭에서 들어올 수 있어, 온 곳을 기억해 뒀다가 그리로 돌아간다.
  // from이 없거나 다른 값이면(예: 딥링크) 기존처럼 서점으로 되돌린다.
  const isFromLibrary = from === "library";
  const closeDestination = isFromLibrary ? "/library" : "/bookstore";

  // 학습 가능한 책이 먼저다 — 그 책들은 카탈로그에도 있지만 표지를 로컬 에셋으로 쓴다.
  const studyBook = BOOKSTORE_BOOKS.find((candidate) => candidate.id === id);
  const catalogBook: CatalogBook | undefined = studyBook
    ? getCatalogBookByBookId(studyBook.id)
    : getCatalogBook(id ?? "");

  const view = studyBook
    ? {
        title: studyBook.title,
        author: studyBook.author,
        cover: { uri: studyBook.coverImage },
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
  // 서재의 키는 항상 catalogBook.id(노션 uuid) — 라우트 id는 학습 가능한 책일 때 BookId라 값이 달라
  // 그대로 쓰면 안 된다(catalogBook은 studyBook 여부와 무관하게 항상 계산되어 있다).
  const inShelf = catalogBook ? isInShelf(catalogBook.id) : false;

  // 시리즈 칩을 앞에, 분야 칩을 뒤에 둔다. 학습 가능한 책도 카탈로그 태그를 그대로 쓴다.
  const tags = catalogBook?.tags ?? [];
  const chips = [
    // 제목 규칙이 걸린 시리즈도 있어서 카탈로그 쪽 제목을 넘긴다(표기가 조금 다르다).
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
    // selectedBookId는 학습 가능한 BookId 유니온이고, 홈 화면의
    // getTomorrowLesson → getBookCalendar → BUILD_CALENDAR[bookId]()가 이 값을 그대로 키로
    // 쓴다. 카탈로그 전용 책의 id를 selectBook에 넘기면 BUILD_CALENDAR에 없는 키라 홈 화면이
    // 그 자리에서 크래시한다 — 그래서 studyBook이 없을 때는 절대 selectBook을 호출하지 않고
    // 안내 토스트만 띄운다. liberal처럼 학습 가능한 책에는 있지만 아직 MVP가 제공하지 않는 책도 같은 이유로 막는다.
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

  const scrollViewRef = useRef<ScrollView>(null);
  // 절 제목 View의 onLayout에서 채워진다 — ScrollView 콘텐츠 기준 y좌표라 scrollTo에 그대로 쓴다.
  const sectionOffsetsRef = useRef<Record<number, number>>({});
  /**
   * 미리보기 팝업 — 지금은 열리지 않는다.
   *
   * MVP에서 이 기능을 아직 내보내지 않기로 해서, 헤더의 미리보기 버튼은 팝업 대신 안내
   * 토스트만 띄운다. 팝업(BookPreviewModal)과 이 상태는 그대로 둔다 — 기능을 되살릴 때
   * openPreview를 setPreviewOpen(true)로 되돌리면 그만이다.
   */
  const [previewOpen, setPreviewOpen] = useState(false);
  const openPreview = () => showToast("MVP에선 제공되지 않는 기능입니다");

  const scrollToSection = (sectionIndex: number) => {
    const y = sectionOffsetsRef.current[sectionIndex];
    if (y === undefined) return;
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  /**
   * 이 화면은 탭 네비게이터의 화면이라 다른 책을 열어도 스택 push가 아니라
   * 같은 컴포넌트 인스턴스가 재사용되고 id 파라미터만 바뀐다. 언마운트가 안 되니
   * ScrollView도 그대로 살아 있어 스크롤 위치·절 오프셋이 이전 책 것으로 남아 있다 —
   * id가 바뀔 때마다 둘 다 직접 처음 상태로 되돌린다.
   */
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
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
          // 채워진 버튼은 검정 하나뿐이다 — 예전의 파랑 그라데이션은 이 시스템에 없다.
          <View style={[styles.ctaButton, styles.ctaFilled]}>
            <Ionicons name="checkmark" color={Ink.onDark} size={18} />
            <Text style={styles.ctaButtonText}>현재 선택중</Text>
          </View>
        );
      }
      return (
        <ScaleButton
          accessibilityLabel={
            studyBook && isMvpBook(studyBook.id)
              ? `${view.title}을(를) 오늘의 공부로 선택`
              : `${view.title}은(는) MVP에서 제공하지 않는 콘텐츠`
          }
          style={[styles.ctaButton, styles.ctaFilled]}
          onPress={chooseBook}
        >
          <Ionicons
            name="sync"
            color={Ink.onDark}
            size={18}
          />
          <Text style={styles.ctaButtonText}>이 책으로 변경하기</Text>
        </ScaleButton>
      );
    }

    if (inShelf) {
      return (
        <View style={[styles.ctaButton, styles.ctaDone]}>
          <Text style={styles.ctaButtonText}>내 서재에 추가된 책입니다.</Text>
        </View>
      );
    }
    return (
      <ScaleButton
        accessibilityLabel={`${view.title}을(를) 읽을 책에 추가`}
        style={[styles.ctaButton, styles.ctaAdd]}
        onPress={addBookToShelf}
      >
        <Ionicons name="add" color={Ink.onDark} size={18} />
        <Text style={styles.ctaButtonText}>읽을 책에 추가하기</Text>
      </ScaleButton>
    );
  };

  // ScrollView의 직속 자식을 평평한 배열로 짠다 — 절 제목과 본문이 번갈아 들어간다.
  const scrollChildren: React.ReactNode[] = [];

  scrollChildren.push(
    <View key="hero" style={styles.hero}>
      {/* '현재 선택중' 배지는 하단 CTA(renderCta)가 같은 문구로 대신한다 — 히어로 상단에
          또 띄우면 같은 상태를 두 번 말하게 된다. 버튼도 여기 두지 않는다: 담기는 하단
          고정 바로, 미리보기는 헤더로 갔다. */}
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
    </View>,
  );

  // 문단이 하나도 없거나 전부 공백뿐인 절(노션에 소제목만 있고 본문이 없는 경우, 예:
  // Review)은 제목까지 통째로 걸러낸다. 스크롤 이동용 sectionOffsetsRef는 이 필터링된
  // 배열의 인덱스를 그대로 기준으로 삼아야 어긋나지 않는다.
  const visibleSections = view.sections.filter((section) =>
    section.paragraphs.some((paragraph) => paragraph.trim() !== ""),
  );

  visibleSections.forEach((section, sectionIndex) => {
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
        {/* 상태바도 종이와 같은 warm taupe로 — 다르게 두면 화면 맨 위에 띠 한 줄이 남는다. */}
        <StatusBarTint tint={{ color: Surface.card, icons: "dark" }} />

        {/* 헤더 60px 한 줄 — 뒤로가기·제목·미리보기. 제목은 좌우 버튼 폭에 밀리지 않게
            절대 위치로 가운데에 못 박는다. */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top, height: 60 + insets.top },
          ]}
        >
          <ScaleButton
            accessibilityLabel="뒤로"
            style={styles.headerIconButton}
            onPress={() => router.replace(closeDestination)}
          >
            <Ionicons name="chevron-back" color={Ink.primary} size={24} />
          </ScaleButton>
          <View style={styles.headerTitleSlot} pointerEvents="none">
            <Text style={styles.headerTitle}>책 정보</Text>
          </View>
          <ScaleButton
            accessibilityLabel="미리보기"
            style={styles.headerPreviewButton}
            onPress={openPreview}
          >
            <Text style={styles.headerPreviewText}>미리보기</Text>
          </ScaleButton>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: 40 },
          ]}
        >
          {scrollChildren}
        </ScrollView>

        {/* 스크롤과 무관하게 화면 하단에 고정되는 CTA 영역 — header와 마찬가지로 ScrollView의
            형제라 absolute 없이도 flexbox가 알아서 하단에 붙여 준다(본문이 이 띠 뒤로
            숨지 않는 것도 그래서다). catalogBook이 없으면 담을 곳도 선택할 곳도 없으니
            (renderCta가 그릴 게 없다) 그때만 빈 띠가 남지 않게 렌더하지 않는다 — 내
            서재에서 isSelected여도 '현재 선택중' 비활성 버튼을 보여줘야 하므로 더 이상
            isSelected로 영역 자체를 숨기지 않는다. */}
        {catalogBook && (
          <View style={[styles.ctaFooter, { paddingBottom: 8 + insets.bottom }]}>
            {renderCta()}
          </View>
        )}
      </View>
      <BookPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

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
            <Ionicons
              name="close"
              color={Ink.primary}
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
                <Ionicons
                  name="sync"
                  color={Surface.canvas}
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
                <Ionicons
                  name="ellipsis-vertical"
                  color={Ink.primary}
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
                  <Ionicons
                    name="trash-outline"
                    color={Feedback.wrong}
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
  screen: { flex: 1, backgroundColor: Surface.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Surface.canvas,
  },
  headerTitle: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    letterSpacing: trackBody(18),
    color: Ink.primary,
  },
  closeButton: { width: 41, height: 41, borderRadius: Corner.pill, alignItems: "center", justifyContent: "center" },
  // 책 info 블록 — 표지+텍스트 줄, 버튼 줄 순서로 세로 gap 20, 자체 좌우 padding 20,
  // 아래 카드 목록과 얇은 구분선으로 나뉜다(Figma 원래 색 #F4F0F7는 팔레트에 없어
  // 앱이 이미 구분선으로 쓰는 brown10으로 대체).
  hero: {
    gap: 20,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Surface.plate,
  },
  coverRow: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  cover: {
    width: 95,
    height: 140,
    borderRadius: 2,
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  infoColumn: { flex: 1, gap: 12, paddingTop: 20 },
  title: { fontFamily: Type.readingBold, fontSize: 22, letterSpacing: trackDisplay(22), color: Ink.primary },
  author: { fontFamily: Type.ui, fontSize: 14, letterSpacing: trackBody(14), color: Ink.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  buttonRow: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center" },
  actionButton: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: Corner.pill, paddingHorizontal: 20 },
  changeButton: { flex: 1, backgroundColor: Ink.strong },
  changeButtonText: { fontFamily: Type.uiMedium, fontSize: 15, letterSpacing: trackBody(15), color: Surface.canvas },
  previewButton: { backgroundColor: Ink.primary },
  previewButtonText: { fontFamily: Type.uiMedium, fontSize: 15, letterSpacing: trackBody(15), color: Surface.canvas },
  moreButton: { width: 40, paddingHorizontal: 0, borderWidth: 1, borderColor: Surface.plate, backgroundColor: Surface.canvas },
  moreMenu: { alignSelf: "stretch", backgroundColor: Surface.canvas, borderRadius: Corner.small, borderWidth: StyleSheet.hairlineWidth, borderColor: Surface.plate, ...Elevation.whisper },
  moreMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  deleteText: { fontFamily: Type.ui, fontSize: 14, letterSpacing: trackBody(14), color: Feedback.wrong },
  // 카드 목록 — 화면 padding이 hero 블록(20)보다 훨씬 좁다(8). 카드 사이 gap 20.
  cardList: { paddingHorizontal: 8, paddingTop: 8, gap: 20 },
  card: { gap: 8, paddingHorizontal: 20, paddingVertical: 24, borderRadius: Corner.card, backgroundColor: Surface.canvas },
  cardTitle: { fontFamily: Type.uiMedium, fontSize: 15, letterSpacing: trackBody(15), color: Ink.primary, paddingBottom: 8 },
  valueRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  cardValue: { fontFamily: Type.uiMedium, fontSize: 20, letterSpacing: trackBody(20), color: Ink.primary },
  cardNote: { fontFamily: Type.ui, fontSize: 15, letterSpacing: trackBody(15), color: Ink.primary },
  readingSentence: { fontFamily: Type.uiMedium, fontSize: 20, letterSpacing: trackBody(20), color: Ink.primary },
  readingStatsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readingStatText: { fontFamily: Type.ui, fontSize: 15, letterSpacing: trackBody(15), color: Ink.primary },
  readingStatDivider: { width: 1, height: 12, backgroundColor: Surface.plate },
  // 공부 진도의 더미 진행 그리드 — 완료 칸은 green100(Figma 원래 색 #34C759는 팔레트에
  // 없어 지정 팔레트의 green100으로 대체), 미완료 칸은 brown10(Figma와 동일한 색).
  dotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 4 },
  dot: { width: 8, height: 8, backgroundColor: Surface.plate },
  dotDone: { backgroundColor: Ink.primary },
  cardButton: {
    alignSelf: "flex-start",
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Ink.body,
  },
  cardButtonText: { fontFamily: Type.uiMedium, fontSize: 14, letterSpacing: trackBody(14), color: Ink.body },
  emptyBookmark: { fontFamily: Type.ui, fontSize: 14, letterSpacing: trackBody(14), color: Ink.body },
});

const styles = StyleSheet.create({
  // 화면 전체가 한 색(warm taupe) — 헤더·본문·하단 바가 저마다 배경을 다시 칠하지 않는다.
  screen: {
    flex: 1,
    backgroundColor: Surface.card,
  },
  // 60px 한 줄. 상태바 높이는 JSX에서 paddingTop·height에 함께 얹는다.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  // 글리프는 24px이지만 손가락이 받을 자리는 40px이다 — 음수 마진으로 넓힌 만큼 되밀어,
  // 화살표 자체는 좌우 여백 20px 자리에 그대로 선다(마이페이지 책 정보와 같은 크기).
  headerIconButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    borderRadius: Corner.pill,
  },
  // 좌우 버튼 폭이 달라도(24 vs 71) 제목은 화면 정가운데여야 한다 — 흐름에서 빼내
  // 60px 줄 전체에 겹쳐 두고 가운데 정렬한다. 상태바 높이에 흔들리지 않게 아래를
  // 기준으로 잡고, 손가락은 밑의 두 버튼이 받도록 pointerEvents를 끈다.
  headerTitleSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.body,
  },
  // 헤더 오른쪽 미리보기 — 채우지 않고 테두리만 두른 작은 버튼이다.
  headerPreviewButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Corner.input,
    borderWidth: 1,
    borderColor: Ink.muted,
  },
  headerPreviewText: {
    fontFamily: Type.ui,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.strong,
  },
  scrollView: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  // 표지·제목·저자·태그칩 — 아래에 선을 두지 않는다. 첫 절 제목이 제 위에 선을 갖고
  // 있어서, 여기에도 그으면 같은 자리에 두 줄이 겹친다.
  hero: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subhero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  buyCard: {
    gap: 12,
    padding: 20,
    backgroundColor: Surface.plate,
    borderRadius: Corner.pill,
    alignItems: "flex-start",
  },
  price: {
    fontFamily: Type.uiMedium,
    fontSize: 15,
    letterSpacing: trackBody(15),
    color: Ink.primary,
    textAlign: "center",
  },
  buyButton: {
    width: "100%",
    height: 48,
    paddingHorizontal: 20,
    borderRadius: Corner.largeCard,
    backgroundColor: Ink.strong,
  },
  buyButtonText: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Surface.canvas,
  },
  buyHint: {
    fontFamily: Type.ui,
    fontSize: 12,
    letterSpacing: trackBody(12),
    color: Ink.body,
    textAlign: "center",
    marginTop: 8,
    width: "100%",
    alignSelf: "stretch",
  },

  cover: {
    width: 140,
    height: 207,
    borderRadius: 2,
    shadowColor: Ink.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 4,
  },
  title: {
    marginTop: 4,
    fontFamily: Type.readingBold,
    fontSize: 22,
    letterSpacing: trackDisplay(22),
    color: Ink.primary,
    textAlign: "center",
  },
  author: {
    fontFamily: Type.ui,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.body,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  // 절 제목 — 본문과 함께 흘러간다(고정하지 않는다). 선은 제목 위에 그어, 앞 절이
  // 끝나는 자리를 표시한다.
  sectionTitleRow: {
    backgroundColor: Surface.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.brown10,
  },
  sectionTitleText: {
    fontFamily: Type.uiMedium,
    fontSize: 18,
    letterSpacing: trackBody(18),
    color: Ink.primary,
  },
  sectionBody: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  paragraphText: {
    fontFamily: Type.ui,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: trackBody(15),
    color: Ink.primary,
  },
  // 화면 하단에 고정되는 CTA 영역 — 종이와 같은 taupe 위에 버튼 하나가 8px 여백을
  // 두르고 앉는다. 세이프에어리어 하단 패딩은 여기서 한 번만 얹는다.
  ctaFooter: {
    padding: 8,
  },
  // 버튼 4종(활성 3 + 비활성 1)이 상태에 따라 자리를 서로 바꿔 끼우므로, 크기·모양은
  // 여기 하나로 묶고 색만 아래에서 갈아 끼운다.
  ctaButton: {
    flexDirection: "row",
    gap: 6,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: Corner.input,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonText: {
    fontFamily: Type.uiMedium,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.onDark,
  },
  /**
   * 읽을 책에 추가하기 — 이 화면이 하러 온 일 하나라, 포인트 컬러가 여기 붙는다.
   * 이 화면에서 주황은 이 버튼 하나뿐이다.
   */
  ctaAdd: {
    backgroundColor: Spark.ember,
  },
  /** 이미 담긴 책 — 누를 것은 없지만 채워진 얼굴로 지금 상태를 말한다. */
  ctaDone: {
    backgroundColor: Ink.muted,
  },
  /** 내 서재에서 들어왔을 때의 선택 버튼 — 채워진 버튼은 검정 하나뿐이다. */
  ctaFilled: {
    backgroundColor: Ink.primary,
  },
});
