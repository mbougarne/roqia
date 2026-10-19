#!/usr/bin/env python3
"""Run normal reader journeys offline on emulator-5554; always restore connectivity."""

import argparse
import json
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=True)
adb = ['/Users/mbougarne/Library/Android/sdk/platform-tools/adb', '-s', 'emulator-5554']


def shell(*args):
    return subprocess.check_output(adb + ['shell', *args]).decode().strip()


keys = ['airplane_mode_on', 'wifi_on', 'mobile_data']
before = {key: shell('settings', 'get', 'global', key) for key in keys}
report = {'before': before}
try:
    shell('cmd', 'connectivity', 'airplane-mode', 'enable')
    shell('svc', 'wifi', 'disable')
    shell('svc', 'data', 'disable')
    report['during'] = {key: shell('settings', 'get', 'global', key) for key in keys}
    assert report['during'] == {
        'airplane_mode_on': '1',
        'wifi_on': '0',
        'mobile_data': '0',
    }
    subprocess.run(
        [
            sys.executable,
            str(Path(__file__).with_name('android-journeys.py')),
            '--section',
            'readers',
            '--output',
            str(out / 'ui'),
        ],
        check=True,
        timeout=900,
    )
    report['offlineColdStartReadersPassed'] = True
finally:
    shell(
        'cmd',
        'connectivity',
        'airplane-mode',
        'enable' if before['airplane_mode_on'] == '1' else 'disable',
    )
    shell('svc', 'wifi', 'enable' if before['wifi_on'] == '1' else 'disable')
    shell('svc', 'data', 'enable' if before['mobile_data'] == '1' else 'disable')
    report['restored'] = {key: shell('settings', 'get', 'global', key) for key in keys}
    (out / 'offline.json').write_text(json.dumps(report, indent=2) + '\n')
