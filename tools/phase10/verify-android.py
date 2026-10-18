#!/usr/bin/env python3
"""Compare populated app backups without modifying either; prove preservation and catalog hashes."""
import argparse,hashlib,json,sqlite3,tarfile,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def records(archive):
 with tempfile.TemporaryDirectory() as directory:
  for name in ['roqia-v2.sqlite','roqia-v2.sqlite-wal','roqia-v2.sqlite-shm']:
   try:raw=archive.extractfile('databases/'+name).read()
   except KeyError:continue
   (Path(directory)/name).write_bytes(raw)
  with sqlite3.connect(Path(directory)/'roqia-v2.sqlite') as db:
   rows={(c,id):json.loads(v) for c,id,v in db.execute('select collection,id,value from records')}
   counters=db.execute('select * from counters order by 1').fetchall()
  return rows,counters
p=argparse.ArgumentParser(description=__doc__);p.add_argument('before');p.add_argument('after');a=p.parse_args()
with tarfile.open(a.before) as before,tarfile.open(a.after) as after:
 b,bc=records(before);e,ec=records(after);assert bc==ec
 stable={}
 for collection in ['bookmarks','reminders','quran-preferences']:
  old={k:v for k,v in b.items() if k[0]==collection};new={k:v for k,v in e.items() if k[0]==collection};assert old==new,collection;stable[collection]=len(old)
 settings=lambda rows:{k:v for k,v in rows[('settings','singleton')].items() if k!='updatedAt'}
 assert settings(b)==settings(e)
 for key in [('prayer','preferences'),('prayer','sounds')]:assert b[key]==e[key],key
 preserved=0
 for f in before.getmembers():
  if f.isfile() and f.name.startswith('files/roqia/content/'):
   assert before.extractfile(f).read()==after.extractfile(f.name).read(),f.name;preserved+=1
 def packs(value):
  if isinstance(value,dict):
   if {'assets','manifestHash','version','id'}<=value.keys():yield value
   else:
    for child in value.values():yield from packs(child)
  elif isinstance(value,list):
   for child in value:yield from packs(child)
 catalog=[]
 for path in ['src/features/quran/catalog.data.json','src/features/quran/translations.data.json','src/features/quran/recordings.data.json','src/features/prayer/sounds.data.json']:
  file=ROOT/path
  if file.exists():catalog+=list(packs(json.loads(file.read_text())))
 installed=[];reactivated=[]
 for (collection,id),old in b.items():
  if collection!='installed':continue
  current=e[(collection,id)];
  if current['activatedAt']!=old['activatedAt']:
   assert old['packId']=='translation-en.pickthall';reactivated.append(old['packId'])
  strip=lambda p:{k:v for k,v in p.items() if k!='activatedAt'};assert strip(current)==strip(old),(id,'installed record changed')
  pack=next((p for p in catalog if p['id']==old['packId'] and p['version']==old['version']),None)
  if not pack:continue
  checked=0
  for asset in pack['assets']+pack.get('derivedAssets',[]):
   raw=after.extractfile('files/roqia/'+current['relativeDirectory']+'/'+asset['file']).read()
   assert len(raw)==asset['bytes'] and hashlib.sha256(raw).hexdigest()==asset['sha256'];checked+=1
  installed.append(dict(packId=old['packId'],files=checked,allHashesMatch=True))
 positions=[id for c,id in b if c=='quran-positions'];assert all(('quran-positions',id) in e for id in positions)
 assert not any(c.startswith('phase10-') for c,id in e),'Fixture records not cleaned'
 print(json.dumps(dict(counterRowsPreserved=len(bc),unchangedCollections=stable,settingsUnchangedIgnoringTimestamp=True,prayerPreferencesAndSoundsUnchanged=True,existingContentFilesByteIdentical=preserved,readingPositionIdentitiesRetained=len(positions),readingPositionsMayReflectTestNavigation=True,originalInstalledRecordsUnchangedExceptActivationTimestamp=True,expectedReactivatedPacks=reactivated,verifiedCatalogPacks=installed,fixtureRecordsCleaned=True),indent=2))
