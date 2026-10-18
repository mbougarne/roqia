package name.roqia.app.prayer;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.io.*;
import java.security.MessageDigest;

/** A bounded, persisted UTC schedule. No JS timers, boot playback or late catch-up. */
final class AdhanAlarms {
  static final String CHANNEL="roqia-full-adhan", PREFS="roqia-adhan", ACTION="name.roqia.app.ADHAN";
  static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences(PREFS,0);}
  static AlarmManager manager(Context c){return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);}
  static boolean exact(Context c){return Build.VERSION.SDK_INT<31||manager(c).canScheduleExactAlarms();}
  static void channel(Context c){
    if(Build.VERSION.SDK_INT<26)return;
    NotificationChannel channel=new NotificationChannel(CHANNEL,"الأذان الكامل",NotificationManager.IMPORTANCE_LOW);
    channel.setSound(null,null);((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
  }
  static boolean allowed(Context c){
    if(!NotificationManagerCompat.from(c).areNotificationsEnabled())return false;
    if(Build.VERSION.SDK_INT<26)return true;
    NotificationChannel ch=((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).getNotificationChannel(CHANNEL);
    return ch==null||ch.getImportance()!=NotificationManager.IMPORTANCE_NONE;
  }
  static PendingIntent pending(Context c,String id){return PendingIntent.getBroadcast(c,0,new Intent(c,AdhanReceiver.class).setAction(ACTION).setData(Uri.parse("roqia-adhan:"+Uri.encode(id))),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
  static JSONArray stored(Context c)throws JSONException{return new JSONArray(prefs(c).getString("events","[]"));}
  static void audit(Context c,String state){prefs(c).edit().putString("lastEvent",state).putLong("lastEventAt",System.currentTimeMillis()).commit();android.util.Log.i("RoqiaAdhan",state);}
  static File verify(Context c,JSONObject e)throws Exception{
    File root=new File(c.getFilesDir(),"roqia").getCanonicalFile(),file=new File(e.getString("path")).getCanonicalFile();
    if(!file.getPath().startsWith(root.getPath()+File.separator)||!file.isFile()||file.length()!=e.getLong("bytes"))throw new IOException("adhan_file_missing");
    MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] b=new byte[65536];for(int n;(n=in.read(b))>0;)digest.update(b,0,n);}
    StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
    if(!hex.toString().equals(e.getString("sha256")))throw new IOException("adhan_file_changed");return file;
  }
  static synchronized void replace(Context c,JSONArray events)throws Exception{
    if(events.length()>32)throw new IllegalArgumentException("too_many_alarms");
    long now=System.currentTimeMillis();java.util.HashSet<String> ids=new java.util.HashSet<>(),verified=new java.util.HashSet<>();
    for(int i=0;i<events.length();i++){
      JSONObject e=events.getJSONObject(i);long at=e.getLong("at");String id=e.getString("id");
      if(!id.startsWith("roqia-prayer:")||!ids.add(id)||at<=now||at>now+4L*86400000)throw new IllegalArgumentException("invalid_alarm");
      String key=e.getString("path")+e.getString("sha256");if(verified.add(key))verify(c,e);
    }
    JSONArray old=stored(c);for(int i=0;i<old.length();i++)manager(c).cancel(pending(c,old.getJSONObject(i).getString("id")));
    // Persist the new desired generation before creating alarms. Failed scheduling is retried on reconciliation.
    if(!prefs(c).edit().putString("events",events.toString()).commit())throw new IOException("schedule_save_failed");
    if(events.length()>0 && (!exact(c)||!allowed(c)))throw new SecurityException("adhan_permission_denied");
    try{for(int i=0;i<events.length();i++){JSONObject e=events.getJSONObject(i);manager(c).setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,e.getLong("at"),pending(c,e.getString("id")));}}
    catch(Exception error){for(int i=0;i<events.length();i++)manager(c).cancel(pending(c,events.getJSONObject(i).getString("id")));prefs(c).edit().putString("events","[]").commit();throw error;}
  }
  static synchronized void replacePrayers(Context c,JSONArray events)throws Exception {
    JSONArray old=stored(c);
    if(exact(c)&&allowed(c))for(int i=0;i<old.length();i++){
      JSONObject e=old.getJSONObject(i);
      if(e.getString("id").equals("roqia-prayer:test")&&e.getLong("at")>System.currentTimeMillis())events.put(e);
    }
    replace(c,events);
  }
  static synchronized void test(Context c,JSONObject event)throws Exception {
    if(!event.getString("id").equals("roqia-prayer:test"))throw new IllegalArgumentException("invalid_test");
    JSONArray events=new JSONArray(),old=stored(c);long now=System.currentTimeMillis();
    for(int i=0;i<old.length();i++){JSONObject e=old.getJSONObject(i);if(!e.getString("id").equals("roqia-prayer:test")&&e.getLong("at")>now)events.put(e);}
    events.put(event);replace(c,events);
  }
  static synchronized void cancelTest(Context c)throws Exception {
    JSONArray events=new JSONArray(),old=stored(c);long now=System.currentTimeMillis();
    if(exact(c)&&allowed(c))for(int i=0;i<old.length();i++){JSONObject e=old.getJSONObject(i);if(!e.getString("id").equals("roqia-prayer:test")&&e.getLong("at")>now)events.put(e);}
    replace(c,events);
  }
  static synchronized JSONObject claim(Context c,String id)throws Exception{
    JSONArray remaining=new JSONArray();JSONObject claimed=null;
    JSONArray all=stored(c);for(int i=0;i<all.length();i++){JSONObject e=all.getJSONObject(i);if(e.getString("id").equals(id))claimed=e;else remaining.put(e);}
    if(claimed!=null && claimed.getLong("at")>System.currentTimeMillis())return null;
    if(!prefs(c).edit().putString("events",remaining.toString()).commit())return null;
    if(claimed==null)return null;long late=System.currentTimeMillis()-claimed.getLong("at");
    if(late<0||late>60000||!allowed(c)||!exact(c)){audit(c,"expired_or_permission_denied");return null;}return claimed;
  }
  static synchronized void restore(Context c)throws Exception{
    JSONArray future=new JSONArray(),all=stored(c);long now=System.currentTimeMillis();
    if(exact(c)&&allowed(c))for(int i=0;i<all.length();i++){JSONObject e=all.getJSONObject(i);if(e.getLong("at")>now)future.put(e);}
    replace(c,future); // Never starts a foreground service from BOOT_COMPLETED.
  }
  static synchronized void release(Context c,String paths)throws Exception{
    JSONArray removed=new JSONArray(paths),keep=new JSONArray(),all=stored(c);java.util.Set<String> files=new java.util.HashSet<>();
    for(int i=0;i<removed.length();i++)files.add(removed.getString(i));
    for(int i=0;i<all.length();i++){JSONObject e=all.getJSONObject(i);if(!files.contains(e.getString("path"))&&e.getLong("at")>System.currentTimeMillis())keep.put(e);}
    // Stop before removal, including an actively playing preview.
    if(files.contains(AdhanService.activePath))c.stopService(new Intent(c,AdhanService.class));
    if(keep.length()!=all.length())replace(c,keep);
  }
}
