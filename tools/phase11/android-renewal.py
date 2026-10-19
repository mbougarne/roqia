#!/usr/bin/env python3
"""Run only Roqia's renewal job in an app process with no foreground Activity."""
import argparse,json,sqlite3,subprocess,tempfile,time
from pathlib import Path
ADB='/Users/mbougarne/Library/Android/sdk/platform-tools/adb'
p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument('--apk');g.add_argument('--reboot',action='store_true');p.add_argument('--out',default='/private/tmp/roqia-phase11/renewal.json');a=p.parse_args()
def adb(*args,check=True):return subprocess.run([ADB,'-s','emulator-5554',*args],capture_output=True,check=check)
def database(folder,remote,name):
 for suffix in ['','-wal','-shm']:
  r=adb('exec-out','run-as','name.roqia.app','cat',remote+suffix,check=False)
  if r.returncode==0:(folder/(name+suffix)).write_bytes(r.stdout)
 return sqlite3.connect(folder/name)
with tempfile.TemporaryDirectory() as directory:
 d=Path(directory)
 with database(d,'no_backup/androidx.work.workdb','work.db') as db:
  jobs=db.execute("SELECT s.system_id,w.id FROM SystemIdInfo s JOIN WorkSpec w ON w.id=s.work_spec_id WHERE w.worker_class_name='name.roqia.app.prayer.PrayerRenewalWorker' AND w.interval_duration>0").fetchall()
 assert len(jobs)==1,jobs
 job,work=jobs[0]
 adb('shell','input','keyevent','KEYCODE_HOME')
 pid=adb('shell','pidof','name.roqia.app').stdout.decode().strip()
 if pid:
  assert pid.isdigit();adb('shell','run-as','name.roqia.app','kill','-9',pid)
 started=int(time.time()*1000)
 if a.reboot:
  adb('reboot');adb('wait-for-device')
  for _ in range(60):
   if adb('shell','getprop','sys.boot_completed',check=False).stdout.strip()==b'1':break
   time.sleep(1)
  else:raise AssertionError('Emulator boot timeout')
  adb('shell','input','keyevent','KEYCODE_WAKEUP');adb('shell','wm','dismiss-keyguard')
 else:
  result=adb('install','-r',a.apk).stdout.decode()
  assert 'Success' in result,result
 # Boot/package replacement invokes the immediate companion through the same worker.
 deadline=time.monotonic()+80
 value=None
 while time.monotonic()<deadline:
  with tempfile.TemporaryDirectory() as snap:
   with database(Path(snap),'databases/roqia-v2.sqlite','app.db') as db:
    row=db.execute("SELECT value FROM records WHERE collection='prayer' AND id='renewal'").fetchone()
    if row:value=json.loads(row[0])
  if value and value['at']>=started:break
  time.sleep(1)
 else:raise AssertionError('Renewal did not execute: '+repr(value))
 activities=adb('shell','dumpsys','activity','activities').stdout.decode()
 resumed=[line.strip() for line in activities.splitlines() if 'mResumedActivity' in line or 'topResumedActivity' in line]
 assert not any('name.roqia.app/' in line for line in resumed),resumed
 report={'passed':True,'jobId':job,'workId':work,'trigger':'BOOT_COMPLETED' if a.reboot else 'MY_PACKAGE_REPLACED','periodicJobRegistered':True,'processKilledBeforeRun':bool(pid),'noRoqiaActivityResumed':True,'renewal':value}
 Path(a.out).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
