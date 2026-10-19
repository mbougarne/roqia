package name.roqia.app.feasibility;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

import android.content.Context;
import android.util.Log;

import org.json.JSONObject;

final class ProbeLog {
  static synchronized void write(Context context, String event, JSONObject detail) {
    try {
      File dir = new File(context.getFilesDir(), "feasibility");
      if (!dir.exists() && !dir.mkdirs())
        throw new IllegalStateException("Cannot create probe directory");
      JSONObject row =
          new JSONObject()
              .put("at", System.currentTimeMillis())
              .put("event", event)
              .put("detail", detail);
      try (FileOutputStream stream = new FileOutputStream(new File(dir, "events.jsonl"), true)) {
        stream.write((row.toString() + "\n").getBytes(StandardCharsets.UTF_8));
        stream.getFD().sync();
      }
      Log.i("RoqiaProbe", row.toString());
    } catch (Exception error) {
      Log.e("RoqiaProbe", "Cannot persist probe evidence", error);
    }
  }
}
