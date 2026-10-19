#!/usr/bin/env python3
"""Isolated production-adapter download matrix on emulator-5554. Back up before running."""

import argparse
import json
import subprocess
import time
from pathlib import Path

ADB = '/Users/mbougarne/Library/Android/sdk/platform-tools/adb'
p = argparse.ArgumentParser()
p.add_argument('modes', nargs='+')
p.add_argument('--out', default='/private/tmp/roqia-phase10/matrix.json')
a = p.parse_args()


def adb(*args):
    return subprocess.run(
        [ADB, '-s', 'emulator-5554', *args], capture_output=True, text=True, check=True
    ).stdout


def events():
    raw = adb(
        'exec-out', 'run-as', 'name.roqia.app', 'cat', 'files/feasibility/events.jsonl'
    )
    return [json.loads(s) for s in raw.splitlines() if s.startswith('{')]


def launch(scenario):
    adb(
        'shell',
        'am',
        'start',
        '-f',
        '0x10008000',
        '-n',
        'name.roqia.app/.feasibility.ProbeActivity',
        '--es',
        'scenario',
        scenario,
    )


def kill():
    pid = adb('shell', 'pidof', 'name.roqia.app').strip()
    assert pid and pid.isdigit(), pid
    adb('shell', 'run-as', 'name.roqia.app', 'kill', '-9', pid)


Path(a.out).parent.mkdir(parents=True, exist_ok=True)
report = []
try:
    for mode in a.modes:
        start = len(events())
        started_at = time.time() * 1000
        if mode in ['native-wifi', 'any-network']:
            adb('shell', 'svc', 'data', 'enable')
            adb('shell', 'svc', 'wifi', 'disable')
            time.sleep(2)
        scenario = 'phase10-' + mode
        launch(scenario)
        interrupted = False
        network_at = None
        backgrounded = False
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            current = events()[start:]
            assert not any(e['event'] == 'scenario-failed' for e in current), current
            if not interrupted and any(
                e['event'] in ['phase10-active-loss', 'phase10-crash-window']
                or (mode == 'user-pause' and e['event'] == 'phase10-paused')
                for e in current
            ):
                kill()
                time.sleep(1)
                launch('phase10-recover-' + mode)
                interrupted = True
            if (
                mode == 'network'
                and network_at is None
                and any(e['event'] == 'phase10-network-window' for e in current)
            ):
                adb('shell', 'svc', 'data', 'enable')
                adb('shell', 'svc', 'wifi', 'disable')
                network_at = time.monotonic()
            if (
                mode == 'native-wifi'
                and network_at is None
                and any(e['event'] == 'phase10-native-wifi-window' for e in current)
            ):
                network_at = time.monotonic()
            if (
                mode == 'native-wifi'
                and network_at
                and time.monotonic() - network_at < 5
            ):
                requests = json.loads(
                    Path('/private/tmp/roqia-phase10/requests.json').read_text()
                )
                assert not any(
                    r['mode'] == mode and r['at'] >= started_at for r in requests
                ), 'Native Wi-Fi constraint leaked bytes'
                Path('/private/tmp/roqia-phase10/native-wifi-job.txt').write_text(
                    adb('shell', 'dumpsys', 'jobscheduler')
                )
            if network_at and time.monotonic() - network_at > 5:
                adb('shell', 'svc', 'wifi', 'enable')
                network_at = 0
            if (
                mode == 'background'
                and not backgrounded
                and any(e['event'] == 'phase10-background-window' for e in current)
            ):
                adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
                backgrounded = True
            if any(
                e['event'] == 'scenario-finished'
                and e['detail']['scenario'] in [scenario, 'phase10-recover-' + mode]
                for e in current
            ):
                adb('shell', 'svc', 'wifi', 'enable')
                report.append({'mode': mode, 'passed': True, 'events': current})
                Path(a.out).write_text(json.dumps(report, indent=2))
                print(mode + ': PASS', flush=True)
                break
            time.sleep(0.5)
        else:
            raise AssertionError('Timeout: ' + json.dumps(current))
finally:
    adb('shell', 'svc', 'wifi', 'enable')
    adb('shell', 'svc', 'data', 'enable')
