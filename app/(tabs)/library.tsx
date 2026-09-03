import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import MyPageRow, { MyPageGroup } from '@/components/mypage/MyPageRow';
import MyPageShell, { MY_PAGE } from '@/components/mypage/MyPageShell';
import { useShelfBooks } from '@/components/mypage/useShelfBooks';
import ScaleButton from '@/components/ScaleButton';
import { Corner, Ink, Space, Spark, Surface, Type, TypeScale } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { findBgm } from '@/lib/bgm';
import { getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getReadingProgress } from '@/lib/progress';

/**
 * 마이페이지.
 *
 * 예전의 '내 서재'를 대신한다 — 담아 둔 책과 설정이 한곳에 모인다. 서재를 따로 두지 않는 건,
 * 이 앱에서 책을 고르는 일과 앱을 손보는 일이 모두 '내 것'을 다루는 일이라서다.
 *
 * 경로는 /library 그대로다. 홈의 사람 버튼을 비롯해 여러 곳에 박혀 있어 이름만 바꾼다.
 */
export default function MyPageScreen() {
  const router = useRouter();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { bgmId } = useBgm();
  const { planned, finished } = useShelfBooks();

  const reading = getCatalogBookByBookId(selectedBookId);
  const progress = getReadingProgress(selectedBookId, isDone);
  const percent =
    progress.totalPages > 0 ? Math.round((progress.readPages / progress.totalPages) * 100) : 0;

  const openReadingBook = () => {
    if (!reading) return;
    router.push({ pathname: '/library/book/[id]', params: { id: selectedBookId } });
  };

  return (
    <MyPageShell title="마이페이지" back="/">
      <MyPageRow icon="book-outline" label="지금 읽고있는 책" onPress={openReadingBook} last />

      {/* 지금 읽는 책 한 권 — 눌러 들어가면 그 책의 상세가 열린다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`지금 읽고있는 책 ${getBookName(selectedBookId)}, ${percent}퍼센트`}
        style={styles.card}
        onPress={openReadingBook}>
        <View style={styles.cardTop}>
          {reading ? (
            <Image
              source={{ uri: reading.coverImage }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.cover} />
          )}
          <View style={styles.cardText}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {reading?.title ?? getBookName(selectedBookId)}
            </Text>
            {reading?.author ? (
              <Text style={styles.cardAuthor} numberOfLines={1}>
                {reading.author}
              </Text>
            ) : null}
          </View>
          <Text style={styles.percent}>{`${percent}%`}</Text>
        </View>

        {/* 읽은 만큼 차오르는 가는 줄과, 그 아래 숫자 둘. */}
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.min(100, percent)}%` }]} />
        </View>
        <View style={styles.barText}>
          <Text style={styles.barRead}>{`${progress.readPages}p 읽음`}</Text>
          <Text style={styles.barTotal}>{`총 ${progress.totalPages}p`}</Text>
        </View>
      </Pressable>

      <MyPageGroup>
        <MyPageRow
          icon="layers-outline"
          label="읽을 예정인 책"
          value={`${planned.length}권`}
          onPress={() => router.push('/library/planned')}
        />
        <MyPageRow
          icon="sparkles-outline"
          label="완독한 책"
          value={`${finished.length}권`}
          onPress={() => router.push('/library/finished')}
        />
        <MyPageRow
          icon="musical-note-outline"
          label="배경음악 설정"
          value={findBgm(bgmId).label}
          onPress={() => router.push('/library/bgm')}
        />
        <MyPageRow
          icon="color-palette-outline"
          label="책 배경 설정"
          value="기본"
          onPress={() => router.push('/library/book-theme')}
          last
        />
      </MyPageGroup>

      {/* 프리미엄 안내 — 지금은 배너뿐이고 누를 곳이 없다. */}
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{'평생 광고 없이\n쾌적하게 독서하세요'}</Text>
        <ScaleButton accessibilityLabel="프리미엄 멤버십 보기" style={styles.bannerButton}>
          <Text style={styles.bannerButtonText}>프리미엄 멤버십 보기</Text>
        </ScaleButton>
      </View>

      <MyPageGroup>
        <MyPageRow label="권한 관리" onPress={() => router.push('/library/permissions')} />
        <MyPageRow label="계정 관리" onPress={() => router.push('/library/account')} last />
      </MyPageGroup>
    </MyPageShell>
  );
}

const styles = StyleSheet.create({
  /** 지금 읽는 책 — 이 화면에서 유일하게 면으로 올라온 자리다. */
  card: {
    marginHorizontal: MY_PAGE.gutter,
    marginBottom: Space[8],
    borderRadius: Corner.small,
    backgroundColor: Surface.card,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    padding: Space[16],
  },
  cover: {
    width: 44,
    height: 62,
    borderRadius: 2,
    backgroundColor: Surface.plate,
  },
  cardText: {
    flex: 1,
    gap: Space[4],
  },
  cardTitle: {
    fontFamily: Type.readingBold,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  cardAuthor: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  percent: {
    fontFamily: Type.uiMedium,
    fontSize: TypeScale.headingSm.fontSize,
    letterSpacing: TypeScale.headingSm.letterSpacing,
    color: Ink.primary,
  },
  /** 진행 줄 — 카드 가로를 꽉 채우는 가는 선이다. */
  bar: {
    height: 4,
    backgroundColor: Surface.plate,
  },
  barFill: {
    height: 4,
    backgroundColor: Spark.ember,
  },
  barText: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space[12],
    paddingVertical: Space[8],
  },
  barRead: {
    fontFamily: Type.uiMedium,
    ...TypeScale.caption,
    color: Spark.ember,
  },
  barTotal: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.muted,
  },

  /** 프리미엄 배너 — 이 화면에서 유일하게 색을 쓰는 자리다. */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[12],
    marginTop: Space[16],
    paddingHorizontal: MY_PAGE.gutter,
    paddingVertical: Space[20],
    backgroundColor: Spark.ember,
  },
  bannerText: {
    flex: 1,
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.onDark,
  },
  bannerButton: {
    height: 40,
    paddingHorizontal: Space[16],
    borderRadius: Corner.pill,
    backgroundColor: Surface.canvas,
  },
  bannerButtonText: {
    fontFamily: Type.uiMedium,
    ...TypeScale.bodySm,
    color: Ink.primary,
  },
});
