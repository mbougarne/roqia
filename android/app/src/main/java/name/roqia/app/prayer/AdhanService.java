package name.roqia.app.prayer;
import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import org.json.JSONObject;

/** One local recording. Respects alarm volume/DND and stops on focus loss. */
public final class AdhanService extends Service {
  static volatile String activePath;
  private MediaPlayer player;private AudioManager audio;private AudioFocusRequest focus;
  private int generation;
  private final Handler handler=new Handler(Looper.getMainLooper());
  private AudioManager.OnAudioFocusChangeListener listener;
  @Override public IBinder onBind(Intent i){return null;}
  @Override public int onStartCommand(Intent intent,int flags,int startId){
    if(intent==null||"STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
    final int session = ++generation;
    releasePlayback();
    try{
      JSONObject event=new JSONObject(intent.getStringExtra("event"));
      activePath=event.getString("path");
      if(!AdhanAlarms.allowed(this))throw new SecurityException("notification_denied");
      AdhanAlarms.channel(this);
      PendingIntent stop=PendingIntent.getService(this,810,new Intent(this,AdhanService.class).setAction("STOP"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      PendingIntent open=PendingIntent.getActivity(this,811,new Intent(Intent.ACTION_VIEW,android.net.Uri.parse("roqia://prayer")).setPackage(getPackageName()),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,AdhanAlarms.CHANNEL):new Notification.Builder(this);
      Notification n=builder.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(event.getString("title")).setContentText("الأذان الكامل · إيقاف التشغيل من هنا").setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause,"إيقاف الأذان",stop).build()).build();
      if(Build.VERSION.SDK_INT>=29)startForeground(810,n,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(810,n);
      AudioAttributes attributes=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
      listener=change->{if(change<0 && generation==session)stopSelf();};
      audio=(AudioManager)getSystemService(AUDIO_SERVICE);int granted;
      if(Build.VERSION.SDK_INT>=26){focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes).setOnAudioFocusChangeListener(listener).build();granted=audio.requestAudioFocus(focus);}
      else granted=audio.requestAudioFocus(listener,AudioManager.STREAM_ALARM,AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
      if(granted!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)throw new IllegalStateException("focus_denied");
      player=new MediaPlayer();player.setAudioAttributes(attributes);player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
      // Hash work off the main thread, after the required foreground notification.
      new Thread(()->{try{
        String path=AdhanAlarms.verify(this,event).getPath();handler.post(()->{try{
          if(player==null || generation != session)return;player.setDataSource(path);
          player.setOnPreparedListener(p->{if(generation != session)return;p.start();AdhanAlarms.audit(this,"playing:"+event.optString("id"));});
          player.setOnCompletionListener(p->{if(generation != session)return;AdhanAlarms.audit(this,"completed");stopSelf();});
          player.setOnErrorListener((p,w,e)->{if(generation != session)return true;AdhanAlarms.audit(this,"media_error");stopSelf();return true;});player.prepareAsync();
        }catch(Exception error){if(generation==session){AdhanAlarms.audit(this,"prepare_failed");stopSelf();}}});
      }catch(Exception error){handler.post(()->{if(generation==session){AdhanAlarms.audit(this,"integrity_failed");stopSelf();}});}},"adhan-verify").start();
      handler.postDelayed(this::stopSelf,15*60*1000); // Bound a damaged decoder or recording.
    }catch(Exception error){AdhanAlarms.audit(this,"playback_failed:"+error.getClass().getSimpleName());stopSelf();}
    return START_NOT_STICKY;
  }
  private void releasePlayback(){
    activePath=null;handler.removeCallbacksAndMessages(null);
    if(player!=null){player.release();player=null;}
    if(audio!=null){if(Build.VERSION.SDK_INT>=26&&focus!=null)audio.abandonAudioFocusRequest(focus);else audio.abandonAudioFocus(listener);}
    audio=null;focus=null;
  }
  @Override public void onDestroy(){generation++;releasePlayback();stopForeground(true);AdhanAlarms.audit(this,"stopped");super.onDestroy();}
}
