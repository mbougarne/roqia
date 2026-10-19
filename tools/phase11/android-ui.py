#!/usr/bin/env python3
"""Normal Phase 11 functional UI checks. Requires fresh backup; emulator-5554 only."""

import argparse
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--output', required=True)
args = p.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
adb = ['/Users/mbougarne/Library/Android/sdk/platform-tools/adb', '-s', 'emulator-5554']


def run(*cmd):
    return subprocess.check_output(adb + list(cmd), timeout=40)


def shell(*cmd):
    return run('shell', *cmd).decode()


def tree():
    for _ in range(5):
        shell('rm', '-f', '/data/local/tmp/roqia-phase6.xml')
        shell(
            'CLASSPATH=/system/framework/uiautomator.jar:/system/framework/android.test.runner.jar:/system/framework/android.test.base.jar:/data/local/tmp/roqia-hierarchy.jar app_process /system/bin com.android.commands.uiautomator.Launcher runtest -c roqia.testing.Hierarchy#testDump -e jars /data/local/tmp/roqia-hierarchy.jar'
        )
        try:
            return ET.fromstring(
                run('exec-out', 'cat', '/data/local/tmp/roqia-phase6.xml')
            )
        except (subprocess.CalledProcessError, ET.ParseError):
            time.sleep(0.3)
    raise AssertionError('No fresh Android hierarchy')


def clean(text):
    return (
        (text or '')
        .replace('\u2066', '')
        .replace('\u2069', '')
        .removeprefix('✓ ')
        .strip()
    )


def values(root):
    return [clean(n.get('text') or n.get('content-desc')) for n in root.iter('node')]


def wait(label):
    for _ in range(12):
        try:
            root = tree()
            if any(label in v for v in values(root)):
                return root
        except (AssertionError, subprocess.CalledProcessError):
            pass
        time.sleep(0.5)
    raise AssertionError('Missing ' + label)


def link(path, label, cold=False):
    if cold:
        shell('am', 'force-stop', 'name.roqia.app')
    shell(
        'am',
        'start',
        '-n',
        'name.roqia.app/.MainActivity',
        '--activity-single-top',
        '--activity-clear-top',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        'roqia://' + path,
    )
    return wait(label)


def tap(label, scroll=False):
    for _ in range(40 if scroll else 3):
        root = tree()
        parents = {c: p for p in root.iter() for c in p}
        for node in root.iter('node'):
            if (
                clean(node.get('content-desc')) != label
                and clean(node.get('text')) != label
            ):
                continue
            while node in parents and node.get('clickable') != 'true':
                node = parents[node]
            if node.get('clickable') != 'true' or node.get('enabled') != 'true':
                continue
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
            if x2 > x1 and y2 - y1 > 60 and y2 < 2340:
                shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
                time.sleep(0.3)
                return
        if scroll:
            shell('input', 'swipe', '1000', '1800', '1000', '1100', '600')
    raise AssertionError('Missing control ' + label)


def capture(name):
    time.sleep(0.5)
    root = tree()
    text = ' '.join(values(root))
    assert len(text) > 50 and 'جار تجهيز التطبيق' not in text, text
    assert not re.search('[\u0660-\u0669\u06f0-\u06f9]', text), text
    assert 'Open debugger' not in text and 'Render Error' not in text, text
    (out / (name + '.png')).write_bytes(run('exec-out', 'screencap', '-p'))
    (out / (name + '.xml')).write_bytes(ET.tostring(root, encoding='utf-8'))
    return root


def theme(name):
    link('settings', 'الإعدادات')
    tap('نهاري' if name == 'light' else 'ليلي', True)


shell('input', 'keyevent', 'KEYCODE_WAKEUP')
shell('wm', 'dismiss-keyguard')
shell('svc', 'wifi', 'disable')
shell('svc', 'data', 'disable')
try:
    link('quran/hafs-tanzil-uthmani-1.1/1/1', 'الترجمات', True)
    wait("Au nom d'Allah")
    capture('hafs-french-offline')
    link('quran/warsh-kfgqpc-v2.1-update6/1/1', 'الترجمات', True)
    capture('warsh-offline')
    link('prayer', 'الصلاة القادمة', True)
    capture('prayer-offline')
    link('qibla', 'اتجاه القبلة')
    capture('qibla-offline')
    link('prayer/adhan', 'تنبيهات الصلاة والأذان')
    wait('تتجدد المواعيد')
    capture('prayer-renewal-coverage')
    link('quran/offline-audio', 'مكتبتي الصوتية', True)
    tap('استماع إلى السور المحفوظة', True)
    # UI hierarchy waits can outlast this short recording; check transport directly.
    for _ in range(30):
        if 'state=PLAYING(3)' in shell('dumpsys', 'media_session'):
            break
        time.sleep(0.2)
    else:
        raise AssertionError('offline recording did not start')
    shell('input', 'keyevent', 'KEYCODE_HOME')
    shell('input', 'keyevent', 'KEYCODE_MEDIA_PAUSE')
    time.sleep(2)
    media = shell('dumpsys', 'media_session')
    assert 'state=PAUSED(2)' in media, 'remote pause failed'
    shell('input', 'keyevent', 'KEYCODE_MEDIA_PLAY')
    time.sleep(2)
    media = shell('dumpsys', 'media_session')
    assert 'state=PLAYING(3)' in media, 'remote play failed'
    for mode in ['dark', 'light']:
        theme(mode)
        link('player', 'المشغل')
        tap('15 دقيقة', True)
        wait('يتوقف الصوت خلال')
        capture('sleep-timer-' + mode)
        tap('إلغاء مؤقت النوم')
        wait('المؤقت متوقف')
    link('player', 'المشغل')
    for _ in range(8):
        shell('input', 'swipe', '1000', '600', '1000', '2050', '350')
    tap('إيقاف الصوت')
    theme('dark')
    link('prayer', 'الصلاة القادمة')
    (out / 'ui-results.json').write_text(
        json.dumps(
            {
                'passed': True,
                'checks': [
                    'offline Hafs/French',
                    'offline original Warsh',
                    'offline prayer and Qibla',
                    'renewal coverage disclosure',
                    'normal native sleep selection/cancel in both themes',
                    'background media-key pause/resume',
                    'stop playback',
                ],
                'visualAcceptance': False,
            },
            indent=2,
        )
        + '\n'
    )
    print('Phase 11 normal offline UI checks: PASS', flush=True)
finally:
    shell('svc', 'wifi', 'enable')
    shell('svc', 'data', 'enable')
