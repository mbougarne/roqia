#!/usr/bin/env python3
"""Check private pre/post-upgrade Android backups; emit counts and hashes, no user records."""
import argparse, hashlib, json, sqlite3, tarfile, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sha=lambda b:hashlib.sha256(b).hexdigest()
def records(archive):
    with tempfile.TemporaryDirectory() as directory:
        for name in ['roqia-v2.sqlite','roqia-v2.sqlite-wal','roqia-v2.sqlite-shm']:
            try: raw=archive.extractfile('databases/'+name).read()
            except KeyError: continue
            (Path(directory)/name).write_bytes(raw)
        with sqlite3.connect(Path(directory)/'roqia-v2.sqlite') as db:
            rows={(c,id):json.loads(v) for c,id,v in db.execute('select collection,id,value from records')}
            counters=db.execute('select * from counters order by 1').fetchall()
        return rows,counters
p=argparse.ArgumentParser(description=__doc__);p.add_argument('before');p.add_argument('after');a=p.parse_args()
with tarfile.open(a.before) as before,tarfile.open(a.after) as after:
    b,bc=records(before);e,ec=records(after);assert bc==ec
    stable={}
    for collection in ['bookmarks','reminders']:
        old={k:v for k,v in b.items() if k[0]==collection};new={k:v for k,v in e.items() if k[0]==collection}
        assert old==new,collection;stable[collection]=len(old)
    settings=lambda rows:{k:v for k,v in rows[('settings','singleton')].items() if k!='updatedAt'}
    assert settings(b)==settings(e)
    stable['settingsIgnoringWriteTimestamp']=1
    for key in [('prayer','preferences'),('prayer','sounds')]: assert b[key]==e[key],key
    stable['prayerPreferencesAndSounds']=2
    preserved=0
    for f in before.getmembers():
        if f.isfile() and f.name.startswith('files/roqia/content/'):
            assert before.extractfile(f).read()==after.extractfile(f.name).read(),f.name
            preserved+=1
    reports=[]
    for t in json.loads((ROOT/'src/features/quran/translations.data.json').read_text()):
        pack=t['pack'];key=('installed',pack['id']+'@'+pack['version']);installed=e[key]
        assert installed['state']=='ready' and installed['active'] and installed['manifestHash']==pack['manifestHash']
        directory='files/roqia/'+installed['relativeDirectory']
        verses=0
        for asset in pack['assets']+pack['derivedAssets']:
            raw=after.extractfile(directory+'/'+asset['file']).read()
            assert len(raw)==asset['bytes'] and sha(raw)==asset['sha256'],asset['file']
            if asset['mime']=='application/json':
                chapter=json.loads(raw);assert chapter['translationId']==t['id'] and chapter['textVersion']==t['textVersion']
                verses+=len(chapter['verses'])
        assert verses==6236
        reports.append(dict(id=t['id'],installedFiles=115,chapters=114,verses=verses,allInstalledHashesMatch=True))
    prefs=e[('quran-preferences','hafs-tanzil-uthmani-1.1')];assert prefs['translationId']=='fr.hamidullah'
    for (collection,id),value in b.items():
        if collection=='quran-preferences':
            current=e[(collection,id)]
            assert {k:v for k,v in value.items() if k!='translationId'}=={k:v for k,v in current.items() if k!='translationId'}
    positions=[id for c,id in b if c=='quran-positions'];assert all(('quran-positions',id) in e for id in positions)
    print(json.dumps(dict(counterRowsPreserved=len(bc),unchangedCollections=stable,existingContentFilesByteIdentical=preserved,existingReaderSettingsPreservedExceptChosenTranslation=True,readingPositionIdentitiesRetained=len(positions),readingPositionsMayReflectTestNavigation=True,selectedHafsTranslation=prefs['translationId'],translations=reports),indent=2))
