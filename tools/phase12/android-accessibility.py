#!/usr/bin/env python3
"""Representative 320 dp and 200% text checks; restore display in finally."""
import subprocess,json,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
base=Path(args.output);base.mkdir(parents=True,exist_ok=True)
adb=['/Users/mbougarne/Library/Android/sdk/platform-tools/adb','-s','emulator-5554']
def shell(*args):subprocess.run(adb+['shell']+list(args),check=True,stdout=subprocess.DEVNULL)
report=[]
try:
 for mode,theme in [('narrow','light'),('large','dark')]:
  shell('wm','size','840x1867' if mode=='narrow' else 'reset');shell('settings','put','system','font_scale','2.0' if mode=='large' else '1.0')
  with (base/(mode+'.log')).open('w') as log:
   subprocess.run(['python3','tools/phase12/android-visual.py','--output',str(base/mode),'--theme',theme,'--screens','07,08,14,15,22,25,30,33,35,38,39,40,42,43,47'],check=True,stdout=log,stderr=subprocess.STDOUT)
  if mode=='large':
   with (base/'large-modal.log').open('w') as log:
    subprocess.run(['python3','tools/phase12/android-journeys.py','--output',str(base/mode),'--theme',theme,'--screens','19,20,21'],check=True,stdout=log,stderr=subprocess.STDOUT)
  report.append({'condition':mode,'theme':theme,'screens':18 if mode=='large' else 15,'widthDp':320 if mode=='narrow' else 1080*160/420,'fontScale':2 if mode=='large' else 1})
finally:
 shell('wm','size','reset');shell('settings','put','system','font_scale','1.0')
(base/'accessibility.json').write_text(json.dumps(report,indent=2)+'\n')
