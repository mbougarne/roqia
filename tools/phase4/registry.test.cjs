require('../foundation/register.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module'),{DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');let writes=0,failAt=0;
const execute=async(q,a=[])=>{if(/^(INSERT|DELETE)/.test(q)){writes++;if(failAt===writes)throw Error('disk_full');}return{rows:db.prepare(q).all(...a)};};
const adapter={execute,transaction:async fn=>{db.exec('BEGIN');try{await fn({execute});db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
const load=Module._load;Module._load=function(name,parent,isMain){
 if(name==='@op-engineering/op-sqlite')return{open:()=>adapter};
 if(name==='react-native-file-access')return{Dirs:{DocumentDir:'/test'},FileSystem:{}};
 if(name.endsWith('audio/controller'))return{playback:{}};
 return load.call(this,name,parent,isMain);
};
const {nativeDownloadPorts}=require('../../src/features/downloads/native.ts');
test('full Quran registry commits only changed rows and rolls back an interrupted multi-collection snapshot',async()=>{
 const jobs=Array.from({length:460},(_,i)=>({jobId:`job${i}`,state:'queued',bytesReceived:0}));
 await nativeDownloadPorts.commit(jobs,[],[]);assert.equal(writes,460);
 writes=0;await nativeDownloadPorts.commit(jobs,[],[]);assert.equal(writes,0);
 jobs[2].bytesReceived=100;await nativeDownloadPorts.commit(jobs,[],[]);assert.equal(writes,1);
 const before=JSON.stringify(await nativeDownloadPorts.load());
 writes=0;failAt=2;jobs[2].bytesReceived=200;
 await assert.rejects(nativeDownloadPorts.commit(jobs,[{packId:'pack',version:'1',state:'ready'}],[]),/disk_full/);
 assert.equal(JSON.stringify(await nativeDownloadPorts.load()),before);
 failAt=0;writes=0;await nativeDownloadPorts.commit(jobs.slice(1),[],[]);assert.equal(writes,2);assert.equal((await nativeDownloadPorts.load()).jobs.length,459);
});
