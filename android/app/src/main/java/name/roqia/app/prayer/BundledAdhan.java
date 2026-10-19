package name.roqia.app.prayer;

import java.io.*;

import android.content.Context;

import org.json.JSONObject;

/** Materializes an APK recording for the existing hash-verified alarm path. */
final class BundledAdhan {
  static synchronized File prepare(Context context, String resource, double bytes, String sha256)
      throws Exception {
    if (!resource.matches("roqia_adhan_[a-z0-9_]+")
        || !sha256.matches("[0-9a-f]{64}")
        || !Double.isFinite(bytes)
        || bytes != Math.floor(bytes)
        || bytes <= 0
        || bytes > 20 * 1024 * 1024) throw new IllegalArgumentException("invalid_bundled_adhan");
    int id = context.getResources().getIdentifier(resource, "raw", context.getPackageName());
    if (id == 0) throw new IOException("bundled_adhan_missing");
    File directory = new File(context.getFilesDir(), "roqia/bundled-adhan");
    if (!directory.isDirectory() && !directory.mkdirs())
      throw new IOException("bundled_adhan_directory");
    File file = new File(directory, resource + "-" + sha256 + ".mp3");
    JSONObject descriptor =
        new JSONObject()
            .put("path", file.getPath())
            .put("bytes", (long) bytes)
            .put("sha256", sha256);
    if (file.exists()) {
      try {
        return AdhanAlarms.verify(context, descriptor);
      } catch (IOException invalidCache) {
        /* Restore only this owned cache from the APK. */
      }
    }
    File pending = new File(directory, file.getName() + ".pending");
    try {
      try (InputStream input = context.getResources().openRawResource(id);
          FileOutputStream output = new FileOutputStream(pending)) {
        byte[] buffer = new byte[65536];
        long written = 0;
        for (int n; (n = input.read(buffer)) > 0; ) {
          written += n;
          if (written > bytes) throw new IOException("bundled_adhan_size");
          output.write(buffer, 0, n);
        }
        output.getFD().sync();
      }
      AdhanAlarms.verify(
          context, new JSONObject(descriptor.toString()).put("path", pending.getPath()));
      if (!pending.renameTo(file)) throw new IOException("bundled_adhan_commit");
      return AdhanAlarms.verify(context, descriptor);
    } finally {
      if (pending.exists()) pending.delete();
    }
  }
}
