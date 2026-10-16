import * as Speech from 'expo-speech';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import MyPageShell from '@/components/mypage/MyPageShell';
import { useStackBack } from '@/components/mypage/useStackBack';
import SettingSection, { PreviewButton } from '@/components/mypage/SettingSection';
import { HeaderTextButton } from '@/components/ScreenHeader';
import { Spark } from '@/constants/theme';
import {
  useReaderSettings,
  type ReaderAutoRead,
  type ReaderVoice,
} from '@/context/ReaderSettingsContext';
import { useToast } from '@/context/ToastContext';
import { koreanSpeech, pickKoreanVoice } from '@/lib/tts';

/** 목소리 미리듣기로 읽어 볼 한 줄. */
const SAMPLE = '오늘의 한 쪽을 읽어 드릴게요.';

const VOICES: { id: ReaderVoice; label: string }[] = [
  { id: 'female', label: '여자' },
  { id: 'male', label: '남자' },
];

const AUTO_READ: { id: ReaderAutoRead; label: string }[] = [
  { id: 'on', label: '켜기' },
  { id: 'off', label: '끄기' },
];

/**
 * TTS 설정 — 낭독 목소리(여자·남자)와 자동읽기(켜기·끄기). 배경음악 설정과 같은 모양이다.
 *
 * 목소리는 기기의 한국어 TTS 목소리 가운데 그 성별로 짐작되는 것을 고른다(lib/tts의
 * pickKoreanVoice). 기기에 그런 목소리가 없으면 기본 목소리로 읽는다 — 미리듣기로 확인할 수
 * 있다. 자동읽기를 켜면 오늘의 공부를 열자마자 낭독이 시작된다.
 *
 * 고른 것은 오른쪽 위 '저장'을 눌러야 실제 설정이 된다.
 */
export default function TtsScreen() {
  const goBack = useStackBack('/library');
  const { showToast } = useToast();
  const { settings, update } = useReaderSettings();

  const [voice, setVoice] = useState<ReaderVoice>(settings.voice);
  const [autoRead, setAutoRead] = useState<ReaderAutoRead>(settings.autoRead);
  const [previewing, setPreviewing] = useState<ReaderVoice | null>(null);

  const stopPreview = useCallback(() => {
    Speech.stop();
    setPreviewing(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setVoice(settings.voice);
      setAutoRead(settings.autoRead);
      return () => stopPreview();
    }, [settings.voice, settings.autoRead, stopPreview]),
  );

  const togglePreview = async (gender: ReaderVoice) => {
    if (previewing === gender) {
      stopPreview();
      return;
    }
    Speech.stop();
    setPreviewing(gender);
    const identifier = await pickKoreanVoice(gender);
    Speech.speak(SAMPLE, {
      ...koreanSpeech(identifier),
      onDone: () => setPreviewing((current) => (current === gender ? null : current)),
      onStopped: () => setPreviewing((current) => (current === gender ? null : current)),
      onError: () => setPreviewing(null),
    });
  };

  const save = () => {
    stopPreview();
    if (voice !== settings.voice) update('voice', voice);
    if (autoRead !== settings.autoRead) update('autoRead', autoRead);
    showToast('TTS 설정을 저장했습니다');
    // 저장했으면 마이페이지로 — 스택에서 이 한 장을 걷는다.
    goBack();
  };

  return (
    <MyPageShell
      title="TTS 설정"
      action={<HeaderTextButton label="저장" color={Spark.ember} onPress={save} />}>
      <SettingSection
        first
        title="보이스 설정"
        icon="mic-outline"
        picked={voice}
        onPick={(id) => setVoice(id as ReaderVoice)}
        options={VOICES.map((option) => ({
          id: option.id,
          label: option.label,
          right: (
            <PreviewButton
              label={`${option.label} 목소리`}
              playing={previewing === option.id}
              onPress={() => togglePreview(option.id)}
            />
          ),
        }))}
      />
      <SettingSection
        title="자동읽기 설정"
        icon="headset-outline"
        picked={autoRead}
        onPick={(id) => setAutoRead(id as ReaderAutoRead)}
        options={AUTO_READ}
      />
    </MyPageShell>
  );
}
