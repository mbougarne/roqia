"""Build passage alignment from pinned Arabic originals; no source text is modified.
Exact matched text anchors establish shared verse boundaries. Between anchors,
whole verses stay grouped, preserving translation text without inferred splits.
"""
import json,zipfile,re,unicodedata,difflib,os,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2];os.chdir(root)
for t in json.loads(Path('src/features/quran/catalog.data.json').read_text())['texts']:
 a=t['pack']['assets'][0];p=Path('.roqia-feasibility/sources')/('UthmanicWarsh_v2-1.zip' if t['editionId'].startswith('warsh') else 'tanzil-uthmani.txt');assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256']
z=zipfile.ZipFile('.roqia-feasibility/sources/UthmanicWarsh_v2-1.zip');rows=json.loads(z.read(next(n for n in z.namelist() if n.endswith('warshData_v2-1.json'))))
hafs={n:[] for n in range(1,115)}
for l in Path('.roqia-feasibility/sources/tanzil-uthmani.txt').read_text().splitlines():
 if re.match(r'^\d+\|',l):
  n,v,t=l.split('|',2);hafs[int(n)].append(t)
def norm(t):
 t=t.translate(str.maketrans('ٱأإآىؤئے','اااايويي'))
 return ''.join(c for c in t if '\u0621'<=c<='\u063a' or '\u0641'<=c<='\u064a')
base=norm(hafs[1][0]);result={};issues=[]
for n in range(1,115):
 w=[norm(r['aya_text']) for r in rows if r['sura_no']==n];h=[norm(t) for t in hafs[n]]
 if n!=9 and n!=1:assert h[0].startswith(base);h[0]=h[0][len(base):]
 if n==1:h=h[1:]
 ws=''.join(w);hs=''.join(h);wb=[0];hb=[0]
 for t in w:wb.append(wb[-1]+len(t))
 for t in h:hb.append(hb[-1]+len(t))
 # A shared verse boundary is accepted only inside an exact matched passage.
 boundary={0:0,len(w):len(h)};hbindex={v:i for i,v in enumerate(hb)}
 for block in difflib.SequenceMatcher(None,ws,hs,autojunk=False).get_matching_blocks():
  for i,b in enumerate(wb[1:-1],1):
   if block.size>=12 and block.a<=b<=block.a+block.size:
    target=block.b+b-block.a
    if target in hbindex:boundary[i]=hbindex[target]
 pairs=sorted(boundary.items());groups=[]
 for (a,b),(c,d) in zip(pairs,pairs[1:]):
  ratio=difflib.SequenceMatcher(None,''.join(w[a:c]),''.join(h[b:d]),autojunk=False).ratio()
  if ratio<.8 or c-a>4 or d-b>4:issues.append((n,a+1,c,b+1,d,ratio))
  groups.append({'warsh':[a+1,c],'hafs':[b+1+(n==1),d+(n==1)],'similarity':round(ratio,4)})
 result[str(n)]=groups
assert not issues, issues
output={'warshEdition':'warsh-kfgqpc-v2.1-update6','hafsEdition':'hafs-tanzil-uthmani-1.1','textVersion':'source-1','chapters':result}
Path('src/features/quran/warsh-translation-map.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n')
print('Verified',sum(map(len,result.values())),'ordered passage groups across 114 chapters')
