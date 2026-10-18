require('../foundation/register.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const d=require('../../src/features/quran/domain.ts');
const {quranCatalog}=require('../../src/features/quran/catalog.ts');
const {resolveLink}=require('../../src/navigation/routes.ts');
const warsh=d.editions[0],hafs=d.editions[1];
const location=(e=warsh)=>({editionId:e.id,numberingScheme:e.numbering,surah:1,verse:1,packVersion:'v1'});
test('edition metadata preserves separate 6214 / 6236 verse structures',()=>{
 assert.equal(d.chapters.length,114);assert.equal(d.chapters.reduce((n,c)=>n+c.warshVerses,0),6214);assert.equal(d.chapters.reduce((n,c)=>n+c.hafsVerses,0),6236);
 assert.deepEqual(d.chapters.map(c=>c.number),Array.from({length:114},(_,i)=>i+1));
});
test('canonical strings and source ornaments survive unchanged; malformed chapters are rejected',()=>{
 const c={editionId:warsh.id,numberingScheme:warsh.numbering,surah:1,sourceNotice:'test-only',verses:Array.from({length:d.chapters[0].warshVerses},(_,i)=>({number:i+1,text:'TEST ONLY \uFC00 \u06e5'}))};
 const original=JSON.stringify(c);assert.equal(d.validateChapter(c,warsh,1),c);assert.equal(JSON.stringify(c),original);
 for(const change of [{editionId:hafs.id},{numberingScheme:hafs.numbering},{surah:2},{verses:c.verses.slice(1)},{sourceNotice:''}])assert.throws(()=>d.validateChapter({...c,...change},warsh,1));
});
test('locators bind edition, numbering and version; no cross-edition ordinal fallback',()=>{
 assert.notEqual(d.locatorKey(location()),d.locatorKey(location(hafs)));
 assert.notEqual(d.locatorKey(location()),d.locatorKey({...location(),packVersion:'v2'}));
 for(const change of [{verse:0},{verse:999},{surah:115},{surah:1.5},{numberingScheme:hafs.numbering},{editionId:'unknown'}])assert.throws(()=>d.validateLocator({...location(),...change}));
});
test('metadata search finds Arabic variants and LTR names without mutating labels',()=>{
 const before=JSON.stringify(d.chapters);assert.equal(d.searchChapters('الفَاتِحَة')[0].number,1);assert.equal(d.searchChapters('Al-Faatiha')[0].number,1);assert.equal(JSON.stringify(d.chapters),before);
});
test('normal catalog keeps unsupported translations unavailable and rejects correspondence guesses',()=>{
 assert.equal(quranCatalog.translations.length,0);assert.equal(quranCatalog.recordings.length,2);d.validateQuranCatalog(quranCatalog);
 assert.throws(()=>d.validateQuranCatalog({texts:[],recordings:[],translations:[{editionId:warsh.id,numberingScheme:warsh.numbering,notice:'test',language:'fr'}]}),/unreviewed_translation_mapping/);
});
test('partial recordings and selective totals use actual files and reject missing surahs',()=>{
 const r={chapters:[1,112,114].map(surah=>({surah,pack:{assets:[{bytes:surah*10}]}}))};
 const selected=d.selectedAudio(r,[114,1,1]);assert.equal(selected.bytes,1150);assert.deepEqual(selected.rows.map(c=>c.surah),[1,114]);assert.equal(selected.complete,false);assert.throws(()=>d.selectedAudio(r,[2]));
});
test('known edition links carry exact surah/verse and invalid locators recover',()=>{
 assert.deepEqual(resolveLink(`roqia://quran/${warsh.id}/2/253`),{reader:{editionId:warsh.id,surah:2,verse:253}});
 assert.deepEqual(resolveLink(`roqia://quran/${warsh.id}/115/1`),{recovery:'invalid-link'});
 assert.deepEqual(resolveLink('roqia://quran/search'),{screen:'QuranSearch'});
});

test('Warsh source binding rejects an otherwise valid font with different glyph semantics',()=>{
 const pack={version:'v1',capabilities:['quran-text'],assets:[{id:'font',mime:'font/ttf',sha256:'f'.repeat(64)}]};
 assert.throws(()=>d.validateQuranCatalog({texts:[{editionId:warsh.id,pack,fontAssetId:'font',notice:'test',basmalaPolicy:'source-verbatim'}],translations:[],recordings:[]}),/edition_font_mismatch/);
 assert.equal(warsh.requiredFontSha256,'b436fb89e1d26f827cd6a3c4d632fb68a49cc954c4ac90699a9502da25555230');
});
