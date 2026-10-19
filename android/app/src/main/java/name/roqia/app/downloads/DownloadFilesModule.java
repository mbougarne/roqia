package name.roqia.app.downloads;

import java.io.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import android.system.Os;
import android.system.OsConstants;

import com.facebook.react.bridge.*;

/** Durable private-file installation. Errors propagate; metadata must never claim ready first. */
public final class DownloadFilesModule extends ReactContextBaseJavaModule {
  private final ExecutorService worker = Executors.newSingleThreadExecutor();

  public DownloadFilesModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() {
    return "RoqiaDownloadFiles";
  }

  private File file(String path) throws IOException {
    File root = new File(getReactApplicationContext().getFilesDir(), "roqia").getCanonicalFile();
    File file = new File(path).getCanonicalFile();
    if (!file.getPath().startsWith(root.getPath() + File.separator))
      throw new IOException("unsafe_path");
    return file;
  }

  private void syncDirectory(File directory) throws Exception {
    File root = getReactApplicationContext().getFilesDir().getCanonicalFile();
    // Also persist newly created pack/version directory entries in their parents.
    while (directory != null && directory.getCanonicalPath().startsWith(root.getPath())) {
      java.io.FileDescriptor fd = Os.open(directory.getPath(), OsConstants.O_RDONLY, 0);
      try {
        Os.fsync(fd);
      } finally {
        Os.close(fd);
      }
      if (directory.getCanonicalFile().equals(root)) break;
      directory = directory.getParentFile();
    }
  }

  private void sync(File file) throws Exception {
    try (RandomAccessFile output = new RandomAccessFile(file, "rw")) {
      output.getFD().sync();
    }
    syncDirectory(file.getParentFile());
  }

  @ReactMethod
  public void move(String source, String destination, Promise promise) {
    worker.execute(
        () -> {
          try {
            File from = file(source), to = file(destination);
            if (!from.isFile()) throw new IOException("source_missing");
            sync(from);
            // Same private filesystem. Os.rename fails rather than falling back to copy/delete.
            Os.rename(from.getPath(), to.getPath());
            syncDirectory(to.getParentFile());
            syncDirectory(from.getParentFile());
            promise.resolve(null);
          } catch (Exception error) {
            promise.reject("durable_move_failed", error);
          }
        });
  }

  @ReactMethod
  public void syncFiles(ReadableArray paths, Promise promise) {
    worker.execute(
        () -> {
          try {
            for (int i = 0; i < paths.size(); i++) {
              File target = file(paths.getString(i));
              if (!target.isFile()) throw new IOException("installed_file_missing");
              sync(target);
            }
            promise.resolve(null);
          } catch (Exception error) {
            promise.reject("durable_sync_failed", error);
          }
        });
  }

  @Override
  public void invalidate() {
    worker.shutdown();
    super.invalidate();
  }
}
