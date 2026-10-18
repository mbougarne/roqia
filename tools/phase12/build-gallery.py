#!/usr/bin/env python3
"""Build a review gallery from real captures and immutable design references."""
import argparse,hashlib,html,json
from pathlib import Path
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--captures',required=True);p.add_argument('--output',required=True);p.add_argument('--screens',default='');a=p.parse_args()
root=Path(__file__).resolve().parents[2];captures=Path(a.captures);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
refs=json.loads((root/'design/roqia-v2/reference/manifest.json').read_text());ids=sorted({r['id'] for r in refs})
if a.screens:ids=[id for id in ids if id[:2] in a.screens.split(',')]
manifest=[]
for theme in ['light','dark']:
 for start in range(0,len(ids),4):
  board=Image.new('RGB',(1440,1680),'#777777');draw=ImageDraw.Draw(board)
  for i,id in enumerate(ids[start:start+4]):
   for side in range(2):
    path=root/'design/roqia-v2/reference'/theme/(id+'.png') if side==0 else captures/(id+'-'+theme+'.png')
    if side==1 and id=='08-ruqya' and (captures/(id+'-playing-'+theme+'.png')).exists():path=captures/(id+'-playing-'+theme+'.png')
    x=(i%2)*720+side*360;y=(i//2)*840
    draw.text((x+6,y+4),id+(' reference' if side==0 else ' Android'),fill='white')
    if path.exists():
     im=Image.open(path).convert('RGB');im.thumbnail((356,810));board.paste(im,(x,y+25))
    else:draw.text((x+20,y+70),'NOT CAPTURED',fill='white')
  board.save(out/(theme+'-'+str(start+1).zfill(2)+'.jpg'),quality=85)
 for id in ids:
  path=captures/(id+'-'+theme+'.png')
  if path.exists():manifest.append({'screen':id,'theme':theme,'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'dimensions':Image.open(path).size})
(out/'captures.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(str(len(manifest))+' / '+str(len(ids)*2)+' captures')
