package name.roqia.app.audio;

import android.os.Handler;
import android.os.Looper;
import com.facebook.react.bridge.*;
import com.doublesymmetry.trackplayer.service.RoqiaSleepTimer;

public final class AudioModule extends ReactContextBaseJavaModule {
  private final Handler main = new Handler(Looper.getMainLooper());
  AudioModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "RoqiaAudio"; }
  @Override public java.util.Map<String, Object> getConstants() {
    return java.util.Collections.singletonMap("segmentPlayback", true);
  }
  @ReactMethod public void audioDuration(String path, Promise promise) {
    new Thread(() -> {
      android.media.MediaMetadataRetriever retriever = new android.media.MediaMetadataRetriever();
      try {
        java.io.File file = new java.io.File(path).getCanonicalFile();
        String root = new java.io.File(getReactApplicationContext().getFilesDir(), "roqia/content").getCanonicalPath() + "/";
        if (!file.getPath().startsWith(root)) throw new IllegalArgumentException("unsafe_audio_path");
        retriever.setDataSource(file.getPath());
        long duration = Long.parseLong(retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION));
        if (duration <= 0) throw new IllegalArgumentException("invalid_audio_duration");
        promise.resolve((double) duration);
      } catch (Exception error) { promise.reject("audio_duration_unavailable", error); }
      finally { try { retriever.release(); } catch (Exception ignored) {} }
    }, "roqia-audio-duration").start();
  }
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
