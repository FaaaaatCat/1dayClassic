import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chevron from '@/components/Chevron';
import ScaleButton from '@/components/ScaleButton';
import { HEADER_H } from '@/components/ScreenHeader';
import { Corner, Ink, Space, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import { getCatalogBooks } from '@/lib/catalog';
import { loadRecentSearches, pushRecentSearch, saveRecentSearches } from '@/lib/recent-searches';
import { FIELD_NAMES, fieldsOf } from '@/lib/tags';

/**
 * 하루 서점의 검색 페이지.
 *
 * 맨 위에 검색창, 그 아래 최근 검색어와 추천 검색어. 무엇을 찾을지 정하는 자리라 결과는
 * 여기서 보여 주지 않는다 — 검색어가 정해지면 onSearch로 넘기고, 서점이 목록 페이지를
 * 그 검색어로 띄운다.
 *
 * 추천 검색어는 분야 이름이다. 지어낸 말을 두지 않으려고 카탈로그에 실제로 있는 분야를
 * 권수 많은 순으로 놓는다. 검색은 제목·작가·출판사·분야를 함께 보므로 누르면 그 분야의 책이 나온다.
 */
export default function BookstoreSearch({
  initialQuery = '',
  onBack,
  onSearch,
}: {
  /** 검색 결과에서 다시 들어왔을 때 창에 남겨 둘 검색어. */
  initialQuery?: string;
  onBack: () => void;
  onSearch: (query: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    loadRecentSearches().then((terms) => {
      if (alive) setRecent(terms);
    });
    return () => {
      alive = false;
    };
  }, []);

  const recommended = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const book of getCatalogBooks()) {
      for (const name of fieldsOf(book.tags)) tally[name] = (tally[name] ?? 0) + 1;
    }
    return FIELD_NAMES.filter((name) => (tally[name] ?? 0) > 0).sort((a, b) => tally[b] - tally[a]);
  }, []);

  const updateRecent = (next: string[]) => {
    setRecent(next);
    saveRecentSearches(next);
  };

  const submit = (term: string) => {
    const trimmed = term.trim();
    if (trimmed === '') return;
    updateRecent(pushRecentSearch(recent, trimmed));
    onSearch(trimmed);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top, height: HEADER_H + insets.top }]}>
        <ScaleButton accessibilityLabel="뒤로" style={styles.back} onPress={onBack}>
          <Chevron size={24} color={Ink.primary} />
        </ScaleButton>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Ink.body} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submit(query)}
            autoFocus
            placeholder="제목, 작가, 출판사 검색"
            placeholderTextColor={Ink.body}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query !== '' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색어 지우기"
              hitSlop={10}
              onPress={() => setQuery('')}>
              <Ionicons name="close-circle" color={Ink.muted} size={18} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>최근 검색어</Text>
            {recent.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="최근 검색어 전체 삭제"
                hitSlop={10}
                onPress={() => updateRecent([])}>
                <Text style={styles.clearAll}>전체 삭제</Text>
              </Pressable>
            )}
          </View>
          {recent.length === 0 ? (
            <Text style={styles.empty}>최근 검색어가 없습니다.</Text>
          ) : (
            <View style={styles.chips}>
              {recent.map((term) => (
                <View key={term} style={[styles.chip, styles.recentChip]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${term} 검색`}
                    onPress={() => submit(term)}>
                    <Text style={styles.chipLabel}>{term}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${term} 최근 검색어에서 지우기`}
                    hitSlop={8}
                    onPress={() => updateRecent(recent.filter((item) => item !== term))}>
                    <Ionicons name="close" size={14} color={Ink.body} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>추천 검색어</Text>
          </View>
          <View style={styles.chips}>
            {recommended.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                accessibilityLabel={`${term} 검색`}
                style={[styles.chip, styles.recommendChip]}
                onPress={() => submit(term)}>
                <Text style={styles.chipLabel}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Surface.canvas,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[4],
    paddingLeft: Space[12],
    paddingRight: Space[20],
    backgroundColor: Surface.canvas,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[8],
    height: 40,
    paddingHorizontal: Space[12],
    borderRadius: Corner.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Surface.plate,
    backgroundColor: Surface.card,
  },
  searchInput: {
    flex: 1,
    // 안드로이드 TextInput은 기본 세로 여백이 있어 40px 상자 안에서 글자가 아래로 쏠린다.
    paddingVertical: 0,
    fontFamily: Type.ui,
    fontSize: 14,
    letterSpacing: trackBody(14),
    color: Ink.primary,
  },
  content: {
    paddingHorizontal: Space[20],
    paddingTop: Space[16],
    paddingBottom: Space[40],
    gap: Space[32],
  },
  section: {
    gap: Space[12],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: Type.uiMedium,
    ...TypeScale.subheading,
    color: Ink.primary,
  },
  clearAll: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.body,
  },
  empty: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space[8],
  },
  /** 검색어 칩 — 흰 바탕에 1px 테. 최근 검색어는 오른쪽에 지우기 표시가 붙는다. */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: Corner.pill,
    borderWidth: 1,
    borderColor: Surface.plate,
    backgroundColor: Surface.canvas,
  },
  recentChip: {
    gap: Space[4],
    paddingLeft: Space[12],
    paddingRight: Space[8],
  },
  recommendChip: {
    paddingHorizontal: Space[12],
  },
  chipLabel: {
    fontFamily: Type.ui,
    fontSize: 13,
    letterSpacing: trackBody(13),
    color: Ink.body,
  },
});
