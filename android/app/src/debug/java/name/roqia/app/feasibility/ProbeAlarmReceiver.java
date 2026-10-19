package name.roqia.app.feasibility;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.*;
import android.os.Build;

import org.json.JSONObject;

public final class ProbeAlarmReceiver extends BroadcastReceiver {
  static PendingIntent pending(Context context) {
    return PendingIntent.getBroadcast(
        context,
        940,
        new Intent(context, ProbeAlarmReceiver.class).setAction("roqia.feasibility.ALARM"),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static void schedule(Context context, long at) {
    ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE))
        .setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context));
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    long at = context.getSharedPreferences("roqia-feasibility", 0).getLong("alarmAt", 0);
    try {
      if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (at > System.currentTimeMillis()
            && (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms())) {
          schedule(context, at);
          ProbeLog.write(context, "boot-rescheduled", new JSONObject().put("at", at));
        } else {
          context.getSharedPreferences("roqia-feasibility", 0).edit().remove("alarmAt").commit();
          ProbeLog.write(context, "boot-no-live-event", new JSONObject());
        }
        return; // Boot NEVER starts media playback.
      }
      if (!"roqia.feasibility.ALARM".equals(intent.getAction()) || at == 0) return;
      context.getSharedPreferences("roqia-feasibility", 0).edit().remove("alarmAt").commit();
      long lateness = System.currentTimeMillis() - at;
      if (lateness > 60000 || lateness < -1000) {
        ProbeLog.write(context, "alarm-expired", new JSONObject().put("latenessMs", lateness));
        return;
      }
      ProbeLog.write(context, "alarm-delivered", new JSONObject().put("latenessMs", lateness));
      Intent service = new Intent(context, ProbeAlarmService.class);
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(service);
      else context.startService(service);
    } catch (Exception e) {
      ProbeLog.write(context, "alarm-failed", new JSONObject());
      android.util.Log.e("RoqiaProbe", "Native alarm path failed", e);
    }
  }
}
