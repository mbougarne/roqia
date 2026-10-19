package name.roqia.app.feasibility;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;

import org.json.JSONObject;

import name.roqia.app.R;

/** Plays a synthetic test tone, not a religious recording. Debug source set only. */
public final class ProbeAlarmService extends Service {
  private MediaPlayer player;
  private AudioManager audio;
  private AudioFocusRequest focus;
  private final AudioManager.OnAudioFocusChangeListener focusListener =
      change -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS
            || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) stopSelf();
      };

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && "STOP".equals(intent.getAction())) {
      stopSelf();
      return START_NOT_STICKY;
    }
    if (player != null) return START_NOT_STICKY;
    try {
      NotificationManager notifications =
          (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
      if (Build.VERSION.SDK_INT >= 26)
        notifications.createNotificationChannel(
            new NotificationChannel(
                "roqia-feasibility-adhan",
                "Roqia feasibility test tone",
                NotificationManager.IMPORTANCE_LOW));
      PendingIntent stop =
          PendingIntent.getService(
              this,
              941,
              new Intent(this, ProbeAlarmService.class).setAction("STOP"),
              PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      Notification.Builder builder =
          Build.VERSION.SDK_INT >= 26
              ? new Notification.Builder(this, "roqia-feasibility-adhan")
              : new Notification.Builder(this);
      Notification notification =
          builder
              .setSmallIcon(android.R.drawable.ic_media_play)
              .setContentTitle("Roqia: native alarm test")
              .setContentText("Synthetic test tone — tap Stop to end")
              .setOngoing(true)
              .addAction(
                  new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Stop", stop)
                      .build())
              .build();
      if (Build.VERSION.SDK_INT >= 29)
        startForeground(940, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
      else startForeground(940, notification);
      audio = (AudioManager) getSystemService(AUDIO_SERVICE);
      AudioAttributes attributes =
          new AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
              .build();
      int granted;
      if (Build.VERSION.SDK_INT >= 26) {
        focus =
            new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(focusListener)
                .build();
        granted = audio.requestAudioFocus(focus);
      } else
        granted =
            audio.requestAudioFocus(
                focusListener, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
      if (granted != AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
        throw new IllegalStateException("Audio focus denied");
      player = new MediaPlayer();
      player.setAudioAttributes(attributes);
      player.setWakeMode(this, PowerManager.PARTIAL_WAKE_LOCK);
      try (android.content.res.AssetFileDescriptor fd =
          getResources().openRawResourceFd(R.raw.roqia_probe_tone)) {
        player.setDataSource(fd.getFileDescriptor(), fd.getStartOffset(), fd.getLength());
      }
      player.setOnPreparedListener(
          media -> {
            media.start();
            ProbeLog.write(this, "alarm-media-started", new JSONObject());
          });
      player.setOnCompletionListener(
          media -> {
            ProbeLog.write(this, "alarm-media-completed", new JSONObject());
            stopSelf();
          });
      player.setOnErrorListener(
          (media, what, extra) -> {
            ProbeLog.write(this, "alarm-media-error", new JSONObject());
            stopSelf();
            return true;
          });
      player.prepareAsync();
    } catch (Exception e) {
      ProbeLog.write(this, "alarm-service-failed", new JSONObject());
      android.util.Log.e("RoqiaProbe", "Alarm playback failed", e);
      stopSelf();
    }
    return START_NOT_STICKY;
  }

  @Override
  public void onDestroy() {
    if (player != null) {
      player.release();
      player = null;
    }
    if (audio != null) {
      if (Build.VERSION.SDK_INT >= 26 && focus != null) audio.abandonAudioFocusRequest(focus);
      else audio.abandonAudioFocus(focusListener);
    }
    stopForeground(true);
    ProbeLog.write(this, "alarm-service-stopped", new JSONObject());
    super.onDestroy();
  }
}
