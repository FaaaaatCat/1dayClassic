import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookPreviewModal from "@/components/BookPreviewModal";
import ScaleButton from "@/components/ScaleButton";
import TagChip from "@/components/TagChip";
import { Colors, Fonts, tracking } from "@/constants/theme";
import { useBookSelection } from "@/context/BookSelectionContext";
import { useShelf } from "@/context/ShelfContext";
import { useToast } from "@/context/ToastContext";
import { BOOKSTORE_BOOKS, isMvpBook } from "@/lib/bookstore";
import { getCatalogBook, getCatalogBookByBookId } from "@/lib/catalog";
import { fieldsOf, seriesOf } from "@/lib/tags";

/** 총 페이지 수를 못 구했을 때 진도 그리드가 그릴 네모 개수. */
const FALLBACK_TOTAL_PAGES = 360;

/** 아직 읽은 페이지를 기록하지 않는다 — 진도 값과 그리드가 같은 수를 보게 한 곳에 둔다. */
const READ_PAGES = 0;

/**
 * 카탈로그의 pages를 진도 그리드의 네모 개수(= 총 페이지 수)로 바꾼다.
 * 값이 "336쪽"과 "136"처럼 섞여 있어 앞의 숫자만 읽고, 비었거나 숫자로 시작하지 않으면
 * FALLBACK_TOTAL_PAGES로 그린다.
 */
