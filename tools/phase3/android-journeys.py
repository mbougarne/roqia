#!/usr/bin/env python3
"""Opt-in phase 3 UI checks on emulator-5554. Back up app data before running.
Mutates the first Ruqya counter/bookmark; restore the test backup after collecting evidence.
Never use on a personal device. Requires the debug APK and Metro.
"""
import argparse, json, os, re, shutil, subprocess, time, xml.etree.ElementTree as ET
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--section',default='screens',choices=['screens','interactions','large','onboarding','notification','extras','extras-dark','permissions','external','confirmations'])
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
sdk=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'Library/Android/sdk')))
adb=[shutil.which('adb') or str(sdk/'platform-tools/adb'),'-s','emulator-5554']
def run(*args):return subprocess.check_output(adb+list(args))
def shell(*args):return run('shell',*args).decode()
def tree():
    shell('rm','-f','/sdcard/roqia-phase3.xml');shell('uiautomator','dump','/sdcard/roqia-phase3.xml')
    return ET.fromstring(run('exec-out','cat','/sdcard/roqia-phase3.xml'))
def values():return [(n.get('text') or n.get('content-desc') or '').replace('\u2066','').replace('\u2069','') for n in tree().iter('node')]
def wait(label):
    for _ in range(18):
        try:
            if any(label in v for v in values()):return
        except (subprocess.CalledProcessError,ET.ParseError):pass
        time.sleep(.4)
    raise AssertionError('Missing screen/text: '+label)
def link(path,label,cold=False):
    if cold:shell('am','force-stop','name.roqia.app')
    shell('am','start','-n','name.roqia.app/.MainActivity','-a','android.intent.action.VIEW','-d','roqia://'+path)
    wait(label)
def tap(label,scroll=False):
    for attempt in range(12 if scroll else 1):
        ns=list(tree().iter('node'))
        candidates=[n for n in ns if (n.get('content-desc') or '').replace('✓ ','').strip()==label and n.get('clickable')=='true']
        if not candidates:candidates=[n for n in ns if (n.get('text') or '').replace('✓ ','').strip()==label]
        if candidates:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',candidates[0].get('bounds')))
            shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.3);return
        if scroll:shell('input','swipe','500','1800','500','600','350')
    raise AssertionError('Missing control: '+label)
def capture(name):
    (out/(name+'.png')).write_bytes(run('exec-out','screencap','-p'))
    (out/(name+'.xml')).write_bytes(ET.tostring(tree(),encoding='utf-8'))
report=[]
if args.section=='screens':
    for theme,label in [('light','نهاري'),('dark','ليلي')]:
        link('settings','الإعدادات',True);tap(label)
        for path,title,name in [('home','الرقية الشرعية','ruqya'),('adhkar','أذكار اليوم','adhkar'),('adkar/morning','أذكار الصباح','morning'),('adkar/night','أذكار المساء','evening'),('adkar/before-sleep','أذكار قبل النوم','sleep'),('duaa','الأدعية','dua'),('tasbihat','التسبيح','tasbih'),('bookmarks','المحفوظات','bookmarks'),('search','البحث في المحتوى','search'),('more','المزيد','more'),('settings','الإعدادات','settings'),('about','حول التطبيق','about'),('sources','المصادر','sources'),('privacy','سياسة الخصوصية','privacy'),('terms','شروط الاستخدام','terms'),('guide','مرحبا بك','welcome'),('guidance','ضوابط الرقية الشرعية','guidance'),('reminders','التذكيرات اليومية','reminders')]:
            link(path,title);capture(name+'-'+theme);report.append({'screen':name,'theme':theme,'pass':True})
    link('settings','الإعدادات');tap('نهاري')
