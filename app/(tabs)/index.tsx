import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlarmDetailScreen from '@/app/(tabs)/alarm-detail';
import BookCoverArt from '@/components/book/BookCoverArt';
import HomeLayout, { COVER_W } from '@/components/home/HomeLayout';
import WelcomeSheet from '@/components/splash/WelcomeSheet';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Ink } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getReadingProgress, getReadPlan } from '@/lib/progress';

/**
 * 홈.
 *
 * 지금 읽는 책 한 권이 검은 화면 한가운데 서 있고, 그 아래 문 셋이 있다 — 목차, 읽기,
 * 리포트. 이 앱에서 유일하게 어두운 화면이던 뷰어에 이어 여기도 어둡게 둔 건, 홈이
 * 책장에서 책 한 권을 꺼내 든 장면이기 때문이다.
 *
 * 예전에는 오늘 한 장(표지 사진 + 제목 + 읽기 버튼)과 목차 목록이 이 화면에 함께 있었다.
 * 목차는 제 화면(app/(tabs)/toc.tsx)으로 떼어냈고, 오늘 한 장은 가운데 읽기 버튼 하나가
 * 대신한다 — 홈이 말하는 것은 '오늘 무엇을 읽는가'가 아니라 '지금 어떤 책을 읽고 있는가'다.
 * 그래서 읽기 버튼도 '오늘'이 아니라 '아직 안 읽은 첫 자리'를 연다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();

  /** 알람 설정 — 화면을 갈아 끼우지 않고 이 위에 띄운다. */
  const [alarmOpen, setAlarmOpen] = useState(false);

  /**
   * 첫 실행을 막 마치고 왔나 — 그때만 환영 창을 띄운다.
   *
   * 첫 그림을 그릴 때 한 번만 읽는다. 뒤에 파라미터가 남아 있어도 다시 뜨지 않아야 한다 —
   * 닫은 창이 홈에 돌아올 때마다 다시 올라오면 그건 환영이 아니라 방해다.
   */
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const [welcoming, setWelcoming] = useState(welcome === '1');

  /** 떠났다 돌아오면 알람 창은 닫혀 있어야 한다 — 홈은 Tabs의 형제라 떠나도 사라지지 않는다. */
  useFocusEffect(
    useCallback(() => {
      setAlarmOpen(false);
    }, []),
  );

  const book = getCatalogBookByBookId(selectedBookId);
  const progress = getReadingProgress(selectedBookId, isDone);
  /**
   * 읽기 버튼이 열 항목과, 말풍선이 뭐라고 부를지.
   *
   * 기준은 '마지막으로 끝낸 화'다 — 그 다음을 연다(갈래는 lib/progress의 getReadPlan).
   * 읽다 만 화는 끝난 것이 아니라서 그 화가 다시 열린다. 진행 줄이 보는 퀴즈 기록과는
   * 서로 다른 물음이라 값도 따로 온다.
   */
  const plan = getReadPlan(selectedBookId, cursorOf(selectedBookId));

  const openResume = () => {
    if (!plan) return;
    router.push({
      pathname: '/today',
      params: { bookId: selectedBookId, lessonId: plan.lessonId },
    });
  };

  /** 리포트 — 그 책에 쌓인 기록(진도·정답률·책갈피·노트·마지막으로 읽은 날). */
  const openReport = () =>
    router.push({
      pathname: '/library/book/[id]',
      params: { id: selectedBookId, from: 'home' },
    });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 화면이 검으므로 상태바도 검게 — 띠가 화면 속으로 이어져 보인다. */}
      <StatusBarTint />

      <HomeLayout
        cover={
          <BookCoverArt
            bookId={selectedBookId}
            coverImage={book?.coverImage}
            coverDesign={book?.coverDesign}
            width={COVER_W}
            standing
          />
        }
        title={book?.title ?? getBookName(selectedBookId)}
        author={book?.author}
        alarm={alarm}
        readPages={progress.readPages}
        totalPages={progress.totalPages}
        plan={plan}
        onBookstore={() => router.push('/bookstore')}
        onAlarm={() => setAlarmOpen(true)}
        onMyPage={() => router.push('/library')}
        onToc={() => router.push('/toc')}
        onRead={openResume}
        onReport={openReport}
      />

      {/* 알람 설정 — 화면을 옮기지 않고 이 위에 띄운다. */}
      <Modal
        visible={alarmOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAlarmOpen(false)}>
        <AlarmDetailScreen onClose={() => setAlarmOpen(false)} />
      </Modal>

      {/*
        첫 실행을 막 마치고 왔을 때만 뜨는 환영 창. 홈 위로 올라오고, 다 올라온 뒤에
        축하 포탄이 터진다. 한 번 닫으면 다시 뜨지 않는다 — 파라미터는 그 한 번을
        알리는 신호일 뿐이라 어디에도 저장하지 않는다(app/onboarding.tsx가 붙여 보낸다).
      */}
      {welcoming ? <WelcomeSheet onDone={() => setWelcoming(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
