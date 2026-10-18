#!/usr/bin/env python3
"""Opt-in emulator-only phase 5 journeys against the normal MainActivity.
Back up user data first; reset removes only the two production Quran packs.
"""
import argparse,json,os,re,shutil,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--section',choices=['reset','downloads','readers'],default='downloads');args=parser.parse_args()
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
adb=['/Users/mbougarne/Library/Android/sdk/platform-tools/adb','-s','emulator-5554']
def run(*args):return subprocess.check_output(adb+list(args))
def shell(*args):return run('shell',*args).decode()
last_tree=None
def tree():
    global last_tree
    for _ in range(3):
        try:
            shell('rm','-f','/sdcard/roqia-phase5.xml');shell('uiautomator','dump','/sdcard/roqia-phase5.xml')
            last_tree=ET.fromstring(run('exec-out','cat','/sdcard/roqia-phase5.xml'));return last_tree
        except (subprocess.CalledProcessError,ET.ParseError):time.sleep(.3)
    raise AssertionError('Android did not expose an idle UI tree')
def tap_cached(label):
    node=next(n for n in last_tree.iter('node') if n.get('content-desc')==label and n.get('clickable')=='true' and n.get('enabled')=='true')
    x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')));shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5)
def values():return [(n.get('text') or n.get('content-desc') or '').replace('\u2066','').replace('\u2069','') for n in tree().iter('node')]
def wait(label):
    for _ in range(18):
        try:
            if any(label in v for v in values()):return
        except (subprocess.CalledProcessError,ET.ParseError):pass
        time.sleep(.4)
    raise AssertionError('Missing screen/text: '+label)
def link(path,label,cold=False):
    if cold:
        shell('am','force-stop','name.roqia.app')
    activity='name.roqia.app/.MainActivity'
    shell('am','start','-n',activity,'--activity-single-top','--activity-clear-top','-a','android.intent.action.VIEW','-d','roqia://'+path,'--es','phase','5')
    wait(label)
def tap(label,scroll=False):
    for attempt in range(12 if scroll else 5):
        root=tree();parents={c:p for p in root.iter() for c in p};nodes=list(root.iter('node'))
        if dismiss_warning(nodes):continue
        candidates=[n for n in nodes if (n.get('content-desc') or '').replace('✓ ','').replace('\u2066','').replace('\u2069','').strip()==label and n.get('clickable')=='true' and n.get('enabled')=='true']
        if not candidates:
            for n in nodes:
                if (n.get('text') or '').replace('✓ ','').replace('\u2066','').replace('\u2069','').strip()!=label:continue
                while n in parents and n.get('clickable')!='true':n=parents[n]
                if n.get('clickable')=='true' and n.get('enabled')=='true':candidates.append(n)
        for node in candidates:
            x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')))
            height=2400  # fixed emulator display, including native dialogs
            if x2>x1 and y2-y1>=60 and y2<=height-60:
                shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5);return
        if scroll:shell('input','swipe','500','1800','500','600','350')
        else:time.sleep(.5)
    raise AssertionError('Missing enabled control: '+label)
def dismiss_warning(nodes):
    banner=next((n for n in nodes if n.get('text')=='Open debugger to view warnings.'),None)
    if banner is not None:
        by1,by2=map(int,re.findall(r'\d+',banner.get('bounds'))[1::2])
        candidates=[]
        for n in nodes:
            if n.get('NAF')=='true' and n.get('clickable')=='true':
                x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
                if y1<=by2 and y2>=by1:candidates.append((x1,y1,x2,y2))
        if candidates:
            x1,y1,x2,y2=max(candidates);shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.3);return True
    return False
def capture(name):
    dismiss_warning(list(tree().iter('node')))
    (out/(name+'.png')).write_bytes(run('exec-out','screencap','-p'))
    (out/(name+'.xml')).write_bytes(ET.tostring(tree(),encoding='utf-8'))

report=[]
warsh='warsh-kfgqpc-v2.1-update6';hafs='hafs-tanzil-uthmani-1.1'
def installed(label):
    for _ in range(60):
        labels=values()
        if label in labels:return
        if any('لم يتم اعتماد هذا الملف' in v for v in labels):
            capture('download-failed');raise AssertionError('Source download/import failed')
        time.sleep(1)
    raise AssertionError('Download did not finish')
if args.section=='reset':
    link('storage','إدارة التخزين',True)
    for pack in ['quran-warsh','quran-hafs']:
        label=next(v for v in values() if v.startswith(pack+' · '))
        tap(label,True)
    label=next(v for v in values() if v.startswith('حذف 2 · '))
    tap(label);wait('حذف الملفات المحددة؟');tap('حذف')
    time.sleep(2)
    assert not any(v.startswith(('quran-warsh · ', 'quran-hafs · ')) for v in values())
    capture('packs-removed')
    link('quran/editions','اختيار المصحف');tap('اختيار هذه الرواية',True)
    report.append({'journey':'remove both newly installed Quran packs through Storage; select Warsh again','pass':True})
elif args.section=='downloads':
    link('quran','القرآن الكريم',True);tap('تنزيل المصحف');wait('تنزيل المصحف');capture('warsh-download')
    tap('تنزيل هذا المصحف');installed('فتح المصحف');capture('warsh-installed');tap('فتح المصحف');wait('الفاتحة');wait('1:1');capture('warsh-first-read')
    link('quran/editions','اختيار المصحف');tap('اختيار هذه الرواية',True)
    link('quran','القرآن الكريم');tap('تنزيل المصحف');wait('تنزيل المصحف');capture('hafs-download')
    tap('تنزيل هذا المصحف');wait('التنزيلات')
    # Wait for both source jobs, not the already-ready Warsh button.
    for _ in range(60):
        labels=values()
        if labels.count('فتح المصحف') >= 3:break
        time.sleep(1)
    else:raise AssertionError('Hafs source and font did not finish')
    link('quran/'+hafs+'/1/1','الفاتحة');wait('1:1');capture('hafs-first-read')
    link('downloads','التنزيلات');capture('both-installed')
    report.append({'journey':'normal MainActivity, actual HTTPS sources, explicit Warsh/Hafs downloads and installed readers','pass':True})
else:
    for theme,label in [('light','نهاري'),('dark','ليلي')]:
        link('settings','الإعدادات',True);tap(label)
        for edition,name in [(warsh,'warsh'),(hafs,'hafs')]:
            link('quran/'+edition+'/1/1','الفاتحة');wait('1:1');capture(name+'-reader-'+theme)
            link('quran/'+edition+'/9/1','التوبة');wait('9:1');capture(name+'-tawbah-'+theme)
            link('quran/'+edition+'/114/1','الناس');wait('114:1');capture(name+'-last-surah-'+theme)
        report.append({'journey':'both installed readers, Al-Fatiha opening, no additional At-Tawbah opening, last surah','theme':theme,'pass':True})
    link('settings','الإعدادات');tap('نهاري')
(out/(args.section+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(args.section+' passed')
