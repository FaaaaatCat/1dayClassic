import { Fragment } from 'react';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import ScaleButton from '@/components/ScaleButton';
import { Colors, Fonts, tracking } from '@/constants/theme';
import { buildCalendarYear, CALENDAR_MONTHS, type CalendarDay } from '@/lib/calendar';

type Row = { kind: 'header'; month: number } | { kind: 'entry'; entry: CalendarDay };

function buildRows(days: CalendarDay[]): Row[] {
  const rows: Row[] = [];
  let lastMonth = -1;
  for (const entry of days) {
    if (entry.month !== lastMonth) {
      rows.push({ kind: 'header', month: entry.month });
      lastMonth = entry.month;
    }
    rows.push({ kind: 'entry', entry });
  }
  return rows;
}

const CALENDAR_DAYS = buildCalendarYear();
const ROWS: Row[] = buildRows(CALENDAR_DAYS);

/**
 * 365일 목차 — 월별 헤더 + 날짜 행. 한 번만 렌더링되며 무한 스크롤은 없다.
 * 자체 ScrollView를 갖지 않는다 — 부모가 소유한 스크롤 컨테이너 안에 바로 넣어서 쓴다.
 */
export default function TableOfContents() {
  const router = useRouter();

  const openTrack = (trackId: string) => {
    router.push({ pathname: '/today', params: { trackId } });
  };

  const renderEntry = (entry: CalendarDay) => {
    if (entry.locked) {
      return (
        <View key={`${entry.month}-${entry.day}`} style={styles.row}>
          <Text style={styles.rowDayLocked}>
            {entry.month} · {entry.day}
          </Text>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            tintColor={Colors.brown10}
            size={22}
            style={styles.rowLockIcon}
          />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitleLocked} numberOfLines={1}>
              {entry.title}
            </Text>
            <Text style={styles.rowComposerLocked} numberOfLines={1}>
              {entry.composer}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScaleButton
        key={`${entry.month}-${entry.day}`}
        accessibilityLabel={`${entry.title} 보기`}
        style={styles.row}
        onPress={() => entry.trackId && openTrack(entry.trackId)}>
        <Text style={styles.rowDay}>
          {entry.month} · {entry.day}
        </Text>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.rowComposer} numberOfLines={1}>
            {entry.composer}
          </Text>
        </View>
      </ScaleButton>
    );
  };

  const renderRow = (row: Row) => {
    if (row.kind === 'header') {
      return (
        <View key={`h${row.month}`} style={styles.monthHeader}>
          <Text style={styles.monthHeaderText}>{CALENDAR_MONTHS[row.month - 1]}</Text>
        </View>
      );
    }
    return renderEntry(row.entry);
  };

  return <Fragment>{ROWS.map((row) => renderRow(row))}</Fragment>;
}

const styles = StyleSheet.create({
  monthHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  monthHeaderText: {
    fontFamily: Fonts.serifDisplay,
    fontSize: 11,
    letterSpacing: tracking(11),
    color: Colors.beige100,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brown10,
    backgroundColor: Colors.bg,
  },
  rowDay: {
    width: 44,
    textAlign: 'left',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige100,
  },
  rowDayLocked: {
    width: 44,
    textAlign: 'left',
    fontFamily: Fonts.serifDisplay,
    fontSize: 14,
    color: Colors.beige50,
  },
  rowLockIcon: {
    width: 22,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown100,
  },
  rowTitleLocked: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    letterSpacing: tracking(13),
    color: Colors.brown50,
  },
  rowComposer: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    letterSpacing: tracking(11),
    color: Colors.beige100,
    marginTop: 2,
  },
  rowComposerLocked: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    letterSpacing: tracking(11),
    color: Colors.beige50,
    marginTop: 2,
  },
});
