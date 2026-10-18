package name.roqia.app.prayer;

import android.Manifest;
import android.app.Activity;
import android.content.*;
import android.content.pm.PackageManager;
import android.hardware.*;
import android.location.*;
import android.os.*;
import android.view.Surface;
import androidx.core.content.ContextCompat;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/** Foreground-only location and magnetic-north orientation, corrected to true north once. */
public final class PrayerModule extends ReactContextBaseJavaModule implements LifecycleEventListener, SensorEventListener {
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final SensorManager sensors;
  private final LocationManager locations;
  private Promise locationPromise;
  private LocationListener locationListener;
  private boolean headingActive;
  private float declination;
  private long lastHeading;
  private final BroadcastReceiver timeChanges = new BroadcastReceiver() {
    @Override public void onReceive(Context context, Intent intent) {
      getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("RoqiaPrayerTimeChanged", null);
    }
  };
  public PrayerModule(ReactApplicationContext context) {
    super(context); context.addLifecycleEventListener(this);
    sensors=(SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
    locations=(LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    IntentFilter filter=new IntentFilter();filter.addAction(Intent.ACTION_TIME_CHANGED);filter.addAction(Intent.ACTION_TIMEZONE_CHANGED);filter.addAction(Intent.ACTION_DATE_CHANGED);
    ContextCompat.registerReceiver(context,timeChanges,filter,ContextCompat.RECEIVER_NOT_EXPORTED);
  }
  @Override public String getName(){ return "RoqiaPrayer"; }
  @ReactMethod public void fetchTimetable(String city, Promise promise) {
    new Thread(() -> {
      try(java.io.InputStream issuer=getReactApplicationContext().getResources().openRawResource(name.roqia.app.R.raw.habous_intermediate)) {
        promise.resolve(HabousTransport.fetch(city,issuer));
      } catch(Exception error) {promise.reject("source_unavailable",error);}
    },"prayer-timetable").start();
  }
  @ReactMethod public void addListener(String event) {}
  @ReactMethod public void removeListeners(double count) {}
  private void finishLocation(Location location, String error) {
    Promise p=locationPromise;locationPromise=null;
    if(locationListener!=null){locations.removeUpdates(locationListener);locationListener=null;}
    handler.removeCallbacks(timeout);
    if(p==null)return;
    if(error!=null){p.reject(error,error);return;}
    WritableMap result=Arguments.createMap();result.putDouble("latitude",location.getLatitude());result.putDouble("longitude",location.getLongitude());result.putDouble("accuracy",location.getAccuracy());result.putDouble("acquiredAt",location.getTime());p.resolve(result);
  }
  private final Runnable timeout=()->finishLocation(null,"location_timeout");
  @ReactMethod public void locate(Promise promise) {
    handler.post(()->{
      if(locationPromise!=null){promise.reject("location_busy","location_busy");return;}
      if(getReactApplicationContext().getCurrentActivity()==null){promise.reject("location_inactive","location_inactive");return;}
      if(ContextCompat.checkSelfPermission(getReactApplicationContext(),Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED && ContextCompat.checkSelfPermission(getReactApplicationContext(),Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){promise.reject("location_denied","location_denied");return;}
      locationPromise=promise;
      locationListener=new LocationListener(){
        @Override public void onLocationChanged(Location fix){
          long age=SystemClock.elapsedRealtimeNanos()-fix.getElapsedRealtimeNanos();
          if(age>=0 && age<=120000000000L && fix.hasAccuracy() && fix.getAccuracy()<=1000)finishLocation(fix,null);
        }
        @Override public void onProviderDisabled(String p){}
        @Override public void onProviderEnabled(String p){}
        @Override public void onStatusChanged(String p,int s,Bundle b){}
      };
      try {
        boolean requested=false;
        for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER}){
          if(!locations.isProviderEnabled(provider))continue;
          if(provider.equals(LocationManager.GPS_PROVIDER) && ContextCompat.checkSelfPermission(getReactApplicationContext(),Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED)continue;
          locations.requestLocationUpdates(provider,1000,0,locationListener,Looper.getMainLooper());requested=true;
        }
        if(!requested){finishLocation(null,"location_disabled");return;}
        handler.postDelayed(timeout,30000);
      } catch(Exception e){finishLocation(null,"location_unavailable");}
    });
  }
  @ReactMethod public void cancelLocation(){handler.post(()->finishLocation(null,"location_cancelled"));}
  @ReactMethod public void startHeading(double latitude,double longitude,Promise promise){handler.post(()->{
    stop();
    if(!Double.isFinite(latitude)||Math.abs(latitude)>90||!Double.isFinite(longitude)||Math.abs(longitude)>180){promise.reject("invalid_location","invalid_location");return;}
    Sensor sensor=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
    if(sensor==null){promise.resolve(false);return;}
    declination=new GeomagneticField((float)latitude,(float)longitude,0,System.currentTimeMillis()).getDeclination();
    headingActive=sensors.registerListener(this,sensor,SensorManager.SENSOR_DELAY_UI);promise.resolve(headingActive);
  });}
  private void stop(){sensors.unregisterListener(this);headingActive=false;lastHeading=0;}
  @ReactMethod public void stopHeading(){handler.post(this::stop);}
  @Override public void onSensorChanged(SensorEvent event){
    if(!headingActive || SystemClock.elapsedRealtime()-lastHeading<100)return;
    lastHeading=SystemClock.elapsedRealtime();
    float[] matrix=new float[9],adjusted=new float[9],orientation=new float[3];SensorManager.getRotationMatrixFromVector(matrix,event.values);
    Activity activity=getReactApplicationContext().getCurrentActivity();if(activity==null)return;
    int rotation=activity.getWindowManager().getDefaultDisplay().getRotation(),x=SensorManager.AXIS_X,y=SensorManager.AXIS_Y;
    if(rotation==Surface.ROTATION_90){x=SensorManager.AXIS_Y;y=SensorManager.AXIS_MINUS_X;}
    else if(rotation==Surface.ROTATION_180){x=SensorManager.AXIS_MINUS_X;y=SensorManager.AXIS_MINUS_Y;}
    else if(rotation==Surface.ROTATION_270){x=SensorManager.AXIS_MINUS_Y;y=SensorManager.AXIS_X;}
    SensorManager.remapCoordinateSystem(matrix,x,y,adjusted);SensorManager.getOrientation(adjusted,orientation);
    double magnetic=Math.toDegrees(orientation[0]);WritableMap value=Arguments.createMap();value.putDouble("heading",(magnetic+declination+720)%360);value.putInt("accuracy",event.accuracy);value.putDouble("at",System.currentTimeMillis());
    getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("RoqiaHeading",value);
  }
  @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
  @Override public void onHostPause(){handler.post(()->{stop();finishLocation(null,"location_cancelled");});}
  @Override public void onHostDestroy(){onHostPause();}
  @Override public void onHostResume(){}
  @Override public void invalidate(){onHostPause();getReactApplicationContext().unregisterReceiver(timeChanges);getReactApplicationContext().removeLifecycleEventListener(this);super.invalidate();}
}
