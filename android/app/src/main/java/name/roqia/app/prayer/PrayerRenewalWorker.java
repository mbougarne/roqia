package name.roqia.app.prayer;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.bridge.*;
import com.facebook.react.interfaces.TaskInterface;
import com.facebook.react.jstasks.*;
import java.util.concurrent.*;

/** Run the shared planner in RN's headless runtime, without opening an Activity or starting media. */
public final class PrayerRenewalWorker extends Worker {
  private static final ConcurrentHashMap<String, Completion> running = new ConcurrentHashMap<>();
  private static final class Completion { final CountDownLatch done = new CountDownLatch(1); volatile boolean success; }
  public PrayerRenewalWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }
  static void complete(String token, boolean success) {
    Completion c = running.get(token); if (c != null) { c.success = success; c.done.countDown(); }
  }
  @NonNull @Override public Result doWork() {
    Context app = getApplicationContext();
    if (!PrayerRenewal.enabled(app)) return Result.success();
    String token = java.util.UUID.randomUUID().toString();
    Completion completion = new Completion(); running.put(token, completion);
    try {
      ReactHost host = ((ReactApplication) app).getReactHost();
      if (host == null) return Result.retry();
      TaskInterface<Void> start = host.start();
      if (!start.waitForCompletion(30, TimeUnit.SECONDS) || start.isFaulted() || start.isCancelled()) return Result.retry();
      ReactContext context = host.getCurrentReactContext();
      if (context == null || isStopped()) return Result.retry();
      UiThreadUtil.runOnUiThread(() -> {
        try {
          if (isStopped() || !PrayerRenewal.enabled(app)) { complete(token, true); return; }
          WritableMap data = Arguments.createMap(); data.putString("token", token);
          HeadlessJsTaskContext.getInstance(context).startTask(new HeadlessJsTaskConfig("RoqiaPrayerRenewal", data, 60000, true));
        } catch (Exception error) { complete(token, false); }
      });
      boolean finished = completion.done.await(65, TimeUnit.SECONDS);
      boolean success = finished && completion.success;
      AdhanAlarms.prefs(app).edit().putLong("renewalLastRun", System.currentTimeMillis()).putBoolean("renewalLastSuccess", success).commit();
      android.util.Log.i("RoqiaRenewal", success ? "headless_completed" : "headless_retry");
      return success ? Result.success() : Result.retry();
    } catch (Exception error) {
      android.util.Log.w("RoqiaRenewal", "renewal_retry", error); return Result.retry();
    } finally { running.remove(token); }
  }
}
