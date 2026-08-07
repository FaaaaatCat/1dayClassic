package expo.modules.alarmclock

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.IBinder
import android.os.PowerManager
import android.util.Log

/**
 * 알람이 울리는 동안 살아 있는 포그라운드 서비스.
 *
 * AlarmActivity의 생명주기와 완전히 독립적이다 — 사용자가 알람 화면을 밀어 닫거나 화면이
 * 꺼져도, 끄기/스누즈를 누를 때까지 소리가 계속된다.
 */
class AlarmRingingService : Service() {

  companion object {
    const val ACTION_DISMISS = "com.onedayalarm.app.ALARM_DISMISS"
    const val ACTION_SNOOZE = "com.onedayalarm.app.ALARM_SNOOZE"

    private const val TAG = "AlarmRingingService"
    private const val CHANNEL_ID = "alarm-ringing"
    private const val NOTIFICATION_ID = 1001
    private const val WAKELOCK_TAG = "1dayclassic:alarm"
    /** 어떤 이유로든 서비스가 정상 종료되지 못했을 때 배터리를 계속 소모하지 않도록 하는 안전장치. */
    private const val WAKELOCK_TIMEOUT_MS = 10L * 60L * 1000L

    fun start(context: Context) {
      val intent = Intent(context, AlarmRingingService::class.java)
      context.startForegroundService(intent)
    }

    fun dismissIntent(context: Context): Intent =
      Intent(context, AlarmRingingService::class.java).apply { action = ACTION_DISMISS }

    fun snoozeIntent(context: Context): Intent =
      Intent(context, AlarmRingingService::class.java).apply { action = ACTION_SNOOZE }
  }

  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_DISMISS -> {
        stopEverything()
        return START_NOT_STICKY
      }
      ACTION_SNOOZE -> {
        AlarmScheduler.scheduleSnooze(this)
        stopEverything()
        return START_NOT_STICKY
      }
    }

    acquireWakeLock()
    startForeground(NOTIFICATION_ID, buildNotification())
    startAlarmSound()
    return START_STICKY
  }

  override fun onDestroy() {
    stopEverything()
    super.onDestroy()
  }

  private fun acquireWakeLock() {
    if (wakeLock != null) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG).apply {
      setReferenceCounted(false)
      acquire(WAKELOCK_TIMEOUT_MS)
    }
  }

  private fun startAlarmSound() {
    if (mediaPlayer != null) return

    val config = AlarmPrefs.load(this)

    // 기기에 기본 알람음이 설정돼 있지 않으면 getDefaultUri가 null을 반환한다. 그대로 두면
    // 소리 없이 진동/알림만 울려 "알람이 안 울렸다"가 되므로, 번들 음원으로 폴백한다.
    val primaryUri = if (config.sound == "custom") bundledAlarmUri() else systemAlarmUri()
    val fallbackUri = bundledAlarmUri()

    mediaPlayer = startPlaying(primaryUri)
      ?: if (primaryUri != fallbackUri) {
        Log.w(TAG, "기본 알람음 재생 실패 — 번들 음원으로 폴백합니다")
        startPlaying(fallbackUri)
      } else {
        null
      }
  }

  private fun bundledAlarmUri(): Uri =
    Uri.parse("android.resource://$packageName/${R.raw.alarm_1}")

  private fun systemAlarmUri(): Uri? =
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)

  /**
   * 지정한 음원으로 재생을 시작하고 MediaPlayer를 반환한다. 실패하면 null.
   *
   * 실패 시 이미 생성된 MediaPlayer를 반드시 release() 한다 — 그냥 버리면 필드에 담기지
   * 않아 stopEverything()이 회수하지 못하고 네이티브 리소스가 파이널라이저까지 남는다.
   */
  private fun startPlaying(uri: Uri?): MediaPlayer? {
    if (uri == null) return null

    // USAGE_ALARM으로 지정하면 ALARM 스트림을 타게 되어, 별도 알람 볼륨으로 제어되고
    // 방해금지(Zen) 정책이 알람을 기본 허용 카테고리로 취급한다.
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val player = MediaPlayer()
    return try {
      player.setAudioAttributes(attributes)
      player.setDataSource(this, uri)
      player.isLooping = true
      player.prepare()
      player.start()
      player
    } catch (e: Exception) {
      Log.e(TAG, "알람 음원 재생 실패: $uri", e)
      player.release()
      null
    }
  }

  private fun stopEverything() {
    mediaPlayer?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (e: IllegalStateException) {
        Log.w(TAG, "MediaPlayer 정지 실패", e)
      }
      it.release()
    }
    mediaPlayer = null

    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null

    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun buildNotification(): Notification {
    createChannel()

    val fullScreenIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(this, AlarmActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // 서비스가 아니라 트램펄린 액티비티를 부른다 — 소리를 끄는 것에 더해 광고 화면까지 열어야 하고,
    // 서비스에서는 액티비티를 실행할 수 없다. AlarmDismissActivity 주석 참고.
    val dismissPending = PendingIntent.getActivity(
      this, 1,
      Intent(this, AlarmDismissActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val snoozePending = PendingIntent.getService(
      this, 2, snoozeIntent(this),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("하루 클래식 알람")
      .setContentText("오늘의 곡을 들을 시간이에요")
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_MAX)
      .setOngoing(true)          // 스와이프로 지워지지 않는다
      .setAutoCancel(false)
      // 잠금/화면꺼짐일 때만 AlarmActivity가 전체화면으로 뜬다.
      // 사용자가 기기를 쓰고 있으면 OS가 헤드업 알림으로 격하시킨다 — 의도된 동작이다.
      .setFullScreenIntent(fullScreenIntent, true)
      // 전체화면이 안 뜨는 상황에서도 알람을 제어할 수 있도록 액션을 항상 넣는다.
      .addAction(0, "스누즈", snoozePending)
      .addAction(0, "끄기", dismissPending)
      .build()
  }

  private fun createChannel() {
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "알람",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "알람이 울릴 때 표시됩니다"
      // 소리는 MediaPlayer(ALARM 스트림)로만 재생한다. 채널 소리를 켜면 이중 재생된다.
      setSound(null, null)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 500, 500)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }
}
