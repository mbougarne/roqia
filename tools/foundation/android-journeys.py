#!/usr/bin/env python3
"""Opt-in emulator UI checks. Keeps counters/content intact; restores display scale and theme.
Only emulator-5554 is permitted. Requires the debug app and Metro already running.
"""
import argparse, json, os, re, shutil, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--display-only', action='store_true')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
sdk = Path(os.environ.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk')))
adb = [shutil.which('adb') or str(sdk / 'platform-tools/adb'), '-s', 'emulator-5554']

def run(*parts):
    return subprocess.check_output(adb + list(parts))

def shell(*parts):
    return run('shell', *parts).decode()

def tree():
    shell('rm', '-f', '/sdcard/roqia-phase2.xml')
    shell('uiautomator', 'dump', '/sdcard/roqia-phase2.xml')
    return ET.fromstring(run('exec-out', 'cat', '/sdcard/roqia-phase2.xml'))

def texts():
    return [n.get('text') or n.get('content-desc') for n in tree().iter('node')]

def link(path, cold=False):
    expected = {'more': 'إدارة التخزين', 'settings': 'الإعدادات', 'home': 'تشغيل جميع المقاطع', 'storage': 'إدارة التخزين', 'adkar/morning': 'أذكار الصباح', 'adkar/night': 'أذكار المساء', 'adkar/before-sleep': 'أذكار قبل النوم', 'duaa': 'الأدعية', 'tasbihat': 'التسبيحات', 'about': 'نبذة عنا', 'invalid': 'الرابط غير صالح', 'quran/warsh/1/1': 'المصحف المطلوب غير مثبت'}.get(path, 'رجوع')
    if cold:
        shell('am', 'force-stop', 'name.roqia.app')
    shell('am', 'start', '-n', 'name.roqia.app/.MainActivity', '-a', 'android.intent.action.VIEW', '-d', 'roqia://' + path)
    time.sleep(1)
    for attempt in range(20):
        try:
            nodes = tree()
            if any((expected in [n.get('text'), n.get('content-desc')] for n in nodes.iter('node'))):
                return
        except (subprocess.CalledProcessError, ET.ParseError):
            pass
        time.sleep(0.5)
    raise AssertionError('App did not become interactive after ' + path)

def tap(label):
    candidates = [n for n in tree().iter('node') if (n.get('content-desc') or '').replace('✓ ', '').strip() == label and n.get('clickable') == 'true']
    if not candidates:
        candidates = [n for n in tree().iter('node') if (n.get('text') or '').replace('✓ ', '').strip() == label]
    if not candidates:
        raise AssertionError('Missing control: ' + label)
    x1, y1, x2, y2 = map(int, re.findall('\\d+', candidates[0].get('bounds')))
    shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    time.sleep(0.4)

def capture(name):
    (out / (name + '.png')).write_bytes(run('exec-out', 'screencap', '-p'))
    (out / (name + '.xml')).write_bytes(ET.tostring(tree(), encoding='utf-8'))
report = json.loads((out / 'journeys.json').read_text()) if args.display_only and (out / 'journeys.json').exists() else []
font = shell('settings', 'get', 'system', 'font_scale').strip()
size = shell('wm', 'size')
try:
    if args.display_only:
        link('settings', True)
        tap('نهاري')
        link('more')
        assert 'إدارة التخزين' in texts()
    if not args.display_only:
        link('settings', True)
        tap('نهاري')
        link('more')
        assert 'إدارة التخزين' in texts()
        capture('more-light')
        report.append({'journey': 'cold link to More', 'pass': True})
        for path, title in [('adkar/morning', 'أذكار الصباح'), ('adkar/night', 'أذكار المساء'), ('adkar/before-sleep', 'أذكار قبل النوم'), ('duaa', 'الأدعية'), ('tasbihat', 'التسبيحات'), ('about', 'نبذة عنا')]:
            link(path)
            actual = texts()
            assert title in actual and 'رجوع' in actual, (path, actual)
            assert not all((t in actual for t in ['الرقية', 'الأذكار', 'القرآن', 'الصلاة', 'المزيد'])), path
            report.append({'journey': path, 'visibleText': [t for t in actual if t][:8], 'detailHasNoTabBar': True})
            shell('input', 'keyevent', '4')
            time.sleep(0.4)
        link('quran/warsh/1/1')
        assert 'المصحف المطلوب غير مثبت' in texts()
        capture('missing-pack')
        link('invalid')
        assert 'الرابط غير صالح' in texts()
        link('settings')
        tap('ليلي')
        link('more')
        capture('more-dark')
        link('home')
        tap('تشغيل جميع المقاطع')
        time.sleep(2)
        link('more')
        tap('إيقاف مؤقت')
        capture('paused-player-dark')
        link('duaa')
        assert 'متابعة الصوت' in texts()
        report.append({'journey': 'paused playback survives root/detail navigation', 'pass': True})
        tap('إيقاف الصوت')
        link('settings')
        tap('نهاري')
        link('storage')
        capture('storage-light')
        assert 'لا توجد حزم منزّلة' in texts()
    shell('wm', 'size', '840x1867')
    shell('settings', 'put', 'system', 'font_scale', '2.0')
    time.sleep(2)
    time.sleep(4)
    link('more')
    capture('more-light-320dp-200percent')
    assert 'إدارة التخزين' in texts()
    link('settings')
    tap('ليلي')
    link('more')
    capture('more-dark-320dp-200percent')
    report.append({'journey': '320dp with 200 percent OS text in both themes and activity recreation', 'pass': True})
finally:
    shell('settings', 'put', 'system', 'font_scale', font)
    match = re.search('Override size: (\\d+x\\d+)', size)
    shell('wm', 'size', match.group(1) if match else 'reset')
    time.sleep(2)
    link('settings')
    try:
        tap('نهاري')
    except Exception:
        pass
    link('more')
    (out / 'journeys.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
