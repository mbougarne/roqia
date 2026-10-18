#!/usr/bin/env python3
"""Compile pinned IANA tzdata and materialize bounded offline UTC-offset transitions."""
import argparse,datetime as dt,hashlib,json,subprocess,tarfile,tempfile
from pathlib import Path
from zoneinfo import ZoneInfo
p=argparse.ArgumentParser();p.add_argument('archive');a=p.parse_args();raw=Path(a.archive).read_bytes()
if hashlib.sha256(raw).hexdigest()!='e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4':raise ValueError('Unexpected tzdata archive')
root=Path(__file__).resolve().parents[2];start=int(dt.datetime(2024,1,1,tzinfo=dt.timezone.utc).timestamp());end=int(dt.datetime(2031,1,1,tzinfo=dt.timezone.utc).timestamp())
with tempfile.TemporaryDirectory() as tmp:
 tmp=Path(tmp)
 with tarfile.open(a.archive) as t:t.extractall(tmp,filter='data')
 if (tmp/'version').read_text().strip()!='2026c':raise ValueError('Unexpected tzdata version')
 subprocess.run(['/usr/sbin/zic','-d',str(tmp/'compiled'),*[str(tmp/n) for n in ['africa','antarctica','asia','australasia','europe','northamerica','southamerica','etcetera','backward']]],check=True)
 zones={}
 for file in sorted((tmp/'compiled').rglob('*')):
  if not file.is_file():continue
  with file.open('rb') as f:zone=ZoneInfo.from_file(f)
  def offset(t):return int(dt.datetime.fromtimestamp(t,dt.timezone.utc).astimezone(zone).utcoffset().total_seconds())
  rows=[[start,offset(start)]];previous=start
  for instant in range(start+86400,end+1,86400):
   new=offset(instant)
   if new!=rows[-1][1]:
    lo,hi=previous,instant
    while hi-lo>1:
     mid=(lo+hi)//2
     if offset(mid)==rows[-1][1]:lo=mid
     else:hi=mid
    rows.append([hi,new])
   previous=instant
  zones[str(file.relative_to(tmp/'compiled'))]=rows
 result={'version':'2026c','source':'https://data.iana.org/time-zones/releases/tzdata2026c.tar.gz','sourceSha256':hashlib.sha256(raw).hexdigest(),'from':start,'until':end,'zones':zones}
 (root/'src/features/prayer/timezones.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
 (root/'src/features/prayer/TZDATA-LICENSE.txt').write_text((tmp/'LICENSE').read_text())
 print(json.dumps({'zones':len(zones),'sourceSha256':result['sourceSha256'],'Casablanca':zones['Africa/Casablanca']}))