elif args.section=='interactions':
    link('home','الرقية الشرعية',True)
    before=[v for v in values() if v.startswith('المتبقي')][0]
    tap('نسخ النص');assert before in values()
    if 'إزالة من المحفوظات' in values():tap('إزالة من المحفوظات')
    tap('حفظ في المحفوظات');wait('إزالة من المحفوظات');assert before in values()
    tap('استماع');time.sleep(1);assert before in values();tap('استماع للكل')
    link('more','المزيد');tap('إيقاف مؤقت');link('duaa','الأدعية');wait('متابعة الصوت');tap('إيقاف الصوت')
    link('home','الرقية الشرعية');tap(before);time.sleep(.6)
    after=[v for v in values() if v.startswith('المتبقي')][0];assert before!=after
    link('home','الرقية الشرعية',True);assert after in values();wait('إزالة من المحفوظات')
    link('bookmarks','المحفوظات');tap('بِسْمِ اللهِ، تَوَكَّلْتُ عَلَى اللهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللهِ');wait('الرقية');assert after in values()
    tap('إزالة من المحفوظات');assert after in values()
    tap('إعادة عداد هذا الذكر',True);tap('إلغاء');assert after in values()
    tap('إعادة عداد هذا الذكر',True);tap('إعادة');wait(before)
    report.append({'journey':'copy/bookmark/audio do not count; counter and bookmark survive restart; bookmark removal and reset cancellation preserve count; confirmed item reset restores default','pass':True})
    capture('reading-actions-light')
elif args.section=='large':
    font=shell('settings','get','system','font_scale').strip();size=shell('wm','size')
    try:
        shell('wm','size','840x1867');shell('settings','put','system','font_scale','2.0');time.sleep(2)
        for theme,label in [('light','نهاري'),('dark','ليلي')]:
            link('settings','الإعدادات',True);tap(label,True)
            for path,title,name in [('home','الرقية الشرعية','ruqya'),('tasbihat','التسبيح','tasbih'),('reminders','التذكيرات اليومية','reminders'),('more','المزيد','more')]:
                link(path,title);capture(name+'-'+theme+'-320dp-200percent')
        report.append({'journey':'320dp / 200% OS text, both themes, live activity recreation','pass':True})
    finally:
        shell('settings','put','system','font_scale',font)
        match=re.search(r'Override size: (\d+x\d+)',size);shell('wm','size',match.group(1) if match else 'reset')
        link('settings','الإعدادات');tap('نهاري',True)
elif args.section=='onboarding':
    # Prepare seen flags with phase3-first-run probe, preserving the original DB backup.
    link('adkar/night','مرحبا بك',True);capture('first-run-welcome')
    tap('تخطي الدليل');wait('ضوابط الرقية الشرعية');capture('first-run-guidance');tap('متابعة');wait('أذكار المساء')
    link('home','الرقية الشرعية',True)
    report.append({'journey':'fresh flags: pending cold link survives skip + guidance; restart honors seen flags; no startup permission request','pass':True})
    link('guide','مرحبا بك');
    for name,title in [('audio','اقرأ واستمع'),('navigation','كل ما تحتاجه'),('adhkar','وردك اليومي'),('personalize','على راحتك')]:
        tap('التالي');wait(title);capture('guide-'+name)
    tap('لنبدأ');wait('الرقية الشرعية')
