#!/usr/bin/env python3
"""Opt-in emulator-only phase 4 journeys. Back up/restore DB around mutations.
Private fixture UI is hosted by ProbeActivity; release screenshots use MainActivity.
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
    choices=[
        'screens',
        'interactions',
        'large',
        'empty',
        'controls',
        'details',
        'audio',
    ],
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
    for _ in range(3):
        try:
            shell('rm', '-f', '/sdcard/roqia-phase4.xml')
            shell('uiautomator', 'dump', '/sdcard/roqia-phase4.xml')
            last_tree = ET.fromstring(
                run('exec-out', 'cat', '/sdcard/roqia-phase4.xml')
            )
            return last_tree
        except (subprocess.CalledProcessError, ET.ParseError):
            time.sleep(0.3)
    raise AssertionError('Android did not expose an idle UI tree')


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
        except (subprocess.CalledProcessError, ET.ParseError):
            pass
        time.sleep(0.4)
    raise AssertionError('Missing screen/text: ' + label)


def link(path, label, cold=False):
    if cold:
        shell('am', 'force-stop', 'name.roqia.app')
    activity = (
        'name.roqia.app/.MainActivity'
        if args.section == 'empty'
        else 'name.roqia.app/.feasibility.ProbeActivity'
    )
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
        'scenario',
        'phase4-ui',
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
            height = (
                int(re.findall(r'\d+', root.get('bounds', '[0,0][1080,2400]'))[-1])
                if root.tag == 'node'
                else max(int(re.findall(r'\d+', n.get('bounds'))[-1]) for n in nodes)
            )
            if x2 > x1 and y2 - y1 >= 60 and y2 <= height - 60:
                shell('input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
                time.sleep(0.5)
                return
        if scroll:
            shell('input', 'swipe', '500', '1800', '500', '600', '350')
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


report = []
warsh = 'warsh-kfgqpc-v2.1-update6'
hafs = 'hafs-tanzil-uthmani-1.1'
if args.section == 'screens':
    for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
        link('settings', 'الإعدادات', True)
        tap(label)
        for path, title, name in [
            ('quran', 'القرآن الكريم', 'library'),
            ('quran/editions', 'اختيار المصحف', 'editions'),
            ('quran/search', 'البحث في القرآن', 'search'),
            ('quran/bookmarks', 'علامات القراءة', 'bookmarks'),
            ('quran/audio', 'القراء والتنزيلات الصوتية', 'audio'),
            ('quran/offline-audio', 'مكتبتي الصوتية', 'offline-audio'),
        ]:
            link(path, title)
            capture(name + '-' + theme)
        for edition, name in [(warsh, 'warsh'), (hafs, 'hafs')]:
            link('quran/' + edition + '/1/1', 'نسخ الآية')
            capture(name + '-reader-' + theme)
            tap('إعدادات القراءة')
            wait('حجم نص القرآن')
            capture(name + '-preferences-' + theme)
            tap('رجوع')
            wait('نسخ الآية')
            tap('الترجمات')
            wait('ترجمات المعاني')
            capture(name + '-translations-' + theme)
        link('quran/editions', 'اختيار المصحف')
        tap('تفاصيل المصحف والتنزيل')
        wait('تنزيل المصحف')
        capture('mushaf-download-' + theme)
        tap('معلومات المصدر')
        wait('معلومات المصحف')
        capture('source-' + theme)
        report.append(
            {
                'journey': 'library, edition selection, readers, preferences, translations, search, bookmarks, recording and offline libraries',
                'theme': theme,
                'pass': True,
            }
        )
    link('settings', 'الإعدادات')
    tap('نهاري')
elif args.section == 'interactions':
    link('quran/' + warsh + '/1/1', 'نسخ الآية', True)
    if 'إزالة علامة القراءة' in values():
        tap('إزالة علامة القراءة')
    tap('حفظ علامة القراءة')
    wait('إزالة علامة القراءة')
    tap('نسخ الآية')
    link('quran/' + hafs + '/1/1', 'نسخ الآية')
    tap('الترجمات')
    tap('اختيار الفرنسية', True)
    tap('رجوع')
    wait('ترجمة المعاني')
    capture('hafs-french')
    link('quran/bookmarks', 'علامات القراءة')
    wait('ورش عن نافع')
    tap('فتح موضع القراءة')
    wait('ورش عن نافع')
    capture('bookmark-original-edition')
    link('quran/' + warsh + '/2/253', '2:253')
    capture('warsh-long-surah')
    assert '2:253' in values()
    link('quran/editions', 'اختيار المصحف')
    tap('اختيار هذه الرواية', True)
    link('quran/bookmarks', 'علامات القراءة', True)
    wait('ورش عن نافع')
    tap('فتح موضع القراءة')
    wait('ورش عن نافع')
    report.append(
        {
            'journey': 'copy, edition-bound bookmark, French translation, long-surah locator, preference switch and restart',
            'pass': True,
        }
    )
elif args.section == 'large':
    font = shell('settings', 'get', 'system', 'font_scale').strip()
    size = shell('wm', 'size')
    try:
        shell('wm', 'size', '840x1867')
        shell('settings', 'put', 'system', 'font_scale', '2.0')
        for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
            link('settings', 'الإعدادات', True)
            tap(label, True)
            for edition, name in [(warsh, 'warsh'), (hafs, 'hafs')]:
                link(
                    'quran/' + edition + '/1/1',
                    'ورش عن نافع' if name == 'warsh' else 'حفص عن عاصم',
                )
                shell('input', 'swipe', '500', '1600', '500', '900', '350')
                capture(name + '-' + theme + '-320dp-200percent')
        report.append(
            {
                'journey': 'both readers, 320dp / 200% OS text in both themes',
                'pass': True,
            }
        )
    finally:
        shell('settings', 'put', 'system', 'font_scale', font)
        match = re.search(r'Override size: (\d+x\d+)', size)
        shell('wm', 'size', match.group(1) if match else 'reset')
        link('settings', 'الإعدادات', True)
        tap('نهاري', True)
elif args.section == 'details':
    for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
        link('settings', 'الإعدادات', True)
        tap(label)
        link('quran/' + hafs + '/1/1', 'نسخ الآية')
        tap('الترجمات')
        wait('ترجمات المعاني')
        capture('hafs-translations-' + theme)
        tap('اختيار الإنجليزية', True)
        tap('رجوع')
        wait('ترجمة المعاني')
        capture('hafs-english-' + theme)
        tap('الترجمات')
        tap('اختيار الفرنسية', True)
        tap('رجوع')
        wait('ترجمة المعاني')
        capture('hafs-french-' + theme)
        link('quran/editions', 'اختيار المصحف')
        tap('تفاصيل المصحف والتنزيل')
        wait('تنزيل المصحف')
        tap('معلومات المصدر')
        wait('معلومات المصحف')
        capture('source-' + theme)
        tap('الإبلاغ عن ملاحظة')
        wait('ملاحظة في المصحف')
        capture('report-draft-' + theme)
        report.append(
            {
                'journey': 'French/English reader and translation choices, source notices, explicit unsent report draft',
                'theme': theme,
                'pass': True,
            }
        )
    link('settings', 'الإعدادات')
    tap('نهاري')
elif args.section == 'controls':

    def awake():
        dump = shell('dumpsys', 'window', 'windows')
        blocks = re.split(r'Window #', dump)
        return any(
            'ProbeActivity' in b.split('mDisplayId')[0] and 'KEEP_SCREEN_ON' in b
            for b in blocks
        )

    link('quran/' + warsh + '/1/1', 'نسخ الآية', True)
    tap('إعدادات القراءة')
    tap('إبقاء الشاشة مضاءة: متوقف', True)
    wait('إبقاء الشاشة مضاءة: مفعل')
    tap('رجوع')
    wait('نسخ الآية')
    time.sleep(0.5)
    assert awake(), 'Reader did not hold screen'
    shell('input', 'keyevent', '3')
    time.sleep(0.5)
    assert not awake(), 'Background reader retained screen flag'
    link('more', 'المزيد')
    assert not awake(), 'Non-reader retained screen flag'
    link('quran/' + warsh + '/1/1', 'نسخ الآية')
    tap('إعدادات القراءة')
    tap('إبقاء الشاشة مضاءة: مفعل', True)
    tap('رجوع')
    wait('نسخ الآية')
    assert not awake()
    report.append(
        {
            'journey': 'native keep-awake flag enabled only in reader; cleared on Home/background, other screen and preference off',
            'pass': True,
        }
    )
    link('quran/offline-audio', 'مكتبتي الصوتية')
    tap('استماع إلى السور المحفوظة')
    wait('إيقاف مؤقت')
    tap_cached('إيقاف مؤقت')
    wait('تشغيل')
    tap('الانتقال إلى الثانية', True)
    shell('input', 'text', '10')
    shell('input', 'keyevent', '4')
    tap('انتقال')
    wait('0:10')
    capture('player-paused-seek')
    tap('1.25×', True)
    tap('تكرار المقطع', True)
    capture('player-controls')
    # The current track must remain paused; do not replay automatically after restoration.
    link('quran/offline-audio', 'مكتبتي الصوتية', True)
    link('player', 'المشغل')
    wait('استعادة موضع الاستماع دون تشغيل')
    tap('استعادة موضع الاستماع دون تشغيل')
    wait('تشغيل')
    wait('0:10')
    assert any(
        n.get('content-desc') == 'تشغيل' and n.get('enabled') == 'true'
        for n in tree().iter('node')
    )
    assert not any(n.get('content-desc') == 'إيقاف مؤقت' for n in tree().iter('node'))
    capture('player-restored-paused')
    tap('إيقاف الصوت', True)
    report.append(
        {
            'journey': 'verified local audio queue, pause/seek/rate/repeat and process restart restoration without autoplay',
            'pass': True,
        }
    )
elif args.section == 'audio':
    for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
        link('settings', 'الإعدادات', True)
        tap(label)
        link('quran/audio', 'القراء والتنزيلات الصوتية')
        tap('ورش عن نافع')
        tap(next(v for v in values() if v.startswith('Mahmoud Khalil Al-Hussary')))
        tap('اختيار كل السور المتاحة', True)
        wait('تنزيل المختار · 3')
        capture('audio-selection-' + theme)
        download = next(v for v in values() if v.startswith('تنزيل المختار · 3'))
        assert '1,1 MB' in download, download
        tap(download, True)
        wait('التنزيلات')
        capture('audio-existing-downloads-' + theme)
        report.append(
            {
                'journey': 'Warsh recording selection, partial three-surah coverage, exact 1.1 MB formatted total, explicit download opens coordinator',
                'theme': theme,
                'pass': True,
            }
        )
    link('settings', 'الإعدادات')
    tap('نهاري')
elif args.section == 'empty':
    for theme, label in [('light', 'نهاري'), ('dark', 'ليلي')]:
        link('settings', 'الإعدادات', True)
        tap(label)
        for path, title, name in [
            ('quran', 'القرآن الكريم', 'empty-library'),
            ('quran/editions', 'اختيار المصحف', 'unavailable-editions'),
            ('quran/audio', 'لا توجد تسجيلات', 'unavailable-recordings'),
            ('quran/' + warsh + '/1/1', 'تعذر فتح المصحف بأمان', 'missing-pack'),
        ]:
            link(path, title)
            capture(name + '-' + theme)
        report.append(
            {
                'journey': 'production empty catalog and no unapproved content/downloads',
                'theme': theme,
                'pass': True,
            }
        )
    link('settings', 'الإعدادات')
    tap('نهاري')
(out / (args.section + '.json')).write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + '\n'
)
print(args.section + ' passed')
