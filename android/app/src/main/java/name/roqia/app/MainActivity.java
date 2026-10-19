package name.roqia.app;

import android.content.Intent;
import android.os.Bundle;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory;

public class MainActivity extends ReactActivity {

  @Override
  public void onNewIntent(Intent intent) {
    // Keep cold links delivered while React is loading available to getInitialURL().
    setIntent(intent);
    super.onNewIntent(intent);
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // React Navigation restores JS screens; use the supported native fragment restoration factory.
    getSupportFragmentManager().setFragmentFactory(new RNScreensFragmentFactory());
    super.onCreate(savedInstanceState);
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "roqia";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this, getMainComponentName(), DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
}
