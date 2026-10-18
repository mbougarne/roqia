#!/usr/bin/env python3
"""Acquire exactly the pinned translation originals for private validation."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'feasibility'))
from content import acquire
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
lock=json.loads(Path(__file__).with_name('translations.lock.json').read_text())
acquire([dict(value,id=id,file=id+'.txt') for id,value in lock.items()],args.out)
print('Pinned French and English originals verified; publication/editorial approval is still pending.')
