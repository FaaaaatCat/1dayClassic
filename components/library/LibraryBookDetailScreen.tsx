import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BookPreviewModal from '@/components/BookPreviewModal';
import ScreenHeader, { HeaderIconButton } from '@/components/ScreenHeader';
import { StatusBarTint } from '@/components/StatusBarTint';
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
 * 리포트.
 *
 * 마이페이지의 내 서재와 홈의 리포트 버튼, 두 곳에서 들어온다. 위의 검은 띠에 책이 있고,
 * 그 아래로 이 책에 쌓인 기록이 줄줄이 놓인다 — 며칠 읽었는지, 어디까지 왔는지, 퀴즈는
 * 얼마나 맞혔는지.
 *
 * 제목이 '책 정보'가 아니라 '리포트'인 건 이 화면이 보여 주는 것이 책의 소개가 아니라
 * 내가 그 책에 남긴 기록이기 때문이다. 책의 소개를 읽는 화면은 서점 쪽에 따로 있다
 * (app/(tabs)/book/[id].tsx — 그쪽이 '책 정보'다).
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
   *
   * from에 넣을 수 있는 값은 셋뿐이다.
   *  - 'home'              홈의 리포트 버튼으로 들어왔다 → 홈으로
   *  - /library 아래 화면 이름('planned'·'finished') → 그 화면으로
   *  - 없음                마이페이지에서 바로 들어왔다 → 마이페이지로
   *
   * 그 밖의 값을 넣으면 /library/<그 값>이라는 없는 경로가 만들어져 '찾을 수 없는 화면'이
   * 뜬다. 마이페이지에서 들어올 때 'library'를 넣어 실제로 그랬다 — 여기는 비워 둔다.
   */
  const goBack = () =>
    router.replace((from === 'home' ? '/' : from ? `/library/${from}` : '/library') as never);

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

  /**
   * 틀린 문제 — 학습 콘텐츠가 있는 책에만 있다(퀴즈가 그 책들에만 있다).
   *
   * 돌아올 자리를 알 수 있게 from을 그대로 실어 보낸다 — 그 화면의 뒤로가기가 여기로
   * 오고, 여기 뒤로가기는 다시 from으로 간다.
   */
  const openWrongQuizzes = () => {
    if (!studyBook) return;
    router.push({
      pathname: '/library/wrong-quizzes',
      params: { id: studyBook.id, ...(from ? { from } : {}) },
    });
  };

  /** 책갈피 — 틀린 문제와 같은 이유로 학습 콘텐츠가 있는 책에만 있다. */
  const openBookmarks = () => {
    if (!studyBook) return;
    router.push({
      pathname: '/library/bookmarks',
      params: { id: studyBook.id, ...(from ? { from } : {}) },
    });
  };

  /** 독서 노트 — 읽으면서 남긴 것들. 위 둘과 같은 이유로 학습 콘텐츠가 있는 책에만 있다. */
  const openNotes = () => {
    if (!studyBook) return;
    router.push({
      pathname: '/library/notes',
      params: { id: studyBook.id, ...(from ? { from } : {}) },
    });
  };

  return (
    <>
      <View style={styles.screen}>
        {/* 위가 검은 띠라 상태바도 검게 둔다 — 띠가 화면 속으로 이어져 보인다. */}
        <StatusBarTint />

        {/* 검은 띠가 상태바 뒤까지 이어져야 하므로 세이프에어리어도 헤더가 맡는다. */}
        <ScreenHeader
          title="리포트"
          back={goBack}
          tone="dark"
          action={
            <HeaderIconButton
              name="ellipsis-vertical"
              label={menuOpen ? '더보기 닫기' : '더보기'}
              onPress={() => setMenuOpen((open) => !open)}
            />
          }
        />

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

          <Section
            title="독서 진도"
            right={
              <View style={styles.barSlot}>
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
            }>
            <Text style={styles.value}>{`${stats.readPages}p`}</Text>
            <Text style={styles.note}>{`(총 ${stats.totalPages}p)`}</Text>
          </Section>

          <Section
            title="퀴즈 정답률"
            action="틀린 문제 보러가기"
            onAction={studyBook ? openWrongQuizzes : notReady}>
            <Text style={styles.value}>{`${stats.correctRate}%`}</Text>
            {stats.quizTotal === 0 ? (
              <Text style={styles.note}>(아직 푼 퀴즈가 없어요)</Text>
            ) : (
              <Text style={styles.note}>{`(${stats.quizTotal}문제 중 ${stats.quizCorrect}개)`}</Text>
            )}
          </Section>

          <Section
            title="책갈피"
            action="책갈피 보기"
            onAction={studyBook ? openBookmarks : notReady}>
            <Text style={styles.value}>{`${stats.bookmarks}개`}</Text>
          </Section>

          <Section
            title="독서 노트"
            action="기록한 노트 보기"
            onAction={studyBook ? openNotes : notReady}>
            <Text style={styles.value}>{`${stats.notes}개`}</Text>
          </Section>

          <Section title="마지막으로 읽은 날" last>
            <Text style={stats.lastReadAt ? styles.value : styles.empty}>
              {stats.lastReadAt ? formatReadDate(stats.lastReadAt) : '아직 읽지 않은 책이에요'}
            </Text>
          </Section>
        </ScrollView>
      </View>

      {/*
        더보기 — 뒤가 어두워지고 목록이 화면 한가운데 뜬다. 안드로이드가 기본으로 쓰는
        모양이고, 하루 서점의 고르기 칸(SelectField)과 같은 몸짓이다.
      */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
        statusBarTranslucent>
        <Pressable style={styles.dim} onPress={() => setMenuOpen(false)}>
          {/* 목록 위를 눌렀을 때 닫히지 않도록 눌림을 여기서 멈춘다. */}
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="미리보기"
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setPreviewOpen(true);
              }}>
              <Ionicons name="eye-outline" color={Ink.primary} size={20} />
              <Text style={styles.menuText}>미리보기</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="내 서재에서 삭제하기"
              style={styles.menuItem}
              onPress={removeBook}>
              <Ionicons name="trash-outline" color={Feedback.wrong} size={20} />
              <Text style={[styles.menuText, styles.menuDelete]}>내 서재에서 삭제하기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <BookPreviewModal visible={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}

