#!/usr/bin/env python3
"""Opt-in normal Android prayer journeys. Back up emulator app data first."""

import argparse
import json
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument(
    '--section',
    choices=['screens', 'notifications', 'offline', 'location', 'calculation'],
    default='screens',
)
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
adb = ['/Users/mbougarne/Library/Android/sdk/platform-tools/adb', '-s', 'emulator-5554']


def run(*args):
    return subprocess.check_output(adb + list(args))


def shell(*args):
    return run('shell', *args).decode()


last_tree = None


def tree():
    global last_tree
    for _ in range(6):
        try:
            shell('rm', '-f', '/data/local/tmp/roqia-phase6.xml')
            shell(
                'CLASSPATH=/system/framework/uiautomator.jar:/system/framework/android.test.runner.jar:/system/framework/android.test.base.jar:/data/local/tmp/roqia-hierarchy.jar app_process /system/bin com.android.commands.uiautomator.Launcher runtest -c roqia.testing.Hierarchy#testDump -e jars /data/local/tmp/roqia-hierarchy.jar'
            )
            last_tree = ET.fromstring(
                run('exec-out', 'cat', '/data/local/tmp/roqia-phase6.xml')
            )
            return last_tree
        except (subprocess.CalledProcessError, ET.ParseError):
            time.sleep(0.3)
    raise AssertionError('Android did not expose a UI tree')


def tap_cached(label):
    node = next(
        n
        for n in last_tree.iter('node')
        if n.get('content-desc') == label
        and n.get('clickable') == 'true'
        and n.get('enabled') == 'true'
    )
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    time.sleep(0.5)


def values():
    return [
        (n.get('text') or n.get('content-desc') or '')
        .replace('\u2066', '')
        .replace('\u2069', '')
        for n in tree().iter('node')
    ]


def wait(label):
    for _ in range(18):
        try:
            if any(label in v for v in values()):
                return
        except (subprocess.CalledProcessError, ET.ParseError, AssertionError):
            pass
        time.sleep(0.4)
    raise AssertionError('Missing screen/text: ' + label)


def link(path, label, cold=False):
    if cold:
        shell('am', 'force-stop', 'name.roqia.app')
    activity = 'name.roqia.app/.MainActivity'
    shell(
        'am',
        'start',
        '-n',
        activity,
        '--activity-single-top',
        '--activity-clear-top',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        'roqia://' + path,
        '--es',
        'phase',
        '6',
    )
    wait(label)


def tap(label, scroll=False):
    for attempt in range(12 if scroll else 5):
        root = tree()
        parents = {c: p for p in root.iter() for c in p}
        nodes = list(root.iter('node'))
        if dismiss_warning(nodes):
            continue
        candidates = [
            n
            for n in nodes
            if (n.get('content-desc') or '')
            .replace('✓ ', '')
            .replace('\u2066', '')
            .replace('\u2069', '')
            .strip()
            == label
            and n.get('clickable') == 'true'
            and n.get('enabled') == 'true'
        ]
        if not candidates:
            for n in nodes:
                if (n.get('text') or '').replace('✓ ', '').replace(
                    '\u2066', ''
                ).replace('\u2069', '').strip() != label:
                    continue
                while n in parents and n.get('clickable') != 'true':
                    n = parents[n]
                if n.get('clickable') == 'true' and n.get('enabled') == 'true':
                    candidates.append(n)
        for node in candidates:
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
            height = 2400  # fixed emulator display, including native dialogs
            if x2 > x1 and y2 - y1 >= 60 and y2 <= height - 60:
                shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
                time.sleep(0.5)
                return
        if scroll:
            shell('input', 'swipe', '1045', '1800', '1045', '600', '350')
        else:
            time.sleep(0.5)
    raise AssertionError('Missing enabled control: ' + label)


def dismiss_warning(nodes):
    banner = next(
        (n for n in nodes if n.get('text') == 'Open debugger to view warnings.'), None
    )
    if banner is not None:
        by1, by2 = map(int, re.findall(r'\d+', banner.get('bounds'))[1::2])
        candidates = []
        for n in nodes:
            if n.get('NAF') == 'true' and n.get('clickable') == 'true':
                x1, y1, x2, y2 = map(int, re.findall(r'\d+', n.get('bounds')))
                if y1 <= by2 and y2 >= by1:
                    candidates.append((x1, y1, x2, y2))
        if candidates:
            x1, y1, x2, y2 = max(candidates)
            shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
            time.sleep(0.3)
            return True
    return False


def capture(name):
    dismiss_warning(list(tree().iter('node')))
    (out / (name + '.png')).write_bytes(run('exec-out', 'screencap', '-p'))
    (out / (name + '.xml')).write_bytes(ET.tostring(tree(), encoding='utf-8'))


def edit(label, value):
    tap(label, True)
    shell('input', 'keycombination', '113', '29')
    shell('input', 'keyevent', 'KEYCODE_DEL')
    shell('input', 'text', value)
    shell('input', 'keyevent', 'KEYCODE_BACK')
    time.sleep(0.3)


