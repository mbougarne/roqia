#!/usr/bin/env python3
"""Phase 12 normal app visual captures. Requires fresh backup; emulator-5554 only."""

import argparse
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--output', required=True)
p.add_argument('--theme', choices=['light', 'dark'], default='light')
p.add_argument('--screens', default='')
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
            bounds = list(
                map(int, re.findall(r'\d+', next(root.iter('node')).get('bounds')))
            )
            width, height = bounds[2], bounds[3]
            shell(
                'input',
                'swipe',
                str(width - 30),
                str(int(height * 0.78)),
                str(width - 30),
                str(int(height * 0.45)),
                '450',
            )
    raise AssertionError('Missing control ' + label)


def capture(name):
    time.sleep(0.5)
    for _ in range(8):
        root = tree()
        text = ' '.join(values(root))
        if len(text) > 25:
            break
        time.sleep(0.3)
    assert any(n.get('package') == 'name.roqia.app' for n in root.iter('node')), (
        'App is not in the foreground: ' + text
    )
    assert len(text) > 25 and 'جار تجهيز التطبيق' not in text, text
    # Source verse markers are immutable scripture, not UI numerals.
    ui_text = re.sub(r'﴿[\u0660-\u0669\u06f0-\u06f9]+﴾', '', text)
    assert not re.search('[\u0660-\u0669\u06f0-\u06f9]', ui_text), ui_text
    assert 'Open debugger' not in text and 'Render Error' not in text, text
    assert 'تعذر حفظ أو استرجاع بياناتك' not in text, text
    (out / (name + '.png')).write_bytes(run('exec-out', 'screencap', '-p'))
    (out / (name + '.xml')).write_bytes(ET.tostring(root, encoding='utf-8'))
    print(name + ': captured', flush=True)
    return root


def theme(name):
    link('settings', 'الإعدادات')
    tap('نهاري' if name == 'light' else 'ليلي', True)


if __name__ == '__main__':
    shell('input', 'keyevent', 'KEYCODE_WAKEUP')
    shell('wm', 'dismiss-keyguard')
    theme(args.theme)
    screens = [
        ('ruqya', 'الرقية الشرعية', '08-ruqya'),
        ('adkar', 'أذكار اليوم', '09-adhkar'),
        ('adkar/morning', 'أذكار الصباح', '10-morning'),
        ('adkar/night', 'أذكار المساء', '11-evening'),
        ('adkar/before-sleep', 'أذكار قبل النوم', '12-before-sleep'),
        ('duaa', 'الأدعية', '13-dua'),
        ('tasbihat', 'التسبيح', '14-tasbih'),
        ('more', 'المزيد', '15-more'),
        ('about', 'حول التطبيق', '16-about'),
        ('privacy', 'سياسة الخصوصية', '17-privacy'),
        ('terms', 'شروط الاستخدام', '18-terms'),
        ('quran', 'القرآن الكريم', '22-quran-library'),
        ('quran/editions', 'اختيار المصحف', '23-mushaf-selection'),
        ('quran/warsh-kfgqpc-v2.1-update6/112/1', 'الإخلاص', '25-warsh-reader'),
        ('quran/hafs-tanzil-uthmani-1.1/112/1', 'الإخلاص', '26-hafs-reader-french'),
        ('quran/search', 'البحث في القرآن', '30-quran-search'),
        ('quran/bookmarks', 'العلامات المحفوظة', '31-bookmarks'),
        ('sources', 'المصادر', '32-content-sources'),
        ('quran/audio', 'اختر القارئ', '33-reciter-selection'),
        ('downloads', 'التنزيلات', '35-download-queue'),
        ('quran/offline-audio', 'مكتبتي الصوتية', '36-offline-audio'),
        ('storage', 'إدارة التخزين', '37-storage'),
        ('player', 'الاستماع', '38-audio-player'),
        ('prayer', 'مواقيت الصلاة', '39-prayer-times'),
        ('qibla', 'من الشمال الحقيقي', '40-qibla'),
        ('qibla/calibration', 'معايرة البوصلة', '41-qibla-calibration'),
        ('prayer/location', 'المدينة والموقع', '42-city-location'),
        ('prayer/adhan', 'تنبيهات الصلاة والأذان', '43-adhan-settings'),
        ('prayer/sounds', 'أصوات الأذان', '44-adhan-sound'),
        ('prayer/calculation', 'طريقة الحساب والتوقيت', '45-prayer-adjustments'),
        ('reminders', 'التذكيرات اليومية', '46-reminders'),
        ('settings', 'الإعدادات', '47-app-settings'),
        ('guidance', 'ضوابط الرقية', '07-guidance'),
    ]
    for path, label, name in screens:
        if args.screens and name[:2] not in args.screens.split(','):
            continue
        link(path, label, True)
        if name == '37-storage':
            time.sleep(4)  # Wait for asynchronous on-disk byte accounting.
        capture(name + '-' + args.theme)
