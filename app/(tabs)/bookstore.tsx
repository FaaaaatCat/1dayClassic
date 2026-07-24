import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/** 하루 서점 — 유유 출판사 "하루 시리즈" 카탈로그. 현재 선택중인 책만 상세로 진입, 나머지는 탭 동작 없음. */
export default function BookstoreScreen() {
  const router = useRouter();
  const currentBook = BOOKSTORE_BOOKS.find((book) => book.isCurrent);
  const otherBooks = BOOKSTORE_BOOKS.filter((book) => !book.isCurrent);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {currentBook && (
        <ScaleButton
          accessibilityLabel={`${currentBook.title} 상세 보기`}
          style={styles.featured}
          onPress={() => router.push('/bookstore-detail')}>
          <Image source={currentBook.coverImage} style={styles.featuredCover} resizeMode="cover" />
          <View style={styles.featuredInfo}>
            <LinearGradient
              colors={[Colors.blue100, Colors.blue50]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featuredBadge}>
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                tintColor={Colors.white}
                size={14}
              />
              <Text style={styles.featuredBadgeText}>현재 선택중</Text>
            </LinearGradient>
            <Text style={styles.featuredTitle}>{currentBook.title}</Text>
            <Text style={styles.featuredAuthor}>{currentBook.author}</Text>
          </View>
        </ScaleButton>
      )}

      <View style={styles.grid}>
        {otherBooks.map((book) => (
          <View key={book.id} style={styles.gridCell}>
            <Image source={book.coverImage} style={styles.gridCover} resizeMode="cover" />
            <Text style={styles.gridTitle}>{book.title}</Text>
            <Text style={styles.gridAuthor}>{book.author}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingBottom: 40,
  },
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.beige10,
  },
  featuredCover: {
    width: 68,
    height: 100,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  featuredInfo: {
    flex: 1,
    gap: 8,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    height: 24,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.white,
  },
  featuredTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: tracking(20),
    color: Colors.brown100,
  },
  featuredAuthor: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    letterSpacing: tracking(14),
    color: Colors.brown100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '50%',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  gridCover: {
    width: 108,
    height: 160,
    borderRadius: 2,
    shadowColor: Colors.brown100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gridTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: tracking(16),
    color: Colors.brown100,
    textAlign: 'center',
  },
  gridAuthor: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    letterSpacing: tracking(12),
    color: Colors.brown50,
    textAlign: 'center',
  },
});
