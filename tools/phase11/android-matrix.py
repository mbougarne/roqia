#!/usr/bin/env python3
"""Phase 11 production-adapter checks; emulator-5554 only, no uninstall/data clear."""
import argparse,json,subprocess,time
from pathlib import Path
ADB='/Users/mbougarne/Library/Android/sdk/platform-tools/adb'
p=argparse.ArgumentParser();p.add_argument('modes',nargs='+');p.add_argument('--out',default='/private/tmp/roqia-phase11/android-matrix.json');a=p.parse_args()
def adb(*args):return subprocess.run([ADB,'-s','emulator-5554',*args],capture_output=True,text=True,check=True).stdout
def events():
 raw=adb('exec-out','run-as','name.roqia.app','cat','files/feasibility/events.jsonl')
 return [json.loads(s) for s in raw.splitlines() if s.startswith('{')]
def launch(scenario):
 adb('shell','input','keyevent','KEYCODE_WAKEUP');adb('shell','wm','dismiss-keyguard')
 adb('shell','am','start','-f','0x10008000','-n','name.roqia.app/.feasibility.ProbeActivity','--es','scenario',scenario)
report=[]
for mode in a.modes:
 start=len(events());scenario='phase11-'+mode;launch(scenario);backgrounded=False;restarted=False
 deadline=time.monotonic()+90
 while time.monotonic()<deadline:
  current=events()[start:]
  assert not any(e['event']=='scenario-failed' for e in current),current
  if not backgrounded and mode=='sleep' and any(e['event']=='phase11-sleep-armed' for e in current):
   adb('shell','input','keyevent','KEYCODE_HOME');adb('shell','input','keyevent','KEYCODE_SLEEP');backgrounded=True
  if not restarted and mode=='sleep-restart-arm' and any(e['event']=='phase11-sleep-armed' for e in current):
   pid=adb('shell','pidof','name.roqia.app').strip();assert pid.isdigit()
   adb('shell','run-as','name.roqia.app','kill','-9',pid);time.sleep(1);launch('phase11-sleep-restart-check');restarted=True
  expected='phase11-sleep-restart-check' if mode=='sleep-restart-arm' else scenario
  if any(e['event']=='scenario-finished' and e['detail']['scenario']==expected for e in current):
   report.append({'mode':mode,'passed':True,'events':current});Path(a.out).write_text(json.dumps(report,indent=2)+'\n');print(mode+': PASS',flush=True);break
  time.sleep(.5)
 else:raise AssertionError('Timeout: '+json.dumps(current))
adb('shell','input','keyevent','KEYCODE_WAKEUP');adb('shell','wm','dismiss-keyguard')
