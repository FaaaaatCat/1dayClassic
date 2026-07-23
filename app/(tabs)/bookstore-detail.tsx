import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts } from '@/constants/theme';
import { getTodayDayOfYear, TOTAL_DAYS_IN_YEAR } from '@/lib/calendar';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/** 하루 서점의 "현재 선택중" 책 상세 페이지. 목차박스는 다음 지시를 기다리는 빈 자리표시자. */
export default function BookstoreDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentBook = BOOKSTORE_BOOKS.find((book) => book.isCurrent);

  const dayOfYear = getTodayDayOfYear();
  const progress = dayOfYear / TOTAL_DAYS_IN_YEAR;

  if (!currentBook) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
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
          <Image source={currentBook.coverImage} style={styles.cover} resizeMode="cover" />
          <Text style={styles.title}>{currentBook.title}</Text>
          <Text style={styles.author}>{currentBook.author}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {dayOfYear}/{TOTAL_DAYS_IN_YEAR}
          </Text>
        </View>

        <View style={styles.tocBox} />
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
  headerIconButton: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
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
    color: Colors.brown100,
    textAlign: 'center',
  },
  author: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.brown50,
    textAlign: 'center',
  },
  progressSection: {
    gap: 8,
    paddingBottom: 32,
  },
  progressTrack: {
    height: 4,
    borderRadius: 100,
    backgroundColor: Colors.beige10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: Colors.beige100,
  },
  progressText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.brown50,
    textAlign: 'right',
  },
  tocBox: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: Colors.brown10,
    borderRadius: 8,
  },
});
