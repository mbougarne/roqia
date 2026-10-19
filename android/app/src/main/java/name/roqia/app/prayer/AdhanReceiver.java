package name.roqia.app.prayer;

import android.content.*;

import org.json.JSONObject;

public final class AdhanReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      if (!AdhanAlarms.ACTION.equals(intent.getAction())) {
        PendingResult pending = goAsync();
        new Thread(
                () -> {
                  try {
                    AdhanAlarms.restore(context);
                  } catch (Exception error) {
                    AdhanAlarms.audit(
                        context, "restore_failed:" + error.getClass().getSimpleName());
                  } finally {
                    try {
                      PrayerRenewal.request(context);
                    } finally {
                      pending.finish();
                    }
                  }
                },
                "prayer-restore")
            .start();
        return;
      }
      if (intent.getData() == null) return;
      JSONObject event = AdhanAlarms.claim(context, intent.getData().getSchemeSpecificPart());
      if (event == null) return;
      Intent service = new Intent(context, AdhanService.class).putExtra("event", event.toString());
      if (android.os.Build.VERSION.SDK_INT >= 26) context.startForegroundService(service);
      else context.startService(service);
    } catch (Exception error) {
      AdhanAlarms.audit(context, "delivery_failed:" + error.getClass().getSimpleName());
    }
  }
}
