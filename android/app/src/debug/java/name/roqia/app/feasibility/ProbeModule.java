package name.roqia.app.feasibility;

import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;

import com.facebook.react.bridge.*;
import org.json.JSONObject;

public final class ProbeModule extends ReactContextBaseJavaModule {
  ProbeModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "RoqiaProbe";
  }

  private File file(String name) throws Exception {
    if (!name.matches("[a-zA-Z0-9_-]+\\.(part|ready)"))
      throw new IllegalArgumentException("Invalid probe file name");
    File dir = new File(getReactApplicationContext().getFilesDir(), "feasibility");
    if (!dir.exists() && !dir.mkdirs())
      throw new IllegalStateException("Cannot create probe directory");
    File file = new File(dir, name);
    if (!file.getCanonicalFile().getParentFile().equals(dir.getCanonicalFile()))
      throw new IllegalArgumentException("Invalid probe path");
    return file;
  }

  @ReactMethod
  public void prepareWarshFonts(Promise promise) {
    new Thread(
            () -> {
              try {
                promise.resolve(FontProbe.prepare(getReactApplicationContext()).toString());
              } catch (Exception error) {
                promise.reject("probe.fonts", error);
              }
            },
            "RoqiaFontProbe")
        .start();
  }

  @ReactMethod
  public void prepare(Promise promise) {
    try {
      File dir = file("prepare.part").getParentFile();
      File tone = new File(dir, "tone.wav");
      if (!tone.exists()) {
        try (java.io.InputStream in =
                getReactApplicationContext()
                    .getResources()
                    .openRawResource(name.roqia.app.R.raw.roqia_probe_tone);
            java.io.FileOutputStream out = new java.io.FileOutputStream(tone)) {
          byte[] bytes = new byte[16384];
          int count;
          while ((count = in.read(bytes)) != -1) out.write(bytes, 0, count);
          out.getFD().sync();
        }
      }
      promise.resolve("file://" + tone.getAbsolutePath());
    } catch (Exception e) {
      promise.reject("probe.prepare", e);
    }
  }

  @ReactMethod
  public void record(String event, String json) {
    try {
      ProbeLog.write(getReactApplicationContext(), event, new JSONObject(json));
    } catch (Exception e) {
      ProbeLog.write(getReactApplicationContext(), "invalid-event", new JSONObject());
    }
  }

  @ReactMethod
  public void verifyAndInstall(String name, String expectedHash, Promise promise) {
    // Large file hashing is performed off the RN native-module thread.
    new Thread(
            () -> {
              try {
                if (!name.endsWith(".part") || !expectedHash.matches("[0-9a-f]{64}"))
                  throw new IllegalArgumentException("Invalid verification input");
                File input = file(name);
                MessageDigest sha = MessageDigest.getInstance("SHA-256");
                try (FileInputStream stream = new FileInputStream(input)) {
                  byte[] buffer = new byte[65536];
                  int count;
                  while ((count = stream.read(buffer)) != -1) sha.update(buffer, 0, count);
                }
                StringBuilder hex = new StringBuilder();
                for (byte b : sha.digest()) hex.append(String.format("%02x", b & 255));
                if (!hex.toString().equals(expectedHash))
                  throw new IllegalStateException(
                      "SHA-256 mismatch; partial file remains quarantined");
                File installed = file(name.replace(".part", ".ready"));
                if (installed.exists())
                  throw new IllegalStateException(
                      "Refuse to overwrite an existing verified probe file");
                if (!input.renameTo(installed))
                  throw new IllegalStateException("Same-filesystem rename failed");
                WritableMap result = Arguments.createMap();
                result.putDouble("bytes", installed.length());
                result.putString("sha256", hex.toString());
                result.putString("path", installed.getAbsolutePath());
                promise.resolve(result);
              } catch (Exception e) {
                promise.reject("probe.integrity", e);
              }
            },
            "RoqiaProbeHash")
        .start();
  }

  @ReactMethod
  public void remove(String name, Promise promise) {
    try {
      File target = file(name);
      if (target.exists() && !target.delete()) throw new IllegalStateException("Delete failed");
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("probe.delete", e);
    }
  }

  @ReactMethod
  public void scheduleAlarm(double delaySeconds, Promise promise) {
    try {
      if (!Double.isFinite(delaySeconds) || delaySeconds < 2 || delaySeconds > 120)
        throw new IllegalArgumentException("Delay must be 2..120 seconds");
      AlarmManager manager =
          (AlarmManager) getReactApplicationContext().getSystemService(Context.ALARM_SERVICE);
      if (android.os.Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
        promise.reject(
            "probe.exact-alarm-denied", "Exact alarm access is disabled; no fake success");
        return;
      }
      long at = System.currentTimeMillis() + (long) (delaySeconds * 1000);
      getReactApplicationContext()
          .getSharedPreferences("roqia-feasibility", 0)
          .edit()
          .putLong("alarmAt", at)
          .commit();
      ProbeAlarmReceiver.schedule(getReactApplicationContext(), at);
      ProbeLog.write(
          getReactApplicationContext(), "alarm-scheduled", new JSONObject().put("at", at));
      promise.resolve((double) at);
    } catch (Exception e) {
      promise.reject("probe.schedule", e);
    }
  }

  @ReactMethod
  public void cancelAlarm(Promise promise) {
    Context context = getReactApplicationContext();
    ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE))
        .cancel(ProbeAlarmReceiver.pending(context));
    context.getSharedPreferences("roqia-feasibility", 0).edit().remove("alarmAt").commit();
    context.stopService(new Intent(context, ProbeAlarmService.class));
    promise.resolve(true);
  }
}
