package name.roqia.app;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactNativeApplicationEntryPoint;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactHost;
import com.facebook.react.defaults.DefaultReactNativeHost;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return "debug".equals(BuildConfig.BUILD_TYPE);
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          packages.add(new name.roqia.app.reader.ReaderPackage());
          if ("debug".equals(BuildConfig.BUILD_TYPE)) {
            try {
              packages.add((ReactPackage) Class.forName("name.roqia.app.feasibility.ProbePackage").getDeclaredConstructor().newInstance());
            } catch (ReflectiveOperationException error) {
              throw new IllegalStateException("Missing debug feasibility package", error);
            }
          }
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }
      };

  private ReactHost mReactHost;

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public ReactHost getReactHost() {
    if (mReactHost == null) {
      mReactHost = DefaultReactHost.getDefaultReactHost(getApplicationContext(), mReactNativeHost, null);
    }
    return mReactHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    ReactNativeApplicationEntryPoint.loadReactNative(this);
  }
}
