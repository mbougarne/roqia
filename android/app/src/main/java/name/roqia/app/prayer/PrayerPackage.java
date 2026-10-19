package name.roqia.app.prayer;

import java.util.*;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.*;
import com.facebook.react.uimanager.ViewManager;

public final class PrayerPackage implements ReactPackage {
  public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    return Collections.singletonList(new PrayerModule(context));
  }

  public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
