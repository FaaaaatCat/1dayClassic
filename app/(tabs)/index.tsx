import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlarmDetailScreen from '@/app/(tabs)/alarm-detail';
import BookCoverArt from '@/components/book/BookCoverArt';
import BookOpening, { LightVeil, OPENING_MS, veilAt } from '@/components/book/BookOpening';
import HomeLayout, { COVER_W } from '@/components/home/HomeLayout';
import { freshVisit } from '@/components/reading/ReadingFlow';
import WelcomeSheet from '@/components/splash/WelcomeSheet';
import { StatusBarTint } from '@/components/StatusBarTint';
import { Ink } from '@/constants/theme';
import { useAlarm } from '@/context/AlarmContext';
import { useBookSelection } from '@/context/BookSelectionContext';
import { useQuiz } from '@/context/QuizContext';
import { useReaderSettings } from '@/context/ReaderSettingsContext';
import { useReadingCursor } from '@/context/ReadingCursorContext';
import { getBookName } from '@/lib/books';
import { getCatalogBookByBookId } from '@/lib/catalog';
import { getBookCoverPlan } from '@/lib/cover';
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
 *
 * ── 책 오픈 효과 ──
 * 읽기를 누르면 서 있던 책이 이 화면 위에서 펼쳐지고(BookOpening), 빛이 화면을 다 덮은 채로
 * 오늘의 공부로 넘어간다(entry=veil — 그쪽에서 흰 화면이 걷히며 첫표지가 드러난다). 책 보기
 * 설정에서 끄면, 또는 표지가 그림이라 펼칠 수 없으면 곧장 넘어간다(entry=fade). 효과는 이 버튼에만
 * 걸린다 — 다음 화 읽기·알람은 오늘의 공부를 곧장 연다.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alarm } = useAlarm();
  const { selectedBookId } = useBookSelection();
  const { isDone } = useQuiz();
  const { cursorOf } = useReadingCursor();
  const { settings: readerSettings } = useReaderSettings();

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
  /**
   * 책이 펼쳐지는 진행(0~1). 펼쳐지는 동안은 다시 누르지 않는다(opening).
   * 돌아오면 닫힌 책으로 — 홈은 떠나도 사라지지 않아, 그대로 두면 빛으로 덮인 채 남는다.
   */
  const opening = useSharedValue(0);
  const [openingBusy, setOpeningBusy] = useState(false);
  const whiten = useSharedValue(0);
  const veil = useDerivedValue(() => veilAt(opening.value));

  /*
   * 돌아올 때뿐 아니라 떠날 때도 닫힌 책으로 되돌린다. 떠날 때 되돌리지 않으면 홈은 빛으로 다
   * 덮인 채(opening=1) 남아 있다가, 오늘의 공부에서 돌아오는 순간 하얀 화면이 먼저 비치고서야
   * 닫힌 책으로 바뀌었다 — 홈으로 돌아가는 데 로딩이 걸리는 것처럼 보였다. 떠나는 때는 오늘의
   * 공부가 이미 위를 덮은 뒤라 되돌려도 보이지 않는다.
   */
  useFocusEffect(
    useCallback(() => {
      setAlarmOpen(false);
      opening.set(0);
      setOpeningBusy(false);
      return () => {
        opening.set(0);
        setOpeningBusy(false);
      };
    }, [opening]),
  );

  const book = getCatalogBookByBookId(selectedBookId);
  const progress = getReadingProgress(selectedBookId, isDone);
  /** 그린 표지만 펼칠 수 있다 — 표지가 그림이면 앞표지·면지를 따로 그릴 수 없다. */
  const coverPlan = getBookCoverPlan(selectedBookId, book?.coverImage, book?.coverDesign);
  const canOpen = readerSettings.bookOpen === 'on' && coverPlan.kind === 'design';
  /**
   * 읽기 버튼이 열 항목과, 말풍선이 뭐라고 부를지.
   *
   * 기준은 '마지막으로 끝낸 화'다 — 그 다음을 연다(갈래는 lib/progress의 getReadPlan).
   * 읽다 만 화는 끝난 것이 아니라서 그 화가 다시 열린다. 진행 줄이 보는 퀴즈 기록과는
   * 서로 다른 물음이라 값도 따로 온다.
   */
  const plan = getReadPlan(selectedBookId, cursorOf(selectedBookId));

  /**
   * 오늘의 공부를 연다. t — 오늘의 공부가 첫표지부터 새로 서게 하는 값(app/(tabs)/today의
   * visitKey 주석).
   */
  const goToday = useCallback(
    (lessonId: string, entry: 'veil' | 'fade') => {
      router.push({
        pathname: '/today',
        params: { bookId: selectedBookId, lessonId, entry, t: freshVisit() },
      });
    },
    [router, selectedBookId],
  );

  const openResume = () => {
    if (!plan || openingBusy) return;
    if (!canOpen) {
      goToday(plan.lessonId, 'fade');
      return;
    }
    // 책이 펼쳐지고 빛이 화면을 다 덮은 순간 넘어간다.
    setOpeningBusy(true);
    const lessonId = plan.lessonId;
    opening.set(0);
    opening.set(
      withTiming(1, { duration: OPENING_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(goToday)(lessonId, 'veil');
      }),
    );
  };

  /** 책 말고 나머지는 표지가 열리기 시작하면 어둠 속으로 물러난다. */
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opening.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
  }));

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
          // 그린 표지는 늘 펼쳐지는 책으로 그린다 — 효과를 끈 날과 켠 날의 홈이 똑같아 보이게.
          coverPlan.kind === 'design' ? (
            <BookOpening design={coverPlan.design} width={COVER_W} progress={opening} />
          ) : (
            <BookCoverArt
              bookId={selectedBookId}
              coverImage={book?.coverImage}
              coverDesign={book?.coverDesign}
              width={COVER_W}
              standing
            />
          )
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
        chromeStyle={chromeStyle}
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

      {/* 책 오픈 효과의 끝 — 빛이 화면을 다 덮는다. 오늘의 공부가 같은 흰빛에서 이어받는다. */}
      <LightVeil opacity={veil} whiten={whiten} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Ink.primary,
  },
});
