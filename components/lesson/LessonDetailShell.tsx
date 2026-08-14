import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AudioListenSheet from '@/components/lesson/AudioListenSheet';
import { LessonDetailContext } from '@/components/lesson/LessonDetailContext';
import ScaleButton from '@/components/ScaleButton';
import { Colors } from '@/constants/theme';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { getBookName, getLessonHeading, type BookLesson } from '@/lib/books';
import { useAlarmLockFlow } from '@/modules/alarm-clock';

interface Props {
  bookLesson: BookLesson;
  children: ReactNode;
}

/**
 * 항목 상세 화면의 껍데기 — 9권이 공용으로 쓴다.
 *
 * 고정 헤더가 없다. 화면을 벗어나는 유일한 길인 닫기(X)만 화면 우측 상단에 고정해
 * 스크롤과 무관하게 항상 눌리게 두고, 나머지(children)는 스크롤되는 본문으로 그린다.
 * 재생 컨트롤은 `LessonDetailContext.openAudio`로 열리는 AudioListenSheet 팝업에 모여 있다.
 */
export default function LessonDetailShell({ bookLesson, children }: Props) {
  const params = useLocalSearchParams<{ autoplay?: string }>();
  const { autoplay } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPlaying, isLoading, hasError, togglePlay, restart, stop } = useAudioPlayer();
  const [sheetVisible, setSheetVisible] = useState(false);
  // 잠금 위 알람 플로우에서는 이 화면을 벗어날 길이 없어야 한다 — 닫기가 유일한 출구라 감춘다.
  const lockFlow = useAlarmLockFlow();

  /**
   * 잠금 중에는 뒤로가기를 삼킨다.
   *
   * 네이티브 리스너(AlarmFlowLifecycleListener.onBackPressed)만으로는 막히지 않는다 —
   * expo의 ReactActivityDelegateWrapper가 리스너 반환값과 무관하게 delegate.onBackPressed()를
   * 호출하고, 그 경로가 invokeDefaultOnBackPressed()로 이어져 액티비티를 끝낸다(실측 확인).
   * RN의 BackHandler에서 true를 반환해야 그 경로가 차단된다.
   */
  useEffect(() => {
    if (!lockFlow) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [lockFlow]);

  const lesson = bookLesson.lesson;
  const bookName = getBookName(bookLesson.book);
  // 낭독 멘트에 쓸 이름 — 항목만으로는 못 만든다(표제 필드가 책마다 다르고 책 이름은 카탈로그에 있다).
  const narrationLabels = { bookName, lessonTitle: getLessonHeading(bookLesson).title };

  // 알람 알림을 탭해서 들어온 경우(autoplay=타임스탬프) 자동으로 재생을 시작한다.
  // autoplay 값은 탭마다 새로 생성돼서, 같은 항목이어도(반복 알람) 매번 다시 트리거된다.
  const handledAutoplayRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoplay) return;
    if (handledAutoplayRef.current === autoplay) return;
    handledAutoplayRef.current = autoplay;
    togglePlay(lesson, narrationLabels);
    setSheetVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  // /today는 탭 라우트라 파라미터만 바뀌면 이 컴포넌트와 재생 훅이 그대로 유지된다.
  // 그때 걷어내지 않으면 앞 항목의 재생 상태('일시정지' 표시)가 다음 항목에 남는다.
  // 첫 렌더에서는 실행하지 않는다 — 알람 자동재생 효과가 방금 시작한 재생을 멈춰 버린다.
  const shownLessonKey = `${bookLesson.book}:${lesson.id}`;
  const shownLessonKeyRef = useRef(shownLessonKey);
  useEffect(() => {
    if (shownLessonKeyRef.current === shownLessonKey) return;
    shownLessonKeyRef.current = shownLessonKey;
    stop();
    setSheetVisible(false);
  }, [shownLessonKey, stop]);

  /** '오디오 듣기' — 재생 토글을 실행하고 팝업을 띄운다. */
  const openAudio = () => {
    togglePlay(lesson, narrationLabels);
    setSheetVisible(true);
  };

  /** 팝업 닫기 — 재생도 함께 멈춘다. */
  const closeAudioSheet = () => {
    stop();
    setSheetVisible(false);
  };

  return (
    <LessonDetailContext.Provider value={{ bookLesson, bookName, openAudio }}>
      <View style={styles.screen}>
        {/* 닫기 — 헤더가 없어져서 이 화면을 벗어나는 유일한 길.
            ScaleButton은 Pressable로 감싼 뒤 내부 Animated.View에만 style을 넣는 구조라,
            position:absolute를 ScaleButton에 직접 주면 크기가 0인 바깥 Pressable을 기준으로
            계산돼 엉뚱한 자리(눌리지 않는 버튼)가 된다. 그래서 위치는 이 wrapper가 잡고
            ScaleButton은 크기만 갖는다(AudioListenSheet의 닫기 버튼과 같은 패턴).

            잠금 위 알람 플로우에서는 이 버튼을 아예 그리지 않는다 — 유일한 출구를 막아야
            잠금 상태에서 오늘의 공부를 벗어날 수 없다. */}
        {!lockFlow && (
          <View style={[styles.closeButtonWrap, { top: insets.top + 12 }]}>
            <ScaleButton
              accessibilityLabel="닫기"
              style={styles.closeButton}
              onPress={() => router.replace('/')}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={Colors.brown50}
                size={18}
              />
            </ScaleButton>
          </View>
        )}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <AudioListenSheet
          visible={sheetVisible}
          isPlaying={isPlaying}
          isLoading={isLoading}
          hasError={hasError}
          onTogglePlay={() => togglePlay(lesson, narrationLabels)}
          onRestart={() => restart(lesson, narrationLabels)}
          onClose={closeAudioSheet}
        />
      </View>
    </LessonDetailContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // 닫기 — 헤더 없이 화면 우측 상단에 고정. 위치는 wrap이, 크기·모양은 ScaleButton이 갖는다.
  closeButtonWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    elevation: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brown10,
  },

  // Body — 스크롤 영역
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 200,
  },
});
