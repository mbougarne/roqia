#!/usr/bin/env python3
"""Acquire complete, unmodified publisher audio; pin every file, never guessed hashes.
Run explicitly with --cache /path (roughly 2 GB). Re-running reuses verified cache.
"""
import argparse,concurrent.futures,hashlib,json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[2]
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--cache',required=True);a=p.parse_args();cache=pathlib.Path(a.cache);cache.mkdir(parents=True,exist_ok=True)
 def acquire(url,key):
  dest=cache/(key+'.mp3')
  if not dest.exists():
   tmp=dest.with_suffix('.part');subprocess.run(['curl','--fail','-sSL','--proto','=https','--proto-redir','=https','--retry','2','--max-time','240',url,'-o',str(tmp)],check=True);tmp.rename(dest)
  b=dest.read_bytes();meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,bit_rate:stream=codec_name','-of','json',str(dest)]))
  assert meta['streams'][0]['codec_name']=='mp3' and float(meta['format']['duration'])>5
  return {'id':'audio','file':'audio.mp3','url':url,'bytes':len(b),'sha256':sha(b),'mime':'audio/mpeg'},meta['format']
 def pack(key,title,asset,source,cap='audio'):
  value={'id':key,'version':'2026.10.18','title':title,'review':'approved','capabilities':[cap],'sourceMetadata':source,'assets':[asset]}
  value['manifestHash']=sha(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode());return value
 recordings=[];evidence=[];chapter_names=json.loads((ROOT/'src/features/quran/chapters.json').read_text())
 for riwaya,rid,mid,title in [('warsh',118,120,'محمود خليل الحصري'),('hafs',1,1,'إبراهيم الأخضر')]:
  fixture=json.loads((ROOT/f'tools/feasibility/fixtures/reciters-{riwaya}.json').read_text());rec=next(r for r in fixture['reciters'] if r['id']==rid);m=next(m for m in rec['moshaf'] if m['id']==mid);assert list(map(int,m['surah_list'].split(',')))==list(range(1,115))
  key=f'mp3quran-{mid}-{riwaya}';source={'publisher':'MP3Quran','sourceUrl':f'https://www.mp3quran.net/api/v3/reciters?language=eng&rewaya={2 if riwaya=="warsh" else 1}','rightsUrl':'https://www.mp3quran.net/ar/privacy','rights':'Publisher permits every visitor or developer to use any material or link on the site. Files unchanged.','reciterId':str(rid),'recordingId':str(mid),'riwaya':riwaya,'tariq':'not specified by publisher','verifiedAt':'2026-10-18'}
  def chapter(n):
   asset,meta=acquire(m['server']+f'{n:03}.mp3',key+f'-{n:03}');return {'surah':n,'assetId':'audio','pack':pack(key+f'-{n:03}',f'{title} · {"ورش" if riwaya=="warsh" else "حفص"} · {chapter_names[n-1]["name"]}',asset,source)},meta
  with concurrent.futures.ThreadPoolExecutor(4) as ex:rows=list(ex.map(chapter,range(1,115)))
  recordings.append({'id':key,'title':title,'riwaya':riwaya,'tariq':None,'quality':'MP3 · جودة المصدر','notice':'المصدر: MP3Quran · التسجيل الأصلي دون تعديل. يتيح الناشر استخدام المواد والروابط للتطبيقات. https://www.mp3quran.net/ar/privacy','chapters':[c for c,_ in rows]})
  evidence.extend({**c['pack']['assets'][0],**meta,'id':c['pack']['id']} for c,meta in rows);print(riwaya,'114 verified',flush=True)
 sounds=[]
 for variant,file,title in [('normal','02_Dhuhr','أذان الدوحة'),('fajr','01_Fajr','أذان الفجر · الدوحة')]:
  url=f'https://archive.org/download/adhan.recordings.from.doha.qatar/Adhan_Doha_Qatar_{file}_Adhan.mp3';key='adhan-doha-'+variant;asset,meta=acquire(url,key)
  source={'publisher':'Internet Archive · Doha, Qatar','sourceUrl':'https://archive.org/details/adhan.recordings.from.doha.qatar','rightsUrl':'https://creativecommons.org/publicdomain/mark/1.0/','rights':'Uploader marks the recordings Public Domain. Original MP3, unchanged.','muezzin':'not identified by source','variant':variant,'verifiedAt':'2026-10-18'}
  sounds.append({'id':key,'variant':variant,'title':title,'notice':'تسجيل من الدوحة (2013–2014) · اسم المؤذن غير مذكور في المصدر. Internet Archive · Public Domain Mark 1.0 · الملف الأصلي دون تعديل.','pack':pack(key,title,asset,source,'adhan')});evidence.append({**asset,**meta,'id':key})
 (ROOT/'src/features/quran/recordings.data.json').write_text(json.dumps(recordings,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'tools/phase8/legacy-sounds.fixture.json').write_text(json.dumps(sounds,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'docs/implementation/phase-8/audio-verification.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
