require('../foundation/register.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
let queue=[],state='none',position=0,index=0,rate=1,repeat=0,plays=0,corrupt=false,session=null;
const player={setupPlayer:async()=>{},updateOptions:async()=>{},reset:async()=>{queue=[];state='none';},add:async tracks=>{queue=tracks;},skip:async i=>{index=i;},seekTo:async n=>{position=n;},pause:async()=>{state='paused';},play:async()=>{state='playing';plays++;},getActiveTrack:async()=>queue[index],getQueue:async()=>queue,getProgress:async()=>({position}),getRepeatMode:async()=>repeat,getRate:async()=>rate,setRepeatMode:async n=>{repeat=n;},setRate:async n=>{rate=n;}};
const load=Module._load;Module._load=function(name,parent,isMain){
 if(name==='react-native')return{Image:{}};
 if(name==='react-native-track-player')return{__esModule:true,default:player,Capability:{},AppKilledPlaybackBehavior:{},State:{},RepeatMode:{Off:0,Track:1,Queue:2}};
 if(name==='react-native-file-access')return{Dirs:{DocumentDir:'/private'},FileSystem:{exists:async()=>true,stat:async()=>({size:10}),hash:async()=>corrupt?'bad':'hash'}};
 if(name.endsWith('repositories/database'))return{saveRecord:async(_c,_i,s)=>{session=s;},readRecord:async(c,id)=>c==='playback'?session:c==='installed'?{state:'ready',capabilities:['audio'],files:['packs/a.mp3','packs/b.mp3']}:{state:'ready',relativeFinalPath:id.includes('.a@')?'packs/a.mp3':'packs/b.mp3',expectedBytes:10,expectedHash:'hash',jobId:id}};
 if(name.endsWith('assets/audio'))return{audioAssets:{}};
 return load.call(this,name,parent,isMain);
};
const {playback,persistPlayback,restoreDownloadedSession,audioErrors}=require('../../src/features/audio/controller.ts');
test('downloaded session restores exact queue/version/index/position paused and refuses corrupt bytes',async()=>{
 const entries=['a','b'].map(assetId=>({packId:'pack',version:'v1',assetId,title:assetId}));
 await playback.downloaded(entries);assert.equal(plays,1);index=1;position=17;rate=1.25;repeat=1;await persistPlayback();
 queue=[];state='none';rate=1;repeat=0;await restoreDownloadedSession();assert.equal(rate,1.25);assert.equal(repeat,1);assert.equal(plays,1);assert.equal(state,'paused');assert.equal(position,17);assert.equal(index,1);assert.equal(queue[0].assetVersion,'v1');
 const previous=queue;corrupt=true;await playback.downloaded(entries);assert.equal(queue,previous);assert.ok(audioErrors.getSnapshot());
 const saved=session;rate=0.75;repeat=0;await assert.rejects(restoreDownloadedSession(),/audio_restore_failed/);assert.equal(session,saved);assert.equal(rate,0.75);assert.equal(repeat,0);assert.equal(queue,previous);assert.ok(audioErrors.getSnapshot());
});
test('rate and repeat are bounded and reflect confirmed player values',async()=>{
 await playback.rate(1.25);assert.equal(rate,1.25);await playback.rate(100);assert.equal(rate,1.25);
 await playback.repeat(2);assert.equal(repeat,2);await playback.repeat(10);assert.equal(repeat,2);
});
