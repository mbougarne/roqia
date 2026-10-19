"""Exercise production native timer logic with deterministic Android clock/storage stubs."""

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JAVA = (
    Path(
        os.environ.get('JAVA_HOME', '/Users/mbougarne/.sdkman/candidates/java/current')
    )
    / 'bin'
)


class NativeSleepTest(unittest.TestCase):
    def test_deadline_replace_cancel_process_restart_and_reboot(self):
        with tempfile.TemporaryDirectory() as directory:
            tmp = Path(directory)
            files = {
                'android/os/Looper.java': 'package android.os; public class Looper {static final Looper l=new Looper();public static Looper getMainLooper(){return l;}public static Looper myLooper(){return l;}}',
                'android/os/SystemClock.java': 'package android.os; public class SystemClock {public static long now=10000;public static long elapsedRealtime(){return now;}}',
                'android/os/Handler.java': 'package android.os; public class Handler {public static Runnable next;public Handler(Looper l){}public void removeCallbacks(Runnable r){next=null;}public void postDelayed(Runnable r,long d){next=r;}public static void fire(){Runnable r=next;next=null;if(r!=null)r.run();}}',
                'android/provider/Settings.java': 'package android.provider; public class Settings {public static class Global {public static int boot=1;public static String BOOT_COUNT="boot";public static int getInt(Object r,String n,int d){return boot;}}}',
                'android/util/Log.java': 'package android.util; public class Log {public static int i(String t,String m){return 0;}}',
                'android/content/Context.java': 'package android.content;public class Context {final SharedPreferences p=new SharedPreferences();public Context getApplicationContext(){return this;}public Object getContentResolver(){return this;}public SharedPreferences getSharedPreferences(String n,int m){return p;}}',
                'android/content/SharedPreferences.java': """package android.content;import java.util.*;public class SharedPreferences {final Map<String,Long> m=new HashMap<>(); public long getLong(String k,long d){return m.getOrDefault(k,d);}public int getInt(String k,int d){return (int)getLong(k,d);}public Editor edit(){return new Editor();}public class Editor {Map<String,Long> writes=new HashMap<>();Set<String> deletes=new HashSet<>();public Editor putLong(String k,long v){writes.put(k,v);return this;}public Editor putInt(String k,int v){return putLong(k,v);}public Editor remove(String k){deletes.add(k);return this;}public boolean commit(){for(String k:deletes)m.remove(k);m.putAll(writes);return true;}}}""",
                'TimerCheck.java': """import android.content.*;import android.os.*;import android.provider.Settings;import com.doublesymmetry.trackplayer.service.RoqiaSleepTimer;
public class TimerCheck {static int pauses;static void check(boolean b){if(!b)throw new AssertionError();}public static void main(String[] args){
 Context c=new Context();RoqiaSleepTimer.attach(c,()->pauses++);
 RoqiaSleepTimer.set(c,1000);SystemClock.now+=999;Handler.fire();check(pauses==0);SystemClock.now++;Handler.fire();check(pauses==1);check(RoqiaSleepTimer.get(c)==0);
 RoqiaSleepTimer.set(c,1000);RoqiaSleepTimer.set(c,3000);SystemClock.now+=1500;Handler.fire();check(pauses==1);RoqiaSleepTimer.set(c,0);SystemClock.now+=5000;Handler.fire();check(pauses==1);
 RoqiaSleepTimer.set(c,2000);RoqiaSleepTimer.detach();SystemClock.now+=500;RoqiaSleepTimer.attach(c,()->pauses++);check(RoqiaSleepTimer.get(c)>System.currentTimeMillis());SystemClock.now+=1600;Handler.fire();check(pauses==2);
 RoqiaSleepTimer.set(c,1000);RoqiaSleepTimer.detach();SystemClock.now+=5000;RoqiaSleepTimer.attach(c,()->pauses++);check(pauses==3);check(RoqiaSleepTimer.get(c)==0);
 // A wall-clock jump in the same boot does not extend or shorten the monotonic countdown.
 RoqiaSleepTimer.set(c,2000);c.getSharedPreferences("roqia-sleep",0).edit().putLong("wall",1).commit();check(RoqiaSleepTimer.get(c)>System.currentTimeMillis());
 RoqiaSleepTimer.detach();Settings.Global.boot++;RoqiaSleepTimer.attach(c,()->pauses++);check(pauses==4);check(RoqiaSleepTimer.get(c)==0);
 try{RoqiaSleepTimer.set(c,-1);throw new AssertionError();}catch(IllegalArgumentException expected){}
 try{RoqiaSleepTimer.set(c,14400001);throw new AssertionError();}catch(IllegalArgumentException expected){}
 RoqiaSleepTimer.detach();try{RoqiaSleepTimer.set(c,1000);throw new AssertionError();}catch(IllegalStateException expected){}
 System.out.println("native sleep: expiry, replacement, cancellation, restart, reboot, clock change, bounds passed");}}
""",
            }
            for name, text in files.items():
                p = tmp / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(text)
            source = (
                ROOT
                / 'node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/service/RoqiaSleepTimer.java'
            )
            subprocess.run(
                [
                    str(JAVA / 'javac'),
                    '-d',
                    str(tmp),
                    str(source),
                    *[str(tmp / n) for n in files],
                ],
                check=True,
                capture_output=True,
            )
            result = subprocess.run(
                [str(JAVA / 'java'), '-cp', str(tmp), 'TimerCheck'],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            print(result.stdout.strip())


if __name__ == '__main__':
    unittest.main()
