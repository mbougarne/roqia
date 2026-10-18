#!/usr/bin/env python3
"""Normal review-build provider download/recovery UI. Requires fresh backup; emulator-5554 only."""
import argparse,json,re,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--section',choices=['audio','resume-audio','retry-audio','translation','offline','cleanup-audio','capture-translation','inspect'],required=True);args=p.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
adb=['/Users/mbougarne/Library/Android/sdk/platform-tools/adb','-s','emulator-5554']
def run(*cmd):return subprocess.check_output(adb+list(cmd),timeout=40)
def shell(*cmd):return run('shell',*cmd).decode()
def tree():
    for _ in range(5):
        shell('rm','-f','/data/local/tmp/roqia-phase6.xml')
        shell('CLASSPATH=/system/framework/uiautomator.jar:/system/framework/android.test.runner.jar:/system/framework/android.test.base.jar:/data/local/tmp/roqia-hierarchy.jar app_process /system/bin com.android.commands.uiautomator.Launcher runtest -c roqia.testing.Hierarchy#testDump -e jars /data/local/tmp/roqia-hierarchy.jar')
        try:return ET.fromstring(run('exec-out','cat','/data/local/tmp/roqia-phase6.xml'))
        except (subprocess.CalledProcessError,ET.ParseError):time.sleep(.3)
    raise AssertionError('No fresh Android hierarchy')

def clean(text):return (text or '').replace('\u2066','').replace('\u2069','').removeprefix('✓ ').strip()
def values(root):return [clean(n.get('text') or n.get('content-desc')) for n in root.iter('node')]
def wait(label):
    for _ in range(12):
        root=tree()
        if any(label in v for v in values(root)):return root
        time.sleep(.3)
    raise AssertionError('Missing '+label)
def link(path,label,cold=False):
    if cold:shell('am','force-stop','name.roqia.app')
    shell('am','start','-n','name.roqia.app/.MainActivity','--activity-single-top','--activity-clear-top','-a','android.intent.action.VIEW','-d','roqia://'+path)
    return wait(label)
def tap(label,scroll=False):
    for _ in range(40 if scroll else 3):
        root=tree();parents={c:p for p in root.iter() for c in p}
        for node in root.iter('node'):
            if clean(node.get('content-desc'))!=label and clean(node.get('text'))!=label:continue
            while node in parents and node.get('clickable')!='true':node=parents[node]
            if node.get('clickable')!='true' or node.get('enabled')!='true':continue
            x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
            if x2>x1 and y2-y1>60 and y2<2340:
                shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.3);return
        if scroll:shell('input','swipe','1000','1800','1000','1100','600')
    raise AssertionError('Missing control '+label)
def capture(name):
    time.sleep(.5)
    root=tree();text=' '.join(values(root))
    assert len(text)>50 and 'جار تجهيز التطبيق' not in text,text
    assert not re.search('[\u0660-\u0669\u06f0-\u06f9]',text),text
    assert 'Open debugger' not in text and 'Render Error' not in text,text
    (out/(name+'.png')).write_bytes(run('exec-out','screencap','-p'))
    (out/(name+'.xml')).write_bytes(ET.tostring(root,encoding='utf-8'))
    return root
def theme(name):
    link('settings','الإعدادات');tap('نهاري' if name=='light' else 'ليلي',True)

HAFS='hafs-tanzil-uthmani-1.1'
def reader(edition=HAFS, verse=1):
    return link(f'quran/{edition}/1/{verse}', 'الترجمات', True)
def translations():
    reader();tap('الترجمات');return wait('ترجمات المعاني')
def wait_pack(id):
    for _ in range(90):
        path=f'files/roqia/content/translation-{id}/source-1/114.json'
        if subprocess.run(adb+['shell','run-as','name.roqia.app','test','-s',path],capture_output=True).returncode==0:return
        time.sleep(1)
    raise AssertionError('Translation not installed '+id)

def reveal(label):
    for _ in range(30):
        root=tree()
        if any(label in v for v in values(root)):return root
        shell('input','swipe','1000','1800','1000','1100','600')
    raise AssertionError('Cannot reveal '+label)

def tap_prefix(prefix):
    for _ in range(30):
        root=tree();label=next((v for v in values(root) if v.startswith(prefix)),None)
        if label:
            try:tap(label);return
            except AssertionError:pass  # Async storage totals may change between snapshots.
        shell('input','swipe','1000','1800','1000','1100','600')
    raise AssertionError('Missing prefix '+prefix)

