import * as Speech from 'expo-speech';

/**
 * 시스템 TTS에서 가장 나은 한국어 목소리를 고른다.
 * (Enhanced > 네트워크 보이스 > 첫 번째 한국어 보이스)
 *
 * 못 고르면 undefined를 준다 — 그때는 엔진 기본 목소리로 말한다.
 */
/**
 * 남녀 목소리를 가르는 단서. 기기 TTS는 목소리에 성별을 적어 주지 않아서 이름으로 짐작한다.
 *
 * 구글 TTS의 한국어 목소리는 ism·kob가 여자, koc·kod가 남자다(ko-kr-x-kob-local 꼴). 이름에
 * female/male이 들어간 엔진도 있다. 어느 단서에도 안 걸리면(삼성 TTS 등) 고를 수 없으므로
 * 성별과 상관없는 기본 목소리로 읽는다.
 */
const VOICE_HINTS: Record<'female' | 'male', RegExp> = {
  female: /(-ism-|-kob-|female|woman|여)/i,
  male: /(-koc-|-kod-|(^|[^e])male|man\b|남)/i,
};

export async function pickKoreanVoice(gender?: 'female' | 'male'): Promise<string | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const korean = voices.filter((v) => {
      // 'ko'로 시작만 검사하면 콘칸어(kok-IN)까지 걸리므로 언어 코드를 정확히 비교한다.
      const lang = v.language?.toLowerCase().replace('_', '-');
      return lang === 'ko' || lang?.startsWith('ko-');
    });
    if (korean.length === 0) return undefined;

    if (gender) {
      const hint = VOICE_HINTS[gender];
      const matched = korean.filter((v) => hint.test(`${v.identifier} ${v.name}`));
      const best =
        matched.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ??
        matched.find((v) => !v.identifier.includes('network')) ??
        matched[0];
      if (best) return best.identifier;
    }

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
