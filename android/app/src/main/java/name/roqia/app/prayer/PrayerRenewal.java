package name.roqia.app.prayer;

import android.content.Context;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

/** Periodic work is best-effort; the app always exposes its actual covered-until time. */
public final class PrayerRenewal {
  static final String PERIODIC = "roqia-prayer-renewal", IMMEDIATE = "roqia-prayer-reconcile";
  static boolean enabled(Context c) { return AdhanAlarms.prefs(c).getBoolean("renewalEnabled", false); }
  static synchronized void configure(Context c, boolean enabled) {
    if (!AdhanAlarms.prefs(c).edit().putBoolean("renewalEnabled", enabled).commit()) throw new IllegalStateException("renewal_save_failed");
    WorkManager work = WorkManager.getInstance(c);
    if (enabled) {
      work.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP,
        new PeriodicWorkRequest.Builder(PrayerRenewalWorker.class, 6, TimeUnit.HOURS)
          .setInitialDelay(6, TimeUnit.HOURS).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES).build());
    } else {
      work.cancelUniqueWork(PERIODIC);
      work.cancelUniqueWork(IMMEDIATE);
    }
  }
  public static void request(Context c) {
    if (enabled(c)) WorkManager.getInstance(c).enqueueUniqueWork(IMMEDIATE, ExistingWorkPolicy.KEEP,
      new OneTimeWorkRequest.Builder(PrayerRenewalWorker.class)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES).build());
  }
}
