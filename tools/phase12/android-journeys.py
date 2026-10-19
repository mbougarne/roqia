#!/usr/bin/env python3
"""Capture real navigated states; never confirm reset or delete installed packs."""

import runpy

h = runpy.run_path(
    __file__.replace('android-journeys.py', 'android-visual.py'), run_name='helpers'
)
globals().update({k: v for k, v in h.items() if not k.startswith('__')})


def shot(name):
    capture(name + '-' + args.theme)


def back():
    shell('input', 'keyevent', 'KEYCODE_BACK')
    time.sleep(0.3)


def adjust(label, fraction):
    root = tree()
    nodes = [n for n in root.iter('node') if clean(n.get('content-desc')) == label]
    node = (
        next(n for n in nodes if n.get('class') == 'android.widget.SeekBar')
        if any(n.get('class') == 'android.widget.SeekBar' for n in nodes)
        else nodes[-1]
    )
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.get('bounds')))
    shell(
        'input',
        'tap',
        str(int(x1 + max(2, min(x2 - x1 - 2, (x2 - x1) * fraction)))),
        str((y1 + y2) // 2),
    )
    time.sleep(0.3)


def edit(label, text):
    tap(label)
    shell('input', 'text', text)
    back()


selection = set(args.screens.split(',')) if args.screens else set()


def want(n):
    return not selection or n in selection


shell('input', 'keyevent', 'KEYCODE_WAKEUP')
shell('wm', 'dismiss-keyguard')
theme(args.theme)
if any(want(n) for n in ['02', '03', '04', '05', '06']):
    link('guide', 'مرحبا بك في الرقية', True)
    for i, name in enumerate(
        [
            '02-welcome',
            '03-guide-audio',
            '04-guide-navigation',
            '05-guide-adhkar',
            '06-guide-personalize',
        ]
    ):
        if want(name[:2]):
            shot(name)
        if i < 4:
            tap('التالي', True)
if want('19'):
    # Reversibly remove the emulator's mail handler to exercise a genuine OS failure.
    component = 'com.google.android.gm'
    shell('pm', 'disable-user', '--user', '0', component)
    try:
        link('about', 'حول التطبيق', True)
        tap('التواصل عبر البريد', True)
        tap('فتح الرابط')
        wait('تعذر فتح الرابط')
        shot('19-link-error')
        tap('إغلاق')
    finally:
        shell('pm', 'default-state', '--user', '0', component)
if want('20'):
    link('tasbihat', 'التسبيح', True)
    tap('إعادة عدادات هذه الصفحة', True)
    wait('إعادة جميع عدادات التسبيح؟')
    shot('20-reset-page')
    tap('إلغاء')
if want('21'):
    link('settings', 'الإعدادات', True)
    tap('إعادة جميع العدادات', True)
    wait('إعادة جميع العدادات؟')
    shot('21-reset-all')
    tap('إلغاء')
if want('24'):
    link('quran/editions', 'اختيار المصحف', True)
    tap('متابعة', True)
    wait('فتح المصحف')
    shot('24-mushaf-download')
if any(want(n) for n in ['25', '26', '27', '28', '29']):
    link('quran/warsh-kfgqpc-v2.1-update6/112/1', 'الإخلاص', True)
    tap('إعدادات القراءة')
    wait('معاينة النص')
    adjust('حجم نص القرآن', 1)
    if want('29'):
        shot('29-reading-preferences')
    tap('حفظ', True)
    wait('الإخلاص')
    if want('25'):
        shot('25-warsh-reader')
    link('quran/hafs-tanzil-uthmani-1.1/112/1', 'الإخلاص', True)
    tap('إعدادات القراءة')
    adjust('حجم نص القرآن', 1)
    tap('حفظ', True)
    tap('الترجمات')
    wait('Français')
    tap('Français')
    if want('28'):
        shot('28-translations')
    if want('26'):
        link('quran/hafs-tanzil-uthmani-1.1/112/1', 'الإخلاص', True)
        wait('Dis')
        shot('26-hafs-reader-french')
        tap('الترجمات')
    tap('English')
    if want('27'):
        link('quran/hafs-tanzil-uthmani-1.1/112/1', 'الإخلاص', True)
        wait('Say:')
        shot('27-hafs-reader-english')
if want('30'):
    link('quran/search', 'البحث في القرآن', True)
    edit('اسم السورة أو نص الآية', '112')
    shot('30-quran-search')
if want('31'):
    link('quran/warsh-kfgqpc-v2.1-update6/112/1', 'الإخلاص', True)
    tap('حفظ علامة القراءة')
    link('quran/bookmarks', 'العلامات المحفوظة')
    shot('31-bookmarks')
    link('quran/warsh-kfgqpc-v2.1-update6/112/1', 'الإخلاص', True)
    tap('إزالة علامة القراءة')
if want('34'):
    link('quran/audio', 'اختر القارئ', True)
    tap('ورش عن نافع')
    tap('محمود خليل الحصري')
    tap('اختيار السور')
    tap('1 · الفاتحة')
    shot('34-audio-surah-selection')
if want('35'):
    link('downloads', 'التنزيلات', True)
    tap('المكتملة')
    shot('35-download-queue')
if want('38'):
    link('quran/offline-audio', 'مكتبتي الصوتية', True)
    tap('استماع إلى السور المحفوظة', True)
    time.sleep(1)
    shell('input', 'keyevent', 'KEYCODE_MEDIA_PAUSE')
    link('player', 'الاستماع')
    shot('38-audio-player')
    tap('إيقاف الصوت', True)
print('Journeys complete', flush=True)

if want('48'):
    shell('svc', 'wifi', 'disable')
    shell('svc', 'data', 'disable')
    try:
        link('quran/audio', 'اختر القارئ', True)
        tap('ورش عن نافع')
        tap('محمود خليل الحصري')
        tap('اختيار السور')
        tap('2 · البقرة')
        tap('تحميل المحدد')
        wait('بانتظار')
        shot('48-download-error')
        tap('إيقاف مؤقت')
        wait('متابعة التنزيل')
        capture('48-download-paused-' + args.theme)
        tap('متابعة التنزيل')
        wait('بانتظار')
        tap('إلغاء التنزيل')
        wait('لا توجد تنزيلات قيد التنفيذ')
    finally:
        shell('svc', 'wifi', 'enable')
        shell('svc', 'data', 'enable')
