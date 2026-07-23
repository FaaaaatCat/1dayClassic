import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScaleButton from '@/components/ScaleButton';
import TableOfContents from '@/components/TableOfContents';
import { Colors, Fonts } from '@/constants/theme';
import { getTodayDayOfYear, TOTAL_DAYS_IN_YEAR } from '@/lib/calendar';
import { BOOKSTORE_BOOKS } from '@/lib/bookstore';

/**
 * 하루 서점의 "현재 선택중" 책 상세 페이지.
 * 상단 인포(라벨/표지/제목/진행바)는 목차와 함께 스크롤되다가 화면 밖으로 사라지면,
 * 헤더 바로 아래 80px짜리 미니박스(표지+제목+라벨 한 줄)로 대체된다.
 */
export default function BookstoreDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentBook = BOOKSTORE_BOOKS.find((book) => book.isCurrent);

  const dayOfYear = getTodayDayOfYear();
  const progress = dayOfYear / TOTAL_DAYS_IN_YEAR;

  const infoHeightRef = useRef(0);
  const [showMiniBox, setShowMiniBox] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const infoHeight = infoHeightRef.current;
    if (infoHeight <= 0) return;
    setShowMiniBox(e.nativeEvent.contentOffset.y >= infoHeight);
  };

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

      {showMiniBox && (
        <View style={styles.miniBox}>
          <Image source={currentBook.coverImage} style={styles.miniCover} resizeMode="cover" />
          <Text style={styles.miniTitle} numberOfLines={1}>
            {currentBook.title}
          </Text>
          <LinearGradient
            colors={[Colors.blue100, Colors.blue50]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.miniBadge}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              tintColor={Colors.white}
              size={12}
            />
            <Text style={styles.miniBadgeText}>현재 선택중</Text>
          </LinearGradient>
        </View>
      )}

      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + insets.bottom }]}>
        <View
          onLayout={(e) => {
            infoHeightRef.current = e.nativeEvent.layout.height;
          }}>
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
        </View>

        <TableOfContents />
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
  miniBox: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
  },
  miniCover: {
    width: 60,
    height: 60,
    borderRadius: 2,
  },
  miniTitle: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.brown100,
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 12,
    height: 24,
    borderRadius: 4,
  },
  miniBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.white,
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
    paddingHorizontal: 20,
    paddingBottom: 24,
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
});
