package name.roqia.app.appearance;

import com.facebook.react.bridge.*;
import java.util.Collections;
import java.util.Map;

public final class AppearanceModule extends ReactContextBaseJavaModule {
  public AppearanceModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "RoqiaAppearance"; }
  @Override public Map<String, Object> getConstants() {
    return Collections.singletonMap("initialPreference", LaunchAppearance.currentPreference());
  }
  @ReactMethod public void sync(String preference, Promise promise) {
    // JS sends its committed setting using the existing OP-SQLite connection.
    // Never open a second SQLite engine while React is using the database.
    if (!preference.equals("dark") && !preference.equals("light") && !preference.equals("system")) {
      promise.reject("invalid_appearance", "invalid_appearance"); return;
    }
    UiThreadUtil.runOnUiThread(() -> {
      try { LaunchAppearance.apply(getReactApplicationContext(), preference); promise.resolve(null); }
      catch (Exception error) { promise.reject("appearance_sync_failed", error); }
    });
  }
}