def resume_audio():
    link('downloads','التنزيلات',True)
    for _ in range(8):shell('input','swipe','1000','650','1000','2050','500')
    reveal('أوقفته مؤقتاً')
    shell('svc','wifi','enable');shell('svc','data','enable');time.sleep(2)
    wait('أوقفته مؤقتاً');capture('pause-retained-after-reopen-and-network')
    shell('svc','wifi','disable');shell('svc','data','enable');time.sleep(2)
    tap('متابعة التنزيل',True);wait('بانتظار الشبكة المسموحة')
    tap('السماح بأي شبكة لهذا الملف');tap('السماح')
    file='files/roqia/content/mp3quran-120-warsh-112/2026.10.18/audio.mp3'
    for _ in range(90):
        if subprocess.run(adb+['shell','run-as','name.roqia.app','test','-s',file],capture_output=True).returncode==0:break
        time.sleep(1)
    else:raise AssertionError('Actual MP3Quran download failed')
    time.sleep(1);capture('real-audio-ready-dark');print('Actual MP3Quran pack installed',flush=True)

if args.section=='inspect':
    link('downloads','التنزيلات',True);print(values(tree()))
elif args.section=='audio':
    link('quran/audio','القراء والتنزيلات الصوتية',True);tap('ورش عن نافع');tap('محمود خليل الحصري',True)
    tap('112 · الإخلاص',True)
    for _ in range(32):shell('input','swipe','1000','600','1000','2050','80')
    root=tree();button=next(v for v in values(root) if v.startswith('تنزيل المختار'))
    assert '1 ·' in button,button
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        tap(button);wait('التنزيلات')
        for _ in range(25):shell('input','swipe','1000','1900','1000','650','90')
        wait('بانتظار الشبكة المسموحة');capture('waiting-wifi-dark')
        tap('إيقاف مؤقت');wait('أوقفته مؤقتاً');capture('paused-user-dark')
        resume_audio()
    finally:shell('svc','wifi','enable');shell('svc','data','enable')
elif args.section=='translation':
    link('storage','إدارة التخزين',True)
    tap_prefix('الإنجليزية · Mohammed Marmaduke William Pickthall ·')
    tap_prefix('حذف 1 ·');tap('حذف');time.sleep(1)
    translations();tap('تنزيل الإنجليزية',True);wait_pack('en.pickthall');capture('real-tanzil-restored-dark');print('Actual Tanzil pack restored',flush=True)
elif args.section=='offline':
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        reader();wait("Au nom d'Allah");capture('existing-hafs-french-offline')
        link('quran/warsh-kfgqpc-v2.1-update6/1/1','الترجمات',True);capture('existing-warsh-offline')
    finally:shell('svc','wifi','enable');shell('svc','data','enable')

elif args.section=='cleanup-audio':
    link('storage','إدارة التخزين',True)
    tap_prefix('محمود خليل الحصري · ورش · الإخلاص ·')
    tap_prefix('حذف 1 ·');tap('حذف');time.sleep(1)
    link('downloads','التنزيلات',True);print('Only new test audio removed')

elif args.section=='resume-audio':
    try:resume_audio()
    finally:shell('svc','wifi','enable');shell('svc','data','enable')

elif args.section=='retry-audio':
    shell('svc','wifi','enable');shell('svc','data','enable');time.sleep(3)
    link('downloads','التنزيلات',True)
    for _ in range(8):shell('input','swipe','1000','650','1000','2050','500')
    reveal('تعذر التنزيل');capture('real-provider-failure-retained')
    tap('إعادة المحاولة',True)
    file='files/roqia/content/mp3quran-120-warsh-112/2026.10.18/audio.mp3'
    for _ in range(90):
        if subprocess.run(adb+['shell','run-as','name.roqia.app','test','-s',file],capture_output=True).returncode==0:break
        time.sleep(1)
    else:raise AssertionError('Actual MP3Quran retry failed')
    time.sleep(1);capture('real-audio-ready-dark');print('Actual MP3Quran pack installed after explicit retry',flush=True)

elif args.section=='capture-translation':
    translations();capture('real-tanzil-restored-dark')
    link('downloads','التنزيلات')
