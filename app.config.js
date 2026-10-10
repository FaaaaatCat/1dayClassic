/**
 * 앱을 세 벌로 빌드한다 — APP_VARIANT 환경 변수가 어느 벌인지 정한다(eas.json의 env).
 *
 * - production: 플레이 스토어에 올릴 앱. app.json 그대로(com.onedayalarm.app, '하루서점').
 * - demo: 출판사에 건넬 데모 APK. 패키지 이름을 따로 두어(com.onedayalarm.app.demo) 개발용
 *   앱과 한 폰에 같이 깔린다. 개발용과 같은 서명이 아니어도 충돌하지 않는다.
 * - (없음): 이 컴퓨터에서 `expo run:android`로 까는 개발용 앱. 데모 앱과 나란히 있을 때
 *   헷갈리지 않게 이름 뒤에 '개발'을 붙인다.
 *
 * 데모 앱은 google-services.json을 쓰지 않는다. 그 파일에는 정식 패키지 이름만 등록돼 있어
 * 다른 이름으로 빌드하면 빌드가 멈추는데, 이 앱의 Firebase는 자바스크립트 SDK(lib/firebase.ts)가
 * 제 설정으로 붙으므로 네이티브 쪽 파일이 없어도 음원·표지를 그대로 받아 온다.
 *
 * 링크 스킴(1dayclassic)은 셋이 같다. 알람이 앱을 여는 인텐트는 그 앱의 첫 화면을 직접
 * 지목하므로(MainActivityIntent) 두 앱이 깔려 있어도 서로 엉키지 않는다.
 */
const VARIANT = process.env.APP_VARIANT;

module.exports = ({ config }) => {
  if (VARIANT === 'production') return config;

  if (VARIANT === 'demo') {
    const { googleServicesFile: _unused, ...android } = config.android;
    return {
      ...config,
      android: { ...android, package: 'com.onedayalarm.app.demo' },
    };
  }

  return { ...config, name: `${config.name} 개발` };
};
