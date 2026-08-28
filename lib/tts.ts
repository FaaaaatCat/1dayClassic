import * as Speech from 'expo-speech';

/**
 * 시스템 TTS에서 가장 나은 한국어 목소리를 고른다.
 * (Enhanced > 네트워크 보이스 > 첫 번째 한국어 보이스)
 *
 * 못 고르면 undefined를 준다 — 그때는 엔진 기본 목소리로 말한다.
 */
export async function pickKoreanVoice(): Promise<string | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const korean = voices.filter((v) => {
      // 'ko'로 시작만 검사하면 콘칸어(kok-IN)까지 걸리므로 언어 코드를 정확히 비교한다.
      const lang = v.language?.toLowerCase().replace('_', '-');
      return lang === 'ko' || lang?.startsWith('ko-');
    });
    if (korean.length === 0) return undefined;

    const preferred =
      korean.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ??
      korean.find((v) => v.identifier.includes('network')) ??
      korean[0];
    return preferred.identifier;
  } catch {
    // 목소리 조회에 실패해도 낭독은 해야 한다.
    return undefined;
  }
}

/**
 * 낭독 공통 옵션.
 *
 * 음높이와 속도를 1.0으로 못박는 건 기기의 TTS 설정에 좌우되지 않게 하려는 것이다.
 * 시스템 음높이가 비정상인 기기(실측 186%)에서는 목소리가 짓눌린 것처럼 들린다.
 */
export function koreanSpeech(voice: string | undefined): Speech.SpeechOptions {
  return { language: 'ko-KR', voice, pitch: 1.0, rate: 1.0 };
}