report = []
if args.section == 'screens':
    link('prayer', 'الصلاة', True)
    if any('حدد المكان' in v for v in values()):
        capture('prayer-location-required')
    link('prayer/location', 'المدينة والموقع')
    capture('location-cities')
    tap('الدار البيضاء')
    wait('الصلاة القادمة')
    for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
        link('settings', 'الإعدادات')
        tap(label)
        for path, title, name in [
            ('prayer', 'الصلاة القادمة', 'prayer'),
            ('qibla', 'اتجاه القبلة', 'qibla'),
            ('qibla/calibration', 'معايرة البوصلة', 'calibration'),
            ('prayer/calculation', 'طريقة الحساب والتوقيت', 'calculation'),
            ('prayer/adhan', 'تنبيهات الصلاة والأذان', 'adhan'),
            ('prayer/sounds', 'أصوات الأذان', 'sounds'),
            ('prayer/sources', 'مصادر الصلاة والقبلة', 'sources'),
        ]:
            link(path, title)
            capture(name + '-' + theme)
        report.append(
            {'journey': 'seven normal prayer routes', 'theme': theme, 'pass': True}
        )
    link('settings', 'الإعدادات')
    tap('نهاري')
    link('prayer', 'الصلاة القادمة')
    tap('تحديث حصة المدينة', True)
    time.sleep(4)
    assert not any('تعذر إكمال' in v for v in values())
    capture('ministry-refreshed')
    report.append(
        {
            'journey': 'manual city without location permission and explicit ministry refresh',
            'pass': True,
        }
    )
elif args.section == 'offline':
    shell('svc', 'wifi', 'disable')
    shell('svc', 'data', 'disable')
    try:
        link('prayer', 'الصلاة القادمة', True)
        wait('حصة محفوظة')
        capture('prayer-offline-cold-start')
        link('qibla', 'اتجاه القبلة')
        capture('qibla-offline')
        link('quran', 'القرآن الكريم')
        capture('quran-preserved')
        report.append(
            {
                'journey': 'offline cold-start prayer and Qibla; Quran library preserved',
                'pass': True,
            }
        )
    finally:
        shell('svc', 'wifi', 'enable')
        shell('svc', 'data', 'enable')
elif args.section == 'location':
    link('prayer/location', 'المدينة والموقع', True)
    tap('استخدام موقعي مرة واحدة', True)
    wait('location')
    capture('location-permission')
    tap('Don’t allow')
    wait('تعذر إكمال العملية')
    capture('location-denied')
    tap('OK')
    link('prayer/location', 'المدينة والموقع', True)
    tap('استخدام موقعي مرة واحدة', True)
    wait('location')
    tap('While using the app')
    for _ in range(3):
        run('emu', 'geo', 'fix', '-7.611', '33.588')
        time.sleep(1)
    wait('دقة الموقع')
    capture('location-fix')
    tap('حفظ الموقع', True)
    link('prayer', 'لا توجد مواقيت صالحة')
    capture('manual-location-needs-method')
    link('prayer/location', 'المدينة والموقع')
    tap('الدار البيضاء')
    report.append(
        {
            'journey': 'foreground location denial fallback then granted emulator fix; explicit save and no automatic city mapping',
            'pass': True,
        }
    )
elif args.section == 'calculation':
    link('prayer/calculation', 'طريقة الحساب والتوقيت', True)
    tap('رابطة العالم الإسلامي')
    tap('الحنفي', True)
    tap('سبع الليل', True)
    edit('الفجر', '2')
    tap('12 ساعة', True)
    tap('حفظ إعدادات الحساب', True)
    link('prayer', 'الصلاة القادمة')
    wait('أوقات محسوبة')
    capture('calculated-12-hour')
    link('prayer/calculation', 'طريقة الحساب والتوقيت')
    tap('إعادة إعدادات الحساب الافتراضية', True)
    tap('إعادة')
    tap('حفظ إعدادات الحساب', True)
    link('prayer', 'الصلاة القادمة')
    wait('حصة محفوظة')
    capture('calculation-reset')
    report.append(
        {
            'journey': 'explicit named calculation, Hanafi/seventh, +2 Fajr, 12-hour preference, then confirmed default reset',
            'pass': True,
        }
    )
else:
    link('prayer/adhan', 'تنبيهات الصلاة والأذان', True)
    tap('الفجر: إشعار فقط', True)
    tap('حفظ تنبيهات الصلاة', True)
    time.sleep(1)
    if any(v == 'Allow' for v in values()):
        tap('Allow')
    wait('تم حفظ تنبيهات الصلاة')
    tap('OK')
    capture('adhan-saved')
    tap('تجربة الإشعار', True)
    time.sleep(1)
    shell('cmd', 'statusbar', 'expand-notifications')
    wait('تجربة تنبيه الصلاة')
    capture('notification-delivered')
    shell('cmd', 'statusbar', 'collapse')
    link('prayer/adhan', 'تنبيهات الصلاة والأذان', True)
    capture('adhan-cold-start')
    tap('الفجر: متوقف', True)
    tap('حفظ تنبيهات الصلاة', True)
    wait('تم حفظ تنبيهات الصلاة')
    tap('OK')
    report.append(
        {
            'journey': 'Fajr notification preference, immediate notification delivered and cold restart, then disabled',
            'pass': True,
        }
    )
(out / (args.section + '.json')).write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n'
)
print(args.section + ' passed')
