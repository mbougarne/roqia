#!/usr/bin/env python3
"""Run one opt-in debug probe on a named emulator; never selects a physical device."""
import argparse
import json
import os
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('scenario', choices=['timezone','provider','stable','range200','changed','wrong206','range416','unknown','recovery','reattach','audio','alarm','cleanup', 'fonts-light', 'fonts-dark', 'fonts-light-large', 'fonts-dark-large', 'fonts-light-marks', 'fonts-dark-marks'])
parser.add_argument('--serial', default='emulator-5554')
parser.add_argument('--adb', default=os.environ.get('ADB', 'adb'))
parser.add_argument('--background', action='store_true')
args = parser.parse_args()
if not args.serial.startswith('emulator-'):
    parser.error('This automated runner only operates on an explicitly named emulator.')

def adb(*commands):
    return subprocess.run([args.adb, '-s', args.serial, *commands], capture_output=True, text=True, check=True).stdout

def events():
    result = subprocess.run([args.adb, '-s', args.serial, 'exec-out', 'run-as', 'name.roqia.app', 'cat', 'files/feasibility/events.jsonl'], capture_output=True, text=True)
    return [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]

before = len(events())
# Separate activity instance; do not force-stop, clear data, uninstall, or select another device.
adb('shell', 'am', 'start', '-f', '0x10008000', '-n', 'name.roqia.app/.feasibility.ProbeActivity', '--es', 'scenario', args.scenario)
backgrounded = False
backgrounded_at = None
returned = False
for _ in range(70):
    current = events()[before:]
    if args.background and not backgrounded and any(e['event'] in ('audio-background-window', 'alarm-armed-from-js', 'download-begin') for e in current):
        adb('shell', 'input', 'keyevent', 'KEYCODE_HOME'); backgrounded = True; backgrounded_at = time.monotonic()
    if args.scenario == 'audio' and backgrounded_at and not returned and time.monotonic() - backgrounded_at >= 28:
        adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        adb('shell', 'wm', 'dismiss-keyguard')
        adb('shell', 'am', 'start', '-f', '0x20000', '-n', 'name.roqia.app/.feasibility.ProbeActivity')
        returned = True
    if any(e['event'] in ('scenario-finished', 'scenario-failed') and e.get('detail', {}).get('scenario') == args.scenario for e in current):
        print(json.dumps(current, indent=2))
        raise SystemExit(1 if any(e['event'] == 'scenario-failed' for e in current) else 0)
    time.sleep(1)
print(json.dumps(events()[before:], indent=2))
raise SystemExit('No completion within 70 seconds; inspect native logs. An armed alarm still needs delivery evidence.')
