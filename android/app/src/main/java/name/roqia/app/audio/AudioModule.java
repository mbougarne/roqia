package name.roqia.app.audio;

import android.os.Handler;
import android.os.Looper;
import com.facebook.react.bridge.*;
import com.doublesymmetry.trackplayer.service.RoqiaSleepTimer;

public final class AudioModule extends ReactContextBaseJavaModule {
  private final Handler main = new Handler(Looper.getMainLooper());
  AudioModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "RoqiaAudio"; }
  @ReactMethod public void sleepDeadline(Promise promise) {
    main.post(() -> { try { promise.resolve((double) RoqiaSleepTimer.get(getReactApplicationContext())); }
      catch (Exception error) { promise.reject("sleep_unavailable", error); } });
  }
  @ReactMethod public void setSleepTimer(double milliseconds, Promise promise) {
    if (!Double.isFinite(milliseconds) || milliseconds != Math.floor(milliseconds)) {
      promise.reject("invalid_sleep_duration", "invalid_sleep_duration"); return;
    }
    main.post(() -> { try { promise.resolve((double) RoqiaSleepTimer.set(getReactApplicationContext(), (long) milliseconds)); }
      catch (Exception error) { promise.reject("sleep_unavailable", error); } });
  }
}
