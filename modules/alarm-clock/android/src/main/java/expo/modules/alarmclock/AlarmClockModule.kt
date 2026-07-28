package expo.modules.alarmclock

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmInput : Record {
  @Field val hour: Int = 7
  @Field val minute: Int = 0
  @Field val repeatDays: List<Boolean> = List(7) { false }
  @Field val sound: String = "default"
  @Field val enabled: Boolean = true
}

class AlarmClockModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AlarmClock")

    AsyncFunction("scheduleAlarm") { input: AlarmInput ->
      AlarmPrefs.save(
        context,
        AlarmConfig(
          enabled = input.enabled,
          hour = input.hour,
          minute = input.minute,
          repeatDays = input.repeatDays,
          sound = input.sound
        )
      )
      // 기존 스누즈 예약이 남아 있으면 새 설정과 충돌하므로 함께 정리한다.
      AlarmScheduler.cancelAll(context)
      AlarmScheduler.scheduleNextWeeklyAlarm(context)
    }

    AsyncFunction("cancelAlarm") {
      val current = AlarmPrefs.load(context)
      AlarmPrefs.save(context, current.copy(enabled = false))
      AlarmScheduler.cancelAll(context)
    }

    AsyncFunction("getPermissionStatus") {
      mapOf(
        "notifications" to hasNotificationPermission(),
        "exactAlarm" to hasExactAlarmPermission(),
        "fullScreenIntent" to hasFullScreenIntentPermission()
      )
    }

    AsyncFunction("openAlarmPermissionSettings") {
      val intent = when {
        !hasExactAlarmPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
          Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:${context.packageName}"))

        !hasFullScreenIntentPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(Uri.parse("package:${context.packageName}"))

        else ->
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.parse("package:${context.packageName}"))
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  private fun hasNotificationPermission(): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.areNotificationsEnabled()
  }

  private fun hasExactAlarmPermission(): Boolean {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return AlarmScheduler.canScheduleExact(alarmManager)
  }

  /** Android 14부터 사용자가 끄고 켤 수 있다. 그 이전 버전은 항상 허용. */
  private fun hasFullScreenIntentPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
    val manager = context.getSystemService(NotificationManager::class.java)
    return manager.canUseFullScreenIntent()
  }
}
