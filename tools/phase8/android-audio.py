#!/usr/bin/env python3
"""Normal-app UI capture/interaction checks. Requires emulator and phase6 hierarchy jar.
Back up the existing emulator app data first. No fixture UI or source mutations.
"""
import argparse,json,re,subprocess,time,xml.etree.ElementTree as ET
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True)
parser.add_argument('--section',choices=['inspect','download','offline','adhan','capture','playback','final-checks','restart'],default='inspect')
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

def wait_file(pack):
    path=f'files/roqia/content/{pack}/2026.10.18/audio.mp3'
    for _ in range(90):
        result=subprocess.run(adb+['shell','run-as','name.roqia.app','test','-s',path],capture_output=True)
        if result.returncode==0:return path
        time.sleep(1)
    raise AssertionError('Download did not finish '+pack)
if args.section=='inspect':
    link('prayer/sounds','أصوات الأذان',True)
    print(values(tree()))
elif args.section=='download':
    for riwaya,title,pack in [('ورش عن نافع','محمود خليل الحصري','mp3quran-120-warsh-001'),('حفص عن عاصم','إبراهيم الأخضر','mp3quran-1-hafs-001')]:
        link('quran/audio','القراء والتنزيلات الصوتية',True);tap(riwaya);tap(title,True);tap('1 · الفاتحة',True)
        shell('input','swipe','1000','650','1000','2000','300')
        root=tree();button=next(v for v in values(root) if v.startswith('تنزيل المختار'))
        tap(button);wait_file(pack);print('downloaded',pack,flush=True)
    for title,pack in [('أذان الدوحة','adhan-doha-normal'),('أذان الفجر · الدوحة','adhan-doha-fajr')]:
        link('prayer/sounds','أصوات الأذان',True);tap('تنزيل '+title,True);wait_file(pack);print('downloaded',pack,flush=True)
    link('prayer/sounds','أصوات الأذان',True);capture('adhan-downloaded-light')
elif args.section=='offline':
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        link('quran/offline-audio','مكتبتي الصوتية',True);print(values(tree()));capture('quran-offline-light')
    finally:shell('svc','wifi','enable');shell('svc','data','enable')
elif args.section=='adhan':
    link('prayer/sounds','أصوات الأذان',True);tap('اختيار أذان الدوحة',True);tap('اختيار أذان الفجر · الدوحة',True)
    print(values(tree()));capture('adhan-selected-light')
