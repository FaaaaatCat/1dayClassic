import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import MyPageShell from '@/components/mypage/MyPageShell';
import { useStackBack } from '@/components/mypage/useStackBack';
import SettingSection, { PreviewButton } from '@/components/mypage/SettingSection';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Spark } from '@/constants/theme';
import { useBgm } from '@/context/BgmContext';
import { useToast } from '@/context/ToastContext';
import { BGM_OPTIONS, type BgmId } from '@/lib/bgm';
import { resolveMediaUrl } from '@/lib/firebase';
import { MEDIA_HEADERS } from '@/lib/lessons';

/** 미리듣기는 앞부분만 — 고르는 데는 이만큼이면 충분하다. */
const PREVIEW_MS = 15000;

/**
 * 배경음악 설정 — 낭독 아래에 깔릴 음악을 고른다. 책 보기 설정과 같은 모양이다(SettingSection).
 *
 * 줄마다 오른쪽에 '미리듣기'가 있어 고르기 전에 들어 볼 수 있다. 한 번에 한 곡만 흐르고,
 * 다른 곡을 누르면 그 곡으로 바뀐다. 화면을 떠나면 멈춘다.
 *
 * 고른 것은 오른쪽 위 '저장'을 눌러야 실제 설정이 된다(책 보기 설정과 같이).
 */
export default function BgmScreen() {
  const goBack = useStackBack('/library');
  const { showToast } = useToast();
  const { bgmId, select } = useBgm();

  /**
   * 고르는 동안의 값. 들어올 때마다 저장된 값에서 다시 시작한다 — 저장하지 않고 나간 것은
   * 없던 일이 된다.
   */
  const [draft, setDraft] = useState<BgmId>(bgmId);

  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  /** 지금 미리 듣고 있는 곡. */
  const [previewing, setPreviewing] = useState<BgmId | null>(null);

  const stopPreview = useCallback(() => {
    // 스택에서 걷혀 화면이 사라질 때는 useAudioPlayer가 플레이어를 먼저 풀어 버린다 — 그 뒤에
    // 부르는 pause는 '이미 풀린 객체'라며 던진다. 풀렸으면 이미 멈춘 것이니 넘어간다.
    try {
      player.pause();
    } catch {}
    setPreviewing(null);
  }, [player]);

  useFocusEffect(
    useCallback(() => {
      setDraft(bgmId);
      // 화면을 떠나면 미리듣기를 멈춘다.
      return () => stopPreview();
    }, [bgmId, stopPreview]),
  );

  // 앞부분만 들려주고 멈춘다. 버튼은 플레이어가 실제로 흐르는지를 보고 그리므로 여기서는
  // 플레이어만 세운다.
  useEffect(() => {
    if (previewing && (status.currentTime ?? 0) * 1000 >= PREVIEW_MS) player.pause();
  }, [status.currentTime, previewing, player]);

  /** 이 곡이 지금 흐르고 있는가 — 고른 곡이고 플레이어가 실제로 재생 중일 때. */
  const isPlaying = (id: BgmId) => previewing === id && status.playing;

  const togglePreview = async (id: BgmId, source: string) => {
    if (isPlaying(id)) {
      stopPreview();
      return;
    }
    setPreviewing(id);
    try {
      const uri = await resolveMediaUrl(source);
      player.replace({ uri, headers: MEDIA_HEADERS });
      player.seekTo(0).catch(() => {});
      player.play();
    } catch (error) {
      console.warn('[bgm] 미리듣기 실패:', error);
      setPreviewing(null);
    }
  };

  const save = () => {
    stopPreview();
    if (draft !== bgmId) select(draft);
    showToast('배경음악 설정을 저장했습니다');
    // 저장했으면 마이페이지로 — 스택에서 이 한 장을 걷는다.
    goBack();
  };

  return (
    <MyPageShell
      title="배경음악 설정"
      action={<HeaderTextButton label="저장" color={Spark.ember} onPress={save} />}>
      <SettingSection
        first
        title="배경음악 설정"
        icon="musical-note-outline"
        picked={draft}
        onPick={(id) => setDraft(id as BgmId)}
        options={BGM_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          right: option.source ? (
            <PreviewButton
              label={option.label}
              playing={isPlaying(option.id)}
              onPress={() => togglePreview(option.id, option.source as string)}
            />
          ) : null,
        }))}
      />
    </MyPageShell>
  );
}