function totalPagesOf(pages: string): number {
  const parsed = Number.parseInt(pages, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_TOTAL_PAGES;
}

export default function LibraryBookDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectBook } = useBookSelection();
  const { removeFromShelf } = useShelf();
  const { showToast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const catalogBook = studyBook
    ? getCatalogBookByBookId(studyBook.id)
    : getCatalogBook(id ?? "");
  const view = studyBook
    ? { title: studyBook.title, author: studyBook.author, cover: studyBook.coverImage }
    : catalogBook && { title: catalogBook.title, author: catalogBook.author, cover: { uri: catalogBook.coverImage } };

  if (!view || !catalogBook) return null;

  const totalPages = totalPagesOf(catalogBook.pages);

  const chips = [
    ...seriesOf(catalogBook.tags, catalogBook.title).map((label) => ({ label, variant: "series" as const })),
    ...fieldsOf(catalogBook.tags).map((label) => ({ label, variant: "field" as const })),
  ];

  const changeBook = () => {
    // studyBook이 없으면(카탈로그 전용 책) BUILD_CALENDAR에 없는 키라 selectBook을 호출할 수
    // 없다(book/[id].tsx의 chooseBook 주석 참고). liberal처럼 학습 가능한 책에는 있지만 아직 MVP가
    // 제공하지 않는 책도 같은 이유로 막는다.
    if (!studyBook || !isMvpBook(studyBook.id)) {
      showToast("MVP에서는 제공하지 않는 콘텐츠입니다.");
      return;
    }
    selectBook(studyBook.id);
    showToast(`선택 완료 · ${studyBook.title}`);
  };

  const removeBook = () => {
    setMoreMenuOpen(false);
    removeFromShelf(catalogBook.id);
    showToast("내 서재에서 삭제했습니다");
    router.replace("/library");
  };

  return (
    <>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>내 서재</Text>
          <ScaleButton accessibilityLabel="내 서재로 돌아가기" style={styles.closeButton} onPress={() => router.replace("/library")}>
            <Ionicons name="close" color={Colors.brown100} size={24} />
          </ScaleButton>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
          <View style={styles.hero}>
            <View style={styles.coverRow}>
              <Image source={view.cover} style={styles.cover} resizeMode="cover" />
              <View style={styles.infoColumn}>
                <Text style={styles.title}>{view.title}</Text>
                <Text style={styles.author}>{view.author}</Text>
                {chips.length > 0 && (
                  <View style={styles.chips}>
                    {chips.map((chip) => <TagChip key={`${chip.variant}-${chip.label}`} detail {...chip} />)}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.buttonRow}>
              <ScaleButton accessibilityLabel={`${view.title} 오늘의 책으로 변경하기`} style={[styles.actionButton, styles.changeButton]} onPress={changeBook}>
                <Ionicons name="sync" color={Colors.white} size={18} />
                <Text style={styles.changeButtonText} numberOfLines={1}>이 책으로 변경하기</Text>
              </ScaleButton>
              <ScaleButton accessibilityLabel="미리보기" style={[styles.actionButton, styles.previewButton]} onPress={() => setPreviewOpen(true)}>
                <Text style={styles.previewButtonText} numberOfLines={1}>미리보기</Text>
              </ScaleButton>
              <ScaleButton accessibilityLabel={moreMenuOpen ? "더보기 닫기" : "더보기"} style={[styles.actionButton, styles.moreButton]} onPress={() => setMoreMenuOpen((open) => !open)}>
                <Ionicons name="ellipsis-vertical" color={Colors.brown100} size={20} />
              </ScaleButton>
            </View>

            {moreMenuOpen && (
              <View style={styles.moreMenu}>
                <Pressable accessibilityRole="button" accessibilityLabel="내 서재에서 삭제하기" style={styles.moreMenuItem} onPress={removeBook}>
                  <Ionicons name="trash-outline" color={Colors.red100} size={18} />
                  <Text style={styles.deleteText}>내 서재에서 삭제하기</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.cardList}>
            {/* 독서 기록 — 다른 카드처럼 값 하나가 아니라 문장 한 줄 + 구분선으로 나눈 통계 한 줄이라
                StatCard 대신 직접 그린다. */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>독서 기록</Text>
              <Text style={styles.readingSentence}>0일 동안 이 책을 읽었어요.</Text>
              <View style={styles.readingStatsRow}>
                <Text style={styles.readingStatText}>총 0시간 0분</Text>
                <View style={styles.readingStatDivider} />
                <Text style={styles.readingStatText}>0p</Text>
                <View style={styles.readingStatDivider} />
                <Text style={styles.readingStatText}>0일 독서</Text>
              </View>
            </View>
            <StatCard title="공부 진도" value={`${READ_PAGES}p`} note={`(총 ${totalPages}p)`} buttonLabel="빼먹은 진도 채우기">
              <ProgressDotGrid total={totalPages} done={READ_PAGES} />
            </StatCard>
            <StatCard title="퀴즈 정답률" value="0%" note="(아직 푼 퀴즈가 없어요)" buttonLabel="틀린 문제 보러가기" />
            <StatCard title="독서 노트" value="0개" buttonLabel="기록한 노트 보기" />
            <View style={styles.bookmarkCard}>
              <Text style={styles.cardTitle}>마지막으로 책갈피 끼워둔 날</Text>
              <Text style={styles.emptyBookmark}>아직 읽지 않은 책이에요</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

function StatCard({ title, value, note, buttonLabel, children }: { title: string; value?: string; note?: string; buttonLabel?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {value && (
        <View style={styles.valueRow}>
          <Text style={styles.cardValue}>{value}</Text>
          {note && <Text style={styles.cardNote}>{note}</Text>}
        </View>
      )}
      {children}
      {buttonLabel && <Pressable style={styles.cardButton}><Text style={styles.cardButtonText}>{buttonLabel}</Text></Pressable>}
    </View>
  );
}

/** 공부 진도 그리드 — 네모 하나가 한 페이지. 앞에서부터 done개가 읽은 표시다. */
function ProgressDotGrid({ total, done }: { total: number; done: number }) {
  return (
    <View style={styles.dotGrid}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index < done && styles.dotDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.bg },
  headerTitle: { fontFamily: Fonts.semiBold, fontSize: 22, letterSpacing: tracking(22), color: Colors.brown100 },
  closeButton: { width: 41, height: 41, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  // 책 info — 표지+제목/저자/태그가 가로로 나란히, 그 아래 버튼 줄. 이 블록만 자체 좌우
  // padding 20을 갖는다(아래 카드 목록은 8로 훨씬 좁다).
  hero: { gap: 20, padding: 20 },
  coverRow: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  cover: { width: 95, height: 140, borderRadius: 2 },
  infoColumn: { flex: 1, gap: 12, paddingTop: 20 },
  title: { fontFamily: Fonts.semiBold, fontSize: 22, letterSpacing: tracking(22), color: Colors.brown100 },
  author: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  buttonRow: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center" },
  // 세 버튼 모두 높이 40 · 모서리 10. 남는 폭은 변경 버튼만 가져가고 미리보기는 글자 폭에
  // 맞춰 둔다 — 둘 다 flex를 주면 "이 책으로 변경하기"가 두 줄로 접힌다.
  actionButton: { height: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingHorizontal: 20 },
  changeButton: { flex: 1, backgroundColor: Colors.beige100 },
  changeButtonText: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.white },
  previewButton: { backgroundColor: Colors.brown100 },
  previewButtonText: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.white },
  moreButton: { width: 40, paddingHorizontal: 0, borderWidth: 1, borderColor: Colors.brown10, backgroundColor: Colors.white },
  moreMenu: { alignSelf: "stretch", backgroundColor: Colors.white, borderRadius: 10, shadowColor: Colors.brown100, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  moreMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  deleteText: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.red100 },
  // 카드 목록 — 화면 좌우 padding이 위 책 info 블록(20)보다 훨씬 좁다(8).
  cardList: { paddingHorizontal: 8, paddingTop: 8, gap: 20 },
  card: { gap: 8, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 20, backgroundColor: Colors.white },
  bookmarkCard: { gap: 8, paddingHorizontal: 20, paddingVertical: 24, borderRadius: 20, backgroundColor: Colors.white },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 15, letterSpacing: tracking(15), color: Colors.brown100, paddingBottom: 8 },
  // 값과 보조 설명이 한 줄에 나란히 온다 — "0p (총 320p)"처럼.
  valueRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  cardValue: { fontFamily: Fonts.semiBold, fontSize: 20, letterSpacing: tracking(20), color: Colors.brown100 },
  cardNote: { fontFamily: Fonts.regular, fontSize: 15, letterSpacing: tracking(15), color: Colors.brown100 },
  // 공부 진도 그리드 — 읽은 칸은 green100(Figma 원래 색 #34C759는 지정 팔레트에 없어
  // 대체), 남은 칸은 brown10으로 Figma와 같다.
  dotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 4 },
  dot: { width: 8, height: 8, backgroundColor: Colors.brown10 },
  dotDone: { backgroundColor: Colors.green100 },
  // 독서 기록 카드 — 문장 한 줄 아래에 세로 구분선으로 나눈 통계 한 줄.
  readingSentence: { fontFamily: Fonts.semiBold, fontSize: 20, letterSpacing: tracking(20), color: Colors.brown100 },
  readingStatsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  readingStatText: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 26, letterSpacing: tracking(15), color: Colors.brown100 },
  readingStatDivider: { width: 1, height: 12, backgroundColor: Colors.brown10 },
  // 카드 하단 버튼 — 카드 폭을 채우는 줄이 아니라 글자 폭에 맞춘 작은 외곽선 버튼.
  cardButton: { alignSelf: "flex-start", height: 32, justifyContent: "center", paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: Colors.brown50 },
  cardButtonText: { fontFamily: Fonts.semiBold, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
  emptyBookmark: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
});