elif args.section=='playback':
    results=[]
    theme('light')
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        link('quran/offline-audio','مكتبتي الصوتية',True)
        tap('استماع إلى السور المحفوظة',True)
        time.sleep(2);capture('quran-player-offline-light')
        state=shell('dumpsys','media_session')
        (out/'quran-media-session.txt').write_text(state)
        assert 'state=PLAYING(3)' in state,state[-3000:]
        results.append('Warsh local audio plays after offline cold start')
        shell('input','keyevent','KEYCODE_MEDIA_PAUSE')
        # Both previews read only the already downloaded originals.
        for title in ['أذان الدوحة','أذان الفجر · الدوحة']:
            link('prayer/sounds','أصوات الأذان',True);tap('استماع: '+title,True);time.sleep(2)
            state=shell('dumpsys','activity','services','name.roqia.app')
            assert 'AdhanService' in state and 'isForeground=true' in state,state
            shell('cmd','statusbar','expand-notifications');time.sleep(1)
            capture('adhan-notification-'+('fajr' if 'الفجر' in title else 'normal'))
            tap('إيقاف الأذان');time.sleep(1)
            assert 'AdhanService' not in shell('dumpsys','activity','services','name.roqia.app')
            shell('cmd','statusbar','collapse');results.append(title+' offline foreground playback and notification Stop')
        shell('appops','set','name.roqia.app','SCHEDULE_EXACT_ALARM','allow')
        link('quran/offline-audio','مكتبتي الصوتية',True);tap('استماع إلى السور المحفوظة',True);wait('المشغل')
        link('prayer/sounds','أصوات الأذان');tap('تجربة بعد 10 ثوان: أذان الدوحة',True)
        shell('input','keyevent','KEYCODE_HOME');shell('input','keyevent','KEYCODE_SLEEP');shell('dumpsys','deviceidle','force-idle')
        time.sleep(12)
        state=shell('dumpsys','activity','services','name.roqia.app');(out/'locked-idle-service.txt').write_text(state)
        assert 'AdhanService' in state and 'isForeground=true' in state,state
        media=shell('dumpsys','media_session');(out/'adhan-interrupted-quran.txt').write_text(media)
        assert 'state=PAUSED(2)' in media,media
        results.append('Exact alarm starts native adhan while locked and forced idle, offline; Quran paused on focus loss')
        shell('dumpsys','deviceidle','unforce');shell('input','keyevent','KEYCODE_WAKEUP');shell('wm','dismiss-keyguard')
        shell('cmd','statusbar','collapse');link('prayer/sounds','أصوات الأذان')
        shell('input','swipe','1000','600','1000','2050','300');tap('إيقاف الأذان',True);time.sleep(1)
        assert 'AdhanService' not in shell('dumpsys','activity','services','name.roqia.app')
        assert 'state=PAUSED(2)' in shell('dumpsys','media_session')
        results.append('Quran stays paused after adhan Stop')
    finally:
        shell('dumpsys','deviceidle','unforce');shell('input','keyevent','KEYCODE_WAKEUP');shell('wm','dismiss-keyguard')
        shell('svc','wifi','enable');shell('svc','data','enable')
        (out/'playback-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print(results)
elif args.section=='restart':
    def alarms():
        return len(re.findall(r'RTC_WAKEUP #\d+:[^\n]*name\.roqia\.app[^\n]*\n\s+tag=\*walarm\*:name\.roqia\.app\.ADHAN',shell('dumpsys','alarm')))
    shell('appops','set','name.roqia.app','SCHEDULE_EXACT_ALARM','allow')
    try:
        link('prayer/adhan','تنبيهات الصلاة والأذان',True);time.sleep(2)
        before=alarms();assert before>0,before
        shell('am','force-stop','name.roqia.app');assert alarms()==0
        link('prayer/adhan','تنبيهات الصلاة والأذان');time.sleep(2)
        after=alarms();assert after==before,(before,after)
        (out/'restart.json').write_text(json.dumps({'scheduledBefore':before,'afterForceStop':0,'restoredAfterReopen':after,'pass':True},indent=2)+'\n')
        print('Native alarms restored after force-stop:',after)
    finally:
        shell('appops','set','name.roqia.app','SCHEDULE_EXACT_ALARM','default')
        link('quran/offline-audio','مكتبتي الصوتية',True)
elif args.section=='final-checks':
    results=[]
    theme('light')
    # Confirm a second riwaya plays from the offline library.
    shell('svc','wifi','disable');shell('svc','data','disable')
    try:
        link('quran/offline-audio','مكتبتي الصوتية',True)
        nodes=[n for n in tree().iter('node') if n.get('clickable')=='true' and clean(n.get('content-desc'))=='استماع إلى السور المحفوظة']
        assert len(nodes)==2,len(nodes)
        x1,y1,x2,y2=map(int,re.findall(r'\d+',nodes[1].get('bounds')));shell('input','tap',str((x1+x2)//2),str((y1+y2)//2));wait('المشغل');time.sleep(1)
        state=shell('dumpsys','media_session');assert 'state=PLAYING(3)' in state and 'إبراهيم الأخضر' in state
        capture('hafs-player-offline-light');results.append('Hafs local audio plays offline')
    finally:shell('svc','wifi','enable');shell('svc','data','enable')
    # Permission changes must preserve desired prayer mode and switch effective delivery.
    for mode in ['deny','allow']:
        shell('appops','set','name.roqia.app','SCHEDULE_EXACT_ALARM',mode)
        link('prayer/adhan','تنبيهات الصلاة والأذان',True);capture('adhan-exact-'+mode)
        events=ET.fromstring(run('exec-out','run-as','name.roqia.app','cat','shared_prefs/roqia-adhan.xml'))
        alarms=json.loads(next(n.text for n in events if n.get('name')=='events'))
        assert bool(alarms)==(mode=='allow'),alarms
        results.append('Exact alarm '+mode+' reflected in native schedule')
    # Native preview rejects a modified installed file before creating a service.
    file='files/roqia/content/adhan-doha-normal/2026.10.18/audio.mp3'
    shell('am','force-stop','name.roqia.app');shell('run-as','name.roqia.app','cp',file,'cache/phase8-original.mp3')
    try:
        shell('run-as','name.roqia.app','sh','-c',"'printf x >> "+file+"'")
        link('prayer/sounds','أصوات الأذان',True);tap('استماع: أذان الدوحة',True);wait('تعذر إكمال العملية')
        assert 'AdhanService' not in shell('dumpsys','activity','services','name.roqia.app')
        capture('adhan-corrupt-rejected');results.append('Modified installed adhan rejected before playback')
    finally:
        shell('am','force-stop','name.roqia.app');shell('run-as','name.roqia.app','cp','cache/phase8-original.mp3',file);shell('run-as','name.roqia.app','rm','cache/phase8-original.mp3')
    link('prayer/sounds','أصوات الأذان',True);tap('استماع: أذان الدوحة',True);time.sleep(1)
    assert 'AdhanService' in shell('dumpsys','activity','services','name.roqia.app')
    shell('input','swipe','1000','600','1000','2050','300');tap('إيقاف الأذان');time.sleep(1)
    assert 'AdhanService' not in shell('dumpsys','activity','services','name.roqia.app')
    results.append('Restored original plays and in-app Stop works')
    (out/'final-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(results)
else:
    for mode in ['light','dark']:
        theme(mode)
        for path,title,key in [('prayer/sounds','أصوات الأذان','adhan-sounds'),('quran/audio','القراء والتنزيلات الصوتية','quran-audio'),('quran/offline-audio','مكتبتي الصوتية','quran-offline')]:
            link(path,title,True);capture(key+'-'+mode)
