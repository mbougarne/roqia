package name.roqia.app.feasibility;

import android.os.Bundle;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;

/** Opt-in debug entry point; never declared in the release manifest. */
public final class ProbeActivity extends ReactActivity {
  @Override protected String getMainComponentName() { return "RoqiaFeasibility"; }
  @Override protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(this, getMainComponentName(), DefaultNewArchitectureEntryPoint.getFabricEnabled()) {
      @Override protected Bundle getLaunchOptions() {
        Bundle options = new Bundle();
        options.putString("scenario", getIntent().getStringExtra("scenario"));
        return options;
      }
    };
  }
}
