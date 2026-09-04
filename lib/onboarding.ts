import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 첫 실행을 마쳤는지.
 *
 * 값은 있고 없고만 본다 — 무엇이 들어 있는지는 보지 않는다. 온보딩이 물은 것들(책·알람)은
 * 각자 제 자리에 저장되므로 여기에 다시 적을 것이 없다.
 */
const STORAGE_KEY = 'onboarded-v1';

/**
 * 권한 안내를 이미 한 번 했는지 — app/_layout.tsx의 첫 실행 안내가 보는 값.
 *
 * 온보딩이 권한을 제대로 묻고 나면 그 안내는 다시 할 말이 없으므로, 마치면서 여기에도
 * 적어 둔다. 키를 이 파일에 둔 건 '첫 실행에 한 번' 하는 일들을 한자리에 모으기 위해서다.
 */
export const PERMISSION_PROMPT_KEY = 'alarm-permission-prompted-v1';

/**
 * 온보딩을 이미 마쳤나.
 *
 * 읽지 못하면 '마쳤다'로 본다. 저장소가 말썽일 때 온보딩을 다시 띄우면, 이미 쓰던 사람이
 * 책을 다시 고르고 알람을 다시 맞추게 된다 — 한 번 더 보는 쪽보다 그쪽이 나쁘다.
 */
export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) !== null;
  } catch (error) {
    console.warn('[onboarding] 첫 실행 여부 읽기 실패:', error);
    return true;
  }
}

/** 온보딩을 마쳤다고 적는다. 마친 날짜를 남기는 건 나중에 들여다볼 때를 위해서다. */
export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('[onboarding] 첫 실행 기록 실패:', error);
  }
}

/** 권한 안내는 이미 했다고 적는다 — 온보딩이 직접 물었으니 또 안내할 것이 없다. */
export async function markPermissionPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_PROMPT_KEY, 'true');
  } catch (error) {
    console.warn('[onboarding] 권한 안내 기록 실패:', error);
  }
}

/** 다시 첫 실행으로 되돌린다 — 개발용(설정 화면에서 부른다). */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, PERMISSION_PROMPT_KEY]);
  } catch (error) {
    console.warn('[onboarding] 첫 실행 기록 지우기 실패:', error);
  }
}
