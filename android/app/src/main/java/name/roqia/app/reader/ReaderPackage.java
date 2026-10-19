package name.roqia.app.reader;

import java.util.Collections;
import java.util.List;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

public final class ReaderPackage implements ReactPackage {
  public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    return Collections.singletonList(new ReaderModule(context));
  }

  public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