elif args.section in ('extras','extras-dark'):
    link('settings','الإعدادات',True);tap('ليلي' if args.section=='extras-dark' else 'نهاري')
    link('home','الرقية الشرعية',True)
    for remaining in [3,2,1]:tap(f'المتبقي {remaining} · اضغط بعد القراءة')
    wait('اكتمل الذكر')
    buttons=[n for n in tree().iter('node') if n.get('content-desc')=='اكتمل الذكر']
    assert buttons and buttons[0].get('enabled')=='false'
    link('home','الرقية الشرعية',True);wait('اكتمل الذكر');capture('counter-complete')
    tap('إعادة عدادات هذه الصفحة');tap('إعادة');wait('المتبقي 3')
    link('tasbihat','التسبيح');start=int(next(v for v in values() if v.isdigit()))
    node=next(n for n in tree().iter('node') if n.get('content-desc')=='اضغط بعد التسبيح')
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
    for _ in range(5):shell('input','tap',str((x1+x2)//2),str((y1+y2)//2))
    assert str(start-5) in values(), (start, values())
    link('tasbihat','التسبيح',True);assert str(start-5) in values(), (start, values())
    tap('إعادة عداد هذا الذكر',True);tap('إلغاء');assert str(start-5) in values()
    tap('إعادة عداد هذا الذكر',True);tap('إعادة');wait('100')
    tap('اختيار التسبيح');wait('إغلاق');capture('tasbih-selection');tap('إغلاق')
    link('settings','الإعدادات');tap('125%',True)
    link('settings','الإعدادات',True)
    # Scroll to the saved selection if it is below the fold.
    for _ in range(6):
        nodes=list(tree().iter('node'));selected=[n for n in nodes if n.get('content-desc')=='125%']
        if selected:break
        shell('input','swipe','500','1800','500','600','350')
    assert selected and selected[0].get('selected')=='true'
    capture('ui-scale-125');tap('100%',True)
    report.append({'journey':'completion disables counting and persists; page reset; five tasbih taps persist; reset cancel/confirm; selector; UI scale persists','pass':True})
elif args.section=='confirmations':
    for theme,label in [('light','نهاري'),('dark','ليلي')]:
        link('settings','الإعدادات',True);tap(label)
        link('home','الرقية الشرعية');tap('المتبقي 3 · اضغط بعد القراءة');wait('المتبقي 2')
        link('settings','الإعدادات');tap('إعادة جميع العدادات',True);wait('ستعود العدادات');capture('reset-all-'+theme);tap('إلغاء')
        link('home','الرقية الشرعية');wait('المتبقي 2');tap('إعادة عدادات هذه الصفحة');wait('ستعود العدادات');capture('reset-page-'+theme);tap('إلغاء');wait('المتبقي 2')
        tap('إعادة عدادات هذه الصفحة');tap('إعادة');wait('المتبقي 3')
        report.append({'journey':'themed global/page reset sheets; cancellation preserves counts; confirmation commits page reset','theme':theme,'pass':True})
elif args.section=='permissions':
    permission='android.permission.POST_NOTIFICATIONS'
    initially_granted=f'{permission}: granted=true' in shell('dumpsys','package','name.roqia.app')
    channel_changed=False
    def channel_settings():
        shell('am','start','-a','android.settings.CHANNEL_NOTIFICATION_SETTINGS','--es','android.provider.extra.APP_PACKAGE','name.roqia.app','--es','android.provider.extra.CHANNEL_ID','daily-adhkar-reminders')
        wait('تذكيرات الأذكار')
    def channel_toggle():
        node=next(n for n in tree().iter('node') if n.get('checkable')=='true')
        x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
        shell('input','tap',str((x1+x2)//2),str((y1+y2)//2))
    try:
        shell('pm','revoke','name.roqia.app',permission)
        link('reminders','التذكيرات اليومية',True);wait('إذن الإشعارات غير مفعل');capture('reminders-denied')
        shell('pm','grant','name.roqia.app',permission)
        link('reminders','التذكيرات اليومية',True);wait('الإذن وقناة التذكيرات متاحان')
        channel_settings();channel_toggle();channel_changed=True
        link('reminders','التذكيرات اليومية');wait('قناة التذكيرات معطلة');capture('reminders-channel-blocked')
        report.append({'journey':'real denied app permission and blocked Android channel are shown separately without startup prompting','pass':True})
    finally:
        if channel_changed:channel_settings();channel_toggle()
        shell('pm','grant' if initially_granted else 'revoke','name.roqia.app',permission)
        link('reminders','التذكيرات اليومية',True)
elif args.section=='external':
    airplane=shell('settings','get','global','airplane_mode_on').strip()
    try:
        link('privacy','سياسة الخصوصية',True) # Load Metro before disconnecting this debug build.
        shell('cmd','connectivity','airplane-mode','enable')
        wait('نسخة محلية');capture('privacy-offline')
        link('terms','شروط الاستخدام');wait('نسخة محلية');capture('terms-offline')
        link('about','حول التطبيق');tap('التواصل عبر البريد',True);tap('فتح الرابط');wait('تعذر فتح الرابط');capture('external-no-handler')
        tap('نسخ الرابط');tap('رجوع')
        report.append({'journey':'offline privacy/terms; absent mail handler offers retry/copy/back; no automatic email send','pass':True})
    finally:shell('cmd','connectivity','airplane-mode','enable' if airplane=='1' else 'disable')
elif args.section=='notification':
    shell('cmd','statusbar','expand-notifications');wait('تجربة التذكير');capture('test-notification')
    tap('تجربة التذكير');wait('أذكار الصباح');capture('notification-destination')
    report.append({'journey':'notification press opens morning adhkar','pass':True})
(out/(args.section+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
