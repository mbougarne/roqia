"""Native launch contract: SQLite closes before React; runtime theme changes never reopen it."""
import pathlib, shutil, subprocess, tempfile, unittest
ROOT = pathlib.Path(__file__).resolve().parents[2]
class LaunchAppearanceTest(unittest.TestCase):
 def test_pre_react_read_and_runtime_sync(self):
  javac = pathlib.Path('/Users/mbougarne/.sdkman/candidates/java/current/bin/javac')
  if not javac.exists():
   found = shutil.which('javac')
   if not found: self.skipTest('JDK required')
   javac = pathlib.Path(found)
  sources = {
   'android/content/Context.java': '''package android.content; public class Context { public java.io.File getDatabasePath(String n){return new java.io.File(System.getProperty("database"));} public <T> T getSystemService(Class<T> c){return c.cast(android.app.UiModeManager.INSTANCE);} }''',
   'android/app/UiModeManager.java': '''package android.app; public class UiModeManager { public static final int MODE_NIGHT_NO=1,MODE_NIGHT_YES=2,MODE_NIGHT_AUTO=0; public static final UiModeManager INSTANCE=new UiModeManager(); public int mode=-9; public void setApplicationNightMode(int m){mode=m;} }''',
   'android/os/Build.java': '''package android.os; public class Build { public static class VERSION { public static int SDK_INT=36; } }''',
   'android/util/Log.java': '''package android.util; public class Log { public static int w(String a,String b,Exception e){throw new AssertionError(e);} }''',
   'android/database/Cursor.java': '''package android.database; public class Cursor implements AutoCloseable { public boolean moveToFirst(){return true;} public String getString(int i){return "dark";} public void close(){} }''',
   'android/database/sqlite/SQLiteDatabase.java': '''package android.database.sqlite; import android.database.Cursor; public class SQLiteDatabase implements AutoCloseable { public static final int OPEN_READONLY=1; public static boolean reactStarted=false; public static int opened=0,closed=0; public static SQLiteDatabase openDatabase(String p,Object f,int mode){if(reactStarted)throw new AssertionError("Android SQLite reopened after React started");opened++;return new SQLiteDatabase();} public Cursor rawQuery(String q,Object a){return new Cursor();} public void close(){closed++;} }''',
   'androidx/appcompat/app/AppCompatDelegate.java': '''package androidx.appcompat.app; public class AppCompatDelegate { public static final int MODE_NIGHT_YES=2,MODE_NIGHT_NO=1,MODE_NIGHT_FOLLOW_SYSTEM=-1; public static int mode=-9; public static void setDefaultNightMode(int m){mode=m;} }''',
   'org/json/JSONObject.java': '''package org.json; public class JSONObject { private String value; public JSONObject(String s){value=s;} public String optString(String k,String d){return value;} }''',
   'com/facebook/react/bridge/ReactApplicationContext.java': '''package com.facebook.react.bridge; public class ReactApplicationContext extends android.content.Context {}''',
   'com/facebook/react/bridge/ReactContextBaseJavaModule.java': '''package com.facebook.react.bridge; public abstract class ReactContextBaseJavaModule { private ReactApplicationContext c; public ReactContextBaseJavaModule(ReactApplicationContext c){this.c=c;} public ReactApplicationContext getReactApplicationContext(){return c;} public abstract String getName(); public java.util.Map<String,Object> getConstants(){return null;} }''',
   'com/facebook/react/bridge/ReactMethod.java': '''package com.facebook.react.bridge; public @interface ReactMethod {}''',
   'com/facebook/react/bridge/UiThreadUtil.java': '''package com.facebook.react.bridge; public class UiThreadUtil { public static void runOnUiThread(Runnable r){r.run();} }''',
   'com/facebook/react/bridge/Promise.java': '''package com.facebook.react.bridge; public interface Promise { void resolve(Object o); void reject(String c,Exception e); void reject(String c,String e); }''',
   'Check.java': '''import name.roqia.app.appearance.*; import android.database.sqlite.SQLiteDatabase; import com.facebook.react.bridge.*;
public class Check {
 static void check(boolean value){if(!value)throw new AssertionError();}
 static class Result implements Promise {boolean ok=false,rejected=false; public void resolve(Object o){ok=true;} public void reject(String c,Exception e){throw new AssertionError(e);} public void reject(String c,String e){rejected=true;}}
 public static void main(String[] args) {
  ReactApplicationContext context=new ReactApplicationContext();
  LaunchAppearance.initialize(context);
  check(SQLiteDatabase.opened==1 && SQLiteDatabase.closed==1);
  check(android.app.UiModeManager.INSTANCE.mode==2);
  SQLiteDatabase.reactStarted=true;
  AppearanceModule module=new AppearanceModule(context);
  check(module.getConstants().get("initialPreference").equals("dark"));
  for(String value:new String[]{"light","dark","system","light","system"}) {
   Result result=new Result();module.sync(value,result);check(result.ok);
   check(module.getConstants().get("initialPreference").equals(value));
  }
  check(SQLiteDatabase.opened==1 && SQLiteDatabase.closed==1);
  check(android.app.UiModeManager.INSTANCE.mode==0);
  check(androidx.appcompat.app.AppCompatDelegate.mode==-1);
  Result invalid=new Result();module.sync("invalid",invalid);check(invalid.rejected);
  check(LaunchAppearance.currentPreference().equals("system"));
  System.out.println("Launch read closed before React; runtime sync uses no SQLite; system reset and validation passed");
 }
}''',
  }
  with tempfile.TemporaryDirectory() as d:
   base=pathlib.Path(d)
   for name,text in sources.items():
    p=base/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
   native=ROOT/'android/app/src/main/java/name/roqia/app/appearance'
   files=list(base.rglob('*.java'))+[native/'LaunchAppearance.java',native/'AppearanceModule.java']
   subprocess.run([str(javac),'-d',str(base),*map(str,files)],check=True,capture_output=True)
   db=base/'roqia-v2.sqlite';db.touch()
   result=subprocess.run([str(javac.with_name('java')),'-cp',str(base),'-Ddatabase='+str(db),'Check'],check=True,capture_output=True,text=True)
   self.assertIn('runtime sync uses no SQLite',result.stdout)
if __name__=='__main__':unittest.main()
