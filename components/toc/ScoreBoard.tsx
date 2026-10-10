import { StyleSheet, Text, View } from 'react-native';

import { useBookStats } from '@/components/mypage/useBookStats';
import { Colors, Corner, Ink, Space, Spark, Surface, Type, TypeScale, trackBody } from '@/constants/theme';
import type { BookId } from '@/types';

/**
 * 성적 현황 — 목차 맨 위에 서는 두 칸짜리 판. 진행도와 오답률.
 *
 * 값은 리포트(서재의 책 상세)와 같은 셈을 쓴다(useBookStats) — 진행도는 읽은 쪽수를 책의 전체
 * 쪽수에 견주고, 오답률은 푼 문제 가운데 틀린 문제의 몫이다. 아직 푼 문제가 없으면 오답률은
 * 셀 것이 없으므로 숫자 대신 줄표를 둔다.
 *
 * 목차가 다크라 이 판도 다크다(한 단 올라온 brown90).
 */
export default function ScoreBoard({ bookId }: { bookId: BookId }) {
  const stats = useBookStats(bookId);
  const progress = stats.totalPages > 0 ? Math.round((stats.readPages / stats.totalPages) * 100) : 0;
  const wrong = stats.quizTotal - stats.quizCorrect;
  const wrongRate = stats.quizTotal > 0 ? Math.round((wrong / stats.quizTotal) * 100) : null;

  return (
    <View style={styles.board} accessibilityLabel="성적 현황">
      <Text style={styles.title}>성적 현황</Text>
      <View style={styles.cells}>
        <View style={styles.cell}>
          <Text style={styles.label}>진행도</Text>
          <Text style={styles.value}>
            {progress}
            <Text style={styles.unit}>%</Text>
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { flex: progress }]} />
            <View style={{ flex: 100 - progress }} />
          </View>
          <Text style={styles.note}>{`${stats.readPages}p / ${stats.totalPages}p`}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cell}>
          <Text style={styles.label}>오답률</Text>
          <Text style={styles.value}>
            {wrongRate === null ? '—' : wrongRate}
            {wrongRate === null ? null : <Text style={styles.unit}>%</Text>}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fillWrong, { flex: wrongRate ?? 0 }]} />
            <View style={{ flex: 100 - (wrongRate ?? 0) }} />
          </View>
          <Text style={styles.note}>
            {stats.quizTotal > 0 ? `틀린 ${wrong}문제 / 푼 ${stats.quizTotal}문제` : '아직 푼 문제가 없어요'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginHorizontal: Space[20],
    marginTop: Space[8],
    padding: Space[20],
    gap: Space[16],
    borderRadius: Corner.card,
    backgroundColor: Colors.brown90,
  },
  title: {
    fontFamily: Type.uiMedium,
    fontSize: 16,
    letterSpacing: trackBody(16),
    color: Ink.onDark,
  },
  cells: {
    flexDirection: 'row',
    gap: Space[16],
  },
  cell: {
    flex: 1,
    gap: Space[8],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Ink.strong,
  },
  label: {
    fontFamily: Type.ui,
    ...TypeScale.bodySm,
    color: Ink.muted,
  },
  value: {
    fontFamily: Type.displayLight,
    fontSize: 32,
    lineHeight: 38,
    color: Ink.onDark,
  },
  unit: {
    fontFamily: Type.ui,
    fontSize: 16,
    color: Ink.muted,
  },
  /** 막대 — 홈의 진행 줄과 같은 4px. 진행도는 주황, 오답률은 한 단 밝은 회색이다. */
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: Ink.strong,
  },
  fill: {
    backgroundColor: Spark.ember,
  },
  fillWrong: {
    backgroundColor: Surface.plate,
  },
  note: {
    fontFamily: Type.ui,
    ...TypeScale.caption,
    color: Ink.body,
  },
});
