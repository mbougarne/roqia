#!/usr/bin/env python3
"""Generate metadata only; download originals using phase4/acquire-translations.py first."""
import argparse, hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sha = lambda b: hashlib.sha256(b).hexdigest()
encoded = lambda v: (json.dumps(v, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
def asset(id, file, raw, mime, url=None):
    return dict(id=id, file=file, bytes=len(raw), sha256=sha(raw), mime=mime, **({'url':url} if url else {}))
def build(directory):
    locks = json.loads((ROOT/'tools/phase4/translations.lock.json').read_text())
    chapters = json.loads((ROOT/'src/features/quran/chapters.json').read_text())
    result = []
    for id, language, title, update in [
        ('fr.hamidullah', 'fr', 'Muhammad Hamidullah', '2011-07-18'),
        ('en.pickthall', 'en', 'Mohammed Marmaduke William Pickthall', '2010-09-04'),
    ]:
        lock = locks[id]
        raw = (directory/(id+'.txt')).read_bytes()
        assert len(raw) == lock['bytes'] and sha(raw) == lock['sha256'], 'Original changed: '+id
        text = raw.decode('utf-8'); body, sep, rest = text.partition('#'); footer = sep+rest
        assert f'#  ID: {id}\n' in footer and f'#  Translator: {title}\n' in footer
        notice = footer+'\nSource and terms: https://tanzil.net/trans/\nNon-commercial use. Translation of meanings; not a replacement for the Arabic Quran.\n'
        p = dict(kind='translation-source-v1', editionId='hafs-tanzil-uthmani-1.1', numberingScheme='tanzil-madina-hafs', textVersion='source-1', translationId=id, sourceAssetId='original', sourceFooter=footer, notice=notice)
        lines = body.splitlines()
        while lines and lines[-1] == '': lines.pop()
        cursor = 0; derived = []
        for c in chapters:
            verses = []
            for n in range(1, c['hafsVerses']+1):
                fields = lines[cursor].split('|', 2); cursor += 1
                assert fields[:2] == [str(c['number']), str(n)] and fields[2].strip(), (id, c['number'], n)
                verses.append(dict(number=n, text=fields[2]))
            value = dict(translationId=id, editionId=p['editionId'], numberingScheme=p['numberingScheme'], textVersion=p['textVersion'], surah=c['number'], verses=verses, sourceNotice=notice)
            derived.append(asset(f"chapter-{c['number']}", f"{c['number']:03}.json", encoded(value), 'application/json'))
        assert cursor == len(lines) == 6236
        pack = dict(id='translation-'+id, version='source-1', title=('الفرنسية' if language=='fr' else 'الإنجليزية')+' · '+title,
            review='approved', capabilities=['translation'], sourceMetadata=dict(translator=title, source=lock['url'], termsUrl=lock['termsUrl'], usage='non-commercial', sourceLastUpdate=update, sourceSha256=sha(raw), delivery='original-source-on-device-import', structuralValidation='114 chapters / 6236 Hafs verses; exact source strings', editorialReview='not claimed'),
            assets=[asset('original','original.txt',raw,'text/plain',lock['url'])], derivedAssets=derived, preparation=p)
        pack['manifestHash'] = sha(encoded(pack))
        result.append(dict(id=id, title=title, language=language, editionId=p['editionId'], numberingScheme=p['numberingScheme'], textVersion=p['textVersion'], pack=pack, chapterAssets={str(c['number']):f"chapter-{c['number']}" for c in chapters}, notice=notice))
    return result
if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources',type=Path,default=ROOT/'.roqia-feasibility/translations')
    parser.add_argument('--check',action='store_true'); args=parser.parse_args()
    data=json.dumps(build(args.sources),ensure_ascii=False,indent=2)+'\n'
    dest=ROOT/'src/features/quran/translations.data.json'
    if args.check: assert dest.read_text()==data, 'Regenerate translation metadata'
    else: dest.write_text(data)
    print('Verified 2 originals, 228 chapter descriptors and 12472 verse records; no corpus published.')
