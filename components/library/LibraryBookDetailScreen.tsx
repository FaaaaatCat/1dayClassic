import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
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
import { BOOKSTORE_BOOKS } from "@/lib/bookstore";
import { getCatalogBook, getCatalogBookByBookId } from "@/lib/catalog";
import { fieldsOf, seriesOf } from "@/lib/tags";

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

  const chips = [
    ...seriesOf(catalogBook.tags, catalogBook.title).map((label) => ({ label, variant: "series" as const })),
    ...fieldsOf(catalogBook.tags).map((label) => ({ label, variant: "field" as const })),
  ];

  const changeBook = () => {
    if (!studyBook) {
      showToast("준비 중인 콘텐츠입니다");
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
            <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} tintColor={Colors.brown100} size={24} />
          </ScaleButton>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
          <View style={styles.hero}>
            <Image source={view.cover} style={styles.cover} resizeMode="cover" />
            <Text style={styles.title}>{view.title}</Text>
            <Text style={styles.author}>{view.author}</Text>
            {chips.length > 0 && (
              <View style={styles.chips}>
                {chips.map((chip) => <TagChip key={`${chip.variant}-${chip.label}`} detail {...chip} />)}
              </View>
            )}

            <View style={styles.buttonRow}>
              <ScaleButton accessibilityLabel={`${view.title} 오늘의 책으로 변경하기`} style={[styles.actionButton, styles.changeButton]} onPress={changeBook}>
                <SymbolView name={{ ios: "arrow.triangle.2.circlepath", android: "sync", web: "sync" }} tintColor={Colors.white} size={18} />
                <Text style={styles.changeButtonText}>이 책으로 변경하기</Text>
              </ScaleButton>
              <ScaleButton accessibilityLabel="미리보기" style={[styles.actionButton, styles.previewButton]} onPress={() => setPreviewOpen(true)}>
                <SymbolView name={{ ios: "eye", android: "visibility", web: "visibility" }} tintColor={Colors.brown50} size={18} />
                <Text style={styles.previewButtonText}>미리보기</Text>
              </ScaleButton>
              <ScaleButton accessibilityLabel={moreMenuOpen ? "더보기 닫기" : "더보기"} style={[styles.actionButton, styles.moreButton]} onPress={() => setMoreMenuOpen((open) => !open)}>
                <SymbolView name={{ ios: "ellipsis", android: "more_vert", web: "more_vert" }} tintColor={Colors.brown100} size={20} />
              </ScaleButton>
            </View>

            {moreMenuOpen && (
              <View style={styles.moreMenu}>
                <Pressable accessibilityRole="button" accessibilityLabel="내 서재에서 삭제하기" style={styles.moreMenuItem} onPress={removeBook}>
                  <SymbolView name={{ ios: "trash", android: "delete", web: "delete" }} tintColor={Colors.red100} size={18} />
                  <Text style={styles.deleteText}>내 서재에서 삭제하기</Text>
                </Pressable>
              </View>
            )}
          </View>

          <StatCard title="독서 기록">
            <View style={styles.statGrid}>
              <Stat label="읽은 날짜 수" value="0일" />
              <Stat label="총 독서 시간" value="0시간 0분" />
              <Stat label="읽은 페이지" value="0p" />
              <Stat label="독서 일수" value="0일 독서" />
            </View>
          </StatCard>
          <StatCard title="공부 진도" value="0p" buttonLabel="빼먹은 진도 채우기" />
          <StatCard title="퀴즈 정답률" value="0%" buttonLabel="틀린 문제 보러가기" />
          <StatCard title="독서 노트" value="0개" buttonLabel="기록한 노트 보기" />
          <View style={styles.bookmarkCard}>
            <Text style={styles.cardTitle}>마지막으로 책갈피 끼워둔 날</Text>
            <Text style={styles.emptyBookmark}>아직 읽지 않은 책이에요</Text>
          </View>
        </ScrollView>
      </View>
      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

function StatCard({ title, value, buttonLabel, children }: { title: string; value?: string; buttonLabel?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {value && <Text style={styles.cardValue}>{value}</Text>}
      {children}
      {buttonLabel && <Pressable style={styles.cardButton}><Text style={styles.cardButtonText}>{buttonLabel}</Text><SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor={Colors.brown100} size={16} /></Pressable>}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.statItem}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.bg },
  headerTitle: { fontFamily: Fonts.semiBold, fontSize: 22, letterSpacing: tracking(22), color: Colors.brown100 },
  closeButton: { width: 41, height: 41, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 12 },
  hero: { alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 12 },
  cover: { width: 140, height: 207, borderRadius: 2 },
  title: { fontFamily: Fonts.semiBold, fontSize: 22, letterSpacing: tracking(22), color: Colors.brown100, textAlign: "center" },
  author: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  buttonRow: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 },
  actionButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 24, paddingHorizontal: 12 },
  changeButton: { flex: 1, backgroundColor: Colors.brown100 },
  changeButtonText: { fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: tracking(13), color: Colors.white },
  previewButton: { flex: 1, borderWidth: 1, borderColor: Colors.brown50, backgroundColor: Colors.white },
  previewButtonText: { fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: tracking(13), color: Colors.brown50 },
  moreButton: { width: 48, paddingHorizontal: 0, borderWidth: 1, borderColor: Colors.brown10, backgroundColor: Colors.white },
  moreMenu: { alignSelf: "stretch", backgroundColor: Colors.white, borderRadius: 10, shadowColor: Colors.brown100, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  moreMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  deleteText: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.red100 },
  card: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: Colors.white },
  bookmarkCard: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: Colors.white },
  cardTitle: { fontFamily: Fonts.semiBold, fontSize: 16, letterSpacing: tracking(16), color: Colors.brown100 },
  cardValue: { fontFamily: Fonts.semiBold, fontSize: 28, letterSpacing: tracking(28), color: Colors.brown100 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  statItem: { width: "50%", gap: 4 },
  statLabel: { fontFamily: Fonts.regular, fontSize: 12, letterSpacing: tracking(12), color: Colors.brown50 },
  statValue: { fontFamily: Fonts.semiBold, fontSize: 17, letterSpacing: tracking(17), color: Colors.brown100 },
  cardButton: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.brown10 },
  cardButtonText: { fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: tracking(13), color: Colors.brown100 },
  emptyBookmark: { fontFamily: Fonts.regular, fontSize: 14, letterSpacing: tracking(14), color: Colors.brown50 },
});
