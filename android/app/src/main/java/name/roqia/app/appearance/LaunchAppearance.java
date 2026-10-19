package name.roqia.app.appearance;

import android.app.UiModeManager;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;

import org.json.JSONObject;

/** Read the same durable setting as JS before the first Activity is created. */
public final class LaunchAppearance {
  private static volatile String currentPreference = "system";

  private LaunchAppearance() {}

  public static String currentPreference() {
    return currentPreference;
  }

  public static void initialize(Context context) {
    // This is called only from Application.onCreate, before the React/OP-SQLite engine.
    // Mixing Android SQLite and OP-SQLite handles on the live WAL can invalidate its mmap.
    apply(context, readBeforeReact(context));
  }

  private static String readBeforeReact(Context context) {
    java.io.File file = context.getDatabasePath("roqia-v2.sqlite");
    if (!file.exists()) return "system";
    try (SQLiteDatabase db =
            SQLiteDatabase.openDatabase(file.getPath(), null, SQLiteDatabase.OPEN_READONLY);
        Cursor cursor =
            db.rawQuery(
                "SELECT value FROM records WHERE collection='settings' AND id='singleton'", null)) {
      if (cursor.moveToFirst()) {
        String value = new JSONObject(cursor.getString(0)).optString("themePreference", "system");
        if (value.equals("dark") || value.equals("light")) return value;
      }
    } catch (Exception error) {
      // JS owns migrations and displays storage errors. Never create or repair the DB here.
      android.util.Log.w("RoqiaAppearance", "Unable to read launch appearance", error);
    }
    return "system";
  }

  public static void apply(Context context, String preference) {
    currentPreference = preference;
    int mode =
        preference.equals("dark")
            ? AppCompatDelegate.MODE_NIGHT_YES
            : preference.equals("light")
                ? AppCompatDelegate.MODE_NIGHT_NO
                : AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
    AppCompatDelegate.setDefaultNightMode(mode);
    if (Build.VERSION.SDK_INT >= 31) {
      // Android's system-owned starting window precedes Application/React on cold starts.
      // Store the choice with the OS as well so that window uses it on the next launch.
      context
          .getSystemService(UiModeManager.class)
          .setApplicationNightMode(
              preference.equals("dark")
                  ? UiModeManager.MODE_NIGHT_YES
                  : preference.equals("light")
                      ? UiModeManager.MODE_NIGHT_NO
                      : UiModeManager.MODE_NIGHT_AUTO);
    }
  }
}
