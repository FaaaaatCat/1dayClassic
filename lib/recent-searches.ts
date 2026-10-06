import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 서점의 최근 검색어 — 검색 페이지가 보여 주고, 검색할 때마다 맨 앞에 쌓인다.
 *
 * 같은 말을 다시 찾으면 중복으로 늘리지 않고 맨 앞으로 끌어올린다. 열 개를 넘으면 오래된
 * 것부터 버린다 — 검색 페이지 한 화면에 들어오는 정도다.
 */
const STORAGE_KEY = 'bookstore-recent-searches-v1';
const LIMIT = 10;

/** 읽지 못하면 빈 목록으로 본다. 최근 검색어가 안 보이는 것쯤은 검색을 막을 일이 아니다. */
export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    console.warn('[recent-searches] 읽기 실패:', error);
    return [];
  }
}

export async function saveRecentSearches(terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch (error) {
    console.warn('[recent-searches] 저장 실패:', error);
  }
}

/** 검색어 하나를 맨 앞에 더한 목록. 앞뒤 공백은 떼고 비교한다. */
export function pushRecentSearch(terms: string[], term: string): string[] {
  const trimmed = term.trim();
  if (trimmed === '') return terms;
  return [trimmed, ...terms.filter((item) => item !== trimmed)].slice(0, LIMIT);
}
