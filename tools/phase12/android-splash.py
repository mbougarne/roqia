#!/usr/bin/env python3
"""Record the unmodified cold launch; select actual hydration frames from the video."""
import argparse,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--theme',choices=['light','dark'],required=True);p.add_argument('--output',required=True);p.add_argument('--system-theme',choices=['light','dark']);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
adb=['/Users/mbougarne/Library/Android/sdk/platform-tools/adb','-s','emulator-5554']
def run(*args):return subprocess.check_output(adb+list(args),timeout=30)
run('shell','cmd','uimode','night','yes' if (a.system_theme or a.theme)=='dark' else 'no')
run('shell','am','force-stop','name.roqia.app');run('shell','input','keyevent','KEYCODE_HOME');time.sleep(.3)
video='/data/local/tmp/roqia-phase12-launch.mp4'
process=subprocess.Popen(adb+['shell','screenrecord','--time-limit','8',video],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
time.sleep(.5);run('shell','am','start','-n','name.roqia.app/.MainActivity');process.communicate(timeout=15)
run('pull',video,str(out/(a.theme+'-launch.mp4')));run('shell','rm',video)
print(str(out/(a.theme+'-launch.mp4')))
