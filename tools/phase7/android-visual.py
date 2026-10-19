#!/usr/bin/env python3
"""Normal-app UI capture/interaction checks. Requires emulator and phase6 hierarchy jar.
Back up the existing emulator app data first. No fixture UI or source mutations.
"""

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
    choices=['capture', 'journeys', 'large', 'narrow', 'restore'],
    default='capture',
)
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
adb = ['adb', '-s', 'emulator-5554']


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
        root = tree()
        if any(label in v for v in values(root)):
            return root
        time.sleep(0.3)
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
    for _ in range(12 if scroll else 3):
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
            shell('input', 'swipe', '1000', '1900', '1000', '650', '300')
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


report = []
if args.section in ['capture', 'large', 'narrow']:
    for mode in ['light', 'dark']:
        theme(mode)
        for path, title, num in [
            ('prayer', 'مواقيت الصلاة', '39-prayer-times'),
            ('qibla', 'من الشمال الحقيقي', '40-qibla'),
        ]:
            link(path, title, True)
            capture(
                num
                + '-'
                + mode
                + ('' if args.section == 'capture' else '-' + args.section)
            )
            if args.section != 'capture':
                shell('input', 'swipe', '1000', '1900', '1000', '600', '300')
                capture(num + '-' + mode + '-' + args.section + '-scrolled')
            report.append(
                {
                    'screen': num,
                    'theme': mode,
                    'variant': args.section,
                    'capture': True,
                    'visibleWesternDigits': True,
                }
            )
elif args.section == 'journeys':
    theme('light')
    link('prayer', 'مواقيت الصلاة', True)
    root = tree()
    labels = values(root)
    for name in ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء']:
        assert name in labels, name
    assert not any('الشروق:' in v and 'إعدادات التنبيه' in v for v in labels)
    # The five icon buttons open preferences and never silently toggle alarms.
    bell = next(
        clean(n.get('content-desc'))
        for n in root.iter('node')
        if n.get('clickable') == 'true' and 'الفجر:' in clean(n.get('content-desc'))
    )
    tap(bell)
    wait('تنبيهات الصلاة والأذان')
    shell('input', 'keyevent', 'KEYCODE_BACK')
    wait('مواقيت الصلاة')
    for control, title in [
        ('القبلة', 'من الشمال الحقيقي'),
        ('إعدادات الأذان', 'تنبيهات الصلاة والأذان'),
        ('طريقة الحساب والتوقيت', 'طريقة الحساب والتوقيت'),
        ('المدينة والموقع', 'الرباط'),
    ]:
        link('prayer', 'مواقيت الصلاة', True)
        tap(control, True)
        wait(title)
    link('qibla', 'من الشمال الحقيقي', True)
    tap('معايرة البوصلة', True)
    wait('معايرة البوصلة')
    tap('العودة إلى القبلة')
    wait('من الشمال الحقيقي')
    tap('المدينة والموقع')
    wait('المدينة والموقع')
    link('prayer', 'مواقيت الصلاة', True)
    tap('مصادر المواقيت والموقع', True)
    wait('مصادر الصلاة والقبلة')
    link('prayer', 'مواقيت الصلاة', True)
    # Confirm reference tab order using actual accessibility bounds.
    root = tree()
    tabs = {}
    for n in root.iter('node'):
        name = clean(n.get('content-desc'))
        if n.get('clickable') == 'true' and name in [
            'الرقية',
            'القرآن',
            'الأذكار',
            'الصلاة',
            'المزيد',
        ]:
            tabs[name] = int(re.findall(r'\d+', n.get('bounds'))[0])
    assert sorted(tabs, key=tabs.get, reverse=True) == [
        'الرقية',
        'القرآن',
        'الأذكار',
        'الصلاة',
        'المزيد',
    ], tabs
    tap('القرآن')
    wait('القرآن الكريم')
    capture('quran-preserved')
    shell('svc', 'wifi', 'disable')
    shell('svc', 'data', 'disable')
    try:
        link('prayer', 'مواقيت الصلاة', True)
        wait('الصلاة القادمة')
        capture('prayer-offline')
        link('qibla', 'من الشمال الحقيقي', True)
        capture('qibla-offline')
    finally:
        shell('svc', 'wifi', 'enable')
        shell('svc', 'data', 'enable')
    report.append(
        {
            'journey': 'six prayers, no sunrise toggle, bell/settings/city/calibration/source navigation, reference tab order, Quran library, offline cold start',
            'pass': True,
        }
    )
else:
    theme('light')
    link('prayer', 'مواقيت الصلاة', True)
if args.section != 'restore':
    (out / (args.section + '.json')).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    )
print(args.section + ' passed', flush=True)
