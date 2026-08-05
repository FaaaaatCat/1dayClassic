/**
 * 낭독 배경음악 목록.
 *
 * 항목마다 음원을 두던 방식을 걷어내고, 사용자가 설정에서 고른 한 곡을 모든 낭독에 깔아 준다.
 * 음원 파일은 Firebase Storage에 있고, 경로는 `resolveMediaUrl`이 다운로드 URL로 바꾼다.
 */
export type BgmId = 'calm' | 'peaceful' | 'lively' | 'none';

export interface BgmOption {
  id: BgmId;
  label: string;
  /** Firebase Storage 경로. '없음'만 비어 있다. */
  source?: string;
}

/** 설정 화면에 보이는 순서 그대로다. */
export const BGM_OPTIONS: readonly BgmOption[] = [
  { id: 'calm', label: '고요한', source: 'musics/bgm/고요한.mp3' },
  { id: 'peaceful', label: '평화로운', source: 'musics/bgm/평화로운.mp3' },
  { id: 'lively', label: '경쾌한', source: 'musics/bgm/경쾌한.mp3' },
  { id: 'none', label: '없음' },
];

export const DEFAULT_BGM_ID: BgmId = 'calm';

export function findBgm(id: BgmId): BgmOption {
  return BGM_OPTIONS.find((option) => option.id === id) ?? BGM_OPTIONS[0];
}

/** 저장된 값이 예전 것이거나 손상됐을 때를 걸러 낸다. */
export function isBgmId(value: unknown): value is BgmId {
  return BGM_OPTIONS.some((option) => option.id === value);
}
