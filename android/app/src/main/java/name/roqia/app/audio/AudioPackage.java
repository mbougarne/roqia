package name.roqia.app.audio;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.*;
import com.facebook.react.uimanager.ViewManager;
import java.util.*;
public final class AudioPackage implements ReactPackage {
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext context) { return Collections.singletonList(new AudioModule(context)); }
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext context) { return Collections.emptyList(); }
}
