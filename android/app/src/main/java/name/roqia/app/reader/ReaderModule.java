package name.roqia.app.reader;
import android.app.Activity;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.text.PositionedGlyphs;
import android.graphics.text.TextRunShaper;
import android.os.Build;
import android.view.WindowManager;
import com.facebook.react.bridge.*;
import com.facebook.react.common.assets.ReactFontManager;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;

/** Register only intact app-private fonts; never silently substitute Quran glyphs. */
public final class ReaderModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
  ReaderModule(ReactApplicationContext context) { super(context); context.addLifecycleEventListener(this); }
  @Override public String getName() { return "RoqiaReader"; }
  @ReactMethod public void loadFont(String path, String expectedHash, ReadableArray verses, Promise promise) {
    try {
      if (Build.VERSION.SDK_INT < 31) throw new IllegalStateException("font_validation_requires_api31");
      File file = new File(path).getCanonicalFile();
      File root = new File(getReactApplicationContext().getFilesDir(), "roqia").getCanonicalFile();
      if (!file.getPath().startsWith(root.getPath() + File.separator) || !file.isFile() || file.length()>16*1024*1024 || !expectedHash.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("invalid_font_path");
      MessageDigest digest=MessageDigest.getInstance("SHA-256");
      try(FileInputStream stream=new FileInputStream(file)) {byte[] b=new byte[16384];int n;while((n=stream.read(b))!=-1)digest.update(b,0,n);}
      StringBuilder hash=new StringBuilder();for(byte b:digest.digest())hash.append(String.format("%02x",b&255));
      if(!hash.toString().equals(expectedHash))throw new IllegalStateException("font_hash_mismatch");
      Typeface face=Typeface.createFromFile(file);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setTypeface(face);paint.setTextSize(32);
      if(verses.size()<1 || verses.size()>300)throw new IllegalArgumentException("invalid_chapter");
      for(int v=0;v<verses.size();v++) {
        String text=verses.getString(v);if(text==null || text.length()>20000)throw new IllegalArgumentException("invalid_verse");
        PositionedGlyphs glyphs=TextRunShaper.shapeTextRun(text,0,text.length(),0,text.length(),0f,0f,true,paint);
        for(int g=0;g<glyphs.glyphCount();g++) {
          File used=glyphs.getFont(g).getFile();
          if(glyphs.getGlyphId(g)==0 || used==null || !used.getCanonicalPath().equals(file.getCanonicalPath()))throw new IllegalStateException("font_fallback_rejected");
        }
      }
      String family="RoqiaQuran_"+expectedHash;
      ReactFontManager.getInstance().addCustomFont(family,face);promise.resolve(family);
    } catch(Exception error) {promise.reject("quran_font_unavailable",error);}
  }
  private File privateFile(String path) throws Exception {
    File file = new File(path).getCanonicalFile();
    File root = new File(getReactApplicationContext().getFilesDir(), "roqia").getCanonicalFile();
    if (!file.getPath().startsWith(root.getPath() + File.separator)) throw new IllegalArgumentException("invalid_source_path");
    return file;
  }
  @ReactMethod public void extractSource(String path, double size, String hash, ReadableArray members, Promise promise) {
    try {
      File archive = privateFile(path); SourceArchive.verify(archive, (long) size, hash);
      if (members.size() < 1 || members.size() > 8) throw new IllegalArgumentException("invalid_members");
      for (int i = 0; i < members.size(); i++) {
        ReadableMap member = members.getMap(i); File target = privateFile(member.getString("path"));
        if (!target.getParentFile().equals(archive.getParentFile()) || target.equals(archive)) throw new IllegalArgumentException("invalid_member_target");
        SourceArchive.extract(archive, member.getString("entry"), target, (long) member.getDouble("bytes"), member.getString("sha256"));
      }
      promise.resolve(null);
    } catch (Exception error) { promise.reject("source_extract_failed", error); }
  }
  @ReactMethod public void sourceOpenings(String path, double size, String hash, Promise promise) {
    try {
      File file = privateFile(path); SourceArchive.verify(file, (long) size, hash);
      WritableMap result = Arguments.createMap();
      for (java.util.Map.Entry<Integer, String> entry : SourceArchive.openings(file).entrySet()) result.putString(String.valueOf(entry.getKey()), entry.getValue());
      promise.resolve(result);
    } catch (Exception error) { promise.reject("source_openings_failed", error); }
  }
  @ReactMethod public void keepAwake(boolean enabled) {
    Activity activity=getReactApplicationContext().getCurrentActivity();
    if(activity!=null)activity.runOnUiThread(()->{if(enabled)activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});
  }
  @Override public void onHostPause(){keepAwake(false);}
  @Override public void onHostDestroy(){keepAwake(false);}
  @Override public void onHostResume(){}
  @Override public void invalidate(){keepAwake(false);getReactApplicationContext().removeLifecycleEventListener(this);super.invalidate();}
}
