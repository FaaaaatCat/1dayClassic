import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookPreviewModal from '@/components/BookPreviewModal';
import { formatReadDate, useBookStats } from '@/components/mypage/useBookStats';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Feedback, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useShelf } from '@/context/ShelfContext';
import { useToast } from '@/context/ToastContext';
import { BOOKSTORE_BOOKS, isMvpBook } from '@/lib/bookstore';
import { getCatalogBook, getCatalogBookByBookId } from '@/lib/catalog';

/** 좌우 여백 — 마이페이지의 것과 같게 둔다. */
const GUTTER = Space[20];

/**
 * 책 정보.
 *
 * 마이페이지에서 들어오는 화면이다. 위의 검은 띠에 책이 있고, 그 아래로 이 책에 쌓인
 * 기록이 줄줄이 놓인다 — 며칠 읽었는지, 어디까지 왔는지, 퀴즈는 얼마나 맞혔는지.
 *
 * 오른쪽 위 버튼은 이 책이 지금 읽는 책인지에 따라 갈린다. 읽는 중이면 '선택 중'이라고
 * 알리기만 하고, 아니면 '이 책 읽기'로 바꿔 준다 — 하루에 한 권만 읽으므로 고르는 일이
 * 곧 바꾸는 일이다.
 */
export default function LibraryBookDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedBookId, selectBook } = useBookSelection();
  const { removeFromShelf } = useShelf();
  const { showToast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const studyBook = BOOKSTORE_BOOKS.find((book) => book.id === id);
  const catalogBook = studyBook ? getCatalogBookByBookId(studyBook.id) : getCatalogBook(id ?? '');
  const stats = useBookStats(studyBook?.id);

  /**
   * 돌아갈 곳 — 들어온 자리로 되돌린다.
   *
   * router.back()을 쓰지 않는 건 이 화면이 Tabs의 형제라서다. 형제로 옮기는 것은 스택에
   * 쌓이지 않아, back()은 그 앞에 쌓여 있던 홈으로 튀어 버린다.
   */
  const goBack = () => router.replace((from ? `/library/${from}` : '/library') as never);

  if (!catalogBook) return null;

  const reading = studyBook?.id === selectedBookId;

  const changeBook = () => {
    // 학습 콘텐츠가 없는 책은 고를 수 없다 — BUILD_CALENDAR에 없는 키라 selectBook이 받지
    // 못한다. liberal처럼 책은 있지만 아직 MVP가 제공하지 않는 것도 같은 이유로 막는다.
    if (!studyBook || !isMvpBook(studyBook.id)) {
      showToast('MVP에서는 제공하지 않는 콘텐츠입니다.');
      return;
    }
    selectBook(studyBook.id);
    showToast(`이제 이 책을 읽습니다 · ${studyBook.title}`);
  };

  const removeBook = () => {
    setMenuOpen(false);
    removeFromShelf(catalogBook.id);
    showToast('내 서재에서 삭제했습니다');
    goBack();
  };

  /** 아직 갈 곳이 없는 버튼들 — 눌리기는 하되 무엇이 없는지 말해 준다. */
  const notReady = () => showToast('아직 준비 중입니다.');

  return (
    <>
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <ScaleButton accessibilityLabel="뒤로" style={styles.iconButton} onPress={goBack}>
            <Ionicons name="chevron-back" color={Ink.primary} size={22} />
          </ScaleButton>
          <Text style={styles.headerTitle}>책 정보</Text>
          <ScaleButton
            accessibilityLabel={menuOpen ? '더보기 닫기' : '더보기'}
            style={styles.iconButton}
            onPress={() => setMenuOpen((open) => !open)}>
            <Ionicons name="ellipsis-vertical" color={Ink.primary} size={20} />
          </ScaleButton>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Space[40] }}>
          {/* 검은 띠 — 책 한 권과, 이 책을 읽을지 정하는 버튼 하나. */}
          <View style={styles.band}>
            <Image
              source={{ uri: catalogBook.coverImage }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.bandText}>
              <Text style={styles.title} numberOfLines={2}>
                {catalogBook.title}
              </Text>
              <Text style={styles.author} numberOfLines={1}>
                {catalogBook.author}
              </Text>
            </View>

            {reading ? (
              // 지금 읽는 책 — 누를 것이 없으니 버튼이 아니라 표시다.
              <View style={[styles.action, styles.actionReading]}>
                <Text style={styles.actionReadingText}>선택 중</Text>
              </View>
            ) : (
              <ScaleButton
                accessibilityLabel={`${catalogBook.title} 읽기 시작`}
                style={[styles.action, styles.actionStart]}
                onPress={changeBook}>
                <Ionicons name="sync" color={Ink.onDark} size={16} />
                <Text style={styles.actionStartText}>이 책 읽기</Text>
              </ScaleButton>
            )}
          </View>

          {menuOpen && (
            <View style={styles.menu}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="미리보기"
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  setPreviewOpen(true);
                }}>
                <Ionicons name="eye-outline" color={Ink.primary} size={18} />
                <Text style={styles.menuText}>미리보기</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="내 서재에서 삭제하기"
                style={styles.menuItem}
                onPress={removeBook}>
                <Ionicons name="trash-outline" color={Feedback.wrong} size={18} />
                <Text style={[styles.menuText, styles.menuDelete]}>내 서재에서 삭제하기</Text>
              </Pressable>
            </View>
          )}

          {/* 독서 기록 — 문장 한 줄과 그 아래 숫자들. */}
          <Section title="독서 기록">
            <Text style={styles.sentence}>{`${stats.daysRead}일 동안 이 책을 읽었어요.`}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{`${stats.readPages}p`}</Text>
              <View style={styles.metaDivider} />
              <Text style={styles.meta}>{`${stats.daysRead}일 독서`}</Text>
            </View>
          </Section>

          <Section title="독서 진도">
            <Text style={styles.value}>{`${stats.readPages}p`}</Text>
            <Text style={styles.note}>{`(총 ${stats.totalPages}p)`}</Text>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${
                      stats.totalPages > 0
                        ? Math.min(100, Math.round((stats.readPages / stats.totalPages) * 100))
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </Section>

          <Section title="퀴즈 정답률" action="틀린 문제 보러가기" onAction={notReady}>
            <Text style={styles.value}>{`${stats.correctRate}%`}</Text>
            {stats.quizTotal === 0 ? (
              <Text style={styles.note}>(아직 푼 퀴즈가 없어요)</Text>
            ) : (
              <Text style={styles.note}>{`(${stats.quizTotal}문제 중 ${stats.quizCorrect}개)`}</Text>
            )}
          </Section>

          <Section title="책갈피" action="책갈피 보기" onAction={notReady}>
            <Text style={styles.value}>{`${stats.bookmarks}개`}</Text>
          </Section>

          <Section title="독서 노트" action="기록한 노트 보기" onAction={notReady}>
            <Text style={styles.value}>{`${stats.notes}개`}</Text>
          </Section>

          <Section title="마지막으로 읽은 날" last>
            <Text style={stats.lastReadAt ? styles.value : styles.empty}>
              {stats.lastReadAt ? formatReadDate(stats.lastReadAt) : '아직 읽지 않은 책이에요'}
            </Text>
          </Section>
        </ScrollView>
      </View>

      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

/**
 * 기록 한 칸 — 이름, 값, 그리고 (있으면) 오른쪽 버튼.
 *
 * 값과 버튼을 한 줄에 두는 건 디자인이 그렇기도 하고, 값이 짧아서다. 값이 길어지는 칸
 * (독서 기록)은 children을 직접 그려 두 줄로 쓴다.
 */
function Section({
  title,
  children,
  action,
  onAction,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.section, last && styles.sectionLast]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        <View style={styles.sectionValue}>{children}</View>
        {action ? (
          <ScaleButton accessibilityLabel={action} style={styles.sectionButton} onPress={onAction}>
            <Text style={styles.sectionButtonText}>{action}</Text>
          </ScaleButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[8],
    paddingBottom: Space[8],
    backgroundColor: Ink.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Corner.pill,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },

  /** 책 한 권이 놓이는 검은 띠 — 헤더와 이어져 한 덩어리로 보인다. */
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingHorizontal: GUTTER,
    paddingBottom: Space[24],
    backgroundColor: Ink.primary,
  },
  cover: {
    width: 56,
    height: 78,
    borderRadius: 2,
    backgroundColor: Ink.strong,
  },
  bandText: {
    flex: 1,
    gap: Space[4],
  },
  title: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.onDark,
  },
  author: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Surface.plate,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[4],
    height: 40,
    paddingHorizontal: Space[16],
    borderRadius: Corner.pill,
  },
  /** 지금 읽는 책 — 물러난 얼굴이라야 '누를 것 없음'으로 읽힌다. */
  actionReading: {
    backgroundColor: Ink.strong,
  },
  actionReadingText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Surface.plate,
  },
  /** 아직 안 읽는 책 — 이 화면에서 가장 눈에 들어와야 하는 자리다. */
  actionStart: {
    backgroundColor: Spark.ember,
  },
  actionStartText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
  },

  menu: {
    marginHorizontal: GUTTER,
    marginTop: Space[8],
    borderRadius: Corner.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    paddingHorizontal: Space[16],
    paddingVertical: Space[12],
  },
  menuText: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.primary,
  },
  menuDelete: {
    color: Feedback.wrong,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Space[12],
    backgroundColor: Surface.plate,
  },

  section: {
    paddingHorizontal: GUTTER,
    paddingVertical: Space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Surface.plate,
  },
  sectionLast: {
    borderBottomWidth: 0,
  },
  sectionTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
  sectionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    marginTop: Space[8],
  },
  sectionValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space[8],
  },
  /** 오른쪽 버튼 — 외곽선만. 이 화면의 채워진 것은 '이 책 읽기' 하나뿐이다. */
  sectionButton: {
    height: 36,
    paddingHorizontal: Space[12],
    borderRadius: Corner.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
  },
  sectionButtonText: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },

  value: {
    fontFamily: Type.uiMedium,
    fontSize: TypeScale.headingSm.fontSize,
    letterSpacing: TypeScale.headingSm.letterSpacing,
    color: Ink.primary,
  },
  note: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  empty: {
    fontFamily: Type.ui,
    ...TypeScale.body,
    color: Ink.muted,
  },
  sentence: {
    fontFamily: Type.uiMedium,
    fontSize: TypeScale.headingSm.fontSize,
    letterSpacing: TypeScale.headingSm.letterSpacing,
    color: Ink.primary,
    marginTop: Space[8],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    marginTop: Space[4],
  },
  meta: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 10,
    backgroundColor: Surface.plate,
  },

  /** 진도 막대 — 값 옆에 붙어 남은 폭을 가져간다. */
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Surface.plate,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: Spark.ember,
  },
});