/**
 * 기록 한 칸 — 이름, 값, 그리고 오른쪽에 붙는 것(막대나 버튼).
 *
 * 값과 그에 딸린 설명은 위아래로 쌓이고, 오른쪽 자리는 하나만 쓴다 — 진도는 막대를,
 * 나머지는 버튼을 놓는다.
 */
function Section({
  title,
  children,
  action,
  onAction,
  right,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
  /** 오른쪽에 놓을 것(진도 막대처럼). 버튼과 함께 쓰지는 않는다. */
  right?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.section, last && styles.sectionLast]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>
        <View style={styles.sectionValue}>{children}</View>
        {right}
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
  /** 책 한 권이 놓이는 검은 띠 — 헤더와 이어져 한 덩어리로 보인다. */
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    paddingHorizontal: GUTTER,
    paddingBottom: Space[24],
    backgroundColor: Ink.primary,
  },
  /** 표지가 앉는 자리 — 바탕을 깔지 않는다(홈의 cover 주석 참고). */
  cover: {
    width: 56,
    height: 78,
    borderRadius: 2,
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

  /** 뒤에 깔리는 어둠 — 목록은 그 위 한가운데에 뜬다. */
  dim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[32],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    alignSelf: 'stretch',
    paddingVertical: Space[8],
    borderRadius: Corner.card,
    backgroundColor: Surface.canvas,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    minHeight: 52,
    paddingHorizontal: Space[20],
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
    marginHorizontal: Space[20],
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
  /**
   * 값과 그에 딸린 설명 — 위아래로 놓는다.
   *
   * 한 줄에 두면 큰 숫자와 작은 글씨의 밑선을 맞춰야 하는데, 크기가 달라 어느 쪽으로
   * 맞춰도 한쪽이 처져 보인다. 위아래로 놓으면 그 다툼이 없다.
   */
  sectionValue: {
    flex: 1,
    gap: Space[4],
  },
  /** 오른쪽 버튼 — 외곽선만. 이 화면의 채워진 것은 '이 책 읽기' 하나뿐이다. */
  sectionButton: {
    height: 36,
    paddingHorizontal: Space[12],
    borderRadius: Corner.small,
    borderWidth: 1,
    borderColor: Ink.muted,
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

  /**
   * 진도 막대 — 폭을 못박아 화면 오른쪽에 붙인다.
   *
   * 남는 폭을 다 가져가게 두면 쪽수의 자릿수에 따라 막대 길이가 달라져, 책마다 다른 화면처럼
   * 보인다. 같은 자리에 같은 길이로 서 있어야 여러 책을 견줄 수 있다.
   */
  barSlot: {
    width: 160,
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
