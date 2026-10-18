#!/usr/bin/env python3
"""Normal-app UI capture/interaction checks. Requires emulator and phase6 hierarchy jar.
Back up the existing emulator app data first. No fixture UI or source mutations.
"""
import argparse,json,re,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
parser.add_argument('--section',choices=['download','capture','recovery','corrupt','inspect'],default='inspect')
args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
adb=['adb','-s','emulator-5554']
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
    for _ in range(12 if scroll else 3):
        root=tree();parents={c:p for p in root.iter() for c in p}
        for node in root.iter('node'):
            if clean(node.get('content-desc'))!=label and clean(node.get('text'))!=label:continue
            while node in parents and node.get('clickable')!='true':node=parents[node]
            if node.get('clickable')!='true' or node.get('enabled')!='true':continue
            x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
            if x2>x1 and y2-y1>60 and y2<2340:
                shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.3);return
        if scroll:shell('input','swipe','1000','1900','1000','650','300')
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
if args.section=='inspect':
    translations();print(values(tree()))
elif args.section=='download':
    for id,language in [('fr.hamidullah','الفرنسية'),('en.pickthall','الإنجليزية')]:
        translations();tap('تنزيل '+language,True);wait_pack(id);print('installed',id,flush=True)
    translations();capture('translations-installed-dark')
elif args.section=='capture':
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        for mode in ['light','dark']:
            theme(mode)
            translations();capture('translations-'+mode)
            for id,language,phrase in [('fr.hamidullah','الفرنسية',"Au nom d'Allah"),('en.pickthall','الإنجليزية','In the name of Allah')]:
                tap('اختيار '+language,True)
                reader();wait(phrase);capture('hafs-'+id+'-'+mode)
                # Cold restart verifies persisted choice without network.
                reader(verse=2);wait('Seigneur' if language=='الفرنسية' else 'Lord of the Worlds')
                translations()
            reader('warsh-kfgqpc-v2.1-update6');tap('الترجمات');wait('الترجمة غير متاحة لورش');capture('warsh-translations-'+mode)
        translations();tap('دون ترجمة');reader();root=tree()
        assert not any('In the name of Allah' in v or "Au nom d'Allah" in v for v in values(root))
        translations();tap('اختيار الفرنسية',True);reader();wait("Au nom d'Allah")
    finally:
        shell('svc','wifi','enable');shell('svc','data','enable')
elif args.section=='recovery':
    translations();tap('اختيار الفرنسية',True)
    link('storage','إدارة التخزين')
    for _ in range(12):
        root=tree();name=next((v for v in values(root) if v.startswith('الفرنسية · Muhammad Hamidullah ·')),None)
        if name:
            try:tap(name);break
            except AssertionError:pass
        shell('input','swipe','1000','1900','1000','650','300')
    else:raise AssertionError('French pack missing in storage')
    for _ in range(12):
        root=tree();name=next((v for v in values(root) if v.startswith('حذف 1 ·')),None)
        if name:
            try:tap(name);break
            except AssertionError:pass
        shell('input','swipe','1000','1900','1000','650','300')
    else:raise AssertionError('Delete missing')
    tap('حذف');time.sleep(1)
    reader();wait('الترجمة المختارة غير متاحة');capture('translation-missing-dark');tap('إدارة الترجمة')
    wait('تنزيل الفرنسية');tap('تنزيل الفرنسية',True);wait_pack('fr.hamidullah')
    reader();wait("Au nom d'Allah");capture('translation-recovered-dark')
    print('Deleted only French, preserved selection, recovered after direct-source re-download',flush=True)

elif args.section=='corrupt':
    # Only the newly installed translation is altered, never canonical Arabic assets.
    translations();tap('اختيار الفرنسية',True)
    file='files/roqia/content/translation-fr.hamidullah/source-1/001.json'
    original=run('exec-out','run-as','name.roqia.app','cat',file)
    backup=out/'restore-translation.json';backup.write_bytes(original)
    try:
        shell('am','force-stop','name.roqia.app')
        # Same-length corruption exercises SHA validation, not only missing/size checks.
        changed=bytearray(original);changed[0]=ord('!')
        tampered=out/'tampered-translation.json';tampered.write_bytes(changed)
        run('push',str(tampered),'/data/local/tmp/roqia-translation-test.json')
        shell('run-as','name.roqia.app','cp','/data/local/tmp/roqia-translation-test.json',file)
        reader();wait('الترجمة المختارة غير متاحة');root=capture('translation-corrupt-dark')
        assert any('بِسْمِ' in v for v in values(root))
        assert not any("Au nom d'Allah" in v for v in values(root))
    finally:
        shell('am','force-stop','name.roqia.app')
        run('push',str(backup),'/data/local/tmp/roqia-translation-test.json')
        shell('run-as','name.roqia.app','cp','/data/local/tmp/roqia-translation-test.json',file)
        shell('rm','-f','/data/local/tmp/roqia-translation-test.json')
        backup.unlink();(out/'tampered-translation.json').unlink(missing_ok=True)
    reader();wait("Au nom d'Allah")
    print('Same-size corruption rejected; Arabic remained readable; exact translation file restored',flush=True)
