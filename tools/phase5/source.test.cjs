require('../foundation/register.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseOriginalSource}=require('../../src/features/quran/sourceParser.ts');
const {quranCatalog}=require('../../src/features/quran/catalog.ts');
const {chapters,validateQuranCatalog}=require('../../src/features/quran/domain.ts');
const {validateCatalog}=require('../../src/features/downloads/types.ts');
test('normal catalog delivers original sources and explicitly defers manual review',()=>{
 validateQuranCatalog(quranCatalog);validateCatalog(quranCatalog.texts.map(t=>t.pack));
 assert.equal(quranCatalog.texts.length,2);
 for(const t of quranCatalog.texts){assert.equal(t.pack.sourceMetadata.manualArabicReview,'deferred-owner-2026-10-18');assert.equal(Object.keys(t.chapterAssets).length,114);assert.ok(t.pack.derivedAssets.length>=114);assert.ok(t.pack.assets.every(a=>a.url.startsWith('https://')));assert.ok(!t.notice.includes('Private local test'));}
 assert.equal(quranCatalog.translations.length,0);assert.equal(quranCatalog.recordings.length,2);
});
test('Hafs importer preserves strings, rejects missing/duplicate/reordered data and missing notice',()=>{
 const p=quranCatalog.texts[1].pack.preparation;
 const lines=chapters.flatMap(c=>Array.from({length:c.hafsVerses},(_,i)=>`${c.number}|${i+1}|TEST ONLY \u064e  ${i}|suffix`));
 const notice='\n# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK\nTanzil Quran Text (Uthmani, Version 1.1)';
 const parsed=parseOriginalSource(p,lines.join('\n')+notice);assert.equal(parsed[0].verses[0].text,'TEST ONLY \u064e  0|suffix');assert.equal(parsed.flatMap(c=>c.verses).length,6236);
 for(const broken of [lines.slice(1),[lines[0],...lines], [...lines].reverse()])assert.throws(()=>parseOriginalSource(p,broken.join('\n')+notice));
 assert.throws(()=>parseOriginalSource(p,lines.join('\n')));
});
test('Warsh importer keeps source IDs and exact opening paragraphs independently of verse numbering',()=>{
 const p=quranCatalog.texts[0].pack.preparation;let id=0;
 const rows=chapters.flatMap(c=>Array.from({length:c.warshVerses},(_,i)=>({id:++id,sura_no:c.number,aya_no:i+1,aya_text:'TEST ONLY \ufc00  '})));
 const openings=Object.fromEntries(chapters.filter(c=>c.number!==9).map(c=>[c.number,'بِسْمِ TEST ONLY  ']));
 const parsed=parseOriginalSource(p,JSON.stringify(rows),openings);assert.equal(parsed.flatMap(c=>c.verses).length,6214);assert.equal(parsed[0].verses[0].text,rows[0].aya_text);assert.equal(parsed[0].opening,openings[1]);assert.equal(parsed[8].opening,undefined);
 assert.throws(()=>parseOriginalSource(p,JSON.stringify(rows),{...openings,9:'بِسْمِ TEST ONLY'}));
 assert.throws(()=>parseOriginalSource(p,JSON.stringify(rows.slice(1)),openings));
 rows[1].aya_no=1;assert.throws(()=>parseOriginalSource(p,JSON.stringify(rows),openings));
});
test('derived file names cannot escape storage or overlap downloaded originals',()=>{
 const original=quranCatalog.texts[0].pack;
 for(const edit of [p=>p.derivedAssets[0].file='../escape',p=>p.derivedAssets[0].file=p.assets[0].file,p=>delete p.assets[0].url,p=>delete p.preparation]){const p=structuredClone(original);edit(p);assert.throws(()=>validateCatalog([p]));}
});
