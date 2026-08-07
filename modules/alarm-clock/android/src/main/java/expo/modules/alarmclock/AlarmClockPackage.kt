package expo.modules.alarmclock

import android.content.Context
import expo.modules.core.BasePackage
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * MainActivity의 생명주기에 알람 플로우 리스너를 꽂는다.
 *
 * MainActivity는 expo prebuild가 만드는 android/ 아래 생성 파일이라 직접 고칠 수 없다
 * (고쳐도 다음 prebuild에 사라진다). 이 Package는 파일명 규약(`*Package.kt`)만으로
 * ExpoModulesPackageList에 자동 등록되므로, git에 들어가는 이 모듈 안에서 후킹이 끝난다.
 */
class AlarmClockPackage : BasePackage() {
  override fun createReactActivityLifecycleListeners(
    activityContext: Context?
  ): List<ReactActivityLifecycleListener> = listOf(AlarmFlowLifecycleListener())
}
